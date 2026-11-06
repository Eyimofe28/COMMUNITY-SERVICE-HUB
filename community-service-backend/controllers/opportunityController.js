// =============================================================================
// Opportunity controller - creating, approving, registering for and recording
// attendance on community service opportunities
// -----------------------------------------------------------------------------
// Routes: routes/opportunityRoutes.js (each runs auth + a role check first, so
// req.user = { userId, role, info } is always set here).
// Dates are "YYYY-MM-DD" text and times "HH:MM[:SS]"; all date/time rules are
// in utils/dates.js and use the campus time zone.
// =============================================================================

const db = require("../config/db");
const {
    nowOnCampus,
    durationHours,
    hasStarted,
    attendanceWindow,
    validateOpportunitySchedule,
} = require("../utils/dates");
const { validateOpportunityDetails, normalizeCapacity } = require("../utils/validation");

// -----------------------------------------------------------------------------
// POST /api/opportunity/create  -  faculty creates an opportunity
// Body: { title, description?, location, date, startTime, endTime, capacity? }
// Result: 201 { opportunityId } - saved as "Pending" with no approver yet.
//
// Steps: 1. details (title, location, description, capacity)  2. date/time rules
//        3. look up the faculty name  4. insert (duration is calculated here,
//        never taken from the request)
// -----------------------------------------------------------------------------
exports.createOpportunity = async (req, res) => {
  // Values sent by the Create Opportunity form
  const { title, description, date, startTime, endTime, location, capacity } = req.body;

  try {
    // 1. Details: title, location, description, capacity (utils/validation.js)
    const detailsError = validateOpportunityDetails({ title, location, description, capacity });
    if (detailsError) {
      return res.status(400).json({ message: detailsError });
    }

    // 2. Date must be tomorrow .. 1 year ahead (campus time); times in 30-minute
    //    steps between 6 AM and 10 PM, lasting 30 min - 12 hrs (see utils/dates.js).
    //    scheduleError is a message for the user, or null when everything is valid.
    const scheduleError = validateOpportunitySchedule({ date, startTime, endTime });
    if (scheduleError) {
      return res.status(400).json({ message: scheduleError });
    }

    // The logged-in faculty member (set by authMiddleware). A faculty member's
    // User_ID is also their faculty ID, so it is stored as Faculty_ID.
    const facultyUserId = req.user.userId;

    // 3. Look up their full name - stored as Person_In_Charge so students and
    //    approvers see who runs the event without another lookup
    const { rows: facultyRows } = await db.query(
      'SELECT "First_Name", "Last_Name" FROM users WHERE "User_ID" = $1',
      [facultyUserId]
    );

    const facultyRow = facultyRows[0];
    const facultyName = facultyRow
      ? `${facultyRow.First_Name || ""} ${facultyRow.Last_Name || ""}`.trim()
      : "Unknown";

    // 4. Save it. Status starts as "Pending" with no Approver_ID; RETURNING
    //    gives back the new row's ID for the response.
    const { rows: inserted } = await db.query(
      `INSERT INTO opportunity (
          "Faculty_ID", "Title", "Description", "Date", "Start_Time", "End_Time",
          "Duration", "Location", "Person_In_Charge", "Capacity", "Approval_Status", "Approver_ID"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', NULL)
        RETURNING "Opportunity_ID"`,
      [
        facultyUserId,                      // Faculty_ID (same as the faculty member's User_ID)
        title.trim(),
        description ? description.trim() : null,
        date,
        startTime,
        endTime,
        durationHours(startTime, endTime),  // Duration is calculated, never taken from the user
        location.trim(),
        facultyName,                        // Person_In_Charge: full name from the users table
        normalizeCapacity(capacity),        // Max students, or NULL for no limit
      ]
    );

    return res.status(201).json({
      message: "Opportunity created successfully and is now pending approval.",
      opportunityId: inserted[0].Opportunity_ID,
    });
  } catch (error) {
    // Unexpected problem (e.g. database unreachable): logged on the server,
    // generic message to the user
    console.error("Create Opportunity Error:", error);
    return res.status(500).json({ message: "Server error while creating opportunity." });
  }
};

// Loads an opportunity the logged-in user OWNS (Faculty_ID = their User_ID).
// Returns the row, or null if it does not exist or belongs to someone else.
async function loadOwnOpportunity(opportunityId, userId) {
  const { rows } = await db.query(
    `SELECT "Opportunity_ID", "Title", "Approval_Status", "Date", "Start_Time"
     FROM opportunity WHERE "Opportunity_ID" = $1 AND "Faculty_ID" = $2`,
    [opportunityId, userId]
  );
  return rows[0] || null;
}

