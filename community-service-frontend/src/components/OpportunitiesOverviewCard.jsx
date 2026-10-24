// =============================================================================
// Opportunities overview (Admin Dashboard - Opportunities tab) - P5b / M2
// -----------------------------------------------------------------------------
// Every opportunity in the system, split into Pending / Approved / Rejected / All
// tabs, with who created it and who decided it. Admins can approve or reject
// pending ones - the same rules as approvers (pending only, final, no approving
// after the start time, reason required to reject); the admin is recorded as the
// decider.
//
// API (admins only): GET /admin/opportunities,
//   PATCH /admin/opportunity/:id/approve, PATCH /admin/opportunity/:id/reject
// =============================================================================

import { useEffect, useMemo, useState } from "react";
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
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import api, { getErrorMessage } from "../api/axios";
import { formatDate, formatTimeRange, formatHours, hasStarted } from "../utils/dates";

// Tabs: label + which Approval_Status it shows (null = all)
const TABS = [
  { label: "Pending", status: "Pending", color: "brown" },
  { label: "Approved", status: "Approved", color: "green" },
  { label: "Rejected", status: "Rejected", color: "red" },
  { label: "All", status: null, color: "inherit" },
];

// Status chip colours
const STATUS_STYLE = {
  Pending: { bgcolor: "#FEF9C3", color: "#92400E" },
  Approved: { bgcolor: "#DCFCE7", color: "#166534" },
  Rejected: { bgcolor: "#FEE2E2", color: "#B91C1C" },
};

const fullName = (first, last) => [first, last].filter(Boolean).join(" ");

export default function OpportunitiesOverviewCard() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  // Index into TABS
  const [tab, setTab] = useState(0);
  // Opportunity_ID being decided (disables buttons)
  const [busyId, setBusyId] = useState(null);
  // Opportunity being rejected (opens the reason dialog) and the typed reason
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState("");
  // Result of the last action: { type, text }
  const [status, setStatus] = useState(null);

  const loadOpportunities = async () => {
    try {
      const res = await api.get("/admin/opportunities");
      setOpportunities(res.data.opportunities || []);
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, "Failed to load opportunities.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Approve, or reject with the typed reason; then refresh
  const decide = async (opp, action) => {
    setBusyId(opp.Opportunity_ID);
    try {
      const res =
        action === "approve"
          ? await api.patch(`/admin/opportunity/${opp.Opportunity_ID}/approve`)
          : await api.patch(`/admin/opportunity/${opp.Opportunity_ID}/reject`, { reason });
      setStatus({ type: "success", text: `"${opp.Title}": ${res.data.message}` });
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, `Failed to ${action} the opportunity.`) });
    } finally {
      setBusyId(null);
      setRejectTarget(null);
      setReason("");
      loadOpportunities();
    }
  };

  // Opportunities shown in the selected tab
  const visible = useMemo(
    () => opportunities.filter((o) => !TABS[tab].status || o.Approval_Status === TABS[tab].status),
    [opportunities, tab]
  );
  const countFor = (s) => opportunities.filter((o) => !s || o.Approval_Status === s).length;

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Opportunities
      </Typography>
      <Typography variant="body2" sx={{ color: "#6B7280" }}>
        Every opportunity in the system. You can approve or reject pending ones.
      </Typography>

      {status && (
        <Alert severity={status.type} sx={{ mt: 2 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mt: 1 }}>
        {TABS.map((t) => (
          <Tab key={t.label} label={`${t.label} (${countFor(t.status)})`} sx={{ fontWeight: 600, color: t.color }} />
        ))}
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : visible.length === 0 ? (
        <Typography variant="body2" sx={{ color: "#6B7280", py: 2 }}>
          No opportunities here.
        </Typography>
      ) : (
        <Stack divider={<Divider />} spacing={2} sx={{ mt: 2, maxHeight: 520, overflowY: "auto", pr: 1 }}>
          {visible.map((o) => {
            const started = hasStarted(o.Date, o.Start_Time);
            const approverName = fullName(o.Approver_First_Name, o.Approver_Last_Name);
            return (
              <Box key={o.Opportunity_ID}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{o.Title}</Typography>
                    <Typography variant="body2" sx={{ color: "#6B7280" }}>
                      {formatDate(o.Date)} • {formatTimeRange(o.Start_Time, o.End_Time)} • {formatHours(o.Duration)}
                      {o.Location ? ` • ${o.Location}` : ""}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#4B5563" }}>
                      Created by {fullName(o.Faculty_First_Name, o.Faculty_Last_Name) || o.Person_In_Charge || "Unknown"}
                      {o.Approval_Status !== "Pending" && approverName && ` • ${o.Approval_Status} by ${approverName}`}
                    </Typography>
                    {o.Approval_Status === "Rejected" && o.Rejection_Reason && (
                      <Typography variant="body2" sx={{ color: "#B91C1C", mt: 0.5 }}>
                        Reason: {o.Rejection_Reason}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <Chip size="small" label={o.Approval_Status} sx={{ ...STATUS_STYLE[o.Approval_Status], fontWeight: 600 }} />
                    {o.Approval_Status === "Pending" && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          // Same rule as approvers: no approving once the event has started
                          disabled={busyId !== null || started}
                          onClick={() => decide(o, "approve")}
                          sx={{ bgcolor: "#166534", "&:hover": { bgcolor: "#14532D" }, textTransform: "none" }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={busyId !== null}
                          onClick={() => setRejectTarget(o)}
                          sx={{ textTransform: "none" }}
                        >
                          Reject
                        </Button>
                      </Stack>
                    )}
                    {o.Approval_Status === "Pending" && started && (
                      <Typography variant="caption" sx={{ color: "#B91C1C" }}>
                        Start time passed - can only be rejected
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* REJECT DIALOG - a reason is required */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject "{rejectTarget?.Title}"</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Reason for rejection (shown to the faculty member)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!reason.trim() || busyId !== null}
            onClick={() => decide(rejectTarget, "reject")}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
