const db = require("../config/db");
const { todayOnCampus, durationHours, validateOpportunitySchedule } = require("../utils/dates");

// Create Opportunity (Faculty Only)
exports.createOpportunity = async (req, res) => {
  const {
    title,
    description,
    date,
    startTime,
    endTime,
    location,
  } = req.body;

  try {
    // Validate required fields
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({
        message:
          "Missing required fields: Title, Date, Start Time, End Time.",
      });
    }

    // Date must be tomorrow .. 1 year ahead (campus time); times in 30-minute
    // steps between 6 AM and 10 PM, lasting 30 min - 12 hrs (see utils/dates.js)
    const scheduleError = validateOpportunitySchedule({ date, startTime, endTime });
    if (scheduleError) {
      return res.status(400).json({ message: scheduleError });
    }

    // This is the userId from your JWT (faculty is a subtype of users)
    const facultyUserId = req.user.userId;

    // 🔎 Fetch faculty name from users table
    const { rows: facultyRows } = await db.query(
      'SELECT "First_Name", "Last_Name" FROM users WHERE "User_ID" = $1',
      [facultyUserId]
    );

    const facultyRow = facultyRows[0];
    const facultyName = facultyRow
      ? `${facultyRow.First_Name || ""} ${facultyRow.Last_Name || ""}`.trim()
      : "Unknown";

    // Insert into opportunity
    const { rows: inserted } = await db.query(
      `INSERT INTO opportunity (
          "Faculty_ID",
          "Title",
          "Description",
          "Date",
          "Start_Time",
          "End_Time",
          "Duration",
          "Location",
          "Person_In_Charge",
          "Approval_Status",
          "Approver_ID"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending', NULL)
        RETURNING "Opportunity_ID"`,
      [
        facultyUserId,          // Faculty_ID (same as the faculty member's User_ID)
        title,
        description || null,
        date,
        startTime,
        endTime,
        durationHours(startTime, endTime), // Duration is calculated, never taken from the user
        location || null,
        facultyName,            // ✅ actual full name from users table
      ]
    );

    return res.status(201).json({
      message:
        "Opportunity created successfully and is now pending approval.",
      opportunityId: inserted[0].Opportunity_ID,
    });
  } catch (error) {
    console.error("Create Opportunity Error:", error);
    return res
      .status(500)
      .json({ message: "Server error while creating opportunity." });
  }
};

exports.approveOpportunity = async (req, res) => {
    const opportunityId = req.params.id;
    const approverId = req.user.userId;
    const { status, rejectionReason } = req.body;

    try {
        // 1. Validate input
        if (!status || !["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                message: "Status must be either 'Approved' or 'Rejected'."
            });
        }

        // 2. Get the opportunity
        const { rows: opps } = await db.query(
            'SELECT * FROM opportunity WHERE "Opportunity_ID" = $1',
            [opportunityId]
        );

        if (opps.length === 0) {
            return res.status(404).json({ message: "Opportunity not found." });
        }

        const opportunity = opps[0];

        // 3. Prevent approver from approving their own submission
        if (opportunity.Faculty_ID === approverId) {
            return res.status(403).json({
                message: "You cannot approve or reject an opportunity you created."
            });
        }

        // 4. If rejecting, require rejectionReason
        if (status === "Rejected" && (!rejectionReason || rejectionReason.trim() === "")) {
            return res.status(400).json({
                message: "Rejection reason is required when rejecting."
            });
        }

        // 5. Approve or reject
        await db.query(
            `UPDATE opportunity
             SET "Approval_Status" = $1, "Rejection_Reason" = $2, "Approver_ID" = $3
             WHERE "Opportunity_ID" = $4`,
            [
                status,
                status === "Rejected" ? rejectionReason : null,
                approverId,
                opportunityId
            ]
        );

        return res.status(200).json({
            message: `Opportunity successfully ${status.toLowerCase()}.`
        });

    } catch (error) {
        console.error("Approve Opportunity Error:", error);
        return res.status(500).json({ message: "Server error while updating opportunity." });
    }
};

exports.listApproved = async (req, res) => {
    try {
        const { rows: opportunities } = await db.query(
            `SELECT
                "Opportunity_ID",
                "Title",
                "Description",
                "Date",
                "Start_Time",
                "End_Time",
                "Duration",
                "Person_In_Charge",
                "Approval_Status",
                "Faculty_ID"
             FROM opportunity
             WHERE "Approval_Status" = 'Approved'
               AND "Date" >= $1               -- ⬅️ Only show today or future (campus date)
               AND "Opportunity_ID" NOT IN (
                   SELECT DISTINCT "Opportunity_ID"
                   FROM attendance              -- ⬅️ Exclude completed
               )
             ORDER BY "Date" ASC, "Start_Time" ASC`,
            [todayOnCampus()]
        );

        return res.status(200).json({
            message: "Approved opportunities retrieved successfully.",
            opportunities
        });

    } catch (error) {
        console.error("List Approved Error:", error);
        return res.status(500).json({
            message: "Server error while listing approved opportunities."
        });
    }
};

