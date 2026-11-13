// =============================================================================
// API test suite - end-to-end tests of the REST API against the DEVELOPMENT database
// -----------------------------------------------------------------------------
// Run from the project root:   npm test
//
// What it does:
//   1. Starts the real backend (server.js) on a spare port.
//   2. Creates its own test accounts and opportunities (emails start with
//      "apitest."), calls the API exactly like the frontend does, and checks
//      status codes, messages and the data saved in the database.
//   3. Deletes everything it created and restores the admin settings it changed.
//
// SAFETY: refuses to run unless DB_ENVIRONMENT=development is set in
//   community-service-backend/.env, so it can never touch the live database.
// Some situations cannot be reached through the API without waiting (an event
// that already started, an attendance window that closed), so those rows are
// inserted directly into the database as test fixtures.
//
// Set TEST_TIMINGS_FILE=<path> to also save each request's response time as JSON.
// =============================================================================

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const { test, before, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const fs = require("fs");

if (process.env.DB_ENVIRONMENT !== "development") {
    console.error("Refusing to run: set DB_ENVIRONMENT=development in community-service-backend/.env (tests write to the database).");
    process.exit(1);
}

const db = require("../config/db");
const { hashPassword } = require("../utils/passwordPolicy");
const { todayOnCampus, addDays } = require("../utils/dates");

const PORT = 5055;
const BASE = `http://localhost:${PORT}/api`;
const RUN = Date.now().toString(36);               // keeps this run's emails unique
const email = (name) => `apitest.${RUN}.${name}@mvsu.edu`;
const PASSWORD = "Service!Hub26";

let server;
const timings = [];                                // { method, path, status, ms }

// ---------- helpers ----------

// Calls the API like the frontend does; returns { status, body, headers, ms }
async function api(method, url, { token, body, raw } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";

    const started = performance.now();
    const res = await fetch(BASE + url, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const ms = performance.now() - started;
    timings.push({ method, path: url.replace(/\/\d+/g, "/:id"), status: res.status, ms: Math.round(ms) });

    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: res.status, body: parsed, headers: res.headers, ms };
}

// Last name from the account name: "faculty1" -> "Faculty"
const lastNameFor = (name) => {
    const letters = name.replace(/\d/g, "");
    return letters.charAt(0).toUpperCase() + letters.slice(1);
};

const signup = (name, role, extra = {}) => api("POST", "/auth/signup", {
    body: { firstName: "Test", lastName: lastNameFor(name), email: email(name), password: PASSWORD, role, ...extra },
});

async function login(name, password = PASSWORD) {
    const res = await api("POST", "/auth/login", { body: { email: email(name), password } });
    assert.equal(res.status, 200, `login ${name}: ${JSON.stringify(res.body)}`);
    return res.body;   // { token, role, userId, ... }
}

// A valid Create Opportunity body; override any field
const opportunity = (overrides = {}) => ({
    title: "Campus Cleanup",
    location: "Student Union",
    description: "Litter pick-up around the main quad.",
    date: addDays(todayOnCampus(), 7),
    startTime: "09:00",
    endTime: "11:30",
    ...overrides,
});

// Inserts an Approved opportunity straight into the database (for dates the API refuses)
async function insertApprovedOpportunity(facultyId, approverId, date, extra = {}) {
    const { rows } = await db.query(
        `INSERT INTO opportunity ("Faculty_ID", "Title", "Date", "Start_Time", "End_Time", "Duration",
                                  "Location", "Person_In_Charge", "Approval_Status", "Approver_ID", "Capacity")
         VALUES ($1, $2, $3, '09:00', '12:00', 3, 'Gym', 'Test Faculty', 'Approved', $4, $5)
         RETURNING "Opportunity_ID"`,
        [facultyId, extra.title || "Fixture Event", date, approverId, extra.capacity ?? null]
    );
    return rows[0].Opportunity_ID;
}

const registerDirect = (studentId, opportunityId) => db.query(
    'INSERT INTO registration ("Student_ID", "Opportunity_ID") VALUES ($1, $2)', [studentId, opportunityId]
);

const hoursTotal = async (studentId) => Number((await db.query(
    'SELECT "Service_Hours_Total" FROM student WHERE "User_ID" = $1', [studentId]
)).rows[0].Service_Hours_Total);

// ---------- shared state ----------
const u = {};            // logged-in users: u.student1 = { token, userId, ... }
let savedSettings;       // app_settings rows to restore afterwards

// ---------- setup / teardown ----------

before(async () => {
    // Start the backend on its own port
    server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "ignore", "pipe"],
    });
    for (let i = 0; i < 60; i++) {
        try { if ((await fetch(`${BASE}/health`)).ok) break; } catch { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 500));
    }

    // Remember the approval switches so they can be restored, then switch them off
    savedSettings = (await db.query(`SELECT "Key", "Value" FROM app_settings WHERE "Key" LIKE 'require_approval_%'`)).rows;
    await db.query(`UPDATE app_settings SET "Value" = 'false' WHERE "Key" LIKE 'require_approval_%'`);

    // A test admin (admins cannot sign up through the API)
    await db.query(
        `INSERT INTO users ("First_Name", "Last_Name", "Email", "Password_Hash", "Role") VALUES ('Test', 'Admin', $1, $2, 'admin')`,
        [email("admin"), await hashPassword(PASSWORD)]
    );

    // Accounts used across the suite
    for (const [name, role] of [["student1", "student"], ["student2", "student"], ["student3", "student"],
        ["faculty1", "faculty"], ["faculty2", "faculty"], ["approver1", "faculty"]]) {
        const res = await signup(name, role, role === "faculty" ? { department: "Computer Science" } : {});
        assert.equal(res.status, 201, `signup ${name}: ${JSON.stringify(res.body)}`);
    }
    for (const name of ["admin", "student1", "student2", "student3", "faculty1", "faculty2"]) {
        u[name] = await login(name);
    }
    const approverId = (await login("approver1")).userId;
    const promote = await api("PATCH", `/admin/faculty/${approverId}/approver`, { token: u.admin.token, body: { approver: true } });
    assert.equal(promote.status, 200);
    u.approver1 = await login("approver1");
});

