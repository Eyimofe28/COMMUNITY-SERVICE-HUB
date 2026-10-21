// src/pages/StudentDashboard.jsx
import { useEffect, useState } from "react";
import api from "../../api/axios";
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

import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";

// adjust this import path to where you put greetings.jpg
import greetingsImg from "./greetings.png";
import StudentSidebar from "./StudentSidebar";

import Modal from "@mui/material/Modal";
import { formatDate, formatTimeRange, formatHours } from "../../utils/dates";


function getIconForCategory(category) {
  // For now your DB doesn’t have category – this safely falls back to a default.
  const normalized = (category || "").toLowerCase();

  if (normalized.includes("build") || normalized.includes("campus")) {
    return <ApartmentRoundedIcon sx={{ color: "#0B3D2E" }} />;
  }
  if (normalized.includes("clean") || normalized.includes("cleanup")) {
    return <CleaningServicesRoundedIcon sx={{ color: "#0B3D2E" }} />;
  }
  if (normalized.includes("tutor") || normalized.includes("academic")) {
    return <SchoolOutlinedIcon sx={{ color: "#0B3D2E" }} />;
  }
  if (normalized.includes("community") || normalized.includes("volunteer")) {
    return <VolunteerActivismRoundedIcon sx={{ color: "#0B3D2E" }} />;
  }
  // extra suggestion: professional / office-type opportunity
  if (normalized.includes("office") || normalized.includes("admin")) {
    return <WorkOutlineRoundedIcon sx={{ color: "#0B3D2E" }} />;
  }

  // default icon
  return <SchoolRoundedIcon sx={{ color: "#0B3D2E" }} />;
}

