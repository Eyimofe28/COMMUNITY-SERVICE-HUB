const db = require("../config/db");

exports.postMessage = async (req, res) => {
    try {
        const facultyId = req.user.userId;
        const opportunityId = req.params.opportunityId;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Message content is required." });
        }

        // Ensure the faculty owns this opportunity
        const [opp] = await db.query(
            "SELECT * FROM Opportunity WHERE Opportunity_ID = ? AND Faculty_ID = ?",
            [opportunityId, facultyId]
        );

        if (opp.length === 0) {
            return res.status(403).json({
                message: "You do not have permission to post messages for this opportunity."
            });
        }

        // Insert message
        await db.query(
            `INSERT INTO Communication (Opportunity_ID, Faculty_ID, Message_Content)
             VALUES (?, ?, ?)`,
            [opportunityId, facultyId, message]
        );

        return res.status(201).json({
            message: "Message posted successfully."
        });

    } catch (error) {
        console.error("Post Message Error:", error);
        return res.status(500).json({ message: "Server error posting message." });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const opportunityId = req.params.opportunityId;

        // 1. Is this user the faculty who created the opportunity?
        const [ownerCheck] = await db.query(
            "SELECT * FROM Opportunity WHERE Opportunity_ID = ? AND Faculty_ID = ?",
            [opportunityId, userId]
        );

        const isOwner = ownerCheck.length > 0;

        // 2. Is this student registered?
        const [studentCheck] = await db.query(
            "SELECT * FROM Registration WHERE Opportunity_ID = ? AND Student_ID = ?",
            [opportunityId, userId]
        );

        const isRegisteredStudent = studentCheck.length > 0;

        // 3. Is the user an approver?
        const [approverCheck] = await db.query(
            "SELECT Approver FROM Faculty WHERE User_ID = ? AND Approver = TRUE",
            [userId]
        );

        const isApprover = approverCheck.length > 0;

        // ALLOW ACCESS ONLY IF ONE OF THESE IS TRUE:
        if (!isOwner && !isRegisteredStudent && !isApprover) {
            return res.status(403).json({
                message: "You do not have permission to view messages for this opportunity."
            });
        }

        // Fetch messages
        const [messages] = await db.query(
            `SELECT 
                c.Communication_ID,
                c.Message_Content,
                c.Timestamp,
                u.First_Name AS Faculty_First_Name,
                u.Last_Name AS Faculty_Last_Name
             FROM Communication c
             JOIN Users u ON c.Faculty_ID = u.User_ID
             WHERE c.Opportunity_ID = ?
             ORDER BY c.Timestamp ASC`,
            [opportunityId]
        );

        const normalized = messages.map(msg => ({
            message: msg.Message_Content,
            senderRole: "Faculty",
            timestamp: msg.Timestamp,
            senderName: `${msg.Faculty_First_Name} ${msg.Faculty_Last_Name}`
        }));

        return res.status(200).json({
            message: "Messages retrieved successfully.",
            messages: normalized
        });


    } catch (error) {
        console.error("Get Messages Error:", error);
        return res.status(500).json({ message: "Server error retrieving messages." });
    }
};
