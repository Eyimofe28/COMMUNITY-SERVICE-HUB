// =============================================================================
// Office contact setting (Admin Dashboard - Admins & Settings tab) - P5b
// -----------------------------------------------------------------------------
// The contact users are told about when their account is waiting for approval
// or was declined: "Questions? Contact the <office contact>."
// e.g. "Community Service office" or "Community Service office (cs@mvsu.edu)".
//
// API (admins only): GET/PUT /admin/settings/office-contact
// =============================================================================

import { useEffect, useState } from "react";
import { Paper, Typography, TextField, Button, Alert, Stack } from "@mui/material";

import api, { getErrorMessage } from "../api/axios";

export default function OfficeContactCard() {
  // Saved value from the server, and what is currently in the text box
  const [saved, setSaved] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  // Result of the last save: { type, text }
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api
      .get("/admin/settings/office-contact")
      .then((res) => {
        setSaved(res.data.officeContact);
        setValue(res.data.officeContact);
      })
      .catch((err) => setStatus({ type: "error", text: getErrorMessage(err, "Failed to load the office contact.") }));
  }, []);

  const trimmed = value.trim();
  const valid = trimmed.length >= 3 && trimmed.length <= 120;

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/admin/settings/office-contact", { officeContact: trimmed });
      setSaved(res.data.officeContact);
      setValue(res.data.officeContact);
      setStatus({ type: "success", text: res.data.message });
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, "Failed to save the office contact.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Office Contact
      </Typography>
      <Typography variant="body2" sx={{ color: "#6B7280", mb: 2 }}>
        Shown to users whose account is waiting for approval or was declined:
        &quot;Questions? Contact the <strong>{trimmed || "…"}</strong>.&quot;
      </Typography>

      {status && (
        <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
        <TextField
          fullWidth
          label="Office contact"
          placeholder="Community Service office (cs@mvsu.edu)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={!!value && !valid}
          helperText={value && !valid ? "3-120 characters" : " "}
        />
        <Button
          variant="contained"
          disabled={saving || !valid || trimmed === saved}
          onClick={save}
          sx={{ bgcolor: "#0B3D2E", "&:hover": { bgcolor: "#0d4d38" }, py: 1.8, px: 4, whiteSpace: "nowrap" }}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </Stack>
    </Paper>
  );
}
