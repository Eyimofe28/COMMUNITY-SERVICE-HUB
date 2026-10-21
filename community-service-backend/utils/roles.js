// =============================================================================
// Effective role of a user
// -----------------------------------------------------------------------------
// The users table stores student / faculty / admin. A faculty member whose
// faculty."Approver" flag is true acts as "approver" in the app.
//
// SECURITY: the role is worked out from the DATABASE on every request (see
// authMiddleware), not trusted from the login token, so promoting or demoting
// an approver takes effect immediately.
// REUSABILITY: used by login (to route the user) and by authMiddleware.
// =============================================================================

exports.effectiveRole = (role, approverFlag) =>
    role === "faculty" && approverFlag === true ? "approver" : role;

// SQL that loads a user together with their approver flag (one query)
exports.USER_WITH_ROLE_SQL = `
    SELECT u."User_ID", u."First_Name", u."Last_Name", u."Email", u."Role", f."Approver"
    FROM users u
    LEFT JOIN faculty f ON f."User_ID" = u."User_ID"
    WHERE u."User_ID" = $1`;
