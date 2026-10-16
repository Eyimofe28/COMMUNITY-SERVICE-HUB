const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { validatePassword } = require("../utils/passwordPolicy");

// NOTE: Email verification was removed (MVSU's mail filter blocks the codes).
// Accounts are created immediately. Admin approval of new accounts is planned.
exports.signup = async (req, res) => {
    const { email, password, role, firstName, lastName, department } = req.body;

    let client;
    try {
        // Check inputs
        if (!email || !password || !role || !firstName || !lastName) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Validate MVSU email domain
        if (!normalizedEmail.endsWith("@mvsu.edu")) {
            return res.status(400).json({ message: "Only mvsu.edu emails are allowed." });
        }

        // Validate role
        if (!["student", "faculty"].includes(role)) {
            return res.status(400).json({ message: "Invalid role." });
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        // Check if email already exists
        const { rows: existing } = await db.query(
            'SELECT "User_ID" FROM users WHERE "Email" = $1',
            [normalizedEmail]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: "Email already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Users row + subtype row are created together or not at all
        client = await db.connect();
        await client.query("BEGIN");

        const { rows: inserted } = await client.query(
            `INSERT INTO users ("First_Name", "Last_Name", "Email", "Password_Hash", "Role")
             VALUES ($1, $2, $3, $4, $5)
             RETURNING "User_ID"`,
            [firstName.trim(), lastName.trim(), normalizedEmail, hashedPassword, role]
        );

        const userId = inserted[0].User_ID;

        if (role === "student") {
            await client.query(
                'INSERT INTO student ("User_ID", "Service_Hours_Total") VALUES ($1, 0)',
                [userId]
            );
        }

        if (role === "faculty") {
            await client.query(
                'INSERT INTO faculty ("User_ID", "Faculty_Dept", "Approver") VALUES ($1, $2, false)',
                [userId, department || null]
            );
        }

        await client.query("COMMIT");

        return res.status(201).json({ message: "Account created. You can now log in." });

    } catch (error) {
        if (client) await client.query("ROLLBACK");
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Server error during signup." });
    } finally {
        if (client) client.release();
    }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required." });
    }

    // 1️⃣ Fetch user from users table (emails are stored lowercase)
    const { rows } = await db.query('SELECT * FROM users WHERE "Email" = $1', [
      email.trim().toLowerCase(),
    ]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const user = rows[0];

    // 2️⃣ Check password
    const match = await bcrypt.compare(password, user.Password_Hash);
    if (!match) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // 3️⃣ Base role (student/faculty/admin) from users table
    let role = user.Role;

    // 4️⃣ Load subtype profile
    let profile = {};

    if (role === "student") {
      const { rows: student } = await db.query(
        'SELECT * FROM student WHERE "User_ID" = $1',
        [user.User_ID]
      );
      profile = student[0] || {};
    }

    if (role === "faculty") {
      const { rows: faculty } = await db.query(
        'SELECT * FROM faculty WHERE "User_ID" = $1',
        [user.User_ID]
      );
      profile = faculty[0] || {};

      // ⭐ 5️⃣ Detect approver override
      if (profile.Approver === true) {
        role = "approver";   // override role for frontend routing
      }
    }

    // 6️⃣ Generate token
    const token = jwt.sign(
      { userId: user.User_ID, role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
        message: "Login successful.",
        token,
        role,
        userId: user.User_ID,
        profile,
    });


  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const match = await bcrypt.compare(currentPassword, req.user.info.Password_Hash);
    if (!match) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET "Password_Hash" = $1 WHERE "User_ID" = $2', [
      hashedPassword,
      req.user.userId,
    ]);

    return res.status(200).json({ message: "Password changed successfully." });

  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ message: "Server error while changing password." });
  }
};