after(async () => {
    try {
        // Everything this suite (or an earlier, interrupted run) created; cascades remove the rest
        await db.query(`DELETE FROM users WHERE "Email" LIKE 'apitest.%@mvsu.edu'`);
        for (const { Key, Value } of savedSettings || []) {
            await db.query('UPDATE app_settings SET "Value" = $1 WHERE "Key" = $2', [Value, Key]);
        }
        if (process.env.TEST_TIMINGS_FILE) {
            fs.writeFileSync(process.env.TEST_TIMINGS_FILE, JSON.stringify(timings, null, 2));
        }
    } finally {
        server?.kill();
        await db.end();
    }
});

// =============================================================================
// Registration and login
// =============================================================================
describe("Registration and login", () => {
    test("rejects a non-MVSU email", async () => {
        const res = await api("POST", "/auth/signup", { body: { firstName: "Test", lastName: "User", email: "someone@gmail.com", password: PASSWORD, role: "student" } });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /mvsu\.edu/);
    });

    test("rejects a password that breaks the policy", async () => {
        const res = await api("POST", "/auth/signup", { body: { firstName: "Test", lastName: "User", email: email("weak"), password: "password", role: "student" } });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /Password/);
    });

    test("refuses the admin role on public signup", async () => {
        const res = await api("POST", "/auth/signup", { body: { firstName: "Test", lastName: "User", email: email("sneaky"), password: PASSWORD, role: "admin" } });
        assert.equal(res.status, 400);
    });

    test("rejects a duplicate email with 409", async () => {
        const res = await signup("student1", "student");
        assert.equal(res.status, 409);
    });

    test("stores only a bcrypt hash of the password", async () => {
        const { rows } = await db.query('SELECT "Password_Hash" FROM users WHERE "Email" = $1', [email("student1")]);
        assert.match(rows[0].Password_Hash, /^\$2[aby]\$12\$/);
        assert.ok(!rows[0].Password_Hash.includes(PASSWORD));
    });

    test("wrong password and unknown email get the same 401 message", async () => {
        const wrong = await api("POST", "/auth/login", { body: { email: email("student1"), password: "Wrong!Pass1" } });
        const unknown = await api("POST", "/auth/login", { body: { email: email("nobody"), password: "Wrong!Pass1" } });
        assert.equal(wrong.status, 401);
        assert.equal(unknown.status, 401);
        assert.equal(wrong.body.message, unknown.body.message);
    });

    test("login returns a token and the student role", () => {
        assert.equal(u.student1.role, "student");
        assert.ok(u.student1.token.split(".").length === 3);
    });

    test("a promoted faculty member logs in with the approver role", () => {
        assert.equal(u.approver1.role, "approver");
    });

    test("protected routes reject a missing or tampered token", async () => {
        assert.equal((await api("GET", "/auth/me")).status, 401);
        const tampered = u.student1.token.slice(0, -2) + (u.student1.token.endsWith("A") ? "BB" : "AA");
        assert.equal((await api("GET", "/auth/me", { token: tampered })).status, 401);
    });

    test("SQL injection in the login email is treated as plain text", async () => {
        const res = await api("POST", "/auth/login", { body: { email: "' OR '1'='1' --@mvsu.edu", password: "x" } });
        assert.equal(res.status, 401);
        const { rows } = await db.query("SELECT COUNT(*)::int AS n FROM users");
        assert.ok(rows[0].n > 0);
    });

    test("change password needs the current password", async () => {
        const wrong = await api("POST", "/auth/change-password", { token: u.student3.token, body: { currentPassword: "Wrong!Pass1", newPassword: "Newer!Pass26" } });
        assert.equal(wrong.status, 400);
        const ok = await api("POST", "/auth/change-password", { token: u.student3.token, body: { currentPassword: PASSWORD, newPassword: "Newer!Pass26" } });
        assert.equal(ok.status, 200);
        await login("student3", "Newer!Pass26");
    });

    test("login is rate-limited after 10 attempts", async () => {
        const statuses = [];
        for (let i = 0; i < 11; i++) {
            statuses.push((await api("POST", "/auth/login", { body: { email: email("ratelimit"), password: "Wrong!Pass1" } })).status);
        }
        assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
        assert.equal(statuses[10], 429);
    });
});

