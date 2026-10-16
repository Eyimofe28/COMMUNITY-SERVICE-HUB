// =============================================================================
// Login session helpers (frontend)
// -----------------------------------------------------------------------------
// REUSABILITY: the ONE place that knows how the session is stored. Login saves it
//   with saveSession(), every logout button calls logout(), and ProtectedRoute /
//   the API client read it with getSession() / isLoggedIn().
// SECURITY: only the signed token and non-sensitive display data are stored in the
//   browser - never the password. The token expires (see the backend), and
//   isLoggedIn() treats an expired token as logged out.
// =============================================================================

const KEYS = ["token", "role", "userId", "firstName"];

// Home page for each role, used after login and by ProtectedRoute
const DASHBOARDS = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  approver: "/approver/dashboard",
  admin: "/admin/dashboard",
};

export const dashboardPathFor = (role) => DASHBOARDS[role] || "/welcome";

// Save what the login API returned: { token, role, userId, firstName }
export function saveSession({ token, role, userId, firstName }) {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  localStorage.setItem("userId", String(userId));
  if (firstName) localStorage.setItem("firstName", firstName);
}

export function getSession() {
  return {
    token: localStorage.getItem("token"),
    role: localStorage.getItem("role"),
    userId: Number(localStorage.getItem("userId")) || null,
    firstName: localStorage.getItem("firstName"),
  };
}

// Reads the expiry time inside the token (the token's middle part is base64 JSON).
// This is only for the UI; the backend still verifies every token's signature.
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true; // unreadable token -> treat as expired
  }
}

export function isLoggedIn() {
  const { token } = getSession();
  return Boolean(token) && !isTokenExpired(token);
}

// Clear the session and go to the login page. `reason` is shown there
// (e.g. "Your session has expired. Please log in again.").
export function logout(reason) {
  KEYS.forEach((key) => localStorage.removeItem(key));
  if (reason) setLoginNotice(reason);
  window.location.href = `${process.env.PUBLIC_URL}/login`;
}

// One-time message shown on the login page (after logout, signup, expired session)
export function setLoginNotice(text) {
  sessionStorage.setItem("loginNotice", text);
}

// Read (and clear) that message - called by the login page
export function takeLoginNotice() {
  const notice = sessionStorage.getItem("loginNotice");
  sessionStorage.removeItem("loginNotice");
  return notice;
}
