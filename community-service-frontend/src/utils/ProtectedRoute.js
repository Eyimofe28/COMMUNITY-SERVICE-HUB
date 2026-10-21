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
//   which checks the token and the role (read from the database) on every API
//   request, so editing the browser cannot unlock any data.
// ROLE CHANGES: when a page loads, the current role is re-read from the backend
//   (GET /api/auth/me). If an admin promoted/demoted this user, the saved role is
//   updated and they are taken to the right dashboard - no new login needed.
// REUSABILITY: one component guards every protected page.
// =============================================================================

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/axios";
import { getSession, isLoggedIn, dashboardPathFor, updateSessionRole } from "./auth";

export default function ProtectedRoute({ roles, children }) {
  const loggedIn = isLoggedIn();
  const [role, setRole] = useState(getSession().role);

  // Refresh the role once per page load (errors are handled by the API client:
  // an expired session logs out; a network problem keeps the saved role)
  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    api
      .get("/auth/me")
      .then((res) => {
        if (cancelled) return;
        updateSessionRole(res.data.role, res.data.firstName);
        setRole(res.data.role);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to={dashboardPathFor(role)} replace />;
  }

  return children;
}
