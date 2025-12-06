const express = require('express');
const router = express.Router();
const { signup, verifyCode, login } = require('../controllers/authController');


router.post('/signup', signup);
router.post('/verify', verifyCode);
router.post('/login', login);

module.exports = router;