export default function StudentDashboard() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [registeringId, setRegisteringId] = useState(null);
  const [registered, setRegistered] = useState([]);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const firstName = localStorage.getItem("firstName") || "Student";
  const [showModal, setShowModal] = useState(false);


  // ---- Fetch approved opportunities ----
  useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Fetch all approved opportunities
      const approvedRes = await api.get(
        "/opportunity/approved"
      );

      const approved = approvedRes.data.opportunities || [];

      // 2. Fetch all registrations for this student
      const regRes = await api.get(
        "/opportunity/my-registrations"
      );

      const registeredList = regRes.data.opportunities || [];
      setRegistered(registeredList);

      // 3. Filter out registered opportunities
      const registeredIds = new Set(
        registeredList.map((r) => r.Opportunity_ID)
      );

      const filtered = approved.filter(
        (opp) => !registeredIds.has(opp.Opportunity_ID)
      );

      setOpportunities(filtered);

    } catch (err) {
      console.error("Fetch opportunities error:", err);
      setError(
        err.response?.data?.message || "Failed to load opportunities."
      );
    } finally {
      setLoading(false);
    }
  };

  if (token) fetchData();
}, [token]);


  // ---- Register for an opportunity ----
  const handleRegister = async (opportunityId) => {
  setRegisteringId(opportunityId);

  try {
    await api.post(
      `/opportunity/register/${opportunityId}`,
      {}
    );

    setOpportunities(prev =>
      prev.map(opp =>
        opp.Opportunity_ID === opportunityId
          ? { ...opp, _registered: true }
          : opp
      )
    );

    setShowModal(true);

  } catch (err) {
    console.error("Register error:", err);
    alert(err.response?.data?.message || "Failed to register.");
  } finally {
    setRegisteringId(null);
  }
};



  return (
    
    <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>
      
      {/* LEFT: Vertical Nav */}
      <StudentSidebar active="dashboard" />

      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <Box
            sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "#ffffff",
            borderRadius: "20px",
            p: 4,
            textAlign: "center",
            boxShadow: "0 0 40px rgba(0,0,0,0.2)"
            }}
        >
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
            🎉 Registration Successful!
            </Typography>

            <Typography sx={{ mb: 3, color: "#555" }}>
            You have successfully registered for this opportunity.
            </Typography>

            <Button
            variant="contained"
            sx={{
                bgcolor: "#0B3D2E",
                py: 1.3,
                width: "100%",
                borderRadius: "10px",
                "&:hover": { bgcolor: "#0d4d38" }
            }}
            onClick={() => {
                setShowModal(false);
                window.location.href = `${process.env.PUBLIC_URL}/student/registered`;
            }}
            >
            Go to Registered Opportunities
            </Button>
        </Box>
        </Modal>


      {/* RIGHT: Main content */}
      <Box
        sx={{
          flex: 1,
          borderRadius: "30px",
          bgcolor: "#ffffff",
          p: 3.5,
          overflow: "auto",
        }}
      >
        {/* Top row: greeting + search */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            // mb: 3,
            alignItems: "center",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827" }}>
            Dashboard
          </Typography>

          <IconButton
            sx={{
              borderRadius: "16px",
              bgcolor: "#F3F4F6",
              width: 44,
              height: 44,
            }}
          >
            <SearchRoundedIcon />
          </IconButton>
        </Box>

        {/* Greeting card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "24px",
            bgcolor: "#F0F9F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 4,
            py: 3,
            mb: 4,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: "#111827", mb: 1 }}
            >
              Hello, {firstName}!
            </Typography>
            <Typography sx={{ color: "#4B5563" }}>
              It&apos;s good to see you again. Explore new opportunities today.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar
              src={greetingsImg}
              alt="greetings"
              sx={{
                width: 96,
                height: 96,
                bgcolor: "#D1FAE5",
              }}
            />
          </Box>
        </Paper>

        {/* Section title */}
        <Typography
          variant="h6"
          sx={{ mb: 2.5, fontWeight: 700, color: "#111827" }}
        >
          Opportunities
        </Typography>

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 6,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        ) : opportunities.length === 0 ? (
          <Typography sx={{ mt: 2, color: "#6B7280" }}>
            🎉 You have registered for all available opportunities.  
            Please check back soon for new ones!
          </Typography>
        ) : (
          opportunities.map((opp) => {
            const id = opp.Opportunity_ID;
            const isExpanded = expandedId === id;

            const date = opp.Date
              ? formatDate(opp.Date)
              : "";
            const timeRange =
              opp.Start_Time && opp.End_Time
                ? formatTimeRange(opp.Start_Time, opp.End_Time)
                : "";

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
                    boxShadow: "0 14px 40px rgba(15, 68, 52, 0.12)",
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.18s ease",
                }}
                onClick={() =>
                  setExpandedId(isExpanded ? null : id)
                }
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  {/* left icon + basic info */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "18px",
                        bgcolor: "#E5F6ED",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {getIconForCategory(opp.Category || opp.Title)}
                    </Box>

                    <Box>
                      <Typography
                        sx={{ fontWeight: 700, color: "#111827", mb: 0.3 }}
                      >
                        {opp.Title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#6B7280" }}
                      >
                        By {opp.Person_In_Charge || "Faculty"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* middle: duration + time */}
                  <Box sx={{ textAlign: "right", mr: 2 }}>
                    {opp.Duration && (
                      <Typography
                        variant="body2"
                        sx={{ color: "#111827", fontWeight: 600 }}
                      >
                        {formatHours(opp.Duration)}
                      </Typography>
                    )}
                    {(date || timeRange) && (
                      <Typography
                        variant="body2"
                        sx={{ color: "#6B7280" }}
                      >
                        {date} {date && timeRange && "•"} {timeRange}
                      </Typography>
                    )}
                  </Box>

                  {/* right: register button */}
                  <Button
                    variant={opp._registered ? "outlined" : "contained"}
                    disabled={opp._registered || registeringId === id}
                    sx={{
                      borderRadius: "999px",
                      px: 3,
                      py: 1,
                      textTransform: "none",
                      fontWeight: 600,
                      bgcolor: opp._registered ? "#FFFFFF" : "#0B3D2E",
                      color: opp._registered ? "#0B3D2E" : "#FFFFFF",
                      "&:hover": {
                        bgcolor: opp._registered ? "#F3F4F6" : "#0d4d38",
                      },
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // don’t toggle expand when clicking button
                      if (!opp._registered) {
                        handleRegister(id);
                      }
                    }}
                  >
                    {opp._registered ? "Registered" : "Register"}
                  </Button>
                </Box>

                {/* Expanded details */}
                {isExpanded && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={0.5}>
                      {opp.Description && (
                        <Typography sx={{ color: "#4B5563" }}>
                          {opp.Description}
                        </Typography>
                      )}
                      {opp.Location && (
                        <Typography
                          variant="body2"
                          sx={{ color: "#6B7280" }}
                        >
                          Location: {opp.Location}
                        </Typography>
                      )}
                      {opp.Approval_Status && (
                        <Typography
                          variant="body2"
                          sx={{ color: "#10B981" }}
                        >
                          Status: {opp.Approval_Status}
                        </Typography>
                      )}
                    </Stack>
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
