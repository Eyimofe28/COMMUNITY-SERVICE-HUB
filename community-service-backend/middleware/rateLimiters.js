// =============================================================================
// Rate limiting for the login and signup endpoints
// -----------------------------------------------------------------------------
// SECURITY: without a limit, anyone could try thousands of passwords against an
//   account (brute force) or script mass account creation. After too many
//   requests the endpoint answers 429 "Too many attempts" for a while.
// ERROR HANDLING: the limit response is JSON with a readable message, the same
//   shape as every other API error, so the frontend can display it.
// REUSABILITY: limiters are plain Express middleware, added to any route with
//   router.post(path, loginLimiter, handler).
//
// Counts are kept in memory, so they reset when the backend restarts.
// =============================================================================

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const tooManyAttempts = (message) => (req, res) => res.status(429).json({ message });

// Login: 10 attempts per 15 minutes for each email + IP address.
// Keyed on the email too, so students sharing one campus IP address do not lock
// each other out, while repeated guesses against one account are still blocked.
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        return `${ipKeyGenerator(req.ip)}|${email}`;
    },
    handler: tooManyAttempts("Too many login attempts. Please wait 15 minutes and try again."),
});

// Signup: 20 new-account attempts per hour from one IP address.
exports.signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: tooManyAttempts("Too many sign-up attempts from this network. Please try again later."),
});
