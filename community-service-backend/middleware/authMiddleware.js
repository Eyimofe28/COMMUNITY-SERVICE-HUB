const jwt = require("jsonwebtoken");
const db = require("../config/db");

module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided." });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // decoded contains { userId, role }

        // Fetch full user record from database
        const { rows } = await db.query(
            'SELECT * FROM users WHERE "User_ID" = $1',
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "User not found." });
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            info: rows[0]
        };

        next();

    } catch (error) {
        console.error("Auth Middleware Error:", error);
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};
