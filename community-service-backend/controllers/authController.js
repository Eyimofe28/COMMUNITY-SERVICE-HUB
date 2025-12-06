const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../config/db");
const verificationStore = require("../utils/verificationStore");
const { sendVerificationEmail } = require("../utils/emailService");

exports.signup = async (req, res) => {
    const { email, password, role, firstName, lastName, department } = req.body;

    try {
        // Check inputs
        if (!email || !password || !role || !firstName || !lastName) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        // Validate MVSU email domain
        const domain = email.split("@")[1];
        if (domain !== "mvsu.edu") {
            return res.status(400).json({ message: "Only mvsu.edu emails are allowed." });
        }

        // Validate role
        if (!["student", "faculty"].includes(role)) {
            return res.status(400).json({ message: "Invalid role." });
        }

        // Check if email already exists
        const [existing] = await db.query("SELECT * FROM Users WHERE Email = ?", [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Email already registered." });
        }

        // Generate verification code
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        console.log("📌 Verification code for testing:", verificationCode);


        // Store temporarily in-memory
        verificationStore.set(email, {
            code: verificationCode,
            expires: Date.now() + 10 * 60 * 1000,
            userData: { email, password, role, firstName, lastName, department }
        });

        // Send email
        await sendVerificationEmail(email, verificationCode);

        return res.status(200).json({
            message: "Verification code sent to your MVSU email.",
            email
        });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Server error during signup." });
    }
};

exports.verifyCode = async (req, res) => {
    const { email, code } = req.body;

    try {
        // Retrieve in-memory entry
        const entry = verificationStore.get(email);

        if (!entry) {
            return res.status(400).json({ message: "No verification request found." });
        }

        // Check expiration
        if (Date.now() > entry.expires) {
            verificationStore.delete(email);
            return res.status(400).json({ message: "Verification code expired." });
        }

        // Check code
        if (entry.code !== code) {
            return res.status(400).json({ message: "Invalid verification code." });
        }

        const { email: userEmail, password, role, firstName, lastName, department } = entry.userData;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into Users table
        const [userInsert] = await db.query(
            "INSERT INTO Users (First_Name, Last_Name, Email, Password_Hash, Role) VALUES (?, ?, ?, ?, ?)",
            [firstName, lastName, userEmail, hashedPassword, role]
        );

        const userId = userInsert.insertId;

        // Insert subtype
        if (role === "student") {
            await db.query(
                "INSERT INTO Student (User_ID, Service_Hours_Total) VALUES (?, 0)",
                [userId]
            );
        }

        if (role === "faculty") {
            await db.query(
                "INSERT INTO Faculty (User_ID, Faculty_Dept, Approver) VALUES (?, ?, false)",
                [userId, department || null]
            );
        }

        // Delete from memory
        verificationStore.delete(email);

        return res.status(201).json({ message: "Email verified — account created." });

    } catch (error) {
        console.error("Verification Error:", error);
        return res.status(500).json({ message: "Server error during verification." });
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
