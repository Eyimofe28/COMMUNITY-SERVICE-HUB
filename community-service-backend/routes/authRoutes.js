// =============================================================================
// Authentication routes - mounted at /api/auth in server.js
// -----------------------------------------------------------------------------
//   POST /api/auth/signup           create a student or faculty account
//   POST /api/auth/login            check credentials, return a login token (JWT)
//   POST /api/auth/change-password  change own password (must be logged in)
//   GET  /api/auth/me               current user + current role (must be logged in)
//
// SECURITY: signup/login are rate limited against brute force; change-password
//   requires a valid token (auth middleware) AND the current password.
// =============================================================================

const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimiters');
const { signup, login, changePassword, me } = require('../controllers/authController');

router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/change-password', auth, changePassword);
router.get('/me', auth, me);

module.exports = router;
