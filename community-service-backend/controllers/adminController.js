const bcrypt = require("bcrypt");
const db = require("../config/db");
const { validatePassword } = require("../utils/passwordPolicy");
const { validateName, validateEmail } = require("../utils/validation");

// NOTE: The FIRST admin is created from the server with `npm run make-admin`
// (see community-service-backend/scripts/make-admin.js). There is intentionally
// no public HTTP endpoint for creating an admin without being logged in.

// List all admins
exports.getAdmins = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT "User_ID", "First_Name", "Last_Name", "Email" FROM users
             WHERE "Role" = 'admin' ORDER BY "Last_Name", "First_Name"`
        );

        return res.status(200).json({
            message: "Admins retrieved successfully.",
            admins: rows
        });
    } catch (error) {
        console.error("Get Admins Error:", error);
        return res.status(500).json({ message: "Server error retrieving admins." });
    }
};

// Create additional admins (ADMIN → ADMIN)
exports.createAdmin = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const inputError =
            validateName(firstName, "First name") ||
            validateName(lastName, "Last name") ||
            validateEmail(normalizedEmail) ||
            validatePassword(password);

        if (inputError) {
            return res.status(400).json({ message: inputError });
        }

        const { rows: existing } = await db.query(
            'SELECT "User_ID" FROM users WHERE "Email" = $1',
            [normalizedEmail]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }

        const hashed = await bcrypt.hash(password, 10);

        await db.query(
            `INSERT INTO users ("First_Name", "Last_Name", "Email", "Password_Hash", "Role")
             VALUES ($1, $2, $3, $4, 'admin')`,
            [firstName, lastName, normalizedEmail, hashed]
        );

        return res.status(201).json({ message: "Admin created successfully." });

    } catch (error) {
        console.error("Create Admin Error:", error);
        return res.status(500).json({ message: "Server error creating admin." });
    }
};

// Remove an admin account (used to hand off / revoke admin access).
// The last remaining admin can never be removed.
exports.removeAdmin = async (req, res) => {
    try {
        const targetId = Number(req.params.userId);

        const { rows: target } = await db.query(
            `SELECT "User_ID" FROM users WHERE "User_ID" = $1 AND "Role" = 'admin'`,
            [targetId]
        );

        if (target.length === 0) {
            return res.status(404).json({ message: "Admin not found." });
        }

        const { rows: [{ adminCount }] } = await db.query(
            `SELECT COUNT(*)::int AS "adminCount" FROM users WHERE "Role" = 'admin'`
        );

        if (adminCount <= 1) {
            return res.status(409).json({
                message: "You cannot remove the last admin. Add another admin first."
            });
        }

        await db.query(`DELETE FROM users WHERE "User_ID" = $1 AND "Role" = 'admin'`, [targetId]);

        return res.status(200).json({
            message: "Admin removed successfully.",
            removedSelf: targetId === req.user.userId
        });

    } catch (error) {
        console.error("Remove Admin Error:", error);
        return res.status(500).json({ message: "Server error removing admin." });
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT "User_ID", "First_Name", "Last_Name", "Email", "Role" FROM users
             ORDER BY "Role", "Last_Name"`
        );

        return res.status(200).json({
            message: "All users retrieved successfully.",
            users: rows
        });
    } catch (error) {
        console.error("Admin getAllUsers Error:", error);
        return res.status(500).json({ message: "Server error retrieving users." });
    }
};

// Get all opportunities (with faculty info)
exports.getAllOpportunities = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT
                o."Opportunity_ID",
                o."Title",
                o."Description",
                o."Date",
                o."Start_Time",
                o."End_Time",
                o."Duration",
                o."Location",
                o."Person_In_Charge",
                o."Approval_Status",
                o."Faculty_ID",
                o."Approver_ID",
                uf."First_Name" AS "Faculty_First_Name",
                uf."Last_Name" AS "Faculty_Last_Name",
                ua."First_Name" AS "Approver_First_Name",
                ua."Last_Name" AS "Approver_Last_Name"
             FROM opportunity o
             LEFT JOIN users uf ON o."Faculty_ID" = uf."User_ID"
             LEFT JOIN users ua ON o."Approver_ID" = ua."User_ID"
             ORDER BY o."Date" DESC, o."Start_Time" DESC`
        );

        return res.status(200).json({
            message: "All opportunities retrieved successfully.",
            opportunities: rows
        });
    } catch (error) {
        console.error("Admin getAllOpportunities Error:", error);
        return res.status(500).json({ message: "Server error retrieving opportunities." });
    }
};

// Get all communications (full log)
exports.getAllCommunications = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT
                c."Communication_ID",
                c."Opportunity_ID",
                o."Title" AS "Opportunity_Title",
                c."Faculty_ID",
                uf."First_Name" AS "Faculty_First_Name",
                uf."Last_Name" AS "Faculty_Last_Name",
                c."Message_Content",
                c."Timestamp"
             FROM communication c
             LEFT JOIN opportunity o ON c."Opportunity_ID" = o."Opportunity_ID"
             LEFT JOIN users uf ON c."Faculty_ID" = uf."User_ID"
             ORDER BY c."Timestamp" DESC`
        );

        return res.status(200).json({
            message: "All communications retrieved successfully.",
            communications: rows
        });
    } catch (error) {
        console.error("Admin getAllCommunications Error:", error);
        return res.status(500).json({ message: "Server error retrieving communications." });
    }
};