// =============================================================================
// Account approval
// =============================================================================
describe("Account approval", () => {
    test("with approval on, a new student is pending and cannot log in", async () => {
        assert.equal((await api("PUT", "/admin/settings/approval", { token: u.admin.token, body: { student: true } })).status, 200);
        const res = await signup("pending1", "student");
        assert.equal(res.status, 201);
        assert.equal(res.body.pendingApproval, true);

        const attempt = await api("POST", "/auth/login", { body: { email: email("pending1"), password: PASSWORD } });
        assert.equal(attempt.status, 403);
        assert.equal(attempt.body.code, "ACCOUNT_PENDING");
    });

    test("after an admin approves, the student can log in", async () => {
        const { rows } = await db.query('SELECT "User_ID" FROM users WHERE "Email" = $1', [email("pending1")]);
        assert.equal((await api("PATCH", `/admin/accounts/${rows[0].User_ID}/approve`, { token: u.admin.token })).status, 200);
        await login("pending1");
    });

    test("a declined account is refused at login with an explanation", async () => {
        await signup("pending2", "student");
        const { rows } = await db.query('SELECT "User_ID" FROM users WHERE "Email" = $1', [email("pending2")]);
        assert.equal((await api("PATCH", `/admin/accounts/${rows[0].User_ID}/decline`, { token: u.admin.token })).status, 200);
        const attempt = await api("POST", "/auth/login", { body: { email: email("pending2"), password: PASSWORD } });
        assert.equal(attempt.status, 403);
        assert.equal(attempt.body.code, "ACCOUNT_DECLINED");
        await api("PUT", "/admin/settings/approval", { token: u.admin.token, body: { student: false } });
    });
});

