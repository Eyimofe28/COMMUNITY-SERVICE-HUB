// =============================================================================
// App settings stored in the app_settings table (key -> text value)
// -----------------------------------------------------------------------------
// Admins change these from the Admin Dashboard, so they take effect immediately
// without editing files or restarting the server.
//
//   require_approval_student / require_approval_faculty
//       "true" = new accounts of that role wait for an admin's approval
//   office_contact
//       who users are told to contact in the approval messages
//
// REUSABILITY: used by signup/login (authController) and the admin endpoints.
// =============================================================================

const db = require("../config/db");

// Used if a setting is missing (e.g. before migration 002 has run)
const DEFAULTS = {
    require_approval_student: "false",
    require_approval_faculty: "false",
    office_contact: "Community Service office",
};

// Reads one setting; `runner` can be a transaction client instead of the pool
async function getSetting(key, runner = db) {
    const { rows } = await runner.query('SELECT "Value" FROM app_settings WHERE "Key" = $1', [key]);
    return rows.length ? rows[0].Value : DEFAULTS[key];
}

async function setSetting(key, value, runner = db) {
    await runner.query(
        `INSERT INTO app_settings ("Key", "Value", "Updated_At") VALUES ($1, $2, now())
         ON CONFLICT ("Key") DO UPDATE SET "Value" = EXCLUDED."Value", "Updated_At" = now()`,
        [key, String(value)]
    );
}

// Whether new accounts of a role ("student" / "faculty") need approval
async function requiresApproval(role, runner = db) {
    return (await getSetting(`require_approval_${role}`, runner)) === "true";
}

// { student: true/false, faculty: true/false }
async function getApprovalSettings() {
    return {
        student: await requiresApproval("student"),
        faculty: await requiresApproval("faculty"),
    };
}

const getOfficeContact = () => getSetting("office_contact");

module.exports = { getSetting, setSetting, requiresApproval, getApprovalSettings, getOfficeContact };
