// =============================================================================
// Password rules, hashing and temporary-password generation
// -----------------------------------------------------------------------------
// SECURITY: passwords are never stored or logged in plain text. They are hashed
//   with bcrypt (a slow, salted hash designed for passwords) and only the hash is
//   saved in users."Password_Hash". Logging in compares against that hash.
// INPUT VALIDATION: validatePassword enforces the password rules on the server.
//   The frontend shows the same rules live (src/utils/passwordRules.js).
// REUSABILITY: every place that hashes or checks a password (signup, login,
//   change password, create admin, make-admin and seed scripts) uses these
//   functions, so the rules and the bcrypt cost are defined in exactly one place.
// =============================================================================

const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Rules: at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 symbol.
// The 72-character cap is bcrypt's limit: anything longer would be silently ignored.
const MIN_LENGTH = 8;
const MAX_LENGTH = 72;
const GENERATED_LENGTH = 12;

// bcrypt cost factor: each +1 doubles the work needed to guess a password.
// 12 is a common recommendation; existing hashes made with other costs still verify.
const BCRYPT_ROUNDS = 12;

const SYMBOL_REGEX = /[^A-Za-z0-9\s]/;

// Returns an error message if the password breaks a rule, otherwise null.
exports.validatePassword = (password) => {
    if (typeof password !== "string" || password.length < MIN_LENGTH) {
        return `Password must be at least ${MIN_LENGTH} characters long.`;
    }
    if (password.length > MAX_LENGTH) {
        return `Password must be ${MAX_LENGTH} characters or fewer.`;
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
        return "Password must contain at least one lowercase letter.";
    }
    if (!SYMBOL_REGEX.test(password)) {
        return "Password must contain at least one symbol (e.g. ! @ # $ %).";
    }
    return null;
};

// Hashes a plain-text password for storage (bcrypt adds a random salt automatically).
exports.hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

// A real bcrypt hash of a random throwaway value. verifyPassword compares against it
// when there is no stored hash (unknown email), so a login for an email that does not
// exist takes as long as one with a wrong password - response timing does not reveal
// which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), BCRYPT_ROUNDS);

// Checks a plain-text password against a stored hash. Returns true/false, never throws
// on bad input (non-string password or missing hash simply return false).
exports.verifyPassword = async (password, storedHash) => {
    if (typeof password !== "string" || password.length === 0) return false;
    const match = await bcrypt.compare(password, storedHash || DUMMY_HASH);
    return Boolean(storedHash) && match;
};

// True when a stored hash was made with a lower cost than BCRYPT_ROUNDS (older accounts).
// Login re-hashes the password at the current cost when this is true, so every account
// moves to the same cost - and failed logins all take the same time (see DUMMY_HASH).
exports.needsRehash = (storedHash) => {
    try {
        return bcrypt.getRounds(storedHash) < BCRYPT_ROUNDS;
    } catch {
        return false; // not a bcrypt hash - leave it alone
    }
};

// Generates a random password that satisfies the rules (used for temporary passwords
// printed by scripts/make-admin.js and scripts/seed-demo.js). Uses crypto.randomInt,
// a cryptographically secure random source.
exports.generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%*?";
    const all = upper + lower + digits + symbols;
    const pick = (chars) => chars[crypto.randomInt(chars.length)];

    const chars = [pick(upper), pick(lower), pick(symbols), pick(digits)];
    while (chars.length < GENERATED_LENGTH) chars.push(pick(all));

    // Shuffle so the required characters are not always first
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
};