// =============================================================================
// Role-based access control
// =============================================================================
describe("Access control", () => {
    test("a student cannot create an opportunity", async () => {
        assert.equal((await api("POST", "/opportunity/create", { token: u.student1.token, body: opportunity() })).status, 403);
    });

    test("an approver cannot create an opportunity", async () => {
        assert.equal((await api("POST", "/opportunity/create", { token: u.approver1.token, body: opportunity() })).status, 403);
    });

    test("non-admins cannot reach admin endpoints", async () => {
        assert.equal((await api("GET", "/admin/users", { token: u.faculty1.token })).status, 403);
        assert.equal((await api("GET", "/admin/users", { token: u.approver1.token })).status, 403);
    });

    test("faculty cannot register for opportunities", async () => {
        assert.equal((await api("POST", "/opportunity/register/1", { token: u.faculty1.token })).status, 403);
    });

    test("a role change applies on the next request, without logging in again", async () => {
        await api("PATCH", `/admin/faculty/${u.faculty2.userId}/approver`, { token: u.admin.token, body: { approver: true } });
        assert.equal((await api("GET", "/auth/me", { token: u.faculty2.token })).body.role, "approver");
        await api("PATCH", `/admin/faculty/${u.faculty2.userId}/approver`, { token: u.admin.token, body: { approver: false } });
        assert.equal((await api("GET", "/auth/me", { token: u.faculty2.token })).body.role, "faculty");
    });
});

