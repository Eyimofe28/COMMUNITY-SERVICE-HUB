const db = require("../config/db");

exports.postMessage = async (req, res) => {
    try {
        const facultyId = req.user.userId;
        const opportunityId = req.params.opportunityId;
        const { message } = req.body;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ message: "Message content is required." });
        }

        if (!/^\d+$/.test(String(opportunityId))) {
            return res.status(400).json({ message: "Invalid opportunity." });
        }

        // Ensure the faculty owns this opportunity
        const { rows: opp } = await db.query(
            'SELECT "Approval_Status" FROM opportunity WHERE "Opportunity_ID" = $1 AND "Faculty_ID" = $2',
            [opportunityId, facultyId]
        );

        if (opp.length === 0) {
            return res.status(403).json({
                message: "You do not have permission to post messages for this opportunity."
            });
        }

        // Announcements only go out for approved opportunities
        if (opp[0].Approval_Status !== "Approved") {
            return res.status(400).json({
                message: "You can post announcements once this opportunity is approved."
            });
        }

        // Insert message
        await db.query(
            `INSERT INTO communication ("Opportunity_ID", "Faculty_ID", "Message_Content")
             VALUES ($1, $2, $3)`,
            [opportunityId, facultyId, message.trim()]
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
        const opportunityId = req.params.opportunityId;

        if (!/^d+$/.test(String(opportunityId))) {
            return res.status(400).json({ message: "Invalid opportunity." });
        }

        // 1. Is this user the faculty who created the opportunity?
        const { rows: ownerCheck } = await db.query(
            'SELECT * FROM opportunity WHERE "Opportunity_ID" = $1 AND "Faculty_ID" = $2',
            [opportunityId, userId]
        );

        const isOwner = ownerCheck.length > 0;

        // 2. Is this student registered?
        const { rows: studentCheck } = await db.query(
            'SELECT * FROM registration WHERE "Opportunity_ID" = $1 AND "Student_ID" = $2',
            [opportunityId, userId]
        );

        const isRegisteredStudent = studentCheck.length > 0;

        // 3. Is the user an approver?
        const { rows: approverCheck } = await db.query(
            'SELECT "Approver" FROM faculty WHERE "User_ID" = $1 AND "Approver" = TRUE',
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
        const { rows: messages } = await db.query(
            `SELECT
                c."Communication_ID",
                c."Message_Content",
                c."Timestamp",
                u."First_Name" AS "Faculty_First_Name",
                u."Last_Name" AS "Faculty_Last_Name"
             FROM communication c
             JOIN users u ON c."Faculty_ID" = u."User_ID"
             WHERE c."Opportunity_ID" = $1
             ORDER BY c."Timestamp" ASC`,
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
