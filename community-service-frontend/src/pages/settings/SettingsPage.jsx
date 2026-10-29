// =============================================================================
// Settings page (F3) - /settings for students, faculty and approvers
// -----------------------------------------------------------------------------
// Shows the account's details and lets the user change their password. New
// personal settings can be added here as further cards. (Admins change their
// password on the Admin Dashboard, under "Admins & Settings".)
//
// API: GET /auth/me (account details), POST /auth/change-password
// =============================================================================

import { useEffect, useState } from "react";
import { Box, Paper, Typography, Stack, CircularProgress, Alert } from "@mui/material";

import api, { getErrorMessage } from "../../api/axios";
import { getSession } from "../../utils/auth";
import StudentSidebar from "../student/StudentSidebar";
import FacultySidebar from "../faculty/FacultySidebar";
import ChangePasswordCard from "../../components/ChangePasswordCard";

// How each role is described on the page
const ROLE_LABELS = { student: "Student", faculty: "Faculty", approver: "Faculty (Approver)" };

// One label / value line in the Account card
function Detail({ label, value }) {
  return (
    <Box>
      <Typography variant="body2" sx={{ color: "#6B7280" }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600 }}>{value || "—"}</Typography>
    </Box>
  );
}

export default function SettingsPage() {
  // Account details from GET /auth/me
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setAccount(res.data))
      .catch((err) => setError(getErrorMessage(err, "Failed to load your account.")));
  }, []);

  // Students get the student sidebar; faculty and approvers the faculty one
  const sidebar =
    getSession().role === "student" ? <StudentSidebar active="settings" /> : <FacultySidebar active="settings" />;

  return (
    <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3 }}>
      {sidebar}

      <Box sx={{ flex: 1, bgcolor: "#fff", borderRadius: "30px", p: 3.5, overflow: "auto" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          Settings
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* ACCOUNT DETAILS (read-only) */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", bgcolor: "#F0F9F5", flex: "1 1 320px" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Account
            </Typography>
            {!account ? (
              !error && <CircularProgress size={24} />
            ) : (
              <Stack spacing={2}>
                <Detail label="Name" value={`${account.firstName} ${account.lastName}`} />
                <Detail label="Email" value={account.email} />
                <Detail label="Role" value={ROLE_LABELS[account.role] || account.role} />
                {account.department && <Detail label="Department" value={account.department} />}
                <Typography variant="body2" sx={{ color: "#6B7280" }}>
                  To change your name, email or department, contact an administrator.
                </Typography>
              </Stack>
            )}
          </Paper>

          {/* CHANGE PASSWORD */}
          <Box sx={{ flex: "1 1 380px" }}>
            <ChangePasswordCard />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