// -----------------------------------------------------------------------------
// PUT /api/opportunity/:id  -  edit a Pending opportunity, or edit and RESUBMIT
// a Rejected one (F1 / F2). Same body and rules as create.
// A resubmitted opportunity goes back to "Pending" with the old rejection
// (reason + approver) cleared, so it returns to the approvers' queue.
// -----------------------------------------------------------------------------
exports.updateOpportunity = async (req, res) => {
  const { title, description, date, startTime, endTime, location, capacity } = req.body;

  try {
    const opportunityId = parseId(req.params.id);
    if (!opportunityId) {
      return res.status(400).json({ message: "Invalid opportunity." });
    }

    const opp = await loadOwnOpportunity(opportunityId, req.user.userId);
    if (!opp) {
      return res.status(404).json({ message: "Opportunity not found." });
    }
    if (!["Pending", "Rejected"].includes(opp.Approval_Status)) {
      return res.status(400).json({
        message: `This opportunity is ${opp.Approval_Status.toLowerCase()} and can no longer be edited.`,
      });
    }

    const detailsError = validateOpportunityDetails({ title, location, description, capacity });
    if (detailsError) {
      return res.status(400).json({ message: detailsError });
    }
    const scheduleError = validateOpportunitySchedule({ date, startTime, endTime });
    if (scheduleError) {
      return res.status(400).json({ message: scheduleError });
    }

    const resubmitting = opp.Approval_Status === "Rejected";

    // "AND Approval_Status = $11" makes sure it was not approved/rejected in the
    // meantime (e.g. an approver decided while the form was open)
    const result = await db.query(
      `UPDATE opportunity SET
          "Title" = $1, "Description" = $2, "Location" = $3, "Date" = $4,
          "Start_Time" = $5, "End_Time" = $6, "Duration" = $7, "Capacity" = $8,
          "Approval_Status" = 'Pending', "Rejection_Reason" = NULL, "Approver_ID" = NULL
       WHERE "Opportunity_ID" = $9 AND "Faculty_ID" = $10 AND "Approval_Status" = $11`,
      [
        title.trim(),
        description ? description.trim() : null,
        location.trim(),
        date,
        startTime,
        endTime,
        durationHours(startTime, endTime),
        normalizeCapacity(capacity),
        opportunityId,
        req.user.userId,
        opp.Approval_Status,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ message: "This opportunity was just reviewed. Reload the page and try again." });
    }

    return res.status(200).json({
      message: resubmitting
        ? "Opportunity resubmitted and is pending approval again."
        : "Opportunity updated. It is still pending approval.",
    });
  } catch (error) {
    console.error("Update Opportunity Error:", error);
    return res.status(500).json({ message: "Server error while updating the opportunity." });
  }
};

