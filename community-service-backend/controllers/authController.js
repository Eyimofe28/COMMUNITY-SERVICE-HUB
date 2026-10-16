const bcrypt = require("bcrypt");
const db = require("../config/db");

// NOTE: Email verification was removed (MVSU's mail filter blocks the codes).
// Accounts are created immediately. Admin approval of new accounts is planned.
exports.signup = async (req, res) => {
    const { email, password, role, firstName, lastName, department } = req.body;

    let conn;
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

        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters." });
        }

        // Check if email already exists
        const [existing] = await db.query("SELECT User_ID FROM Users WHERE Email = ?", [normalizedEmail]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Email already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Users row + subtype row are created together or not at all
        conn = await db.getConnection();
        await conn.beginTransaction();

        const [userInsert] = await conn.query(
            "INSERT INTO Users (First_Name, Last_Name, Email, Password_Hash, Role) VALUES (?, ?, ?, ?, ?)",
            [firstName.trim(), lastName.trim(), normalizedEmail, hashedPassword, role]
        );

        const userId = userInsert.insertId;

        if (role === "student") {
            await conn.query(
                "INSERT INTO Student (User_ID, Service_Hours_Total) VALUES (?, 0)",
                [userId]
            );
        }

        if (role === "faculty") {
            await conn.query(
                "INSERT INTO Faculty (User_ID, Faculty_Dept, Approver) VALUES (?, ?, false)",
                [userId, department || null]
            );
        }

        await conn.commit();

        return res.status(201).json({ message: "Account created. You can now log in." });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Server error during signup." });
    } finally {
        if (conn) conn.release();
    }
};

const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required." });
    }

    // 1️⃣ Fetch user from Users table
    const [rows] = await db.query("SELECT * FROM Users WHERE Email = ?", [email]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const user = rows[0];

    // 2️⃣ Check password
    const match = await bcrypt.compare(password, user.Password_Hash);
    if (!match) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // 3️⃣ Base role (student/faculty) from Users table
    let role = user.Role;

    // 4️⃣ Load subtype profile
    let profile = {};

    if (role === "student") {
      const [student] = await db.query(
        "SELECT * FROM Student WHERE User_ID = ?",
        [user.User_ID]
      );
      profile = student[0] || {};
    }

    if (role === "faculty") {
      const [faculty] = await db.query(
        "SELECT * FROM Faculty WHERE User_ID = ?",
        [user.User_ID]
      );
      profile = faculty[0] || {};

      // ⭐ 5️⃣ Detect approver override 
      if (profile.Approver === 1 || profile.Approver === true) {
        role = "approver";   // override role for frontend routing
      }
    }

    // 6️⃣ Generate token
    const token = jwt.sign(
      { userId: user.User_ID, role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 7️⃣ Return correct first name for dashboard greetings
    // Determine final role
    let finalRole = user.Role;

    if (user.Role === "faculty" && profile?.Approver === 1) {
        finalRole = "approver";
    }

    return res.status(200).json({
        message: "Login successful.",
        token,
        role: finalRole,   // <-- corrected role
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

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const match = await bcrypt.compare(currentPassword, req.user.info.Password_Hash);
    if (!match) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE Users SET Password_Hash = ? WHERE User_ID = ?", [
      hashedPassword,
      req.user.userId,
    ]);

    return res.status(200).json({ message: "Password changed successfully." });

  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ message: "Server error while changing password." });
  }
};
