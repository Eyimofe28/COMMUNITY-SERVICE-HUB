// =============================================================================
// Admin Dashboard - /admin/dashboard (admins only)
// -----------------------------------------------------------------------------
// Three tabs:
//   Accounts       - account approval switches + pending/declined accounts
//                    (AccountApprovalCard) and the Users list with the
//                    Approver switch (UsersCard)
//   Opportunities  - every opportunity; approve/reject pending ones
//                    (OpportunitiesOverviewCard)
//   Admins & Settings - office contact (OfficeContactCard), current admins,
//                    add admin, handoff steps and change password (this file)
// =============================================================================

import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
} from "@mui/material";

import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";

import api from "../../api/axios";
import PasswordRequirements from "../../components/PasswordRequirements";
import { isPasswordValid } from "../../utils/passwordRules";
import { validateName, validateEmail } from "../../utils/validation";
import { logout } from "../../utils/auth";
import AccountApprovalCard from "../../components/AccountApprovalCard";
import ChangePasswordCard from "../../components/ChangePasswordCard";
import UsersCard from "../../components/UsersCard";
import OpportunitiesOverviewCard from "../../components/OpportunitiesOverviewCard";
import OfficeContactCard from "../../components/OfficeContactCard";
import PasswordField from "../../components/PasswordField";

const emptyAdminForm = { firstName: "", lastName: "", email: "", password: "" };