// =============================================================================
// Opportunity creation, review and lifecycle
// =============================================================================
describe("Opportunity creation and review", () => {
    let pendingId;

    test("rejects dates outside tomorrow .. 365 days ahead", async () => {
        for (const date of [todayOnCampus(), addDays(todayOnCampus(), -3), addDays(todayOnCampus(), 400)]) {
            const res = await api("POST", "/opportunity/create", { token: u.faculty1.token, body: opportunity({ date }) });
            assert.equal(res.status, 400, `date ${date}`);
        }
    });

    test("rejects times off the half hour, outside 6 AM-10 PM, or longer than 12 hours", async () => {
        for (const [startTime, endTime] of [["09:15", "10:00"], ["05:00", "07:00"], ["06:00", "21:30"], ["10:00", "09:00"]]) {
            const res = await api("POST", "/opportunity/create", { token: u.faculty1.token, body: opportunity({ startTime, endTime }) });
            assert.equal(res.status, 400, `${startTime}-${endTime}`);
        }
    });

    test("rejects an out-of-range capacity", async () => {
        for (const capacity of [0, 501, 2.5]) {
            assert.equal((await api("POST", "/opportunity/create", { token: u.faculty1.token, body: opportunity({ capacity }) })).status, 400);
        }
    });

    test("creates a valid opportunity as Pending with a calculated duration", async () => {
        const res = await api("POST", "/opportunity/create", { token: u.faculty1.token, body: opportunity() });
        assert.equal(res.status, 201);
        pendingId = res.body.opportunityId;
        const { rows } = await db.query('SELECT * FROM opportunity WHERE "Opportunity_ID" = $1', [pendingId]);
        assert.equal(rows[0].Approval_Status, "Pending");
        assert.equal(Number(rows[0].Duration), 2.5);
        assert.equal(rows[0].Person_In_Charge, "Test Faculty");
        assert.equal(rows[0].Approver_ID, null);
    });

    test("pending opportunities are hidden from students", async () => {
        const res = await api("GET", "/opportunity/approved", { token: u.student1.token });
        assert.ok(!res.body.opportunities.some((o) => o.Opportunity_ID === pendingId));
    });

    test("approvers see it in the pending queue", async () => {
        const res = await api("GET", "/opportunity/pending", { token: u.approver1.token });
        assert.ok(res.body.pending.some((o) => o.Opportunity_ID === pendingId));
    });

    test("rejecting without a reason is refused", async () => {
        const res = await api("PATCH", `/opportunity/approve/${pendingId}`, { token: u.approver1.token, body: { status: "Rejected" } });
        assert.equal(res.status, 400);
    });

    test("an approver cannot decide their own submission", async () => {
        const own = await insertApprovedOpportunity(u.approver1.userId, null, addDays(todayOnCampus(), 5));
        await db.query(`UPDATE opportunity SET "Approval_Status" = 'Pending' WHERE "Opportunity_ID" = $1`, [own]);
        const res = await api("PATCH", `/opportunity/approve/${own}`, { token: u.approver1.token, body: { status: "Approved" } });
        assert.equal(res.status, 403);
    });

    test("rejection with a reason, then edit and resubmit returns it to Pending", async () => {
        const rej = await api("PATCH", `/opportunity/approve/${pendingId}`, { token: u.approver1.token, body: { status: "Rejected", rejectionReason: "Please add a meeting point." } });
        assert.equal(rej.status, 200);
        const again = await api("PATCH", `/opportunity/approve/${pendingId}`, { token: u.approver1.token, body: { status: "Approved" } });
        assert.equal(again.status, 409, "decisions are final");

        const edit = await api("PUT", `/opportunity/${pendingId}`, { token: u.faculty1.token, body: opportunity({ location: "Student Union front steps" }) });
        assert.equal(edit.status, 200);
        const { rows } = await db.query('SELECT "Approval_Status", "Rejection_Reason", "Approver_ID" FROM opportunity WHERE "Opportunity_ID" = $1', [pendingId]);
        assert.deepEqual(rows[0], { Approval_Status: "Pending", Rejection_Reason: null, Approver_ID: null });
    });

    test("approval records the approver and makes it visible to students", async () => {
        const res = await api("PATCH", `/opportunity/approve/${pendingId}`, { token: u.approver1.token, body: { status: "Approved" } });
        assert.equal(res.status, 200);
        const { rows } = await db.query('SELECT "Approver_ID" FROM opportunity WHERE "Opportunity_ID" = $1', [pendingId]);
        assert.equal(rows[0].Approver_ID, u.approver1.userId);
        const browse = await api("GET", "/opportunity/approved", { token: u.student1.token });
        assert.ok(browse.body.opportunities.some((o) => o.Opportunity_ID === pendingId));
    });

    test("an admin rejection is recorded with the admin as decider", async () => {
        const created = await api("POST", "/opportunity/create", { token: u.faculty1.token, body: opportunity({ title: "Admin Review Test" }) });
        const id = created.body.opportunityId;
        const res = await api("PATCH", `/admin/opportunity/${id}/reject`, { token: u.admin.token, body: { reason: "Duplicate event." } });
        assert.equal(res.status, 200);
        const { rows } = await db.query('SELECT "Approver_ID", "Approval_Status" FROM opportunity WHERE "Opportunity_ID" = $1', [id]);
        assert.equal(rows[0].Approval_Status, "Rejected");
        assert.equal(rows[0].Approver_ID, u.admin.userId);
    });

    test("pending opportunities can be withdrawn; approved ones cannot", async () => {
        const created = await api("POST", "/opportunity/create", { token: u.faculty1.token, body: opportunity({ title: "Withdraw Me" }) });
        assert.equal((await api("DELETE", `/opportunity/${created.body.opportunityId}`, { token: u.faculty1.token })).status, 200);
        assert.equal((await api("DELETE", `/opportunity/${pendingId}`, { token: u.faculty1.token })).status, 400);
    });
});

