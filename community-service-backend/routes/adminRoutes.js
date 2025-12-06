const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");
const adminController = require("../controllers/adminController");

// Create admin (you must already be an admin to use this)
router.post("/create-admin", auth, isAdmin, adminController.createAdmin);

// First admin bootstrap (disabled automatically after use)
router.post("/bootstrap-admin", adminController.bootstrapAdmin);

// View all users
router.get("/users", auth, isAdmin, adminController.getAllUsers);

// View all opportunities
router.get("/opportunities", auth, isAdmin, adminController.getAllOpportunities);

// View all communications (all opportunities)
router.get("/communications", auth, isAdmin, adminController.getAllCommunications);

// View all registrations (system log)
router.get("/registrations", auth, isAdmin, adminController.getAllRegistrations);

// View all attendance records (system log)
router.get("/attendance", auth, isAdmin, adminController.getAllAttendance);

// Promote/demote faculty to/from approver
router.patch("/faculty/:userId/approver", auth, isAdmin, adminController.setFacultyApproverStatus);

// Approve an opportunity
router.patch("/opportunity/:id/approve", auth, isAdmin, adminController.adminApproveOpportunity);

// Reject an opportunity
router.patch("/opportunity/:id/reject", auth, isAdmin, adminController.adminRejectOpportunity);

// Assign a (new) approver to an opportunity
router.patch("/opportunity/:id/assign-approver", auth, isAdmin, adminController.adminAssignApprover);

// Assign a (new) faculty member to an opportunity => useful if a faculty account is deleted or changed.
router.patch("/opportunity/:id/assign-faculty", auth, isAdmin, adminController.adminAssignFaculty);

module.exports = router;

