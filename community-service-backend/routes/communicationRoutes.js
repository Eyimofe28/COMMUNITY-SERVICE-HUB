const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { isFacultyOrApprover } = require("../middleware/roleMiddleware");
const communicationController = require("../controllers/communicationController");

// Faculty posts a message
router.post("/:opportunityId", auth, isFacultyOrApprover, communicationController.postMessage);

// Students & faculty view messages
router.get("/:opportunityId", auth, communicationController.getMessages);

module.exports = router;
