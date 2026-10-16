// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import theme from "./theme/theme";

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



// ✅ import ONLY the entry dashboard component
import StudentDashboard from "./pages/student/studentDashboard";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import ApproverDashboard from "./pages/approver/ApproverDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* PUBLIC_URL is "" locally and e.g. "/~username" when built for the school server */}
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <Routes>
          {/* Onboarding flow */}
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* ✅ Student dashboard route */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/registered" element={<RegisteredOpportunities />} />
          <Route path="/student/completed" element={<CompletedOpportunities />} />
          <Route path="/student/messages" element={<StudentMessages />} />

          {/* Faculty dashboard route */}
          <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
          <Route path="/faculty/create" element={<FacultyCreateOpportunity />} />
          <Route path="/faculty/messages" element={<FacultyMessages />} />
          <Route path="/faculty/attendance" element={<FacultyAttendance />} />

          {/* ✅ Approver dashboard route */}
          <Route path="/approver/dashboard" element={<ApproverDashboard />} />

          {/* Admin dashboard route */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