// Get all registrations (log of who registered for what)
exports.getAllRegistrations = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT
                r."Registration_ID",
                r."Student_ID",
                us."First_Name" AS "Student_First_Name",
                us."Last_Name" AS "Student_Last_Name",
                us."Email" AS "Student_Email",
                r."Opportunity_ID",
                o."Title" AS "Opportunity_Title",
                r."Registration_Status"
             FROM registration r
             LEFT JOIN users us ON r."Student_ID" = us."User_ID"
             LEFT JOIN opportunity o ON r."Opportunity_ID" = o."Opportunity_ID"
             ORDER BY r."Registration_ID" DESC`
        );

        return res.status(200).json({
            message: "All registrations retrieved successfully.",
            registrations: rows
        });
    } catch (error) {
        console.error("Admin getAllRegistrations Error:", error);
        return res.status(500).json({ message: "Server error retrieving registrations." });
    }
};

// Get all attendance records
exports.getAllAttendance = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT
                a."Attendance_ID",
                a."Student_ID",
                us."First_Name" AS "Student_First_Name",
                us."Last_Name" AS "Student_Last_Name",
                us."Email" AS "Student_Email",
                a."Opportunity_ID",
                o."Title" AS "Opportunity_Title",
                a."Attended",
                a."Hours_Earned"
             FROM attendance a
             LEFT JOIN users us ON a."Student_ID" = us."User_ID"
             LEFT JOIN opportunity o ON a."Opportunity_ID" = o."Opportunity_ID"
             ORDER BY a."Attendance_ID" DESC`
        );

        return res.status(200).json({
            message: "All attendance records retrieved successfully.",
            attendance: rows
        });
    } catch (error) {
        console.error("Admin getAllAttendance Error:", error);
        return res.status(500).json({ message: "Server error retrieving attendance." });
    }
};

// Promote/demote faculty to/from approver
exports.setFacultyApproverStatus = async (req, res) => {
    try {
        const facultyUserId = req.params.userId;
        const { approver } = req.body;  // true / false

        // Ensure faculty exists
        const { rows } = await db.query(
            'SELECT * FROM faculty WHERE "User_ID" = $1',
            [facultyUserId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Faculty not found." });
        }

        await db.query(
            'UPDATE faculty SET "Approver" = $1 WHERE "User_ID" = $2',
            [!!approver, facultyUserId]
        );

        return res.status(200).json({
            message: `Faculty approver status updated to ${approver ? "TRUE" : "FALSE"}.`
        });

    } catch (error) {
        console.error("Admin setFacultyApproverStatus Error:", error);
        return res.status(500).json({ message: "Server error updating approver status." });
    }
};

exports.adminApproveOpportunity = async (req, res) => {
    try {
        const opportunityId = req.params.id;

        // Ensure opportunity exists
        const { rows } = await db.query(
            'SELECT * FROM opportunity WHERE "Opportunity_ID" = $1',
            [opportunityId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Opportunity not found." });
        }

        // Admin approves
        await db.query(
            `UPDATE opportunity
             SET "Approval_Status" = 'Approved', "Approver_ID" = NULL
             WHERE "Opportunity_ID" = $1`,
            [opportunityId]
        );

        return res.status(200).json({ message: "Opportunity approved by admin." });

    } catch (error) {
        console.error("Admin Approve Opportunity Error:", error);
        return res.status(500).json({ message: "Server error approving opportunity." });
    }
};

exports.adminRejectOpportunity = async (req, res) => {
    try {
        const opportunityId = req.params.id;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: "Rejection reason required." });
        }

        const { rows } = await db.query(
            'SELECT * FROM opportunity WHERE "Opportunity_ID" = $1',
            [opportunityId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Opportunity not found." });
        }

        await db.query(
            `UPDATE opportunity
             SET "Approval_Status" = 'Rejected',
                 "Rejection_Reason" = $1
             WHERE "Opportunity_ID" = $2`,
            [reason, opportunityId]
        );

        return res.status(200).json({ message: "Opportunity rejected by admin." });

    } catch (error) {
        console.error("Admin Reject Opportunity Error:", error);
        return res.status(500).json({ message: "Server error rejecting opportunity." });
    }
};

exports.adminAssignApprover = async (req, res) => {
    try {
        const opportunityId = req.params.id;
        const { approverUserId } = req.body;

        // Ensure faculty exists
        const { rows: fac } = await db.query(
            'SELECT "Approver" FROM faculty WHERE "User_ID" = $1',
            [approverUserId]
        );

        if (fac.length === 0 || fac[0].Approver !== true) {
            return res.status(400).json({
                message: "Target user is not a valid approver."
            });
        }

        await db.query(
            'UPDATE opportunity SET "Approver_ID" = $1 WHERE "Opportunity_ID" = $2',
            [approverUserId, opportunityId]
        );

        return res.status(200).json({ message: "Approver assigned successfully." });

    } catch (error) {
        console.error("Admin Assign Approver Error:", error);
        return res.status(500).json({ message: "Server error assigning approver." });
    }
};

exports.adminAssignFaculty = async (req, res) => {
    try {
        const opportunityId = req.params.id;
        const { facultyUserId } = req.body;

        const { rows: fac } = await db.query(
            'SELECT * FROM faculty WHERE "User_ID" = $1',
            [facultyUserId]
        );

        if (fac.length === 0) {
            return res.status(404).json({ message: "Faculty not found." });
        }

        await db.query(
            'UPDATE opportunity SET "Faculty_ID" = $1 WHERE "Opportunity_ID" = $2',
            [facultyUserId, opportunityId]
        );

        return res.status(200).json({ message: "Opportunity assigned to new faculty member." });

    } catch (error) {
        console.error("Admin Assign Faculty Error:", error);
        return res.status(500).json({ message: "Server error assigning faculty." });
    }
};