// -----------------------------------------------------------------------------
// DELETE /api/opportunity/:id  -  withdraw a Pending or Rejected opportunity (F1)
// These never have registrations, so deleting removes nothing students rely on.
// Approved opportunities are cancelled instead (below), never deleted.
// -----------------------------------------------------------------------------
exports.withdrawOpportunity = async (req, res) => {
  try {
    const opportunityId = parseId(req.params.id);
    if (!opportunityId) {
      return res.status(400).json({ message: "Invalid opportunity." });
    }

    const result = await db.query(
      `DELETE FROM opportunity
       WHERE "Opportunity_ID" = $1 AND "Faculty_ID" = $2 AND "Approval_Status" IN ('Pending', 'Rejected')
       RETURNING "Title"`,
      [opportunityId, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        message: "Only your own pending or rejected opportunities can be withdrawn. Approved ones can be cancelled instead.",
      });
    }

    return res.status(200).json({ message: `"${result.rows[0].Title}" was withdrawn.` });
  } catch (error) {
    console.error("Withdraw Opportunity Error:", error);
    return res.status(500).json({ message: "Server error while withdrawing the opportunity." });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/opportunity/:id/cancel  -  cancel an Approved opportunity (F1)
// Body: { reason } (3-500 characters, shown to registered students)
// Only before the event starts. Registrations are kept so students see it as
// cancelled; registration, attendance and announcements stop (they all require
// "Approved").
// -----------------------------------------------------------------------------
exports.cancelOpportunity = async (req, res) => {
  try {
    const opportunityId = parseId(req.params.id);
    if (!opportunityId) {
      return res.status(400).json({ message: "Invalid opportunity." });
    }

    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (reason.length < 3 || reason.length > 500) {
      return res.status(400).json({ message: "Please give a reason for cancelling (3-500 characters)." });
    }

    const opp = await loadOwnOpportunity(opportunityId, req.user.userId);
    if (!opp) {
      return res.status(404).json({ message: "Opportunity not found." });
    }
    if (opp.Approval_Status !== "Approved") {
      return res.status(400).json({ message: "Only approved opportunities can be cancelled." });
    }
    if (hasStarted(opp.Date, opp.Start_Time)) {
      return res.status(400).json({ message: "This opportunity has already started and can no longer be cancelled." });
    }

    await db.query(
      `UPDATE opportunity
       SET "Approval_Status" = 'Cancelled', "Cancellation_Reason" = $1, "Cancelled_At" = now()
       WHERE "Opportunity_ID" = $2 AND "Approval_Status" = 'Approved'`,
      [reason, opportunityId]
    );

    return res.status(200).json({ message: `"${opp.Title}" was cancelled. Registered students will see it as cancelled.` });
  } catch (error) {
    console.error("Cancel Opportunity Error:", error);
    return res.status(500).json({ message: "Server error while cancelling the opportunity." });
  }
};

// -----------------------------------------------------------------------------
// decideOpportunity - the ONE place the approve/reject rules live
// Used by approvers (PATCH /api/opportunity/approve/:id) and admins
// (PATCH /api/admin/opportunity/:id/approve|reject), so both follow identical rules.
//
// Rules: only Pending opportunities can be decided and the decision is final;
// nobody decides their own submission; an event that has started can be rejected
// but not approved; rejecting needs a reason. The decider's User_ID is stored as
// Approver_ID (approver OR admin - see migration 003).
// Returns { code, body }: the HTTP status and JSON to send back.
// -----------------------------------------------------------------------------
async function decideOpportunity({ opportunityId, deciderId, status, rejectionReason }) {
    if (!opportunityId) {
        return { code: 400, body: { message: "Invalid opportunity." } };
    }

    // 1. Validate input
    if (!["Approved", "Rejected"].includes(status)) {
        return { code: 400, body: { message: "Status must be either 'Approved' or 'Rejected'." } };
    }

    // 2. Get the opportunity
    const { rows: opps } = await db.query(
        'SELECT "Faculty_ID", "Approval_Status", "Date", "Start_Time" FROM opportunity WHERE "Opportunity_ID" = $1',
        [opportunityId]
    );
    if (opps.length === 0) {
        return { code: 404, body: { message: "Opportunity not found." } };
    }
    const opportunity = opps[0];

    // 3. Nobody approves or rejects their own submission
    if (opportunity.Faculty_ID === deciderId) {
        return { code: 403, body: { message: "You cannot approve or reject an opportunity you created." } };
    }

    // 4. Decisions are final: only Pending opportunities can be approved/rejected
    if (opportunity.Approval_Status !== "Pending") {
        return { code: 409, body: { message: `This opportunity has already been ${opportunity.Approval_Status.toLowerCase()}.` } };
    }

    // 5. An event that has already started can no longer be approved
    //    (rejecting it is still allowed, to clear it from the queue)
    if (status === "Approved" && hasStarted(opportunity.Date, opportunity.Start_Time)) {
        return {
            code: 400,
            body: { message: "This opportunity's start time has passed, so it can no longer be approved. You can reject it instead." },
        };
    }

    // 6. If rejecting, require a reason
    if (status === "Rejected" && (typeof rejectionReason !== "string" || rejectionReason.trim() === "")) {
        return { code: 400, body: { message: "Rejection reason is required when rejecting." } };
    }

    // 7. Approve or reject. "AND Approval_Status = 'Pending'" makes this safe if
    //    two people act at the same moment - only the first one counts.
    const result = await db.query(
        `UPDATE opportunity
         SET "Approval_Status" = $1, "Rejection_Reason" = $2, "Approver_ID" = $3
         WHERE "Opportunity_ID" = $4 AND "Approval_Status" = 'Pending'`,
        [status, status === "Rejected" ? rejectionReason.trim() : null, deciderId, opportunityId]
    );
    if (result.rowCount === 0) {
        return { code: 409, body: { message: "This opportunity was just decided by someone else." } };
    }

    return { code: 200, body: { message: `Opportunity successfully ${status.toLowerCase()}.` } };
}
exports.decideOpportunity = decideOpportunity;

// PATCH /api/opportunity/approve/:id  -  approver approves or rejects
// Body: { status: "Approved" | "Rejected", rejectionReason? }
exports.approveOpportunity = async (req, res) => {
    try {
        const { code, body } = await decideOpportunity({
            opportunityId: parseId(req.params.id),
            deciderId: req.user.userId,
            status: req.body.status,
            rejectionReason: req.body.rejectionReason,
        });
        return res.status(code).json(body);
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
                "Faculty_ID",
                "Capacity",
                (SELECT COUNT(*)::int FROM registration r
                 WHERE r."Opportunity_ID" = opportunity."Opportunity_ID") AS "Registered_Count"
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
              AND "Faculty_ID" <> $1   -- not their own submissions (they can't decide those)
            ORDER BY "Date" ASC, "Start_Time" ASC`,
            [req.user.userId]
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
                "Rejection_Reason",
                "Capacity",
                "Cancellation_Reason",
                (SELECT COUNT(*)::int FROM registration r
                 WHERE r."Opportunity_ID" = opportunity."Opportunity_ID") AS "Registered_Count"
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
// Rules: the opportunity must be approved, must not have started yet
// (registration closes at the event's start time, campus time) and must not be
// full (Capacity, if set).
// -----------------------------------------------------------------------------
exports.registerForOpportunity = async (req, res) => {
    const studentId = req.user.userId;
    const opportunityId = parseId(req.params.id);

    let client;
    try {
        if (!opportunityId) {
            return res.status(400).json({ message: "Invalid opportunity." });
        }

        // One transaction: lock the opportunity row, check the rules and the
        // number of free spots, then insert. The lock (FOR UPDATE) makes a second
        // student registering at the same moment wait, so a full opportunity can
        // never be over-filled.
        client = await db.connect();
        await client.query("BEGIN");

        const { rows: opp } = await client.query(
            `SELECT "Approval_Status", "Date", "Start_Time", "Capacity"
             FROM opportunity WHERE "Opportunity_ID" = $1 FOR UPDATE`,
            [opportunityId]
        );

        if (opp.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Opportunity not found." });
        }

        if (opp[0].Approval_Status !== "Approved") {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "You can only register for approved opportunities." });
        }

        if (hasStarted(opp[0].Date, opp[0].Start_Time)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Registration is closed - this opportunity has already started." });
        }

        // Capacity (NULL = no limit)
        if (opp[0].Capacity !== null) {
            const { rows: [{ taken }] } = await client.query(
                'SELECT COUNT(*)::int AS taken FROM registration WHERE "Opportunity_ID" = $1',
                [opportunityId]
            );
            if (taken >= opp[0].Capacity) {
                await client.query("ROLLBACK");
                return res.status(409).json({ message: "Sorry, this opportunity is full." });
            }
        }

        // Insert registration. The UNIQUE (Student_ID, Opportunity_ID) constraint
        // makes a duplicate impossible; ON CONFLICT turns it into "no row inserted".
        const result = await client.query(
            `INSERT INTO registration ("Student_ID", "Opportunity_ID", "Registration_Status")
             VALUES ($1, $2, 'Registered')
             ON CONFLICT ("Student_ID", "Opportunity_ID") DO NOTHING`,
            [studentId, opportunityId]
        );

        await client.query("COMMIT");

        if (result.rowCount === 0) {
            return res.status(400).json({ message: "You are already registered for this opportunity." });
        }

        return res.status(201).json({
            message: "Successfully registered for the opportunity."
        });

    } catch (error) {
        if (client) await client.query("ROLLBACK").catch(() => {});
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Server error during registration." });
    } finally {
        if (client) client.release();
    }
};

// -----------------------------------------------------------------------------
// DELETE /api/opportunity/unregister/:id  -  student cancels a registration
// Rules: only before the event starts, and never once attendance is recorded
// (otherwise hours could be left behind without a registration). A cancelled
// opportunity can be removed at any time.
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
            `SELECT o."Date", o."Start_Time", o."Approval_Status", a."Attendance_ID"
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

        // A cancelled opportunity can always be removed from the student's list
        if (rows[0].Approval_Status !== "Cancelled" && hasStarted(rows[0].Date, rows[0].Start_Time)) {
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
            `SELECT "Approval_Status", "Date", "Start_Time", "Duration", "Capacity"
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
            capacity: opp[0].Capacity,
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
                o."Cancellation_Reason",
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
