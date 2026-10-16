// Input rules for account fields (keep in sync with community-service-backend/utils/validation.js).
// Each validator returns an error message, or "" when the value is valid.

const NAME_REGEX = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;
const EMAIL_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*@mvsu\.edu$/;
const DEPARTMENT_REGEX = /^\p{L}(?:[\p{L}&,.'’-]| (?! ))*$/u;

export const validateName = (value, label) => {
  if (!value) return `${label} is required.`;
  if (value.length > 50) return `${label} must be 50 characters or fewer.`;
  if (/^\s|\s$/.test(value)) return `${label} cannot start or end with a space.`;
  if (!NAME_REGEX.test(value)) {
    return `${label} can only contain letters, with single spaces, hyphens or apostrophes between them.`;
  }
  return "";
};

export const validateEmail = (value) => {
  const email = value.trim().toLowerCase();
  if (!email) return "Email is required.";
  if (email.length > 100) return "Email must be 100 characters or fewer.";
  if (!email.endsWith("@mvsu.edu")) return "Only mvsu.edu emails are allowed.";
  if (!EMAIL_REGEX.test(email)) return "Please enter a valid MVSU email address (e.g. first.last@mvsu.edu).";
  return "";
};

export const validateDepartment = (value) => {
  if (!value.trim()) return "Department is required for faculty.";
  if (value.length < 2 || value.length > 100) return "Department must be 2-100 characters.";
  if (!DEPARTMENT_REGEX.test(value) || value.endsWith(" ")) {
    return "Department can only contain letters, single spaces and & , . ' -";
  }
  return "";
};
