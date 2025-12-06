const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

router.get("/protected", auth, (req, res) => {
    res.json({
        message: "Access granted!",
        user: req.user
    });
});

module.exports = router;
