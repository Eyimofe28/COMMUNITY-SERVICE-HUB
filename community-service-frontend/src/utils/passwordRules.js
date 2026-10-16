// Password rules (keep in sync with community-service-backend/utils/passwordPolicy.js):
//   8-12 characters, at least one uppercase letter, one lowercase letter, and one symbol.
export const PASSWORD_RULES = [
  { label: "8-12 characters", test: (pw) => pw.length >= 8 && pw.length <= 12 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One symbol (e.g. ! @ # $ %)", test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

export const isPasswordValid = (pw) => PASSWORD_RULES.every((rule) => rule.test(pw));
