// src/pages/StudentMessages.jsx
import { useEffect, useState } from "react";
import api from "../../api/axios";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import StudentSidebar from "./StudentSidebar";

export default function StudentMessages() {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);

  const [registrations, setRegistrations] = useState([]);
  const [activeOpportunity, setActiveOpportunity] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch opportunities student has registered for
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const res = await api.get(
          "/opportunity/my-registrations"
        );

        const list = res.data.opportunities || [];
        setRegistrations(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [token]);

  // Fetch messages for selected opportunity
  useEffect(() => {
    if (!activeOpportunity) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await api.get(
          `/communication/${activeOpportunity}`
        );
        setMessages(res.data.messages || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeOpportunity, token]);

  const handleSelectOpportunity = (oppId) => {
    setActiveOpportunity(oppId);
  };

  const selectedOpp = registrations.find((o) => o.Opportunity_ID === activeOpportunity);

  return (
    <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>
      {/* SIDEBAR */}
      <StudentSidebar active="messages" />

      {/* MAIN AREA */}
      <Box
        sx={{
          flex: 1,
          bgcolor: "#fff",
          borderRadius: "30px",
          p: 4,
          display: "flex",
          gap: 3,
        }}
      >
        {/* LEFT SECTION: Opportunities List */}
        <Box
          sx={{
            width: 330,
            bgcolor: "#F0F9F5",
            borderRadius: "20px",
            paddingLeft: 2,
            paddingRight: 2,
            height: "100%",
            overflowY: "auto",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Opportunities
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : registrations.length === 0 ? (
            <Typography sx={{ color: "#6B7280" }}>
              You are not registered for any opportunities.
            </Typography>
          ) : (
            registrations.map((opp) => (
              <Box
                key={opp.Opportunity_ID}
                onClick={() => handleSelectOpportunity(opp.Opportunity_ID)}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: "16px",
                  cursor: "pointer",
                  bgcolor:
                    activeOpportunity === opp.Opportunity_ID
                      ? "#b0d6bf"
                      : "#fff",
                  "&:hover": { bgcolor: "#F1F5F4" },
                  border: "1px solid #e5e5e5",
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {opp.Title}
                </Typography>

                <Typography sx={{ fontSize: 13, color: "#6B7280" }}>
                  {opp.Person_In_Charge}
                </Typography>
              </Box>
            ))
          )}
        </Box>

        {/* RIGHT SECTION: Messages Panel */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Messages
            </Typography>

            <IconButton sx={{ bgcolor: "#F3F4F6", width: 44, height: 44 }}>
              <SearchRoundedIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Messages Display */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              pr: 1,
            }}
          >
            {!activeOpportunity ? (
              <Typography sx={{ color: "#9CA3AF" }}>
                Select an opportunity on the left to view messages.
              </Typography>
            ) : loadingMessages ? (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : messages.length === 0 ? (
              <Typography sx={{ color: "#9CA3AF" }}>
                No messages yet. Check back soon!
              </Typography>
            ) : (
              messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 3,
                    display: "flex",
                    justifyContent:
                      msg.senderRole === "Student" ? "flex-end" : "flex-start",
                  }}
                >
                  <Box>
                    <Paper
                      sx={{
                        maxWidth: "65%",
                        p: 2,
                        borderRadius: "14px",
                        bgcolor:
                          msg.senderRole === "Student"
                            ? "#DCFCE7"
                            : "#E5E7EB",
                      }}
                    >
                      <Typography sx={{ fontSize: 14 }}>
                        {msg.message}
                      </Typography>
                    </Paper>

                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "#6B7280",
                        mt: 0.5,
                        textAlign:
                          msg.senderRole === "Student" ? "right" : "left",
                      }}
                    >
                      {msg.senderName} • {new Date(msg.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
