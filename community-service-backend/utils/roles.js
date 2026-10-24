// =============================================================================
// Effective role and account status of a user
// -----------------------------------------------------------------------------
// The users table stores student / faculty / admin. A faculty member whose
// faculty."Approver" flag is true acts as "approver" in the app.
// users."Account_Status" is pending / approved / declined (account approval, P5a).
//
// SECURITY: the role and status are read from the DATABASE on every request (see
// authMiddleware), not trusted from the login token, so promoting or demoting an
// approver - or declining an account - takes effect immediately.
// REUSABILITY: used by login (to route the user) and by authMiddleware.
// =============================================================================

exports.effectiveRole = (role, approverFlag) =>
    role === "faculty" && approverFlag === true ? "approver" : role;

// SQL that loads a user together with their approver flag and status (one query)
exports.USER_WITH_ROLE_SQL = `
    SELECT u."User_ID", u."First_Name", u."Last_Name", u."Email", u."Role",
           u."Account_Status", f."Approver"
    FROM users u
    LEFT JOIN faculty f ON f."User_ID" = u."User_ID"
    WHERE u."User_ID" = $1`;

// Explains a pending or declined account to the user. Shown only AFTER the
// correct password was entered, so it never reveals which emails exist.
// Returns { code, title, message } or null for an approved account.
exports.accountStatusNotice = (status, email, officeContact) => {
    if (status === "pending") {
        return {
            code: "ACCOUNT_PENDING",
            title: "Your account is waiting for approval",
            message: `An administrator still needs to approve ${email}. You'll be able to log in once it's approved. Questions? Contact the ${officeContact}.`,
        };
    }
    if (status === "declined") {
        return {
            code: "ACCOUNT_DECLINED",
            title: "Your account request was not approved",
            message: `Contact the ${officeContact} if you think this is a mistake.`,
        };
    }
    return null;
};