export default function AdminDashboard() {
  const currentUserId = Number(localStorage.getItem("userId"));

  // Selected section tab: 0 = Accounts, 1 = Opportunities, 2 = Admins & Settings
  const [section, setSection] = useState(0);

  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminFormStatus, setAdminFormStatus] = useState(null);
  const [creating, setCreating] = useState(false);


  const [removeTarget, setRemoveTarget] = useState(null);
  const [listStatus, setListStatus] = useState(null);


  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await api.get("/admin/admins");
      setAdmins(res.data.admins || []);
    } catch (err) {
      setListStatus({ type: "error", text: err.response?.data?.message || "Failed to load admins." });
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Add admin ----
  const adminErrors = {
    firstName: validateName(adminForm.firstName, "First name"),
    lastName: validateName(adminForm.lastName, "Last name"),
    email: validateEmail(adminForm.email),
  };

  const handleAdminFormChange = (e) => {
    setAdminForm({ ...adminForm, [e.target.name]: e.target.value });
  };

  const handleCreateAdmin = async () => {
    setAdminFormStatus(null);
    setCreating(true);
    try {
      const res = await api.post("/admin/create-admin", {
        ...adminForm,
        email: adminForm.email.trim().toLowerCase(),
      });
      setAdminFormStatus({ type: "success", text: res.data.message });
      setAdminForm(emptyAdminForm);
      loadAdmins();
    } catch (err) {
      setAdminFormStatus({ type: "error", text: err.response?.data?.message || "Failed to create admin." });
    } finally {
      setCreating(false);
    }
  };

  // ---- Remove admin ----
  const confirmRemoveAdmin = async () => {
    const target = removeTarget;
    setRemoveTarget(null);
    setListStatus(null);
    try {
      const res = await api.delete(`/admin/admins/${target.User_ID}`);
      if (res.data.removedSelf) {
        logout();
        return;
      }
      setListStatus({ type: "success", text: res.data.message });
      loadAdmins();
    } catch (err) {
      setListStatus({ type: "error", text: err.response?.data?.message || "Failed to remove admin." });
    }
  };

  const isLastAdmin = admins.length <= 1;

  return (
    <Box sx={{ bgcolor: "#F5F5F7", minHeight: "100vh", p: 5 }}>
      {/* HEADER */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Admin Dashboard
        </Typography>

        <IconButton sx={{ color: "#111010ff" }} onClick={() => logout()}>
          <LogoutRoundedIcon />
        </IconButton>
      </Box>

      {/* BANNER */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          mb: 4,
          p: 4,
          borderRadius: "20px",
          bgcolor: "#E8F5E9",
          display: "flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <AdminPanelSettingsRoundedIcon sx={{ fontSize: 64, color: "#0B3D2E" }} />
        <Box>
          <Typography sx={{ fontSize: "24px", fontWeight: 800 }}>Manage Accounts & Admins</Typography>
          <Typography sx={{ color: "#4B5563", mt: 0.5 }}>
            Approve new accounts, add or remove admins, and hand off admin access when someone leaves.
          </Typography>
        </Box>
      </Paper>

      {/* SECTION TABS */}
      <Tabs value={section} onChange={(e, v) => setSection(v)} sx={{ mb: 3 }}>
        <Tab label="Accounts" sx={{ fontWeight: 600 }} />
        <Tab label="Opportunities" sx={{ fontWeight: 600 }} />
        <Tab label="Admins & Settings" sx={{ fontWeight: 600 }} />
      </Tabs>

      {/* ACCOUNTS: approval switches + pending/declined (P5a), users + Approver switch (P5b) */}
      {section === 0 && (
        <>
          <AccountApprovalCard />
          <UsersCard />
        </>
      )}

      {/* OPPORTUNITIES: overview + admin approve/reject (P5b, M2) */}
      {section === 1 && <OpportunitiesOverviewCard />}

      {/* ADMINS & SETTINGS: office contact + admin management (below) */}
      {section === 2 && (
      <>
      <OfficeContactCard />

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* LEFT COLUMN: admin list + handoff steps */}
        <Stack spacing={3} sx={{ flex: "1 1 420px" }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: "20px" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Current Admins
            </Typography>

            {listStatus && (
              <Alert severity={listStatus.type} sx={{ mb: 2 }} onClose={() => setListStatus(null)}>
                {listStatus.text}
              </Alert>
            )}

            {loadingAdmins ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack divider={<Divider />} spacing={1.5}>
                {admins.map((admin) => {
                  const isMe = admin.User_ID === currentUserId;
                  return (
                    <Box
                      key={admin.User_ID}
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {admin.First_Name} {admin.Last_Name} {isMe && "(you)"}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#6B7280" }}>
                          {admin.Email}
                        </Typography>
                      </Box>

                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={isLastAdmin}
                        onClick={() => setRemoveTarget(admin)}
                        sx={{ textTransform: "none", flexShrink: 0 }}
                      >
                        {isMe ? "Remove myself" : "Remove"}
                      </Button>
                    </Box>
                  );
                })}
              </Stack>
            )}

            {!loadingAdmins && isLastAdmin && (
              <Typography variant="body2" sx={{ color: "#6B7280", mt: 2 }}>
                You are the only admin. Add another admin before you can be removed.
              </Typography>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", bgcolor: "#F0F9F5" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Handing off admin access
            </Typography>
            <Typography component="ol" sx={{ color: "#374151", pl: 2.5, m: 0, "& li": { mb: 0.75 } }}>
              <li>Add the new admin below with a temporary password and share it with them privately.</li>
              <li>The new admin logs in and changes their password under "Change My Password".</li>
              <li>Once they confirm it works, click "Remove myself" next to your name.</li>
            </Typography>
          </Paper>
        </Stack>

        {/* RIGHT COLUMN: add admin + change password */}
        <Stack spacing={3} sx={{ flex: "1 1 420px" }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: "20px" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Add an Admin
            </Typography>

            {adminFormStatus && (
              <Alert severity={adminFormStatus.type} sx={{ mb: 2 }} onClose={() => setAdminFormStatus(null)}>
                {adminFormStatus.text}
              </Alert>
            )}

            <Stack spacing={2}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={adminForm.firstName}
                  onChange={handleAdminFormChange}
                  error={!!adminForm.firstName && !!adminErrors.firstName}
                  helperText={adminForm.firstName && adminErrors.firstName}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={adminForm.lastName}
                  onChange={handleAdminFormChange}
                  error={!!adminForm.lastName && !!adminErrors.lastName}
                  helperText={adminForm.lastName && adminErrors.lastName}
                />
              </Box>
              <TextField
                fullWidth
                label="MVSU Email"
                name="email"
                value={adminForm.email}
                onChange={handleAdminFormChange}
                error={!!adminForm.email && !!adminErrors.email}
                helperText={adminForm.email && adminErrors.email}
              />
              <PasswordField
                fullWidth
                label="Temporary Password"
                name="password"
                value={adminForm.password}
                onChange={handleAdminFormChange}
              />
              <PasswordRequirements password={adminForm.password} />
              <Button
                variant="contained"
                disabled={
                  creating ||
                  !isPasswordValid(adminForm.password) ||
                  Object.values(adminErrors).some(Boolean)
                }
                onClick={handleCreateAdmin}
                sx={{ bgcolor: "#0B3D2E", py: 1.2, "&:hover": { bgcolor: "#0d4d38" } }}
              >
                {creating ? "Adding..." : "Add Admin"}
              </Button>
            </Stack>
          </Paper>

          {/* Shared with the Settings page (components/ChangePasswordCard.jsx) */}
          <ChangePasswordCard title="Change My Password" />
        </Stack>
      </Box>
      </>
      )}

      {/* REMOVE CONFIRMATION */}
      <Dialog open={!!removeTarget} onClose={() => setRemoveTarget(null)}>
        <DialogTitle>Remove admin?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {removeTarget?.User_ID === currentUserId
              ? "This deletes your admin account and logs you out. Make sure the new admin can log in first."
              : `This deletes the admin account for ${removeTarget?.First_Name} ${removeTarget?.Last_Name} (${removeTarget?.Email}).`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmRemoveAdmin}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
