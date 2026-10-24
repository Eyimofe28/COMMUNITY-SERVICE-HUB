// =============================================================================
// Account Approval card (Admin Dashboard) - P5a
// -----------------------------------------------------------------------------
// 1. Approval switches: for students and for faculty, choose "Require admin
//    approval" or "Approve automatically". Saved immediately; they apply to NEW
//    sign-ups only (accounts already waiting stay in the list below).
// 2. Pending / Declined tabs: approve or decline waiting accounts, approve all
//    at once, or approve a previously declined account (admins can change their
//    mind - declined accounts are kept, not deleted).
//
// API (admins only): GET/PUT /admin/settings/approval, GET /admin/accounts,
//   PATCH /admin/accounts/:id/approve|decline, POST /admin/accounts/approve-all
// =============================================================================

import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Stack,
  Divider,
  Tabs,
  Tab,
  Chip,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
  CircularProgress,
} from "@mui/material";

import api, { getErrorMessage } from "../api/axios";
import { formatDate, campusDateOf } from "../utils/dates";

// The two roles that can be switched, with their labels
const ROLES = [
  { key: "student", label: "New student accounts" },
  { key: "faculty", label: "New faculty accounts" },
];

export default function AccountApprovalCard() {
  // { student: true/false, faculty: true/false } - true = approval required
  const [settings, setSettings] = useState(null);
  // Accounts waiting for a decision, and accounts that were declined
  const [pending, setPending] = useState([]);
  const [declined, setDeclined] = useState([]);
  // 0 = Pending tab, 1 = Declined tab
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  // User_ID being approved/declined right now (disables its buttons), or "all"
  const [busyId, setBusyId] = useState(null);
  // Result of the last action: { type: "success" | "error", text }
  const [status, setStatus] = useState(null);

  // Loads the switches and both account lists
  const loadAll = async () => {
    try {
      const [s, p, d] = await Promise.all([
        api.get("/admin/settings/approval"),
        api.get("/admin/accounts", { params: { status: "pending" } }),
        api.get("/admin/accounts", { params: { status: "declined" } }),
      ]);
      setSettings(s.data);
      setPending(p.data.accounts || []);
      setDeclined(d.data.accounts || []);
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, "Failed to load account approval.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saves one switch as soon as a radio button is chosen
  const handleSettingChange = async (role, requireApproval) => {
    const previous = settings;
    setSettings({ ...settings, [role]: requireApproval }); // update the radios right away
    try {
      const res = await api.put("/admin/settings/approval", { [role]: requireApproval });
      setSettings({ student: res.data.student, faculty: res.data.faculty });
      setStatus({ type: "success", text: res.data.message });
    } catch (err) {
      setSettings(previous); // put the radios back if saving failed
      setStatus({ type: "error", text: getErrorMessage(err, "Failed to save the setting.") });
    }
  };

  // Approve or decline one account, then refresh the lists
  const decide = async (account, action) => {
    setBusyId(account.User_ID);
    try {
      const res = await api.patch(`/admin/accounts/${account.User_ID}/${action}`);
      setStatus({ type: "success", text: res.data.message });
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, `Failed to ${action} the account.`) });
    } finally {
      setBusyId(null);
      loadAll();
    }
  };

  // Approve every pending account at once
  const approveAll = async () => {
    setBusyId("all");
    try {
      const res = await api.post("/admin/accounts/approve-all");
      setStatus({ type: "success", text: res.data.message });
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, "Failed to approve accounts.") });
    } finally {
      setBusyId(null);
      loadAll();
    }
  };

  // The list shown in the selected tab
  const accounts = tab === 0 ? pending : declined;

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Account Approval
      </Typography>
      <Typography variant="body2" sx={{ color: "#6B7280", mb: 2 }}>
        Choose whether new accounts must be approved by an admin before they can log in.
        Changes apply to new sign-ups.
      </Typography>

      {status && (
        <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      {loading || !settings ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {/* ---- 1. Approval switches (one radio group per role) ---- */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2, md: 6 }} sx={{ mb: 2 }}>
            {ROLES.map(({ key, label }) => (
              <FormControl key={key}>
                <FormLabel sx={{ fontWeight: 600, color: "#111827", "&.Mui-focused": { color: "#111827" } }}>
                  {label}
                </FormLabel>
                <RadioGroup
                  row
                  value={settings[key] ? "require" : "auto"}
                  onChange={(e) => handleSettingChange(key, e.target.value === "require")}
                >
                  <FormControlLabel value="require" control={<Radio />} label="Require admin approval" />
                  <FormControlLabel value="auto" control={<Radio />} label="Approve automatically" />
                </RadioGroup>
              </FormControl>
            ))}
          </Stack>

          <Divider sx={{ mb: 1 }} />

          {/* ---- 2. Pending / Declined accounts ---- */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)}>
              <Tab label={`Pending (${pending.length})`} sx={{ fontWeight: 600, color: "brown" }} />
              <Tab label={`Declined (${declined.length})`} sx={{ fontWeight: 600, color: "red" }} />
            </Tabs>

            {tab === 0 && pending.length > 0 && (
              <Button
                variant="outlined"
                disabled={busyId !== null}
                onClick={approveAll}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {busyId === "all" ? "Approving..." : "Approve all pending"}
              </Button>
            )}
          </Box>

          {accounts.length === 0 ? (
            <Typography variant="body2" sx={{ color: "#6B7280", py: 2 }}>
              {tab === 0 ? "No accounts are waiting for approval." : "No declined accounts."}
            </Typography>
          ) : (
            <Stack divider={<Divider />} spacing={1.5} sx={{ mt: 2 }}>
              {accounts.map((a) => (
                <Box
                  key={a.User_ID}
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {a.First_Name} {a.Last_Name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#6B7280" }}>
                      {a.Email}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        label={a.Role === "faculty" ? `Faculty${a.Faculty_Dept ? ` · ${a.Faculty_Dept}` : ""}` : "Student"}
                        sx={{ bgcolor: a.Role === "faculty" ? "#E0E7FF" : "#E5F6ED" }}
                      />
                      <Typography variant="caption" sx={{ color: "#9CA3AF" }}>
                        Signed up {formatDate(campusDateOf(a.Created_At))}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={busyId !== null}
                      onClick={() => decide(a, "approve")}
                      sx={{ bgcolor: "#166534", "&:hover": { bgcolor: "#14532D" }, textTransform: "none" }}
                    >
                      Approve
                    </Button>
                    {/* Only waiting accounts can be declined */}
                    {tab === 0 && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={busyId !== null}
                        onClick={() => decide(a, "decline")}
                        sx={{ textTransform: "none" }}
                      >
                        Decline
                      </Button>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}
