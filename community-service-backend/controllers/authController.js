// =============================================================================
// Authentication controller: registration (signup), login and change password
// -----------------------------------------------------------------------------
// Routes: see routes/authRoutes.js. Every handler follows the same pattern:
//   1. INPUT VALIDATION  - reject bad input with 400 before touching the database
//   2. DATABASE WORK     - parameterized queries ($1, $2 ...) only, never string
//                          concatenation, so user input cannot inject SQL
//   3. RESPONSE          - JSON { message, ... } with a meaningful HTTP status
//   4. ERROR HANDLING    - expected problems get specific 4xx messages; unexpected
//                          errors are logged on the server and the client gets a
//                          generic 500 message (no internal details leak out)
// =============================================================================

const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { validatePassword, hashPassword, verifyPassword, needsRehash } = require("../utils/passwordPolicy");
const { normalizeEmail, validateName, validateEmail, validateDepartment } = require("../utils/validation");
const { effectiveRole } = require("../utils/roles");

// Postgres error code for a UNIQUE constraint violation (e.g. duplicate email)
const UNIQUE_VIOLATION = "23505";

// How long a login token stays valid before the user must log in again
const TOKEN_LIFETIME = process.env.JWT_EXPIRES_IN || "1d";

// -----------------------------------------------------------------------------
// POST /api/auth/signup  -  register a new student or faculty account
// Body: { firstName, lastName, email, password, role, department? }
// NOTE: Email verification was removed (MVSU's mail filter blocks the codes).
// Accounts are created immediately. Admin approval of new accounts is planned.
// -----------------------------------------------------------------------------
exports.signup = async (req, res) => {
    const { email, password, role, firstName, lastName, department } = req.body;

    let client;
    try {
        // ---- 1. Input validation ----
        if (!email || !password || !role || !firstName || !lastName) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const normalizedEmail = normalizeEmail(email);

        // Only students and faculty can self-register; admins are created by admins
        if (!["student", "faculty"].includes(role)) {
            return res.status(400).json({ message: "Invalid role." });
        }

        // Run each rule in turn; the first failure is returned to the user
        const inputError =
            validateName(firstName, "First name") ||
            validateName(lastName, "Last name") ||
            validateEmail(normalizedEmail) ||
            validatePassword(password) ||
            (role === "faculty" ? validateDepartment(department) : null);

        if (inputError) {
            return res.status(400).json({ message: inputError });
        }

        // Friendly early check for an existing account (the UNIQUE constraint on
        // users."Email" is the real guarantee - see the catch block below)
        const { rows: existing } = await db.query(
            'SELECT "User_ID" FROM users WHERE "Email" = $1',
            [normalizedEmail]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: "Email already registered." });
        }

        // ---- 2. Security: store only a bcrypt hash of the password ----
        const hashedPassword = await hashPassword(password);

        // ---- 3. Database: Users row + subtype row in ONE transaction ----
        // Either both rows are saved or neither is, so there is never a user
        // without its student/faculty record.
        client = await db.connect();
        await client.query("BEGIN");

        const { rows: inserted } = await client.query(
            `INSERT INTO users ("First_Name", "Last_Name", "Email", "Password_Hash", "Role")
             VALUES ($1, $2, $3, $4, $5)
             RETURNING "User_ID"`,
            [firstName, lastName, normalizedEmail, hashedPassword, role]
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
                [userId, department]
            );
        }

        await client.query("COMMIT");

        return res.status(201).json({ message: "Account created. You can now log in." });

    } catch (error) {
        // ---- 4. Error handling ----
        // Undo any partial work; a failed rollback must not hide the real error
        if (client) await client.query("ROLLBACK").catch(() => {});

        // Two signups with the same email at the same moment: the database's
        // UNIQUE constraint rejects the second one - report it as a duplicate
        if (error.code === UNIQUE_VIOLATION) {
            return res.status(409).json({ message: "Email already registered." });
        }

        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Server error during signup. Please try again." });
    } finally {
        // Always return the connection to the pool
        if (client) client.release();
    }
};

