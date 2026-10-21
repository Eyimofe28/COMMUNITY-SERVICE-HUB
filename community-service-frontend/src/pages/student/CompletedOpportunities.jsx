// src/pages/CompletedOpportunities.jsx
import { useEffect, useState } from "react";
import api from "../../api/axios";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Avatar,
  Stack,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";

import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";

import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import StudentSidebar from "./StudentSidebar";
import { formatDate, formatTimeRange, formatHours, attendanceCorrectableUntil } from "../../utils/dates";


function getIconForCategory(category) {
  const normalized = (category || "").toLowerCase();

  if (normalized.includes("build")) return <ApartmentRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("clean")) return <CleaningServicesRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("tutor")) return <SchoolOutlinedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("volunteer")) return <VolunteerActivismRoundedIcon sx={{ color: "#0B3D2E" }} />;
  if (normalized.includes("office")) return <WorkOutlineRoundedIcon sx={{ color: "#0B3D2E" }} />;

  return <SchoolRoundedIcon sx={{ color: "#0B3D2E" }} />;
}

export default function CompletedOpportunities() {
  const token = localStorage.getItem("token");
  const firstName = localStorage.getItem("firstName") || "Student";

  const [completed, setCompleted] = useState([]);
  // Past opportunities the student was marked absent from (earn 0 hours)
  const [missed, setMissed] = useState([]);
  // 0 = Completed tab, 1 = Missed tab
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const TOTAL_REQUIRED_HOURS = 60;

  useEffect(() => {
    const fetchCompleted = async () => {
      try {
        const res = await api.get(
          "/opportunity/my-registrations"
        );

        // History: attended ones count toward hours, missed ones (Attended = false)
        // are listed separately. Not-yet-recorded ones stay on the Registered page.
        // Newest first (the API returns oldest first)
        const all = [...(res.data.opportunities || [])].reverse();
        setCompleted(all.filter((opp) => opp.Attended === true));
        setMissed(all.filter((opp) => opp.Attended === false));
      } catch (error) {
        console.error("Error fetching completed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompleted();
  }, [token]);

  const totalHours = completed.reduce((sum, opp) => sum + Number(opp.Hours_Earned || 0), 0);


  const progressPercent = Math.min(
    Math.round((totalHours / TOTAL_REQUIRED_HOURS) * 100),
    100
  );


  return (
    <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>
      
      {/* LEFT SIDEBAR */}
      <StudentSidebar active="completed" />

      {/* MAIN CONTENT */}
      <Box
        sx={{
          flex: 1,
          bgcolor: "#fff",
          borderRadius: "30px",
          p: 3.5,
          overflow: "auto",
        }}
      >
        {/* PAGE HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Completed Opportunities
          </Typography>

          <IconButton sx={{ bgcolor: "#F3F4F6", width: 44, height: 44 }}>
            <SearchRoundedIcon />
          </IconButton>
        </Box>

        {/* LIVE HOURS TRACKER */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "24px",
            bgcolor: "#E8FFF1",
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
              Your Service Progress
            </Typography>
            <Typography sx={{ color: "#4B5563" }}>
              You’ve completed {totalHours} of 60 required community service hours.
            </Typography>
          </Box>

          {/* circular progress manually styled */} 
            <Box
            sx={{
                position: "relative",
                width: 120,
                height: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
            >
            {/* Background Circle */}
            <CircularProgress
                variant="determinate"
                value={100}
                size={120}
                thickness={4}
                sx={{ color: "#E5E7EB" }} // light grey background
            />

            {/* Foreground Progress Arc */}
            <CircularProgress
                variant="determinate"
                value={progressPercent}
                size={120}
                thickness={4}
                sx={{
                color: "#0B3D2E", // blue like example
                position: "absolute",
                left: 0,
                }}
            />

            {/* Percentage Text */}
            <Box
                sx={{
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                }}
            >
                <Typography
                sx={{ fontWeight: 700, fontSize: "1.4rem", color: "#111827" }}
                >
                {progressPercent}%
                </Typography>
            </Box>
            </Box>


        </Paper>

        {/* HISTORY TABS - same pattern as the faculty dashboard. The counts in the
            labels make missed opportunities visible without opening the tab. */}
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{ mb: 3 }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label={`Completed (${completed.length})`} sx={{ fontWeight: 600, color: "green" }} />
          <Tab label={`Missed (${missed.length})`} sx={{ fontWeight: 600, color: "red" }} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : tab === 0 ? (
          /* ---------------- COMPLETED TAB ---------------- */
          completed.length === 0 ? (
            <Typography sx={{ color: "#6B7280", textAlign: "center", mt: 5 }}>
              You haven’t completed any service opportunities yet.
            </Typography>
          ) : (
            completed.map((opp) => {
              const id = opp.Opportunity_ID;
              const date = formatDate(opp.Date);
              const timeRange = formatTimeRange(opp.Start_Time, opp.End_Time);

              return (
                <Paper
                  key={id}
                  sx={{
                    borderRadius: "22px",
                    p: 2.5,
                    mb: 2,
                    bgcolor: "#ECFDF5",
                    boxShadow: "0 10px 30px rgba(16,185,129,0.12)",
                    border: "1px solid #A7F3D0",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "18px",
                          bgcolor: "#D1FAE5",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {getIconForCategory(opp.Title)}
                      </Box>

                      <Box>
                        <Typography sx={{ fontWeight: 700, color: "#065F46" }}>
                          {opp.Title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#0F766E" }}>
                          By {opp.Person_In_Charge || "Faculty"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontWeight: 600, color: "#064E3B" }}>
                        {formatHours(opp.Hours_Earned)} earned
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#0F766E" }}>
                        {date} • {timeRange}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography sx={{ color: "#047857", mb: 1 }}>
                    {opp.Description}
                  </Typography>

                  <Typography variant="body2" sx={{ color: "#065F46" }}>
                    Location: {opp.Location || "N/A"}
                  </Typography>

                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: "#059669" }}>
                    ✔ Completed
                  </Typography>
                </Paper>
              );
            })
          )
        ) : (
          /* ---------------- MISSED TAB (marked absent - 0 hours) ---------------- */
          missed.length === 0 ? (
            <Typography sx={{ color: "#6B7280", textAlign: "center", mt: 5 }}>
              No missed opportunities. Keep it up!
            </Typography>
          ) : (
            missed.map((opp) => {
              const id = opp.Opportunity_ID;
              // While faculty can still correct attendance, tell the student how to
              // get a mistaken "absent" fixed and by when
              const correctableUntil = attendanceCorrectableUntil(opp.Date);

              return (
                <Paper
                  key={id}
                  elevation={0}
                  sx={{
                    borderRadius: "22px",
                    p: 2.5,
                    mb: 2,
                    bgcolor: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "18px",
                          bgcolor: "#F3F4F6",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {getIconForCategory(opp.Title)}
                      </Box>

                      <Box>
                        <Typography sx={{ fontWeight: 700, color: "#374151" }}>
                          {opp.Title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#6B7280" }}>
                          By {opp.Person_In_Charge || "Faculty"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontWeight: 600, color: "#6B7280" }}>
                        0 hrs earned
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280" }}>
                        {formatDate(opp.Date)} • {formatTimeRange(opp.Start_Time, opp.End_Time)}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" sx={{ color: "#4B5563" }}>
                    Location: {opp.Location || "N/A"}
                  </Typography>

                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: "#B91C1C" }}>
                    ✖ Missed
                  </Typography>

                  {correctableUntil && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Think this is a mistake? Contact {opp.Person_In_Charge || "the faculty member in charge"} by{" "}
                      <strong>{formatDate(correctableUntil)}</strong> — they can correct your attendance until then.
                    </Alert>
                  )}
                </Paper>
              );
            })
          )
        )}
      </Box>
    </Box>
  );
}
