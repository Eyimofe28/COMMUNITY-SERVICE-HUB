// src/pages/admin/AdminDashboard.jsx
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
} from "@mui/material";

import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";

import api from "../../api/axios";
import PasswordRequirements from "../../components/PasswordRequirements";
import { isPasswordValid } from "../../utils/passwordRules";

const emptyAdminForm = { firstName: "", lastName: "", email: "", password: "" };
const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function AdminDashboard() {
  const currentUserId = Number(localStorage.getItem("userId"));

  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminFormStatus, setAdminFormStatus] = useState(null);
  const [creating, setCreating] = useState(false);

  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [listStatus, setListStatus] = useState(null);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

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
  const handleAdminFormChange = (e) => {
    setAdminForm({ ...adminForm, [e.target.name]: e.target.value });
  };

  const handleCreateAdmin = async () => {
    setAdminFormStatus(null);
    setCreating(true);
    try {
      const res = await api.post("/admin/create-admin", adminForm);
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
        handleLogout();
        return;
      }
      setListStatus({ type: "success", text: res.data.message });
      loadAdmins();
    } catch (err) {
      setListStatus({ type: "error", text: err.response?.data?.message || "Failed to remove admin." });
    }
  };

  // ---- Change my password ----
  const handlePasswordFormChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleChangePassword = async () => {
    setPasswordStatus(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: "error", text: "New passwords do not match." });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordStatus({ type: "success", text: res.data.message });
      setPasswordForm(emptyPasswordForm);
    } catch (err) {
      setPasswordStatus({ type: "error", text: err.response?.data?.message || "Failed to change password." });
    } finally {
      setChangingPassword(false);
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

        <IconButton sx={{ color: "#111010ff" }} onClick={handleLogout}>
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
          <Typography sx={{ fontSize: "24px", fontWeight: 800 }}>Manage Admins</Typography>
          <Typography sx={{ color: "#4B5563", mt: 0.5 }}>
            Add or remove admins and hand off admin access when someone leaves.
          </Typography>
        </Box>
      </Paper>

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
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={adminForm.lastName}
                  onChange={handleAdminFormChange}
                />
              </Box>
              <TextField
                fullWidth
                label="MVSU Email"
                name="email"
                value={adminForm.email}
                onChange={handleAdminFormChange}
              />
              <TextField
                fullWidth
                label="Temporary Password"
                name="password"
                type="password"
                value={adminForm.password}
                onChange={handleAdminFormChange}
              />
              <PasswordRequirements password={adminForm.password} />
              <Button
                variant="contained"
                disabled={creating || !isPasswordValid(adminForm.password)}
                onClick={handleCreateAdmin}
                sx={{ bgcolor: "#0B3D2E", py: 1.2, "&:hover": { bgcolor: "#0d4d38" } }}
              >
                {creating ? "Adding..." : "Add Admin"}
              </Button>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: "20px" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Change My Password
            </Typography>

            {passwordStatus && (
              <Alert severity={passwordStatus.type} sx={{ mb: 2 }} onClose={() => setPasswordStatus(null)}>
                {passwordStatus.text}
              </Alert>
            )}

            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordFormChange}
              />
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordFormChange}
              />
              <PasswordRequirements password={passwordForm.newPassword} />
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordFormChange}
              />
              <Button
                variant="contained"
                disabled={changingPassword || !isPasswordValid(passwordForm.newPassword)}
                onClick={handleChangePassword}
                sx={{ bgcolor: "#0B3D2E", py: 1.2, "&:hover": { bgcolor: "#0d4d38" } }}
              >
                {changingPassword ? "Saving..." : "Change Password"}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Box>

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
