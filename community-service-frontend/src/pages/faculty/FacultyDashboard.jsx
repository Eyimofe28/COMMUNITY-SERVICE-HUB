// =============================================================================
// Faculty dashboard - the faculty member's own submitted opportunities
// -----------------------------------------------------------------------------
// Route: /faculty/dashboard (faculty role only). Newly created opportunities
// land here under "Pending" (see FacultyCreateOpportunity.jsx).
//
// Loads GET /api/opportunity/my-submissions, splits the results into
// Pending / Approved / Rejected / Cancelled tabs, and shows ITEMS_PER_PAGE cards
// per page. Clicking a card expands its details and actions (faculty batch):
//   Pending   -> Edit, Withdraw            Rejected -> Edit & Resubmit, Withdraw
//   Approved  -> Cancel (before it starts, with a reason students will see)
// =============================================================================

import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api/axios";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Avatar,
  Stack,
  Divider,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";

import FacultySidebar from "./FacultySidebar";
import { getSession } from "../../utils/auth";
import greetingsImg from "./greetings.png";
import { formatDate, formatTimeRange, formatHours, hasStarted } from "../../utils/dates";

// ---------- ICON PICKER ----------
// Picks an icon from keywords in the title (e.g. "clean" -> cleaning icon);
// falls back to a school icon. Opportunities have no category column yet.
function getIconForCategory(category) {
  const normalized = (category || "").toLowerCase();

  if (normalized.includes("build")) return <ApartmentRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("clean")) return <CleaningServicesRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("tutor") || normalized.includes("academic"))
    return <SchoolOutlinedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("community") || normalized.includes("volunteer"))
    return <VolunteerActivismRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("office") || normalized.includes("admin"))
    return <WorkOutlineRoundedIcon sx={{ color: "#0B3D2E" }} />;

  return <SchoolRoundedIcon sx={{ color: "#0B3D2E" }} />;
}

