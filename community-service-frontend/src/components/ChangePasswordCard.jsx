// =============================================================================
// Change Password card - used on the Settings page (F3) and the Admin Dashboard
// -----------------------------------------------------------------------------
// Current password + new password (with the live rules checklist) + confirm.
// The backend re-checks everything: the current password must be correct, the
// new one must meet the rules and differ from the current one.
//
// SECURITY: each field has a show/hide eye (PasswordField, U2); passwords only
// live in this component's state and are cleared after a successful change.
// API: POST /auth/change-password (any logged-in user)
// =============================================================================

import { useState } from "react";
import { Paper, Typography, Button, Alert, Stack } from "@mui/material";

import api, { getErrorMessage } from "../api/axios";
import PasswordField from "./PasswordField";
import PasswordRequirements from "./PasswordRequirements";
import { isPasswordValid } from "../utils/passwordRules";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePasswordCard({ title = "Change Password" }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  // Result of the last attempt: { type: "success" | "error", text }
  const [status, setStatus] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Confirmation must match before anything is sent
  const mismatch = form.confirmPassword !== "" && form.confirmPassword !== form.newPassword;

  const handleSubmit = async () => {
    setStatus(null);
    if (form.newPassword !== form.confirmPassword) {
      setStatus({ type: "error", text: "New passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setStatus({ type: "success", text: res.data.message });
      setForm(EMPTY);
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, "Failed to change password.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: "20px" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {title}
      </Typography>

      {status && (
        <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      <Stack spacing={2}>
        <PasswordField
          fullWidth
          label="Current Password"
          name="currentPassword"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={handleChange}
        />
        <PasswordField
          fullWidth
          label="New Password"
          name="newPassword"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={handleChange}
        />
        <PasswordRequirements password={form.newPassword} />
        <PasswordField
          fullWidth
          label="Confirm New Password"
          name="confirmPassword"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={mismatch}
          helperText={mismatch ? "Passwords do not match." : " "}
        />
        <Button
          variant="contained"
          disabled={saving || !form.currentPassword || !isPasswordValid(form.newPassword) || mismatch}
          onClick={handleSubmit}
          sx={{ bgcolor: "#0B3D2E", py: 1.2, "&:hover": { bgcolor: "#0d4d38" } }}
        >
          {saving ? "Saving..." : "Change Password"}
        </Button>
      </Stack>
    </Paper>
  );
}
