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

// -----------------------------------------------------------------------------
// Opportunity details (create / edit / resubmit) - faculty batch F1 + capacity
// -----------------------------------------------------------------------------
// title: 3-100 characters; location: required, 2-150; description: optional,
// up to 1000; capacity: optional whole number 1-500 (empty = no limit).
// Returns an error message, or null when the details are valid.
exports.validateOpportunityDetails = ({ title, location, description, capacity }) => {
    if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 100) {
        return "Title must be 3-100 characters.";
    }
    if (typeof location !== "string" || location.trim().length < 2 || location.trim().length > 150) {
        return "Location is required (2-150 characters).";
    }
    if (description !== undefined && description !== null && description !== "") {
        if (typeof description !== "string" || description.length > 1000) {
            return "Description must be 1000 characters or fewer.";
        }
    }
    if (capacity !== undefined && capacity !== null && capacity !== "") {
        const n = Number(capacity);
        if (!Number.isInteger(n) || n < 1 || n > 500) {
            return "Max students must be a whole number from 1 to 500 (leave it empty for no limit).";
        }
    }
    return null;
};

// Capacity as stored: a whole number, or null for "no limit"
exports.normalizeCapacity = (capacity) =>
    capacity === undefined || capacity === null || capacity === "" ? null : Number(capacity);
