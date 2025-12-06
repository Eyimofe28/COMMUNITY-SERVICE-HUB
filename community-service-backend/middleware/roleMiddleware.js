const db = require("../config/db");

// STUDENT ONLY
exports.isStudent = (req, res, next) => {
    if (req.user.role !== "student") {
        return res.status(403).json({ message: "Access denied. Students only." });
    }
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
// Admin cannot create opportunities (important)
exports.isRegularFaculty = async (req, res, next) => {

    // Admin blocked from this route
    if (req.user.role === "admin") {
        return res.status(403).json({
            message: "Admins cannot perform this action."
        });
    }

    if (req.user.role !== "faculty") {
        return res.status(403).json({ message: "Access denied. Faculty only." });
    }

    const [rows] = await db.query(
        "SELECT Approver FROM Faculty WHERE User_ID = ?",
        [req.user.userId]
    );

    if (rows.length === 0) {
        return res.status(403).json({ message: "Faculty record not found." });
    }

    if (rows[0].Approver === 1) {
        return res.status(403).json({
            message: "Approvers cannot create opportunities."
        });
    }

    next();
};



// const db = require("../config/db");

// // STUDENT ONLY
// exports.isStudent = (req, res, next) => {
//     if (req.user.role !== "student") {
//         return res.status(403).json({ message: "Access denied. Students only." });
//     }
//     next();
// };

// // FACULTY ONLY (excluding admin)
// exports.isFaculty = (req, res, next) => {
//     if (req.user.role !== "faculty") {
//         return res.status(403).json({ message: "Access denied. Faculty only." });
//     }
//     next();
// };

// // ADMIN ONLY
// exports.isAdmin = (req, res, next) => {
//     if (req.user.role !== "admin") {
//         return res.status(403).json({ message: "Access denied. Admin only." });
//     }
//     next();
// };


// // APPROVER CHECK
// exports.isApprover = async (req, res, next) => {

//     // Admin is automatically an approver
//     if (req.user.role === "admin") {
//         return next();
//     }

//     // Must be faculty for further checks
//     if (req.user.role !== "faculty") {
//         return res.status(403).json({ message: "Access denied. Faculty only." });
//     }

//     const [rows] = await db.query(
//         "SELECT Approver FROM Faculty WHERE User_ID = ?",
//         [req.user.userId]
//     );

//     if (rows.length === 0 || rows[0].Approver !== 1) {
//         return res.status(403).json({ message: "Access denied. Approver privilege required." });
//     }

//     next();
// };


// // REGULAR FACULTY ONLY (NOT approver)
// exports.isRegularFaculty = async (req, res, next) => {

//     // Admin is not treated as a faculty creator
//     if (req.user.role === "admin") {
//         return res.status(403).json({ message: "Admins cannot create opportunities." });
//     }

//     // Must be faculty
//     if (req.user.role !== "faculty") {
//         return res.status(403).json({ message: "Access denied. Faculty only." });
//     }

//     const [rows] = await db.query(
//         "SELECT Approver FROM Faculty WHERE User_ID = ?",
//         [req.user.userId]
//     );

//     if (rows.length === 0) {
//         return res.status(403).json({ message: "Faculty record not found." });
//     }

//     if (rows[0].Approver === 1) {
//         return res.status(403).json({
//             message: "Approvers cannot create opportunities."
//         });
//     }

//     next();
// };
