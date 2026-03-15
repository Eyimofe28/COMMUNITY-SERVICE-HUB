// src/pages/StudentMessages.jsx
import { useEffect, useState } from "react";
import axios from "axios";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  TextField,
  Button,
  Stack,
} from "@mui/material";

import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import StudentSidebar from "./StudentSidebar";

export default function StudentMessages() {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);

  const [registrations, setRegistrations] = useState([]);
  const [activeOpportunity, setActiveOpportunity] = useState(null);

  const [messages, setMessages] = useState([]);

  // Fetch opportunities student has registered for
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/opportunity/my-registrations",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const list = res.data.opportunities || [];
        setRegistrations(list);

        if (list.length > 0) {
          setActiveOpportunity(list[0].Opportunity_ID);
        }
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
      try {
        const res = await axios.get(
          `http://localhost:5000/api/communication/${activeOpportunity}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(res.data.messages || []);
      } catch (e) {
        console.error(e);
      }
    };

    fetchMessages();
  }, [activeOpportunity, token]);

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
          p: 3.5,
          display: "flex",
          gap: 3,
        }}
      >
        {/* LEFT SECTION: Opportunities List */}
        <Paper
          elevation={0}
          sx={{
            width: "28%",
            borderRadius: "20px",
            p: 2,
            bgcolor: "#F0F9F5",
            overflowY: "auto",
          }}
        >
          <Typography sx={{ fontWeight: 700, mb: 2 }}>
            Opportunities
          </Typography>

          {loading ? (
            <CircularProgress />
          ) : registrations.length === 0 ? (
            <Typography sx={{ color: "#6B7280" }}>
              You are not registered for any opportunities.
            </Typography>
          ) : (
            registrations.map((opp) => (
              <Paper
                key={opp.Opportunity_ID}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: "16px",
                  cursor: "pointer",
                  bgcolor:
                    activeOpportunity === opp.Opportunity_ID
                      ? "#E5F6ED"
                      : "#ffffff",
                  "&:hover": { bgcolor: "#F0FDF4" },
                }}
                onClick={() => setActiveOpportunity(opp.Opportunity_ID)}
              >
                <Typography sx={{ fontWeight: 600 }}>
                  {opp.Title}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ color: "#6B7280", mt: 0.5 }}
                >
                  {opp.Person_In_Charge}
                </Typography>
              </Paper>
            ))
          )}
        </Paper>

        {/* RIGHT SECTION: Messages Panel */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: "20px",
            p: 3,
            display: "flex",
            flexDirection: "column",
          }}
        >
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

            <IconButton sx={{ bgcolor: "#F3F4F6" }}>
              <SearchRoundedIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              pr: 1,
            }}
          >
            {messages.length === 0 ? (
              <Typography sx={{ mt: 5, color: "#9CA3AF", textAlign: "center" }}>
                No messages yet. Start the conversation!
              </Typography>
            ) : (
              messages.map((msg, index) => (
                <Stack
                  key={index}
                  sx={{
                    mb: 2,
                    alignItems:
                      msg.senderRole === "Student"
                        ? "flex-end"
                        : "flex-start",
                  }}
                >
                  <Paper
                    sx={{
                      maxWidth: "65%",
                      p: 1.5,
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
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "#6B7280",
                        mt: 0.5,
                        textAlign: "right",
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleString()}
                    </Typography>
                  </Paper>
                </Stack>
              ))
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
