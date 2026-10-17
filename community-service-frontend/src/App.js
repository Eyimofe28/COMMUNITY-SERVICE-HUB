// src/App.js
// Page routes. Public pages (splash, welcome, login, signup) are open to anyone;
// every dashboard page is wrapped in <ProtectedRoute>, which requires a valid
// login session with the right role (see utils/ProtectedRoute.js).
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import theme from "./theme/theme";
import ProtectedRoute from "./utils/ProtectedRoute";

import Splash from "./pages/auth/Splash";
import Welcome from "./pages/auth/Welcome";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import RegisteredOpportunities from "./pages/student/RegisteredOpportunities";
import CompletedOpportunities from "./pages/student/CompletedOpportunities";
import StudentMessages from "./pages/student/StudentMessages";
import FacultyCreateOpportunity from "./pages/faculty/FacultyCreateOpportunity";
import FacultyMessages from "./pages/faculty/FacultyMessages";
import FacultyAttendance from "./pages/faculty/FacultyAttendance";

import StudentDashboard from "./pages/student/studentDashboard";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import ApproverDashboard from "./pages/approver/ApproverDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

// Shorthand: a page only the given roles may open
const only = (roles, page) => <ProtectedRoute roles={roles}>{page}</ProtectedRoute>;

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* PUBLIC_URL is "" locally and e.g. "/~username" when built for the school server */}
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <Routes>
          {/* Onboarding flow (public) */}
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Student pages */}
          <Route path="/student/dashboard" element={only(["student"], <StudentDashboard />)} />
          <Route path="/student/registered" element={only(["student"], <RegisteredOpportunities />)} />
          <Route path="/student/completed" element={only(["student"], <CompletedOpportunities />)} />
          <Route path="/student/messages" element={only(["student"], <StudentMessages />)} />

          {/* Faculty pages */}
          <Route path="/faculty/dashboard" element={only(["faculty"], <FacultyDashboard />)} />
          <Route path="/faculty/create" element={only(["faculty"], <FacultyCreateOpportunity />)} />
          <Route path="/faculty/messages" element={only(["faculty"], <FacultyMessages />)} />
          <Route path="/faculty/attendance" element={only(["faculty"], <FacultyAttendance />)} />

          {/* Approver page */}
          <Route path="/approver/dashboard" element={only(["approver"], <ApproverDashboard />)} />

          {/* Admin page */}
          <Route path="/admin/dashboard" element={only(["admin"], <AdminDashboard />)} />

          {/* Unknown address -> welcome page */}
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
