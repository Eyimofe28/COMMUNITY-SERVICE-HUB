const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { signup, login, changePassword } = require('../controllers/authController');


router.post('/signup', signup);
router.post('/login', login);
router.post('/change-password', auth, changePassword);

module.exports = router;
