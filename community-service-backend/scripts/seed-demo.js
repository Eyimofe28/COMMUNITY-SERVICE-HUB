// Fills an EMPTY database with demo accounts and sample opportunities.
//
// Run from the project root (after `npm run db:schema -- --yes`):
//   npm run db:seed
//
// Passwords are randomly generated and printed ONCE - write them down.
// (They are never stored in the repo, because the repo is public.)
// Create the admin account separately with `npm run make-admin`.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });


const db = require("../config/db");
const { generatePassword, hashPassword } = require("../utils/passwordPolicy");
const { todayOnCampus, addDays } = require("../utils/dates");

const DEMO_USERS = [
    { key: "approver", firstName: "Grace",  lastName: "Johnson",  email: "demo.approver@mvsu.edu", role: "faculty", dept: "Community Engagement", approver: true },
    { key: "faculty",  firstName: "Marcus", lastName: "Williams", email: "demo.faculty@mvsu.edu",  role: "faculty", dept: "Computer Science",     approver: false },
    { key: "student1", firstName: "Jordan", lastName: "Lee",      email: "demo.student1@mvsu.edu", role: "student" },
    { key: "student2", firstName: "Taylor", lastName: "Brooks",   email: "demo.student2@mvsu.edu", role: "student" },
];

async function main() {
    const { rows: [{ userCount }] } = await db.query('SELECT COUNT(*)::int AS "userCount" FROM users WHERE "Role" <> \'admin\'');
    if (userCount > 0) {
        console.log("The database already has student/faculty accounts. Seeding is only for an empty database.");
        console.log("To start over: npm run db:schema -- --yes   (deletes ALL data, including admins)");
        process.exitCode = 1;
        return;
    }

    const client = await db.connect();
    const ids = {};
    const credentials = [];

    try {
        await client.query("BEGIN");

        // ---- Accounts ----
        for (const u of DEMO_USERS) {
            const password = generatePassword();
            const hash = await hashPassword(password);

            const { rows } = await client.query(
                `INSERT INTO users ("First_Name", "Last_Name", "Email", "Password_Hash", "Role")
                 VALUES ($1, $2, $3, $4, $5) RETURNING "User_ID"`,
                [u.firstName, u.lastName, u.email, hash, u.role]
            );
            ids[u.key] = rows[0].User_ID;

            if (u.role === "faculty") {
                await client.query(
                    'INSERT INTO faculty ("User_ID", "Faculty_Dept", "Approver") VALUES ($1, $2, $3)',
                    [ids[u.key], u.dept, u.approver]
                );
            } else {
                await client.query('INSERT INTO student ("User_ID") VALUES ($1)', [ids[u.key]]);
            }

            credentials.push({
                role: u.approver ? "approver" : u.role,
                name: `${u.firstName} ${u.lastName}`,
                email: u.email,
                password,
            });
        }

        // ---- Opportunities (all created by the demo faculty member) ----
        const insertOpportunity = async (title, description, dayOffset, start, end, hours, location, status) => {
            const { rows } = await client.query(
                `INSERT INTO opportunity ("Faculty_ID", "Title", "Description", "Date", "Start_Time", "End_Time",
                                          "Duration", "Location", "Person_In_Charge", "Approval_Status", "Approver_ID")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Marcus Williams', $9, $10)
                 RETURNING "Opportunity_ID"`,
                [ids.faculty, title, description, addDays(todayOnCampus(), dayOffset), start, end, hours, location, status,
                 status === "Pending" ? null : ids.approver]
            );
            return rows[0].Opportunity_ID;
        };

        // 1) Pending: waits in the approver's queue
        await insertOpportunity(
            "Campus Cleanup Day",
            "Help clean up the main quad and surrounding walkways.",
            14, "09:00", "12:00", 3, "Main Quad", "Pending"
        );

        // 2) Approved, upcoming: student 1 is registered and has an announcement
        const tutoringId = await insertOpportunity(
            "Tutoring at Local Elementary",
            "Tutor 3rd-5th graders in reading and math.",
            7, "14:00", "16:00", 2, "Itta Bena Elementary School", "Approved"
        );
        await client.query(
            'INSERT INTO registration ("Student_ID", "Opportunity_ID") VALUES ($1, $2)',
            [ids.student1, tutoringId]
        );
        await client.query(
            `INSERT INTO communication ("Opportunity_ID", "Faculty_ID", "Message_Content")
             VALUES ($1, $2, $3)`,
            [tutoringId, ids.faculty, "Please arrive 10 minutes early and check in at the front office."]
        );

        // 3) Approved, in the past: attendance already submitted
        const foodBankId = await insertOpportunity(
            "Food Bank Volunteer Shift",
            "Sort and pack food donations for local families.",
            -7, "10:00", "13:00", 3, "Delta Community Food Bank", "Approved"
        );
        for (const student of ["student1", "student2"]) {
            await client.query(
                'INSERT INTO registration ("Student_ID", "Opportunity_ID") VALUES ($1, $2)',
                [ids[student], foodBankId]
            );
        }
        await client.query(
            `INSERT INTO attendance ("Student_ID", "Opportunity_ID", "Attended", "Hours_Earned")
             VALUES ($1, $3, true, 3), ($2, $3, false, 0)`,
            [ids.student1, ids.student2, foodBankId]
        );
        await client.query(
            'UPDATE student SET "Service_Hours_Total" = 3 WHERE "User_ID" = $1',
            [ids.student1]
        );

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    console.log("Demo data created. Write these credentials down - they are shown only once:\n");
    console.table(credentials);
}

main()
    .catch((error) => {
        console.error("seed-demo failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
