const db = require("../config/db");
const {
    nowOnCampus,
    durationHours,
    hasStarted,
    attendanceWindow,
    validateOpportunitySchedule,
} = require("../utils/dates");

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
    const opportunityId = parseId(req.params.id);
    const approverId = req.user.userId;
    const { status, rejectionReason } = req.body;

    try {
        if (!opportunityId) {
            return res.status(400).json({ message: "Invalid opportunity." });
        }

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

        // 4. Decisions are final: only Pending opportunities can be approved/rejected
        if (opportunity.Approval_Status !== "Pending") {
            return res.status(409).json({
                message: `This opportunity has already been ${opportunity.Approval_Status.toLowerCase()}.`
            });
        }

        // 5. An event that has already started can no longer be approved
        //    (rejecting it is still allowed, to clear it from the queue)
        if (status === "Approved" && hasStarted(opportunity.Date, opportunity.Start_Time)) {
            return res.status(400).json({
                message: "This opportunity's start time has passed, so it can no longer be approved. You can reject it instead."
            });
        }

        // 6. If rejecting, require rejectionReason
        if (status === "Rejected" && (typeof rejectionReason !== "string" || rejectionReason.trim() === "")) {
            return res.status(400).json({
                message: "Rejection reason is required when rejecting."
            });
        }

        // 7. Approve or reject. "AND Approval_Status = 'Pending'" makes this safe if
        //    two approvers act at the same moment - only the first one counts.
        const result = await db.query(
            `UPDATE opportunity
             SET "Approval_Status" = $1, "Rejection_Reason" = $2, "Approver_ID" = $3
             WHERE "Opportunity_ID" = $4 AND "Approval_Status" = 'Pending'`,
            [
                status,
                status === "Rejected" ? rejectionReason.trim() : null,
                approverId,
                opportunityId
            ]
        );

        if (result.rowCount === 0) {
            return res.status(409).json({ message: "This opportunity was just decided by someone else." });
        }

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
        const now = nowOnCampus();

        const { rows: opportunities } = await db.query(
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
                "Faculty_ID"
             FROM opportunity
             WHERE "Approval_Status" = 'Approved'
               -- Only events that have not started yet (campus date/time):
               -- registration closes when an event starts
               AND ("Date" > $1 OR ("Date" = $1 AND "Start_Time" > $2))
             ORDER BY "Date" ASC, "Start_Time" ASC`,
            [now.date, now.time]
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

// Reads "/:id" route parameters safely: a positive whole number, or null
const parseId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// -----------------------------------------------------------------------------
// POST /api/opportunity/register/:id  -  student signs up for an opportunity
// Rules: the opportunity must be approved and must not have started yet
// (registration closes at the event's start time, campus time).
// -----------------------------------------------------------------------------
exports.registerForOpportunity = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const opportunityId = parseId(req.params.id);
        if (!opportunityId) {
            return res.status(400).json({ message: "Invalid opportunity." });
        }

        // Check if opportunity exists and is approved
        const { rows: opp } = await db.query(
            'SELECT "Approval_Status", "Date", "Start_Time" FROM opportunity WHERE "Opportunity_ID" = $1',
            [opportunityId]
        );

        if (opp.length === 0) {
            return res.status(404).json({ message: "Opportunity not found." });
        }

        if (opp[0].Approval_Status !== "Approved") {
            return res.status(400).json({ message: "You can only register for approved opportunities." });
        }

        if (hasStarted(opp[0].Date, opp[0].Start_Time)) {
            return res.status(400).json({ message: "Registration is closed - this opportunity has already started." });
        }

        // Insert registration. The UNIQUE (Student_ID, Opportunity_ID) constraint
        // makes a duplicate impossible; ON CONFLICT turns it into "no row inserted".
        const result = await db.query(
            `INSERT INTO registration ("Student_ID", "Opportunity_ID", "Registration_Status")
             VALUES ($1, $2, 'Registered')
             ON CONFLICT ("Student_ID", "Opportunity_ID") DO NOTHING`,
            [studentId, opportunityId]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ message: "You are already registered for this opportunity." });
        }

        return res.status(201).json({
            message: "Successfully registered for the opportunity."
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Server error during registration." });
    }
};

// -----------------------------------------------------------------------------
// DELETE /api/opportunity/unregister/:id  -  student cancels a registration
// Rules: only before the event starts, and never once attendance is recorded
// (otherwise hours could be left behind without a registration).
// -----------------------------------------------------------------------------
exports.unregisterFromOpportunity = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const opportunityId = parseId(req.params.id);
        if (!opportunityId) {
            return res.status(400).json({ message: "Invalid opportunity." });
        }

        // Registration + the event's timing + any attendance record, in one query
        const { rows } = await db.query(
            `SELECT o."Date", o."Start_Time", a."Attendance_ID"
             FROM registration r
             JOIN opportunity o ON o."Opportunity_ID" = r."Opportunity_ID"
             LEFT JOIN attendance a
                ON a."Student_ID" = r."Student_ID" AND a."Opportunity_ID" = r."Opportunity_ID"
             WHERE r."Student_ID" = $1 AND r."Opportunity_ID" = $2`,
            [studentId, opportunityId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "You are not registered for this opportunity." });
        }

        if (rows[0].Attendance_ID) {
            return res.status(400).json({ message: "Attendance has already been recorded, so you can no longer unregister." });
        }

        if (hasStarted(rows[0].Date, rows[0].Start_Time)) {
            return res.status(400).json({ message: "This opportunity has already started, so you can no longer unregister." });
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

// -----------------------------------------------------------------------------
// GET /api/opportunity/:id/registrations  -  faculty: registered students
// Also returns the attendance window, so the page can say whether attendance
// can be submitted/corrected right now and until when.
// -----------------------------------------------------------------------------
exports.getRegistrations = async (req, res) => {
    try {
        const opportunityId = parseId(req.params.id);
        const facultyId = req.user.userId;
        if (!opportunityId) {
            return res.status(400).json({ message: "Invalid opportunity." });
        }

        // Ensure faculty owns the opportunity
        const { rows: opp } = await db.query(
            `SELECT "Approval_Status", "Date", "Start_Time", "Duration"
             FROM opportunity WHERE "Opportunity_ID" = $1 AND "Faculty_ID" = $2`,
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
            WHERE r."Opportunity_ID" = $1
            ORDER BY u."Last_Name", u."First_Name"`,
            [opportunityId]
        );

        return res.status(200).json({
            message: "Registered students retrieved.",
            students: registrations,
            maxHours: Number(opp[0].Duration),
            attendanceWindow: attendanceWindow(opp[0].Date, opp[0].Start_Time),
        });

    } catch (error) {
        console.error("Get Registrations Error:", error);
        return res.status(500).json({ message: "Server error while retrieving registrations." });
    }
};

