// Creates an admin account, or resets the password of an existing admin.
//
// Run from the project root (requires access to the server and its .env):
//   npm run make-admin -- someone@mvsu.edu "First" "Last"   -> create a new admin
//   npm run make-admin -- someone@mvsu.edu                   -> reset an existing admin's password
//
// Use this to create the very FIRST admin on a fresh install, or to recover
// access if every admin has left / forgotten their password. Day-to-day admin
// management (adding/removing admins) is done from the Admin page in the app.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });


const db = require("../config/db");
const { generatePassword, hashPassword } = require("../utils/passwordPolicy");
const { normalizeEmail, validateName, validateEmail } = require("../utils/validation");

async function main() {
    const [emailArg, firstName, lastName] = process.argv.slice(2);

    if (!emailArg) {
        console.log('Usage: npm run make-admin -- <email@mvsu.edu> ["First" "Last"]');
        process.exitCode = 1;
        return;
    }

    const email = normalizeEmail(emailArg);
    if (!email.includes("@")) {
        console.log(`Error: "${emailArg}" is not an email address.`);
        console.log('Make sure there is a space after the "--":');
        console.log('  npm run make-admin -- someone@mvsu.edu "First" "Last"');
        process.exitCode = 1;
        return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
        console.log(`Error: ${emailError}`);
        process.exitCode = 1;
        return;
    }

    const tempPassword = generatePassword();
    const hashed = await hashPassword(tempPassword);

    const { rows } = await db.query('SELECT "User_ID", "Role" FROM users WHERE "Email" = $1', [email]);

    if (rows.length > 0) {
        if (rows[0].Role !== "admin") {
            console.log(`Error: ${email} already exists as a ${rows[0].Role} account and cannot be made an admin.`);
            process.exitCode = 1;
            return;
        }

        await db.query('UPDATE users SET "Password_Hash" = $1 WHERE "User_ID" = $2', [hashed, rows[0].User_ID]);
        console.log(`Password reset for existing admin ${email}.`);
    } else {
        if (!firstName || !lastName) {
            console.log("Error: first and last name are required to create a new admin.");
            console.log('Usage: npm run make-admin -- <email@mvsu.edu> "First" "Last"');
            process.exitCode = 1;
            return;
        }

        const nameError = validateName(firstName, "First name") || validateName(lastName, "Last name");
        if (nameError) {
            console.log(`Error: ${nameError}`);
            process.exitCode = 1;
            return;
        }

        await db.query(
            `INSERT INTO users ("First_Name", "Last_Name", "Email", "Password_Hash", "Role")
             VALUES ($1, $2, $3, $4, 'admin')`,
            [firstName, lastName, email, hashed]
        );
        console.log(`Admin account created for ${email}.`);
    }

    console.log(`Temporary password: ${tempPassword}`);
    console.log("Log in and change this password from the Admin page right away.");
}

main()
    .catch((error) => {
        console.error("make-admin failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
