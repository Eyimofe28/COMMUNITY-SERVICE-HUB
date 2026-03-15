// src/pages/RegisteredOpportunities.jsx
import { useEffect, useState } from "react";
import axios from "axios";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Avatar,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";

import greetingsImg from "./checklist.jpg";
import StudentSidebar from "./StudentSidebar";

function getIconForCategory(category) {
  const normalized = (category || "").toLowerCase();

  if (normalized.includes("build")) return <ApartmentRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("clean")) return <CleaningServicesRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("tutor")) return <SchoolOutlinedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("volunteer")) return <VolunteerActivismRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("office")) return <WorkOutlineRoundedIcon sx={{ color: "#0B3D2E" }} />;

  return <SchoolRoundedIcon sx={{ color: "#0B3D2E" }} />;
}

export default function RegisteredOpportunities() {
  const token = localStorage.getItem("token");
  const firstName = localStorage.getItem("firstName") || "Student";

  const [registered, setRegistered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [unregisteringId, setUnregisteringId] = useState(null);

  // Fetch registered opportunities
  useEffect(() => {
  const fetchRegistered = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/opportunity/my-registrations",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Only keep opportunities where Attended !== 1
      const notCompleted = (res.data.opportunities || []).filter(
        (opp) => opp.Attended !== 1
      );

      setRegistered(notCompleted);
    } catch (error) {
      console.error("Error fetching registered:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchRegistered();
}, [token]);


  // ---- UNREGISTER FUNCTION ----
  const handleUnregister = async (opportunityId) => {
    if (!token) return;
    setUnregisteringId(opportunityId);

    try {
      await axios.delete(
        `http://localhost:5000/api/opportunity/unregister/${opportunityId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove opportunity from UI instantly
      setRegistered((prev) => prev.filter((opp) => opp.Opportunity_ID !== opportunityId));
      alert("You have been unregistered.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unregister.");
    } finally {
      setUnregisteringId(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>
      {/* LEFT NAV */}
      <StudentSidebar active="registered" />

      {/* RIGHT MAIN AREA */}
      <Box
        sx={{
          flex: 1,
          bgcolor: "#fff",
          borderRadius: "30px",
          p: 3.5,
          overflow: "auto",
        }}
      >
        {/* Top header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Registered Opportunities
          </Typography>

          <IconButton sx={{ bgcolor: "#F3F4F6", width: 44, height: 44 }}>
            <SearchRoundedIcon />
          </IconButton>
        </Box>

        {/* Greeting */}
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
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Your Registered Opportunities
            </Typography>
            <Typography sx={{ color: "#4B5563" }}>
              Keep track of your upcoming service commitments.
            </Typography>
          </Box>

          <Avatar src={greetingsImg} sx={{ width: 96, height: 96, bgcolor: "#D1FAE5" }} />
        </Paper>

        {/* Registered List */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
            <CircularProgress />
          </Box>
        ) : registered.length === 0 ? (
          <Typography sx={{ textAlign: "center", color: "#6B7280", mt: 5 }}>
            You have not registered for any opportunities yet.
          </Typography>
        ) : (
          registered.map((opp) => {
            const id = opp.Opportunity_ID;
            const date = opp.Date ? new Date(opp.Date).toLocaleDateString() : "";
            const timeRange = `${opp.Start_Time} – ${opp.End_Time}`;
            const isExpanded = expandedId === id;

            return (
              <Paper
                key={id}
                sx={{
                  borderRadius: "22px",
                  p: 2.5,
                  mb: 2,
                  boxShadow: "0 10px 30px rgba(15,68,52,0.06)",
                  cursor: "pointer",
                  "&:hover": { boxShadow: "0 14px 40px rgba(15,68,52,0.12)" },
                }}
                onClick={() => setExpandedId(isExpanded ? null : id)}
              >
                {/* Top row */}
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "18px",
                        bgcolor: "#E5F6ED",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {getIconForCategory(opp.Title)}
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{opp.Title}</Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280" }}>
                        By {opp.Person_In_Charge || "Faculty"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Right: Date time */}
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontWeight: 600 }}>{opp.Duration} hrs</Typography>
                    <Typography variant="body2" sx={{ color: "#6B7280" }}>
                      {date} • {timeRange}
                    </Typography>
                  </Box>
                </Box>

                {/* Expandable Section */}
                {isExpanded && (
                  <>
                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Stack spacing={1}>
                        <Typography sx={{ color: "#4B5563" }}>{opp.Description}</Typography>

                        <Typography variant="body2" sx={{ color: "#111827" }}>
                          Location: {opp.Location || "N/A"}
                        </Typography>

                        <Typography variant="body2" sx={{ color: "#10B981" }}>
                          Status: Registered
                        </Typography>
                      </Stack>

                      {/* UNREGISTER BUTTON */}
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={unregisteringId === id}
                        sx={{
                          alignSelf: "center",
                          fontWeight: 600,
                          textTransform: "none",
                          px: 3,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregister(id);
                        }}
                      >
                        {unregisteringId === id ? "Unregistering..." : "Unregister"}
                      </Button>
                    </Box>
                  </>
                )}
              </Paper>
            );
          })
        )}
      </Box>
    </Box>
  );
}
