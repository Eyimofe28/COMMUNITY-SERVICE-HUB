// =============================================================================
// Authentication middleware - protects every route that needs a logged-in user
// -----------------------------------------------------------------------------
// Usage: router.get(path, auth, handler)
//
// CLIENT/SERVER COMMUNICATION: the frontend sends the login token on each request
//   in the header "Authorization: Bearer <token>" (added automatically by
//   community-service-frontend/src/api/axios.js).
// SECURITY: the token's signature and expiry are verified with JWT_SECRET, and the
//   user must still exist (a deleted account's token stops working immediately).
//   Only non-sensitive user fields are loaded - never the password hash.
// ERROR HANDLING: any problem -> 401, which tells the frontend to log in again.
// =============================================================================

const jwt = require("jsonwebtoken");
const db = require("../config/db");

module.exports = async (req, res, next) => {
    try {
        // 1. Read the token from the Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Please log in to continue." });
        }

        const token = authHeader.split(" ")[1];

        // 2. Verify signature + expiry. Only HS256 is accepted, so a token signed
        //    with a different (or no) algorithm is rejected.
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

        // 3. Make sure the account still exists (parameterized query)
        const { rows } = await db.query(
            'SELECT "User_ID", "First_Name", "Last_Name", "Email", "Role" FROM users WHERE "User_ID" = $1',
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Your account no longer exists. Please log in again." });
        }

        // 4. Attach the user to the request for the route handlers
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            info: rows[0]
        };

        next();

    } catch (error) {
        // Expired or tampered tokens are expected - log one line, not a stack trace
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Your session has expired. Please log in again." });
        }

        // Anything else (e.g. database unreachable) is a server problem, not the user's
        console.error("Auth Middleware Error:", error);
        return res.status(500).json({ message: "Server error while checking your login. Please try again." });
    }
};