// -----------------------------------------------------------------------------
// POST /api/opportunity/:id/attendance  -  faculty submits or corrects attendance
// Body: { attendance: [{ studentId, attended, hoursEarned }, ...] }
//
// INPUT VALIDATION: every entry is checked before anything is saved - each
//   student must be registered for THIS opportunity (listed once), attended
//   must be true/false, and hours must be 0.5-step values from 0.5 up to the
//   opportunity's duration (absent = 0 hours).
// RULES: approved opportunities only; from the event's start time until 14
//   days after its date (corrections allowed in that window).
// DATABASE INTERACTION: one transaction - every row is saved or none is.
//   Each student's Service_Hours_Total is RECALCULATED from their attendance
//   records (not added to), so submitting again or correcting can never
//   double-count hours.
// -----------------------------------------------------------------------------
exports.submitAttendance = async (req, res) => {
    const opportunityId = parseId(req.params.id);
    const facultyId = req.user.userId;
    const { attendance } = req.body;

    let client;
    try {
        if (!opportunityId) {
            return res.status(400).json({ message: "Invalid opportunity." });
        }

        if (!Array.isArray(attendance) || attendance.length === 0) {
            return res.status(400).json({ message: "Attendance must list at least one student." });
        }

        // Verify faculty owns opportunity
        const { rows: opp } = await db.query(
            `SELECT "Approval_Status", "Date", "Start_Time", "Duration"
             FROM opportunity WHERE "Opportunity_ID" = $1 AND "Faculty_ID" = $2`,
            [opportunityId, facultyId]
        );

        if (opp.length === 0) {
            return res.status(403).json({
                message: "You do not have permission to submit attendance for this opportunity."
            });
        }

        if (opp[0].Approval_Status !== "Approved") {
            return res.status(400).json({ message: "Attendance can only be recorded for approved opportunities." });
        }

        const window = attendanceWindow(opp[0].Date, opp[0].Start_Time);
        if (!window.open) {
            return res.status(400).json({ message: window.reason });
        }

        // Students registered for this opportunity
        const { rows: regs } = await db.query(
            'SELECT "Student_ID" FROM registration WHERE "Opportunity_ID" = $1',
            [opportunityId]
        );
        const registered = new Set(regs.map((r) => r.Student_ID));
        const maxHours = Number(opp[0].Duration);

        // Validate every entry before saving anything
        const seen = new Set();
        const entries = [];
        for (const entry of attendance) {
            const studentId = Number(entry?.studentId);
            const attended = entry?.attended;
            const hours = Number(entry?.hoursEarned);

            if (!registered.has(studentId)) {
                return res.status(400).json({ message: "Attendance can only be recorded for students registered for this opportunity." });
            }
            if (seen.has(studentId)) {
                return res.status(400).json({ message: "Each student can only be listed once." });
            }
            seen.add(studentId);

            if (typeof attended !== "boolean") {
                return res.status(400).json({ message: "Each student must be marked as attended or absent." });
            }

            if (attended && (!Number.isFinite(hours) || hours < 0.5 || hours > maxHours || !Number.isInteger(hours * 2))) {
                return res.status(400).json({
                    message: `Hours earned must be between 0.5 and ${maxHours}, in half-hour steps.`
                });
            }

            entries.push({ studentId, attended, hours: attended ? hours : 0 });
        }

        // Save everything in ONE transaction
        client = await db.connect();
        await client.query("BEGIN");

        for (const { studentId, attended, hours } of entries) {
            await client.query(
                `INSERT INTO attendance ("Student_ID", "Opportunity_ID", "Attended", "Hours_Earned")
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT ("Student_ID", "Opportunity_ID")
                 DO UPDATE SET "Attended" = EXCLUDED."Attended", "Hours_Earned" = EXCLUDED."Hours_Earned"`,
                [studentId, opportunityId, attended, hours]
            );
        }

        // Recalculate each affected student's total from ALL their attendance
        // records - never "+= hours" - so re-submitting cannot double-count.
        await client.query(
            `UPDATE student s
             SET "Service_Hours_Total" = COALESCE((
                 SELECT SUM(a."Hours_Earned") FROM attendance a
                 WHERE a."Student_ID" = s."User_ID" AND a."Attended"
             ), 0)
             WHERE s."User_ID" = ANY($1::int[])`,
            [entries.map((e) => e.studentId)]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Attendance saved successfully.",
            attendanceWindow: window,
        });

    } catch (error) {
        if (client) await client.query("ROLLBACK").catch(() => {});
        console.error("Submit Attendance Error:", error);
        return res.status(500).json({ message: "Server error while saving attendance. Nothing was saved." });
    } finally {
        if (client) client.release();
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
