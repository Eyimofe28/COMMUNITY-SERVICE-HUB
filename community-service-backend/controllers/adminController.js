const bcrypt = require("bcrypt");
const db = require("../config/db");

let bootstrapUsed = false; // prevents multiple uses

// Create the FIRST admin (no auth required ONCE)
exports.bootstrapAdmin = async (req, res) => {
    try {
        if (bootstrapUsed) {
            return res.status(403).json({ message: "Bootstrap already used." });
        }

        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const hashed = await bcrypt.hash(password, 10);

        const [user] = await db.query(
            "INSERT INTO Users (First_Name, Last_Name, Email, Password_Hash, Role) VALUES (?, ?, ?, ?, 'admin')",
            [firstName, lastName, email, hashed]
        );

        const userId = user.insertId;

        // You can create a future Admin table if needed, but not required now
        bootstrapUsed = true;

        return res.status(201).json({ message: "Master Admin created.", userId });

    } catch (error) {
        console.error("Bootstrap Admin Error:", error);
        return res.status(500).json({ message: "Server error creating admin." });
    }
};

// Create additional admins (ADMIN → ADMIN)
exports.createAdmin = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const hashed = await bcrypt.hash(password, 10);

        const [user] = await db.query(
            "INSERT INTO Users (First_Name, Last_Name, Email, Password_Hash, Role) VALUES (?, ?, ?, ?, 'admin')",
            [firstName, lastName, email, hashed]
        );

        return res.status(201).json({ message: "Admin created successfully." });

    } catch (error) {
        console.error("Create Admin Error:", error);
        return res.status(500).json({ message: "Server error creating admin." });
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT User_ID, First_Name, Last_Name, Email, Role FROM Users ORDER BY Role, Last_Name"
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
        const [rows] = await db.query(
            `SELECT 
                o.Opportunity_ID,
                o.Title,
                o.Description,
                o.Date,
                o.Start_Time,
                o.End_Time,
                o.Duration,
                o.Location,
                o.Person_In_Charge,
                o.Approval_Status,
                o.Faculty_ID,
                o.Approver_ID,
                uf.First_Name AS Faculty_First_Name,
                uf.Last_Name AS Faculty_Last_Name,
                ua.First_Name AS Approver_First_Name,
                ua.Last_Name AS Approver_Last_Name
             FROM Opportunity o
             LEFT JOIN Users uf ON o.Faculty_ID = uf.User_ID
             LEFT JOIN Users ua ON o.Approver_ID = ua.User_ID
             ORDER BY o.Date DESC, o.Start_Time DESC`
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
        const [rows] = await db.query(
            `SELECT 
                c.Communication_ID,
                c.Opportunity_ID,
                o.Title AS Opportunity_Title,
                c.Faculty_ID,
                uf.First_Name AS Faculty_First_Name,
                uf.Last_Name AS Faculty_Last_Name,
                c.Message_Content,
                c.Timestamp
             FROM Communication c
             LEFT JOIN Opportunity o ON c.Opportunity_ID = o.Opportunity_ID
             LEFT JOIN Users uf ON c.Faculty_ID = uf.User_ID
             ORDER BY c.Timestamp DESC`
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
        const [rows] = await db.query(
            `SELECT 
                r.Registration_ID,
                r.Student_ID,
                us.First_Name AS Student_First_Name,
                us.Last_Name AS Student_Last_Name,
                us.Email AS Student_Email,
                r.Opportunity_ID,
                o.Title AS Opportunity_Title,
                r.Registration_Status
             FROM Registration r
             LEFT JOIN Users us ON r.Student_ID = us.User_ID
             LEFT JOIN Opportunity o ON r.Opportunity_ID = o.Opportunity_ID
             ORDER BY r.Registration_ID DESC`
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
        const [rows] = await db.query(
            `SELECT 
                a.Attendance_ID,
                a.Student_ID,
                us.First_Name AS Student_First_Name,
                us.Last_Name AS Student_Last_Name,
                us.Email AS Student_Email,
                a.Opportunity_ID,
                o.Title AS Opportunity_Title,
                a.Attended,
                a.Hours_Earned
             FROM Attendance a
             LEFT JOIN Users us ON a.Student_ID = us.User_ID
             LEFT JOIN Opportunity o ON a.Opportunity_ID = o.Opportunity_ID
             ORDER BY a.Attendance_ID DESC`
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
        const [rows] = await db.query(
            "SELECT * FROM Faculty WHERE User_ID = ?",
            [facultyUserId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Faculty not found." });
        }

        await db.query(
            "UPDATE Faculty SET Approver = ? WHERE User_ID = ?",
            [approver ? 1 : 0, facultyUserId]
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
        const [rows] = await db.query(
            "SELECT * FROM Opportunity WHERE Opportunity_ID = ?",
            [opportunityId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Opportunity not found." });
        }

        // Admin approves
        await db.query(
            `UPDATE Opportunity 
             SET Approval_Status = 'Approved', Approver_ID = NULL 
             WHERE Opportunity_ID = ?`,
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

        const [rows] = await db.query(
            "SELECT * FROM Opportunity WHERE Opportunity_ID = ?",
            [opportunityId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Opportunity not found." });
        }

        await db.query(
            `UPDATE Opportunity 
             SET Approval_Status = 'Rejected',
                 Rejection_Reason = ?
             WHERE Opportunity_ID = ?`,
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
        const [fac] = await db.query(
            "SELECT Approver FROM Faculty WHERE User_ID = ?",
            [approverUserId]
        );

        if (fac.length === 0 || fac[0].Approver !== 1) {
            return res.status(400).json({
                message: "Target user is not a valid approver."
            });
        }

        await db.query(
            "UPDATE Opportunity SET Approver_ID = ? WHERE Opportunity_ID = ?",
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

        const [fac] = await db.query(
            "SELECT * FROM Faculty WHERE User_ID = ?",
            [facultyUserId]
        );

        if (fac.length === 0) {
            return res.status(404).json({ message: "Faculty not found." });
        }

        await db.query(
            "UPDATE Opportunity SET Faculty_ID = ? WHERE Opportunity_ID = ?",
            [facultyUserId, opportunityId]
        );

        return res.status(200).json({ message: "Opportunity assigned to new faculty member." });

    } catch (error) {
        console.error("Admin Assign Faculty Error:", error);
        return res.status(500).json({ message: "Server error assigning faculty." });
    }
};
