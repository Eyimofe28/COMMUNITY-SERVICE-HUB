// =============================================================================
// ProtectedRoute - wraps pages that require a logged-in user with a given role
// -----------------------------------------------------------------------------
// Usage in App.js:
//   <Route path="/student/dashboard"
//          element={<ProtectedRoute roles={["student"]}><StudentDashboard /></ProtectedRoute>} />
//
// SECURITY: keeps logged-out users (or an expired session) on the login page, and
//   sends users to their own dashboard if they open another role's page.
//   This is for user experience only - the REAL protection is on the backend,
//   which checks the token and role on every API request (authMiddleware +
//   roleMiddleware), so editing the browser cannot unlock any data.
// REUSABILITY: one component guards every protected page.
// =============================================================================

import { Navigate } from "react-router-dom";
import { getSession, isLoggedIn, dashboardPathFor } from "./auth";

export default function ProtectedRoute({ roles, children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const { role } = getSession();
  if (roles && !roles.includes(role)) {
    return <Navigate to={dashboardPathFor(role)} replace />;
  }

  return children;
}