// =============================================================================
// Student registration
// =============================================================================
describe("Student registration", () => {
    let openId;

    before(async () => {
        openId = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), 10), { title: "Food Drive" });
    });

    test("a student registers once; a second attempt is refused", async () => {
        assert.equal((await api("POST", `/opportunity/register/${openId}`, { token: u.student1.token })).status, 201);
        assert.equal((await api("POST", `/opportunity/register/${openId}`, { token: u.student1.token })).status, 400);
    });

    test("a full opportunity refuses further registrations with 409", async () => {
        const small = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), 10), { capacity: 1 });
        assert.equal((await api("POST", `/opportunity/register/${small}`, { token: u.student1.token })).status, 201);
        assert.equal((await api("POST", `/opportunity/register/${small}`, { token: u.student2.token })).status, 409);
    });

    test("simultaneous registrations never exceed capacity", async () => {
        const small = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), 10), { capacity: 1 });
        const results = await Promise.all([u.student1, u.student2, u.student3].map((s) =>
            api("POST", `/opportunity/register/${small}`, { token: s.token })));
        assert.equal(results.filter((r) => r.status === 201).length, 1);
        const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM registration WHERE "Opportunity_ID" = $1', [small]);
        assert.equal(rows[0].n, 1);
    });

    test("registration is closed once the event has started", async () => {
        const started = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), -1));
        assert.equal((await api("POST", `/opportunity/register/${started}`, { token: u.student2.token })).status, 400);
    });

    test("a student can unregister before the event", async () => {
        assert.equal((await api("POST", `/opportunity/register/${openId}`, { token: u.student2.token })).status, 201);
        assert.equal((await api("DELETE", `/opportunity/unregister/${openId}`, { token: u.student2.token })).status, 200);
    });

    test("a cancelled opportunity shows its reason to registered students", async () => {
        const res = await api("PATCH", `/opportunity/${openId}/cancel`, { token: u.faculty1.token, body: { reason: "Venue closed for repairs." } });
        assert.equal(res.status, 200);
        const mine = await api("GET", "/opportunity/my-registrations", { token: u.student1.token });
        const row = mine.body.opportunities.find((o) => o.Opportunity_ID === openId);
        assert.equal(row.Approval_Status, "Cancelled");
        assert.equal(row.Cancellation_Reason, "Venue closed for repairs.");
    });
});

// =============================================================================
// Attendance and service hours
// =============================================================================
describe("Attendance and service hours", () => {
    let pastId;

    before(async () => {
        pastId = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), -1), { title: "River Cleanup" });
        await registerDirect(u.student1.userId, pastId);
        await registerDirect(u.student2.userId, pastId);
    });

    test("only the owning faculty member can submit attendance", async () => {
        const res = await api("POST", `/opportunity/${pastId}/attendance`, { token: u.faculty2.token, body: { attendance: [{ studentId: u.student1.userId, attended: true, hoursEarned: 3 }] } });
        assert.equal(res.status, 403);
    });

    test("attendance cannot be submitted before the event starts", async () => {
        const future = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), 3));
        await registerDirect(u.student1.userId, future);
        const res = await api("POST", `/opportunity/${future}/attendance`, { token: u.faculty1.token, body: { attendance: [{ studentId: u.student1.userId, attended: true, hoursEarned: 1 }] } });
        assert.equal(res.status, 400);
    });

    test("attendance cannot be changed more than 14 days after the event", async () => {
        const old = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), -20));
        await registerDirect(u.student1.userId, old);
        const res = await api("POST", `/opportunity/${old}/attendance`, { token: u.faculty1.token, body: { attendance: [{ studentId: u.student1.userId, attended: true, hoursEarned: 1 }] } });
        assert.equal(res.status, 400);
    });

    test("invalid entries are refused and nothing is saved", async () => {
        for (const entry of [
            { studentId: u.student1.userId, attended: true, hoursEarned: 4 },     // more than the 3-hour event
            { studentId: u.student1.userId, attended: true, hoursEarned: 1.25 },  // not a half-hour step
            { studentId: u.student3.userId, attended: true, hoursEarned: 1 },     // not registered
        ]) {
            assert.equal((await api("POST", `/opportunity/${pastId}/attendance`, { token: u.faculty1.token, body: { attendance: [entry] } })).status, 400);
        }
        const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM attendance WHERE "Opportunity_ID" = $1', [pastId]);
        assert.equal(rows[0].n, 0);
    });

    test("valid attendance credits hours; absent students get none", async () => {
        const res = await api("POST", `/opportunity/${pastId}/attendance`, { token: u.faculty1.token, body: { attendance: [
            { studentId: u.student1.userId, attended: true, hoursEarned: 3 },
            { studentId: u.student2.userId, attended: false, hoursEarned: 0 },
        ] } });
        assert.equal(res.status, 200);
        assert.equal(await hoursTotal(u.student1.userId), 3);
        assert.equal(await hoursTotal(u.student2.userId), 0);
    });

    test("correcting attendance recalculates totals instead of adding again", async () => {
        const body = { attendance: [{ studentId: u.student1.userId, attended: true, hoursEarned: 2.5 }] };
        assert.equal((await api("POST", `/opportunity/${pastId}/attendance`, { token: u.faculty1.token, body })).status, 200);
        assert.equal((await api("POST", `/opportunity/${pastId}/attendance`, { token: u.faculty1.token, body })).status, 200);
        assert.equal(await hoursTotal(u.student1.userId), 2.5);
        const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM attendance WHERE "Opportunity_ID" = $1 AND "Student_ID" = $2', [pastId, u.student1.userId]);
        assert.equal(rows[0].n, 1);
    });

    test("a student cannot unregister once attendance is recorded", async () => {
        assert.equal((await api("DELETE", `/opportunity/unregister/${pastId}`, { token: u.student1.token })).status, 400);
    });

    test("attendance for 50 students is saved in under 2 seconds", async () => {
        const big = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), -1), { title: "Large Event" });
        const hash = await hashPassword(PASSWORD);
        const ids = [];
        for (let i = 0; i < 50; i++) {
            const { rows } = await db.query(
                `INSERT INTO users ("First_Name", "Last_Name", "Email", "Password_Hash", "Role") VALUES ('Bulk', 'Student', $1, $2, 'student') RETURNING "User_ID"`,
                [email(`bulk${i}`), hash]
            );
            ids.push(rows[0].User_ID);
            await db.query('INSERT INTO student ("User_ID") VALUES ($1)', [rows[0].User_ID]);
            await registerDirect(rows[0].User_ID, big);
        }
        const res = await api("POST", `/opportunity/${big}/attendance`, { token: u.faculty1.token, body: {
            attendance: ids.map((studentId, i) => ({ studentId, attended: i % 5 !== 0, hoursEarned: i % 5 !== 0 ? 3 : 0 })),
        } });
        assert.equal(res.status, 200);
        assert.ok(res.ms < 2000, `took ${Math.round(res.ms)} ms`);
    });
});

