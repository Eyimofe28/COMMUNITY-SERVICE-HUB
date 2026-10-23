// =============================================================================
// Role checks (authorization) - run AFTER authMiddleware on protected routes
// -----------------------------------------------------------------------------
// Usage: router.post(path, auth, isStudent, handler)
//
// SECURITY: logging in proves WHO the user is; these checks decide WHAT they may
//   do. Each route lists the role it needs, and anyone else gets 403 Forbidden.
//   The role comes from the signed login token, so it cannot be edited by the user.
// REUSABILITY: small middleware functions reused across all route files.
// =============================================================================

const db = require("../config/db");

// STUDENT ONLY
exports.isStudent = (req, res, next) => {
    if (req.user.role !== "student") {
        return res.status(403).json({ message: "Access denied. Students only." });
    }
    // Allowed - continue to the route's handler
    next();
};

// FACULTY ONLY (admin is NOT faculty)
exports.isFaculty = (req, res, next) => {
    if (req.user.role !== "faculty") {
        return res.status(403).json({ message: "Access denied. Faculty only." });
    }
    next();
};

// ADMIN ONLY
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
};

// APPROVER ONLY (faculty with Approver = TRUE)
// Admin is allowed because admin supervises everything.
exports.isApprover = async (req, res, next) => {
    // allow admin
    if (req.user.role === "admin") return next();

    // allow approver
    if (req.user.role === "approver") return next();

    return res.status(403).json({
        message: "Access denied. Approver privilege required."
    });
};

// REGULAR FACULTY ONLY (faculty with Approver = FALSE)
// Used by POST /api/opportunity/create: only faculty who are NOT approvers may
// create opportunities, so nobody approves their own submission. Admins are
// blocked too. req.user.role is already read from the database by
// authMiddleware; the Approver flag is checked again here as a second safeguard.
exports.isRegularFaculty = async (req, res, next) => {

    // 1. Admin blocked from this route
    if (req.user.role === "admin") {
        return res.status(403).json({
            message: "Admins cannot perform this action."
        });
    }

    // 2. Must be faculty (approvers have the role "approver", so they stop here)
    if (req.user.role !== "faculty") {
        return res.status(403).json({ message: "Access denied. Faculty only." });
    }

    // 3. Confirm the faculty record exists and is not flagged as an approver
    const { rows } = await db.query(
        'SELECT "Approver" FROM faculty WHERE "User_ID" = $1',
        [req.user.userId]
    );

    if (rows.length === 0) {
        return res.status(403).json({ message: "Faculty record not found." });
    }

    if (rows[0].Approver === true) {
        return res.status(403).json({
            message: "Approvers cannot create opportunities."
        });
    }

    next();
};