exports.listApprovedByApprover = async (req, res) => {
    try {
        const approverId = req.user.userId;

        const { rows: approved } = await db.query(
            `SELECT
                "Opportunity_ID",
                "Faculty_ID",
                "Title",
                "Description",
                "Date",
                "Start_Time",
                "End_Time",
                "Duration",
                "Location",
                "Person_In_Charge",
                "Approval_Status",
                "Approver_ID"
             FROM opportunity
             WHERE "Approval_Status" = 'Approved'
               AND "Approver_ID" = $1
             ORDER BY "Date" DESC, "Start_Time" DESC`,
            [approverId]
        );

        return res.status(200).json({
            message: "Approved opportunities retrieved successfully.",
            approved
        });

    } catch (error) {
        console.error("List Approved By Approver Error:", error);
        return res.status(500).json({
            message: "Server error while listing approved opportunities."
        });
    }
};

exports.listRejectedByMe = async (req, res) => {
  try {
    const approverId = req.user.userId;

    const { rows } = await db.query(
      `SELECT
          "Opportunity_ID",
          "Title",
          "Description",
          "Date",
          "Start_Time",
          "End_Time",
          "Duration",
          "Location",
          "Person_In_Charge",
          "Approval_Status",
          "Rejection_Reason"
        FROM opportunity
        WHERE "Approval_Status" = 'Rejected' AND "Approver_ID" = $1
        ORDER BY "Date" DESC`,
      [approverId]
    );

    return res.status(200).json({
      message: "Rejected opportunities retrieved.",
      rejected: rows
    });

  } catch (error) {
    console.error("List Rejected Error:", error);
    return res.status(500).json({ message: "Server error while listing rejected." });
  }
};

exports.listPending = async (req, res) => {
    try {
        const { rows: pending } = await db.query(
            `SELECT
                "Opportunity_ID",
                "Faculty_ID",
                "Title",
                "Description",
                "Date",
                "Start_Time",
                "End_Time",
                "Duration",
                "Location",
                "Person_In_Charge",
                "Approval_Status"
            FROM opportunity
            WHERE "Approval_Status" = 'Pending'
            ORDER BY "Date" ASC, "Start_Time" ASC`
        );

        return res.status(200).json({
            message: "Pending opportunities retrieved successfully.",
            pending
        });

    } catch (error) {
        console.error("List Pending Error:", error);
        return res.status(500).json({
            message: "Server error while listing pending opportunities."
        });
    }
};

exports.listMySubmissions = async (req, res) => {
    try {
        const facultyId = req.user.userId;

        const { rows } = await db.query(
            `SELECT
                "Opportunity_ID",
                "Title",
                "Description",
                "Date",
                "Start_Time",
                "End_Time",
                "Duration",
                "Location",
                "Person_In_Charge",
                "Approval_Status",
                "Approver_ID",
                "Rejection_Reason"
            FROM opportunity
            WHERE "Faculty_ID" = $1
            ORDER BY "Date" DESC, "Start_Time" DESC`,
            [facultyId]
        );
        return res.status(200).json({
            message: "Your submitted opportunities retrieved successfully.",
            submissions: rows
        });

    } catch (error) {
        console.error("List My Submissions Error:", error);
        return res.status(500).json({ message: "Server error while fetching submissions." });
    }
};

exports.registerForOpportunity = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const opportunityId = req.params.id;

        // Check if opportunity exists and is approved
        const { rows: opp } = await db.query(
            'SELECT * FROM opportunity WHERE "Opportunity_ID" = $1',
            [opportunityId]
        );

        if (opp.length === 0) {
            return res.status(404).json({ message: "Opportunity not found." });
        }

        if (opp[0].Approval_Status !== "Approved") {
            return res.status(400).json({ message: "You can only register for approved opportunities." });
        }

        // Prevent duplicate registration
        const { rows: existing } = await db.query(
            'SELECT * FROM registration WHERE "Student_ID" = $1 AND "Opportunity_ID" = $2',
            [studentId, opportunityId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "You are already registered for this opportunity." });
        }

        // Insert registration
        await db.query(
            `INSERT INTO registration ("Student_ID", "Opportunity_ID", "Registration_Status")
             VALUES ($1, $2, 'Registered')`,
            [studentId, opportunityId]
        );

        return res.status(201).json({
            message: "Successfully registered for the opportunity."
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Server error during registration." });
    }
};

