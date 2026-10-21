import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  Tabs,
  Tab,
    IconButton,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import SchoolIcon from "@mui/icons-material/School";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import { logout } from "../../utils/auth";
import { formatDate, formatTimeRange } from "../../utils/dates";

export default function ApproverDashboard() {
  const firstName = localStorage.getItem("firstName") || "Approver";
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejected, setRejected] = useState([]);


  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [tab, setTab] = useState(0);

  // Get Pending opportunities
  const loadPending = async () => {
    try {
      const res = await api.get(
        "/opportunity/pending"
      );
      setPending(res.data.pending || []);
    } catch (err) {
      console.error("Pending Load Error:", err);
    }
  };

  // Get Approved opportunities
  const loadApproved = async () => {
    try {
      const res = await api.get(
            "/opportunity/approved-by-me"
    );

      setApproved(res.data.approved || []);
    } catch (err) {
      console.error("Approved Load Error:", err);
    }
  };
    // Get Rejected opportunities
    const loadRejected = async () => {
    try {
        const res = await api.get(
        "/opportunity/rejected-by-me"
        );
        setRejected(res.data.rejected || []);
    } catch (err) {
        console.error("Rejected Load Error:", err);
    }
    };

    useEffect(() => {
    loadPending();
    loadApproved();
    loadRejected();
    }, []);



  const reject = async () => {
    if (!selectedOpp) return;

    try {
        await api.patch(
        `/opportunity/approve/${selectedOpp.Opportunity_ID}`,
        { status: "Rejected", rejectionReason }
        );

        setRejectModalOpen(false);
        setRejectionReason("");
        setSelectedOpp(null);

        loadPending();
        loadApproved();
        loadRejected();

    } catch (err) {
        console.error("Reject Error:", err);
    }
    };


  const approve = async (id) => {
    try {
      await api.patch(
        `/opportunity/approve/${id}`,
        { status: "Approved" }
      );
      loadPending();
      loadApproved();
    } catch (err) {
      console.error("Approve Error:", err);
    }
  };

  const getIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes("build")) return <ApartmentRoundedIcon sx={{ color: "#0B3D2E" }} />;
    if (t.includes("clean")) return <CleaningServicesRoundedIcon sx={{ color: "#0B3D2E" }} />;
    if (t.includes("tutor") || t.includes("school"))
      return <SchoolIcon sx={{ color: "#0B3D2E" }} />;
    return <VolunteerActivismRoundedIcon sx={{ color: "#0B3D2E" }} />;
  };

  return (
    <Box sx={{ display: "flex", bgcolor: "#F5F5F7", height: "100vh", overflow: "hidden" }}>
      {/* MAIN CONTENT AREA */}
      <Box sx={{ flexGrow: 1, p: 5, display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* HEADER + SEARCH */}
        <Box sx={{ display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Dashboard
          </Typography>

          <IconButton sx={{ color: "#111010ff", mt: 2 }} onClick={() => logout()}>
            <LogoutRoundedIcon />
          </IconButton>
        </Box>

        {/* HELLO BANNER */}
        <Paper
          sx={{
            mt: 3,
            p: 4,
            borderRadius: "20px",
            bgcolor: "#E8F5E9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: "28px", fontWeight: "800" }}>
              Hello, {firstName}!
            </Typography>
            <Typography sx={{ color: "#4B5563", mt: 1 }}>
              Manage and approve community service opportunities.
            </Typography>
          </Box>

          <img
            src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png"
            alt="Approver"
            width={110}
          />
        </Paper>

        {/* NAV TABS */}
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{ mt: 4, flexShrink: 0 }}
          textColor="primary"
          indicatorColor="primary"
          bgcolor="#144C3A"
          borderRadius="10px"
          boxShadow="0 4px 12px rgba(0,0,0,0.05)"
        >
          <Tab label="Pending Opportunities" sx={{ fontWeight: 600 }} />
          <Tab label="Approved BY YOU" sx={{ fontWeight: 600 }} />
          <Tab label="Rejected BY YOU" sx={{ fontWeight: 600 }} />   // NEW TAB
        </Tabs>

        <Divider sx={{ mb: 3, flexShrink: 0 }} />
        
        {/* SCROLLABLE TAB CONTENT CONTAINER */}
        <Box sx={{ flex: 1, overflow: "auto", pr: 2, pb: 5.5 }}>
          {/* TAB CONTENT */}
          {tab === 0 && (
            <>
              {pending.length === 0 ? (
                <Typography sx={{ color: "#6B7280", mt: 2 }}>
                  No pending opportunities.
                </Typography>
              ) : (
                pending.map((o) => (
                  <Paper
                    key={o.Opportunity_ID}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: "20px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* TITLE + ICON */}
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            bgcolor: "#E5F6ED",
                            borderRadius: "14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {getIcon(o.Title)}
                        </Box>

                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "18px" }}>
                            {o.Title}
                          </Typography>
                          <Typography sx={{ color: "#6B7280" }}>
                            {formatDate(o.Date)} • {formatTimeRange(o.Start_Time, o.End_Time)}
                          </Typography>
                          <Typography sx={{ color: "#4B5563", fontSize: "14px" }}>
                            Created by: {o.Person_In_Charge}
                          </Typography>

                        </Box>
                      </Box>

                      <Chip label="Pending" sx={{ bgcolor: "#FEF9C3" }} />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography sx={{ mb: 2 }}>{o.Description}</Typography>

                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        variant="contained"
                        sx={{
                          bgcolor: "#166534",
                          "&:hover": { bgcolor: "#14532D" },
                        }}
                        onClick={() => approve(o.Opportunity_ID)}
                      >
                        Approve
                      </Button>

                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => {
                            setSelectedOpp(o);
                            setRejectModalOpen(true);
                        }}
                        >
                        Reject
                    </Button>

                    </Box>
                  </Paper>
                ))
              )}
            </>
          )}

          {tab === 1 && (
            <>
              {approved.length === 0 ? (
                <Typography sx={{ color: "#6B7280", mt: 2 }}>
                  No approved opportunities yet.
                </Typography>
              ) : (
                approved.map((o) => (
                  <Paper
                    key={o.Opportunity_ID}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: "20px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* TITLE + ICON */}
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            bgcolor: "#E5F6ED",
                            borderRadius: "14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {getIcon(o.Title)}
                        </Box>

                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "18px" }}>
                            {o.Title}
                          </Typography>
                          <Typography sx={{ color: "#6B7280" }}>
                            {formatDate(o.Date)} • {formatTimeRange(o.Start_Time, o.End_Time)}
                          </Typography>
                          <Typography sx={{ color: "#4B5563", fontSize: "14px" }}>
                            Created by: {o.Person_In_Charge}
                          </Typography>

                        </Box>
                      </Box>

                      <Chip
                        label="Approved"
                        sx={{ bgcolor: "#DCFCE7", color: "#166534" }}
                      />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography>{o.Description}</Typography>
                  </Paper>
                ))
              )}
            </>
          )}

          {tab === 2 && (
            <>
              {rejected.length === 0 ? (
                <Typography sx={{ color: "#6B7280", mt: 2 }}>
                  No rejected opportunities yet.
                </Typography>
              ) : (
                rejected.map((o) => (
                  <Paper
                    key={o.Opportunity_ID}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: "20px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            bgcolor: "#FEE2E2",
                            borderRadius: "14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {getIcon(o.Title)}
                        </Box>

                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "18px" }}>
                            {o.Title}
                          </Typography>
                          <Typography sx={{ color: "#6B7280" }}>
                            {formatDate(o.Date)} • {formatTimeRange(o.Start_Time, o.End_Time)}
                          </Typography>
                          <Typography sx={{ color: "#4B5563", fontSize: "14px" }}>
                            Created by: {o.Person_In_Charge}
                          </Typography>

                        </Box>
                      </Box>

                      <Chip label="Rejected" sx={{ bgcolor: "#FECACA", color: "#B91C1C" }} />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography sx={{ mb: 1 }}>{o.Description}</Typography>
                    <Typography sx={{ color: "#B91C1C", fontWeight: 600 }}>
                      Reason: {o.Rejection_Reason}
                    </Typography>
                  </Paper>
                ))
              )}
            </>
          )}
        </Box>

        {/* REJECTION MODAL */}
        <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)}>
          <DialogTitle>Reject Opportunity</DialogTitle>

          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={reject}
            >
              Submit Rejection
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
