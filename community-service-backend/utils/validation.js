// Input rules for account fields (keep in sync with community-service-frontend/src/utils/validation.js).
// Each validator returns an error message, or null when the value is valid.

// Letters (any language), with a single space, hyphen or apostrophe allowed BETWEEN letters:
// "Mary Ann", "Smith-Jones", "O'Neal", "José". No leading/trailing/double spaces, digits or symbols.
const NAME_REGEX = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

// name@mvsu.edu - letters/digits with . _ - only between them
const EMAIL_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*@mvsu\.edu$/;

// Starts with a letter; letters, & , . ' - and single spaces
const DEPARTMENT_REGEX = /^\p{L}(?:[\p{L}&,.'’-]| (?! ))*$/u;

exports.validateName = (value, label) => {
    if (typeof value !== "string" || value.length === 0) return `${label} is required.`;
    if (value.length > 50) return `${label} must be 50 characters or fewer.`;
    if (!NAME_REGEX.test(value)) {
        return `${label} can only contain letters, with single spaces, hyphens or apostrophes between them.`;
    }
    return null;
};

// Expects the email already trimmed and lowercased.
exports.validateEmail = (email) => {
    if (typeof email !== "string" || email.length === 0) return "Email is required.";
    if (email.length > 100) return "Email must be 100 characters or fewer.";
    if (!email.endsWith("@mvsu.edu")) return "Only mvsu.edu emails are allowed.";
    if (!EMAIL_REGEX.test(email)) return "Please enter a valid MVSU email address (e.g. first.last@mvsu.edu).";
    return null;
};

exports.validateDepartment = (value) => {
    if (typeof value !== "string" || value.trim().length === 0) return "Department is required for faculty.";
    if (value.length < 2 || value.length > 100) return "Department must be 2-100 characters.";
    if (!DEPARTMENT_REGEX.test(value) || value.endsWith(" ")) {
        return "Department can only contain letters, single spaces and & , . ' -";
    }
    return null;
};