// =========================================================
//                   MAIN COMPONENT
// =========================================================
export default function FacultyDashboard() {
  // Saved at login (utils/auth.js); the token is only used to decide whether to load
  const token = localStorage.getItem("token");
  const firstName = localStorage.getItem("firstName") || "Faculty";

  // All submissions, plus the same list split by Approval_Status (one array per tab)
  const [submissions, setSubmissions] = useState([]);
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [cancelled, setCancelled] = useState([]);

  // Withdraw / cancel confirmation: { opp, type: "withdraw" | "cancel" } or null
  const [action, setAction] = useState(null);
  // Reason typed in the cancel dialog (shown to registered students)
  const [cancelReason, setCancelReason] = useState("");
  const [acting, setActing] = useState(false);
  // Result of the last action: { type: "success" | "error", text }
  const [status, setStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  // Selected tab: 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Cancelled
  const [tab, setTab] = useState(0);
  // Opportunity_ID of the card that is expanded (null = none)
  const [expandedId, setExpandedId] = useState(null);
  // Current page number (starting at 0) kept separately for each tab
  const [pendingPage, setPendingPage] = useState(0);
  const [approvedPage, setApprovedPage] = useState(0);
  const [rejectedPage, setRejectedPage] = useState(0);
  const [cancelledPage, setCancelledPage] = useState(0);

  // Cards shown per page in each tab
  const ITEMS_PER_PAGE = 2;

  // ---------------- LOAD SUBMISSIONS ----------------
  // Fetches this faculty member's opportunities (newest first) and sorts them
  // into the four tabs. Runs when the page opens and again after an action.
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/opportunity/my-submissions");

      const rows = res.data.submissions || [];

      // Group them client-side
      setPending(rows.filter((o) => o.Approval_Status === "Pending"));
      setApproved(rows.filter((o) => o.Approval_Status === "Approved"));
      setRejected(rows.filter((o) => o.Approval_Status === "Rejected"));
      setCancelled(rows.filter((o) => o.Approval_Status === "Cancelled"));

      setSubmissions(rows);
    } catch (err) {
      console.error("My Submissions Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---------------- WITHDRAW / CANCEL ----------------
  // Runs the confirmed action, shows the result and reloads the lists
  const confirmAction = async () => {
    const { opp, type } = action;
    setActing(true);
    try {
      const res =
        type === "withdraw"
          ? await api.delete(`/opportunity/${opp.Opportunity_ID}`)
          : await api.patch(`/opportunity/${opp.Opportunity_ID}/cancel`, { reason: cancelReason });
      setStatus({ type: "success", text: res.data.message });
      setExpandedId(null);
      await fetchSubmissions();
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, `Failed to ${type} the opportunity.`) });
    } finally {
      setActing(false);
      setAction(null);
      setCancelReason("");
    }
  };

  // Opens the edit page (Pending = edit, Rejected = edit & resubmit)
  const openEditor = (opp) => {
    window.location.href = `${process.env.PUBLIC_URL}/faculty/edit/${opp.Opportunity_ID}`;
  };

  // Switching tabs collapses any expanded card
  const handleTabChange = (e, v) => {
    setTab(v);
    setExpandedId(null);
  };

  // Get current page based on tab
  const getCurrentPage = () => {
    if (tab === 0) return pendingPage;
    if (tab === 1) return approvedPage;
    if (tab === 2) return rejectedPage;
    return cancelledPage;
  };

  // Set current page based on tab
  const setCurrentPage = (page) => {
    if (tab === 0) setPendingPage(page);
    else if (tab === 1) setApprovedPage(page);
    else if (tab === 2) setRejectedPage(page);
    else setCancelledPage(page);
  };

  // Get current tab data
  const getCurrentData = () => {
    if (tab === 0) return pending;
    if (tab === 1) return approved;
    if (tab === 2) return rejected;
    return cancelled;
  };

  // Paginate data: the slice of the current tab's list for the current page
  const currentData = getCurrentData();
  const currentPage = getCurrentPage();
  const startIdx = currentPage * ITEMS_PER_PAGE;
  const paginatedData = currentData.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);

  // Next / Previous page buttons (stop at the first and last page)
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // ---------- STATUS CHIP COLORS ----------
  // Props for the status badge: green = Approved, red = Rejected, grey = Cancelled, yellow = Pending
  const getStatusChipProps = (status) => {
    const base = {
      label: status,
      sx: { fontWeight: 600, textTransform: "none" },
      size: "small",
    };

    if (status === "Approved") {
      return { ...base, sx: { ...base.sx, bgcolor: "#DCFCE7", color: "#166534" } };
    }
    if (status === "Rejected") {
      return { ...base, sx: { ...base.sx, bgcolor: "#FEE2E2", color: "#B91C1C" } };
    }
    if (status === "Cancelled") {
      return { ...base, sx: { ...base.sx, bgcolor: "#E5E7EB", color: "#374151" } };
    }
    return { ...base, sx: { ...base.sx, bgcolor: "#FEF9C3", color: "#92400E" } };
  };

  // ---------- REUSABLE OPPORTUNITY CARD ----------
  // Renders one opportunity; clicking it toggles the expanded details.
  // Date and time are formatted for display ("Wed, Oct 21, 2026", "9:00 AM – 11:30 AM").
  const OpportunityCard = (opp) => {
    const id = opp.Opportunity_ID;
    const expanded = expandedId === id;

    const date = opp.Date ? formatDate(opp.Date) : "";
    const timeRange = opp.Start_Time && opp.End_Time ? formatTimeRange(opp.Start_Time, opp.End_Time) : "";

    return (
      <Paper
        key={id}
        elevation={0}
        sx={{
          borderRadius: "22px",
          bgcolor: "#FFFFFF",
          mb: 2,
          p: 2.5,
          boxShadow: "0 10px 30px rgba(15, 68, 52, 0.06)",
          cursor: "pointer",
          "&:hover": {
            boxShadow: "0 16px 38px rgba(15, 68, 52, 0.12)",
            transform: "translateY(-2px)",
          },
          transition: "all 0.2s ease",
        }}
        onClick={() => setExpandedId(expanded ? null : id)}
      >
        {/* ---- Top Row with Fixed Layout ---- */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 200px 120px", gap: 2, alignItems: "center" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", minWidth: 0 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "18px",
                bgcolor: "#E5F6ED",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {getIconForCategory(opp.Title)}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {opp.Title}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: "right" }}>
            {opp.Duration && (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatHours(opp.Duration)}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: "#6B7280" }}>
              {date}
            </Typography>
            <Typography variant="body2" sx={{ color: "#6B7280" }}>
              {timeRange}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Chip {...getStatusChipProps(opp.Approval_Status)} />
          </Box>
        </Box>

        {/* ---- Expanded Details ---- */}
        {expanded && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.5}>
              <Typography sx={{ color: "#4B5563" }}>{opp.Description}</Typography>

              {opp.Location && (
                <Typography variant="body2" sx={{ color: "#6B7280" }}>
                  Location: {opp.Location}
                </Typography>
              )}

              {/* Registrations vs capacity (approved / cancelled) */}
              {["Approved", "Cancelled"].includes(opp.Approval_Status) && (
                <Typography variant="body2" sx={{ color: "#6B7280" }}>
                  Registered: {opp.Registered_Count ?? 0}
                  {opp.Capacity ? ` / ${opp.Capacity} spots` : " (no limit)"}
                </Typography>
              )}
              {opp.Approval_Status === "Pending" && opp.Capacity && (
                <Typography variant="body2" sx={{ color: "#6B7280" }}>
                  Max students: {opp.Capacity}
                </Typography>
              )}

              {/* Rejection reason (only on rejected opportunities) */}
              {opp.Approval_Status === "Rejected" && opp.Rejection_Reason && (
                <Typography variant="body2" sx={{ color: "#B91C1C", mt: 1 }}>
                  <strong>Rejection Reason:</strong> {opp.Rejection_Reason}
                </Typography>
              )}

              {/* Cancellation reason (only on cancelled opportunities) */}
              {opp.Approval_Status === "Cancelled" && opp.Cancellation_Reason && (
                <Typography variant="body2" sx={{ color: "#374151", mt: 1 }}>
                  <strong>Cancelled:</strong> {opp.Cancellation_Reason}
                </Typography>
              )}
            </Stack>

            {/* ---- Actions (buttons stop the click from collapsing the card) ---- */}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} onClick={(e) => e.stopPropagation()}>
              {opp.Approval_Status === "Pending" && (
                <Button size="small" variant="contained" sx={{ bgcolor: "#0B3D2E", textTransform: "none" }} onClick={() => openEditor(opp)}>
                  Edit
                </Button>
              )}
              {opp.Approval_Status === "Rejected" && (
                <Button size="small" variant="contained" sx={{ bgcolor: "#0B3D2E", textTransform: "none" }} onClick={() => openEditor(opp)}>
                  Edit & Resubmit
                </Button>
              )}
              {["Pending", "Rejected"].includes(opp.Approval_Status) && (
                <Button size="small" variant="outlined" color="error" sx={{ textTransform: "none" }} onClick={() => setAction({ opp, type: "withdraw" })}>
                  Withdraw
                </Button>
              )}
              {opp.Approval_Status === "Approved" && !hasStarted(opp.Date, opp.Start_Time) && (
                <Button size="small" variant="outlined" color="error" sx={{ textTransform: "none" }} onClick={() => setAction({ opp, type: "cancel" })}>
                  Cancel Opportunity
                </Button>
              )}
            </Stack>
          </>
        )}
      </Paper>
    );
  };

  // =========================================================
  //                      RENDER UI
  // =========================================================
  return (
    
    <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>
      <FacultySidebar active="dashboard" />

      <Box sx={{ flex: 1, borderRadius: "30px", bgcolor: "#ffffff", p: 4, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {/* ----- Top Bar ----- */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827" }}>
            {/* Approvers use this page to manage the opportunities they created */}
            {getSession().role === "approver" ? "My Opportunities" : "Dashboard"}
          </Typography>
          <IconButton sx={{ bgcolor: "#F3F4F6", width: 44, height: 44 }}>
            <SearchRoundedIcon />
          </IconButton>
        </Box>

        {/* ----- Greeting Banner ----- */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "24px",
            bgcolor: "#F0F9F5",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 4,
            py: 3,
            mb: 4,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Hello, {firstName}!
            </Typography>
            <Typography sx={{ color: "#4B5563" }}>
              Track your submitted community service opportunities.
            </Typography>
          </Box>

          <Avatar src={greetingsImg} sx={{ width: 96, height: 96 }} />
        </Paper>

        {/* Result of the last withdraw / cancel */}
        {status && (
          <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
            {status.text}
          </Alert>
        )}

        {/* ---- TABS ---- */}
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{ mb: 3 }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label={`Pending (${pending.length})`} sx={{ fontWeight: 600, color: 'brown'}} />
          <Tab label={`Approved (${approved.length})`} sx={{ fontWeight: 600 , color: 'green' }} />
          <Tab label={`Rejected (${rejected.length})`} sx={{ fontWeight: 600 , color: 'red'}} />
          <Tab label={`Cancelled (${cancelled.length})`} sx={{ fontWeight: 600 , color: '#4B5563'}} />
        </Tabs>
        <Divider sx={{ mb: 3 }} />

        {/* ---- SCROLLABLE OPPORTUNITIES SECTION ---- */}
        <Box sx={{ flex: 1, overflow: "auto", pr: 2 }}>
          {loading ? (
            <CircularProgress />
          ) : currentData.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography sx={{ color: "#9CA3AF", fontSize: 16 }}>
                {tab === 0 && "No pending requests available"}
                {tab === 1 && "No approved requests available"}
                {tab === 2 && "No rejected requests available"}
                {tab === 3 && "No cancelled opportunities"}
              </Typography>
            </Box>
          ) : (
            <>
              {paginatedData.map(OpportunityCard)}
            </>
          )}
        </Box>

        {/* ---- PAGINATION CONTROLS (FIXED AT BOTTOM) ---- */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 4, pt: 2, borderTop: "1px solid #E5E7EB" }}>
          <Button
            disabled={currentPage === 0}
            onClick={handlePrevPage}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            ← Previous
          </Button>

          <Typography sx={{ color: "#6B7280", fontWeight: 600 }}>
            Page {currentPage + 1} of {totalPages}
          </Typography>

          <Button
            disabled={currentPage >= totalPages - 1}
            onClick={handleNextPage}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Next →
          </Button>
        </Box>
      </Box>

      {/* WITHDRAW / CANCEL CONFIRMATION */}
      <Dialog open={!!action} onClose={() => !acting && setAction(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {action?.type === "withdraw" ? "Withdraw this opportunity?" : "Cancel this opportunity?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: action?.type === "cancel" ? 2 : 0 }}>
            {action?.type === "withdraw"
              ? `"${action?.opp.Title}" will be deleted. This cannot be undone.`
              : `"${action?.opp.Title}" will be marked as cancelled. Registered students will see it as cancelled with your reason, and attendance can no longer be taken.`}
          </DialogContentText>
          {action?.type === "cancel" && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason (shown to registered students)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              helperText={`3-500 characters (${cancelReason.trim().length}/500)`}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAction(null)} disabled={acting}>
            Keep it
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={acting || (action?.type === "cancel" && (cancelReason.trim().length < 3 || cancelReason.trim().length > 500))}
            onClick={confirmAction}
          >
            {acting ? "Working..." : action?.type === "withdraw" ? "Withdraw" : "Cancel Opportunity"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
