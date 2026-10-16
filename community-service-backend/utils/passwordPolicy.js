const crypto = require("crypto");

// Password rules (keep in sync with community-service-frontend/src/utils/passwordRules.js):
//   8-12 characters, at least one uppercase letter, one lowercase letter, and one symbol.
const MIN_LENGTH = 8;
const MAX_LENGTH = 12;

const SYMBOL_REGEX = /[^A-Za-z0-9\s]/;

// Returns an error message if the password breaks a rule, otherwise null.
exports.validatePassword = (password) => {
    if (typeof password !== "string" || password.length < MIN_LENGTH || password.length > MAX_LENGTH) {
        return `Password must be ${MIN_LENGTH}-${MAX_LENGTH} characters long.`;
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

// Generates a random password that satisfies the rules (used for temporary passwords).
exports.generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%*?";
    const all = upper + lower + digits + symbols;
    const pick = (chars) => chars[crypto.randomInt(chars.length)];

    const chars = [pick(upper), pick(lower), pick(symbols), pick(digits)];
    while (chars.length < MAX_LENGTH) chars.push(pick(all));

    // Shuffle so the required characters are not always first
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
};
