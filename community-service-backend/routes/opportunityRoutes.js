// =============================================================================
// Opportunity routes - mounted at /api/opportunity in server.js
// -----------------------------------------------------------------------------
// Every route runs, in order:
//   auth         -> checks the login token and loads the user + CURRENT role
//                   from the database (middleware/authMiddleware.js)
//   role check   -> isStudent / isFaculty / isApprover / isRegularFaculty
//                   (middleware/roleMiddleware.js); anyone else gets 403
//   controller   -> the handler in controllers/opportunityController.js
//
// Routes with an :id always end in a fixed word (e.g. /:id/registrations), so
// they never clash with one-word routes such as /pending or /my-submissions.
// =============================================================================

const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { isFaculty, isApprover, isRegularFaculty, isStudent } = require("../middleware/roleMiddleware");

const opportunityController = require("../controllers/opportunityController");

// Faculty creates an opportunity (saved as "Pending" until an approver decides).
// isRegularFaculty: faculty only, and NOT approvers (approvers review, they don't create).
router.post("/create", auth, isRegularFaculty, opportunityController.createOpportunity);

// Approver approves an opportunity
router.patch("/approve/:id", auth, isApprover, opportunityController.approveOpportunity);

// Students view approved opportunities
router.get("/approved", auth, isStudent, opportunityController.listApproved);

// Approver views opportunities THEY approved
router.get("/approved-by-me", auth, isApprover, opportunityController.listApprovedByApprover);

// Approver views opportunities THEY rejected
router.get("/rejected-by-me", auth, isApprover, opportunityController.listRejectedByMe);

// Approvers view pending opportunities
router.get("/pending", auth, isApprover, opportunityController.listPending);

// Faculty views their submitted opportunities
router.get("/my-submissions", auth, isFaculty, opportunityController.listMySubmissions);

// Student registers for an opportunity
router.post("/register/:id", auth, isStudent, opportunityController.registerForOpportunity);

// Student unregisters for an opportunity
router.delete("/unregister/:id", auth, isStudent, opportunityController.unregisterFromOpportunity);

// Faculty retrieves all registered students for an opportunity
router.get("/:id/registrations", auth, isFaculty, opportunityController.getRegistrations);

// Faculty submits attendance
router.post("/:id/attendance", auth, isFaculty, opportunityController.submitAttendance);

// Student views their registrations
router.get("/my-registrations", auth, isStudent, opportunityController.listMyRegistrations);


module.exports = router;
