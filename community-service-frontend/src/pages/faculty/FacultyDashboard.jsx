// src/pages/faculty/FacultyDashboard.jsx
import { useEffect, useState } from "react";
import axios from "axios";

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
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";

import FacultySidebar from "./FacultySidebar";
import greetingsImg from "./greetings.png";

// ---------- ICON PICKER ----------
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
  const token = localStorage.getItem("token");
  const firstName = localStorage.getItem("firstName") || "Faculty";

  const [submissions, setSubmissions] = useState([]);
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [pendingPage, setPendingPage] = useState(0);
  const [approvedPage, setApprovedPage] = useState(0);
  const [rejectedPage, setRejectedPage] = useState(0);

  const ITEMS_PER_PAGE = 2;

  // ---------------- LOAD SUBMISSIONS ----------------
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          "http://localhost:5000/api/opportunity/my-submissions",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const rows = res.data.submissions || [];

        // Group them client-side
        setPending(rows.filter((o) => o.Approval_Status === "Pending"));
        setApproved(rows.filter((o) => o.Approval_Status === "Approved"));
        setRejected(rows.filter((o) => o.Approval_Status === "Rejected"));

        setSubmissions(rows);
      } catch (err) {
        console.error("My Submissions Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchSubmissions();
  }, [token]);

  const handleTabChange = (e, v) => {
    setTab(v);
    setExpandedId(null);
  };

  // Get current page based on tab
  const getCurrentPage = () => {
    if (tab === 0) return pendingPage;
    if (tab === 1) return approvedPage;
    return rejectedPage;
  };

  // Set current page based on tab
  const setCurrentPage = (page) => {
    if (tab === 0) setPendingPage(page);
    else if (tab === 1) setApprovedPage(page);
    else setRejectedPage(page);
  };

  // Get current tab data
  const getCurrentData = () => {
    if (tab === 0) return pending;
    if (tab === 1) return approved;
    return rejected;
  };

  // Paginate data
  const currentData = getCurrentData();
  const currentPage = getCurrentPage();
  const startIdx = currentPage * ITEMS_PER_PAGE;
  const paginatedData = currentData.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);

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
    return { ...base, sx: { ...base.sx, bgcolor: "#FEF9C3", color: "#92400E" } };
  };

  // ---------- REUSABLE OPPORTUNITY CARD ----------
  const OpportunityCard = (opp) => {
    const id = opp.Opportunity_ID;
    const expanded = expandedId === id;

    const date = opp.Date ? new Date(opp.Date).toLocaleDateString() : "";
    const timeRange = opp.Start_Time && opp.End_Time ? `${opp.Start_Time} – ${opp.End_Time}` : "";

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
                {opp.Duration} hrs
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

              {/* ⭐ SHOW REJECTION REASON IN REJECTED TAB */}
              {opp.Approval_Status === "Rejected" && opp.Rejection_Reason && (
                <Typography variant="body2" sx={{ color: "#B91C1C", mt: 1 }}>
                  <strong>Rejection Reason:</strong> {opp.Rejection_Reason}
                </Typography>
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
            Dashboard
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

        {/* ---- TABS ---- */}
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{ mb: 3 }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Pending" sx={{ fontWeight: 600, color: 'brown'}} />
          <Tab label="Approved" sx={{ fontWeight: 600 , color: 'green' }} />
          <Tab label="Rejected" sx={{ fontWeight: 600 , color: 'red'}} />
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
    </Box>
  );
}