exports.unregisterFromOpportunity = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const opportunityId = req.params.id;

        // Check registration
        const { rows: reg } = await db.query(
            'SELECT * FROM registration WHERE "Student_ID" = $1 AND "Opportunity_ID" = $2',
            [studentId, opportunityId]
        );

        if (reg.length === 0) {
            return res.status(404).json({ message: "You are not registered for this opportunity." });
        }

        // Unregister
        await db.query(
            'DELETE FROM registration WHERE "Student_ID" = $1 AND "Opportunity_ID" = $2',
            [studentId, opportunityId]
        );

        return res.status(200).json({
            message: "Successfully unregistered from the opportunity."
        });

    } catch (error) {
        console.error("Unregister Error:", error);
        return res.status(500).json({ message: "Server error during unregistration." });
    }
};

exports.getRegistrations = async (req, res) => {
    try {
        const opportunityId = req.params.id;
        const facultyId = req.user.userId;

        // Ensure faculty owns the opportunity
        const { rows: opp } = await db.query(
            'SELECT * FROM opportunity WHERE "Opportunity_ID" = $1 AND "Faculty_ID" = $2',
            [opportunityId, facultyId]
        );

        if (opp.length === 0) {
            return res.status(403).json({
                message: "You do not have permission to view registrations for this opportunity."
            });
        }

        // Get all registered students
        const { rows: registrations } = await db.query(
            `SELECT
                r."Student_ID",
                u."First_Name",
                u."Last_Name",
                u."Email",
                a."Attended",
                a."Hours_Earned"
            FROM registration r
            JOIN users u ON r."Student_ID" = u."User_ID"
            LEFT JOIN attendance a
                ON a."Student_ID" = r."Student_ID"
            AND a."Opportunity_ID" = r."Opportunity_ID"
            WHERE r."Opportunity_ID" = $1`,
            [opportunityId]
        );

        return res.status(200).json({
            message: "Registered students retrieved.",
            students: registrations
        });

    } catch (error) {
        console.error("Get Registrations Error:", error);
        return res.status(500).json({ message: "Server error while retrieving registrations." });
    }
};

exports.submitAttendance = async (req, res) => {
    try {
        const opportunityId = req.params.id;
        const facultyId = req.user.userId;
        const { attendance } = req.body;
        // [{ studentId, attended, hoursEarned }]

        // Verify faculty owns opportunity
        const { rows: opp } = await db.query(
            'SELECT * FROM opportunity WHERE "Opportunity_ID" = $1 AND "Faculty_ID" = $2',
            [opportunityId, facultyId]
        );

        if (opp.length === 0) {
            return res.status(403).json({
                message: "You do not have permission to submit attendance for this opportunity."
            });
        }

        for (const entry of attendance) {
            const { studentId, attended, hoursEarned } = entry;

            // Insert/update attendance table
            await db.query(
                `INSERT INTO attendance ("Student_ID", "Opportunity_ID", "Attended", "Hours_Earned")
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT ("Student_ID", "Opportunity_ID")
                 DO UPDATE SET "Attended" = EXCLUDED."Attended", "Hours_Earned" = EXCLUDED."Hours_Earned"`,
                [studentId, opportunityId, !!attended, hoursEarned || 0]
            );

            // If attended, update student's total hours
            if (attended) {
                await db.query(
                    `UPDATE student
                     SET "Service_Hours_Total" = "Service_Hours_Total" + $1
                     WHERE "User_ID" = $2`,
                    [hoursEarned || 0, studentId]
                );
            }
        }

        return res.status(200).json({
            message: "Attendance submitted successfully."
        });

    } catch (error) {
        console.error("Submit Attendance Error:", error);
        return res.status(500).json({ message: "Server error while submitting attendance." });
    }
};

exports.listMyRegistrations = async (req, res) => {
    try {
        const studentId = req.user.userId;

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
                r."Registration_Status",
                a."Attended",
                a."Hours_Earned"
            FROM registration r
            JOIN opportunity o ON r."Opportunity_ID" = o."Opportunity_ID"
            LEFT JOIN attendance a
                ON r."Student_ID" = a."Student_ID"
                AND r."Opportunity_ID" = a."Opportunity_ID"
            WHERE r."Student_ID" = $1
            ORDER BY o."Date" ASC, o."Start_Time" ASC`,
            [studentId]
        );

        return res.status(200).json({
            message: "Your registered opportunities retrieved successfully.",
            opportunities: rows
        });

    } catch (error) {
        console.error("List My Registrations Error:", error);
        return res.status(500).json({ message: "Server error while retrieving your registrations." });
    }
};
