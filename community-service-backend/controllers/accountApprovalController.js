// =============================================================================
// Account approval (P5a) - admin endpoints, mounted under /api/admin (admins only)
// -----------------------------------------------------------------------------
//   GET   /api/admin/settings/approval        current switches { student, faculty }
//   PUT   /api/admin/settings/approval        change one or both switches
//   GET   /api/admin/accounts?status=pending  pending (or declined) accounts
//   PATCH /api/admin/accounts/:userId/approve pending/declined -> approved
//   PATCH /api/admin/accounts/:userId/decline pending -> declined
//   POST  /api/admin/accounts/approve-all     every pending account -> approved
//   GET   /api/admin/settings/office-contact  who users are told to contact
//   PUT   /api/admin/settings/office-contact  change it
//
// Rules:
//   - A switch only affects NEW signups. Accounts already pending stay pending
//     until an admin approves them (individually or with "approve all").
//   - Declined accounts are kept (not deleted), so the user sees a clear message
//     and an admin can still change their mind and approve them later.
//   - Admin accounts are never part of this (they are always approved).
// =============================================================================

const db = require("../config/db");
const { getApprovalSettings, setSetting, getOfficeContact } = require("../utils/settings");

const STATUSES = ["pending", "declined"];

// Reads "/:userId" safely: a positive whole number, or null
const parseId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /api/admin/settings/approval
exports.getApprovalSettings = async (req, res) => {
    try {
        return res.status(200).json(await getApprovalSettings());
    } catch (error) {
        console.error("Get Approval Settings Error:", error);
        return res.status(500).json({ message: "Server error retrieving approval settings." });
    }
};

// PUT /api/admin/settings/approval   Body: { student?: boolean, faculty?: boolean }
exports.updateApprovalSettings = async (req, res) => {
    try {
        const changes = Object.entries(req.body || {}).filter(([role]) => ["student", "faculty"].includes(role));

        if (changes.length === 0 || changes.some(([, value]) => typeof value !== "boolean")) {
            return res.status(400).json({ message: "Send student and/or faculty as true or false." });
        }

        for (const [role, value] of changes) {
            await setSetting(`require_approval_${role}`, value);
        }

        return res.status(200).json({
            message: "Approval settings saved. They apply to new sign-ups.",
            ...(await getApprovalSettings()),
        });
    } catch (error) {
        console.error("Update Approval Settings Error:", error);
        return res.status(500).json({ message: "Server error saving approval settings." });
    }
};

// GET /api/admin/settings/office-contact
exports.getOfficeContact = async (req, res) => {
    try {
        return res.status(200).json({ officeContact: await getOfficeContact() });
    } catch (error) {
        console.error("Get Office Contact Error:", error);
        return res.status(500).json({ message: "Server error retrieving the office contact." });
    }
};

// PUT /api/admin/settings/office-contact   Body: { officeContact }
// Shown in the approval messages as "Contact the <officeContact>", e.g.
// "Community Service office" or "Community Service office (cs@mvsu.edu)".
exports.updateOfficeContact = async (req, res) => {
    try {
        const value = typeof req.body?.officeContact === "string" ? req.body.officeContact.trim() : "";
        if (value.length < 3 || value.length > 120) {
            return res.status(400).json({ message: "The office contact must be 3-120 characters." });
        }
        await setSetting("office_contact", value);
        return res.status(200).json({ message: "Office contact saved.", officeContact: value });
    } catch (error) {
        console.error("Update Office Contact Error:", error);
        return res.status(500).json({ message: "Server error saving the office contact." });
    }
};

// GET /api/admin/accounts?status=pending|declined  (oldest sign-up first)
exports.listAccounts = async (req, res) => {
    try {
        const status = req.query.status || "pending";
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ message: "Status must be pending or declined." });
        }

        const { rows } = await db.query(
            `SELECT u."User_ID", u."First_Name", u."Last_Name", u."Email", u."Role",
                    u."Account_Status", u."Created_At", f."Faculty_Dept"
             FROM users u
             LEFT JOIN faculty f ON f."User_ID" = u."User_ID"
             WHERE u."Account_Status" = $1 AND u."Role" <> 'admin'
             ORDER BY u."Created_At" ASC`,
            [status]
        );

        return res.status(200).json({ accounts: rows });
    } catch (error) {
        console.error("List Accounts Error:", error);
        return res.status(500).json({ message: "Server error retrieving accounts." });
    }
};

// Shared by approve/decline: moves one account from an allowed status to a new one.
// The WHERE clause makes the change only if the account is still in an allowed
// status, so two admins acting at the same time cannot conflict.
async function changeStatus(req, res, { from, to, verb }) {
    try {
        const userId = parseId(req.params.userId);
        if (!userId) {
            return res.status(400).json({ message: "Invalid account." });
        }

        const result = await db.query(
            `UPDATE users SET "Account_Status" = $1
             WHERE "User_ID" = $2 AND "Role" <> 'admin' AND "Account_Status" = ANY($3::text[])
             RETURNING "First_Name", "Last_Name", "Email"`,
            [to, userId, from]
        );

        if (result.rowCount === 0) {
            return res.status(409).json({ message: `This account can't be ${verb} (it may already have been handled).` });
        }

        const u = result.rows[0];
        return res.status(200).json({ message: `${u.First_Name} ${u.Last_Name} (${u.Email}) was ${verb}.` });
    } catch (error) {
        console.error(`Account ${verb} Error:`, error);
        return res.status(500).json({ message: "Server error updating the account." });
    }
}

// PATCH /api/admin/accounts/:userId/approve  (pending or declined -> approved)
exports.approveAccount = (req, res) =>
    changeStatus(req, res, { from: ["pending", "declined"], to: "approved", verb: "approved" });

// PATCH /api/admin/accounts/:userId/decline  (pending -> declined)
exports.declineAccount = (req, res) =>
    changeStatus(req, res, { from: ["pending"], to: "declined", verb: "declined" });

// POST /api/admin/accounts/approve-all  (every pending account -> approved)
exports.approveAllPending = async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE users SET "Account_Status" = 'approved'
             WHERE "Account_Status" = 'pending' AND "Role" <> 'admin'`
        );
        return res.status(200).json({
            message: `${result.rowCount} pending account${result.rowCount === 1 ? "" : "s"} approved.`,
            approved: result.rowCount,
        });
    } catch (error) {
        console.error("Approve All Pending Error:", error);
        return res.status(500).json({ message: "Server error approving accounts." });
    }
};
