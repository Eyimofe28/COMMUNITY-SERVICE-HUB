// =============================================================================
// Input validation rules for account fields (signup, admin creation, scripts)
// -----------------------------------------------------------------------------
// INPUT VALIDATION: every value a user types is checked here on the SERVER
//   before it is processed or stored. The frontend has a copy of these rules
//   (community-service-frontend/src/utils/validation.js) for instant feedback,
//   but this file is the one that is enforced - client checks can be bypassed.
// REUSABILITY: one set of validators shared by authController (signup),
//   adminController (create admin) and scripts/make-admin.js.
//
// Each validator returns an error message (string) or null when the value is valid,
// so callers can chain them:  validateName(a) || validateEmail(b) || ...
// =============================================================================

// Letters (any language), with a single space, hyphen or apostrophe allowed BETWEEN letters:
// "Mary Ann", "Smith-Jones", "O'Neal", "José". No leading/trailing/double spaces, digits or symbols.
const NAME_REGEX = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

// name@mvsu.edu - letters/digits with . _ - only between them
const EMAIL_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*@mvsu\.edu$/;

// Starts with a letter; letters, & , . ' - and single spaces
const DEPARTMENT_REGEX = /^\p{L}(?:[\p{L}&,.'’-]| (?! ))*$/u;

// Puts an email into the one canonical form stored in the database (trimmed, lowercase).
// Emails are case-insensitive, and the users table only accepts lowercase emails.
// Non-string input becomes "" so the validators below reject it instead of crashing.
exports.normalizeEmail = (email) =>
    typeof email === "string" ? email.trim().toLowerCase() : "";

// First / last name: 1-50 characters, letters with single separators (see NAME_REGEX)
exports.validateName = (value, label) => {
    if (typeof value !== "string" || value.length === 0) return `${label} is required.`;
    if (value.length > 50) return `${label} must be 50 characters or fewer.`;
    if (!NAME_REGEX.test(value)) {
        return `${label} can only contain letters, with single spaces, hyphens or apostrophes between them.`;
    }
    return null;
};

// MVSU email: must already be normalized (see normalizeEmail), max 100 characters
exports.validateEmail = (email) => {
    if (typeof email !== "string" || email.length === 0) return "Email is required.";
    if (email.length > 100) return "Email must be 100 characters or fewer.";
    if (!email.endsWith("@mvsu.edu")) return "Only mvsu.edu emails are allowed.";
    if (!EMAIL_REGEX.test(email)) return "Please enter a valid MVSU email address (e.g. first.last@mvsu.edu).";
    return null;
};

// Faculty department: required for faculty, 2-100 characters (see DEPARTMENT_REGEX)
exports.validateDepartment = (value) => {
    if (typeof value !== "string" || value.trim().length === 0) return "Department is required for faculty.";
    if (value.length < 2 || value.length > 100) return "Department must be 2-100 characters.";
    if (!DEPARTMENT_REGEX.test(value) || value.endsWith(" ")) {
        return "Department can only contain letters, single spaces and & , . ' -";
    }
    return null;
};