// =============================================================================
// Announcements (communication)
// =============================================================================
describe("Announcements", () => {
    let eventId;

    before(async () => {
        eventId = await insertApprovedOpportunity(u.faculty1.userId, u.approver1.userId, addDays(todayOnCampus(), 6), { title: "Tutoring Night" });
        await registerDirect(u.student1.userId, eventId);
    });

    test("the owner posts an announcement on an approved opportunity", async () => {
        const res = await api("POST", `/communication/${eventId}`, { token: u.faculty1.token, body: { message: "Meet at the library entrance." } });
        assert.equal(res.status, 201);
    });

    test("empty messages, non-owners and students cannot post", async () => {
        assert.equal((await api("POST", `/communication/${eventId}`, { token: u.faculty1.token, body: { message: "   " } })).status, 400);
        assert.equal((await api("POST", `/communication/${eventId}`, { token: u.faculty2.token, body: { message: "Hi" } })).status, 403);
        assert.equal((await api("POST", `/communication/${eventId}`, { token: u.student1.token, body: { message: "Hi" } })).status, 403);
    });

    test("a registered student can read the announcements", async () => {
        const res = await api("GET", `/communication/${eventId}`, { token: u.student1.token });
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.equal(res.body.messages[0].message, "Meet at the library entrance.");
    });

    test("an unregistered student cannot read them", async () => {
        assert.equal((await api("GET", `/communication/${eventId}`, { token: u.student2.token })).status, 403);
    });
});

// =============================================================================
// Server hardening
// =============================================================================
describe("Server hardening", () => {
    test("health check reports the database as connected", async () => {
        const res = await api("GET", "/health");
        assert.equal(res.status, 200);
        assert.equal(res.body.database, "connected");
    });

    test("security headers are set and the framework is not advertised", async () => {
        const res = await api("GET", "/health");
        assert.equal(res.headers.get("x-content-type-options"), "nosniff");
        assert.equal(res.headers.get("x-powered-by"), null);
    });

    test("malformed JSON gets a clean 400, unknown routes a JSON 404", async () => {
        const bad = await api("POST", "/auth/login", { raw: "{not json" });
        assert.equal(bad.status, 400);
        const missing = await api("GET", "/does-not-exist");
        assert.equal(missing.status, 404);
        assert.equal(typeof missing.body.message, "string");
    });
});
