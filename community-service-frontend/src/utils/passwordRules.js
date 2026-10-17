// =============================================================================
// Password rules (frontend copy)
// -----------------------------------------------------------------------------
// INPUT VALIDATION: drives the live checklist (components/PasswordRequirements.jsx)
//   and blocks submitting a weak password. COPY of the rules in
//   community-service-backend/utils/passwordPolicy.js - keep both in sync; the
//   backend enforces them.
// REUSABILITY: each rule is data ({ label, test }), so the checklist, Signup and
//   the admin forms all read the same list.
//
// Rules: at least 8 characters, one uppercase letter, one lowercase letter, one symbol.
// (The backend also caps passwords at 72 characters, bcrypt's limit.)
// =============================================================================
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 && pw.length <= 72 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One symbol (e.g. ! @ # $ %)", test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

export const isPasswordValid = (pw) => PASSWORD_RULES.every((rule) => rule.test(pw));