// -----------------------------------------------------------------------------
// POST /api/auth/login  -  check credentials and issue a login token
// Body: { email, password }
// Returns: { token, role, userId, firstName, profile }
// -----------------------------------------------------------------------------
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ---- 1. Input validation (type checks stop non-string input crashing the handler) ----
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // ---- 2. Database: look the user up by normalized email ----
    const { rows } = await db.query(
      'SELECT "User_ID", "First_Name", "Password_Hash", "Role" FROM users WHERE "Email" = $1',
      [normalizeEmail(email)]
    );
    const user = rows[0];

    // ---- 3. Security: check the password against the stored bcrypt hash ----
    // verifyPassword does the same amount of work even when the email does not
    // exist, and both failures return the SAME message, so an attacker cannot
    // tell which emails have accounts.
    const passwordOk = await verifyPassword(password, user?.Password_Hash);
    if (!user || !passwordOk) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Upgrade an older, weaker hash now that we know the correct password.
    // A failure here must not block the login, so it is only logged.
    if (needsRehash(user.Password_Hash)) {
      try {
        await db.query('UPDATE users SET "Password_Hash" = $1 WHERE "User_ID" = $2', [
          await hashPassword(password),
          user.User_ID,
        ]);
      } catch (rehashError) {
        console.error("Password rehash failed (login continues):", rehashError.message);
      }
    }

    // ---- 4. Load the role-specific profile ----
    let role = user.Role;
    let profile = {};

    if (role === "student") {
      const { rows: student } = await db.query(
        'SELECT "Service_Hours_Total" FROM student WHERE "User_ID" = $1',
        [user.User_ID]
      );
      profile = student[0] || {};
    }

    if (role === "faculty") {
      const { rows: faculty } = await db.query(
        'SELECT "Faculty_Dept", "Approver" FROM faculty WHERE "User_ID" = $1',
        [user.User_ID]
      );
      profile = faculty[0] || {};

      // Faculty with the Approver flag get the "approver" role for routing/permissions
      role = effectiveRole(role, profile.Approver);
    }

    // ---- 5. Issue a signed token (JWT) ----
    // Contains only the user ID and role - never the password or hash. Signed with
    // JWT_SECRET, so it cannot be forged or edited, and it expires automatically.
    const token = jwt.sign(
      { userId: user.User_ID, role },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_LIFETIME }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      role,
      userId: user.User_ID,
      firstName: user.First_Name,
      profile,
    });

  } catch (error) {
    // ---- 6. Error handling: unexpected failure (e.g. database unreachable) ----
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error during login. Please try again." });
  }
};

// -----------------------------------------------------------------------------
// GET /api/auth/me  -  who is logged in, with their CURRENT role
// Requires a valid token. The frontend calls this when a page loads so a role
// changed by an admin (e.g. promoted to approver) is picked up without logging
// in again. The role is the one authMiddleware read from the database.
// -----------------------------------------------------------------------------
exports.me = (req, res) => {
  return res.status(200).json({
    userId: req.user.userId,
    role: req.user.role,
    firstName: req.user.info.First_Name,
  });
};

// -----------------------------------------------------------------------------
// POST /api/auth/change-password  -  change the logged-in user's password
// Requires a valid token (auth middleware). Body: { currentPassword, newPassword }
// -----------------------------------------------------------------------------
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // ---- 1. Input validation ----
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: "New password must be different from the current password." });
    }

    // ---- 2. Security: a stolen/unattended session alone cannot change the
    // password - the current password must be re-entered and verified ----
    const { rows } = await db.query(
      'SELECT "Password_Hash" FROM users WHERE "User_ID" = $1',
      [req.user.userId]
    );
    if (!(await verifyPassword(currentPassword, rows[0]?.Password_Hash))) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    // ---- 3. Database: store the new hash ----
    await db.query('UPDATE users SET "Password_Hash" = $1 WHERE "User_ID" = $2', [
      await hashPassword(newPassword),
      req.user.userId,
    ]);

    return res.status(200).json({ message: "Password changed successfully." });

  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ message: "Server error while changing password. Please try again." });
  }
};
