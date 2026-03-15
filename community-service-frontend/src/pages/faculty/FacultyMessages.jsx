// src/pages/FacultyMessages.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  IconButton,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FacultySidebar from "./FacultySidebar";

export default function FacultyMessages() {
  const token = localStorage.getItem("token");

  const [conversations, setConversations] = useState([]);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  // Fetch all faculty submissions
  const fetchConversations = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/opportunity/my-submissions",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const rows =
        res.data.submissions ||
        res.data.opportunities ||
        res.data ||
        [];

      setConversations(rows);
    } catch (error) {
      console.error("Conversation Load Error:", error);
    }
  };

  // Fetch messages for selected opportunity
  const fetchMessages = async (opportunityId) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/communication/${opportunityId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(res.data.messages || []);
    } catch (error) {
      console.error("Message Load Error:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSelectConversation = (opp) => {
    setSelectedOpp(opp);
    fetchMessages(opp.Opportunity_ID);
  };

  // Send a message (only allowed if approved)
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedOpp) return;

    try {
      await axios.post(
        `http://localhost:5000/api/communication/${selectedOpp.Opportunity_ID}`,
        { message: messageInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessageInput("");
      fetchMessages(selectedOpp.Opportunity_ID);
    } catch (error) {
      console.error("Send Message Error:", error);
    }
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date)) return "";
      return date.toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>
      <FacultySidebar active="messages" />

      {/* MAIN CONTENT */}
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
        {/* LEFT — Conversation List */}
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
            Conversations
          </Typography>

          {conversations.map((opp) => (
            <Box
              key={opp.Opportunity_ID}
              onClick={() => handleSelectConversation(opp)}
              sx={{
                p: 2,
                mb: 1.5,
                borderRadius: "16px",
                cursor: "pointer",
                bgcolor:
                  selectedOpp?.Opportunity_ID === opp.Opportunity_ID
                    ? "#E8F5ED"
                    : "#fff",
                "&:hover": { bgcolor: "#F1F5F4" },
                border: "1px solid #e5e5e5",
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>
                {opp.Title}
              </Typography>

              <Typography sx={{ fontSize: 13, color: "#6B7280" }}>
                Status: {opp.Approval_Status}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* RIGHT — Messages */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* HEADER */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Messages
            </Typography>

            <IconButton sx={{ bgcolor: "#F3F4F6", width: 44, height: 44 }}>
              <SearchRoundedIcon />
            </IconButton>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* MESSAGE DISPLAY AREA */}
          <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
            {!selectedOpp ? (
              <Typography sx={{ color: "#9CA3AF" }}>
                Select a conversation to view messages.
              </Typography>
            ) : messages.length === 0 ? (
              <Typography sx={{ color: "#9CA3AF" }}>
                No messages have been sent yet.
              </Typography>
            ) : (
              messages.map((msg) => (
                <Box key={msg.timestamp + msg.senderName} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      bgcolor: "#E5E7EB",
                      px: 2,
                      py: 1,
                      borderRadius: "12px",
                      mb: 0.5,
                    }}
                  >
                    <Typography>{msg.message}</Typography>
                  </Box>

                  <Typography sx={{ fontSize: 12, color: "#9CA3AF" }}>
                    {msg.senderName} • {formatDate(msg.timestamp)}
                  </Typography>
                </Box>

              ))
            )}
          </Box>

          {/* INPUT AREA */}
          {selectedOpp && (
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                disabled={selectedOpp.Approval_Status !== "Approved"}
                placeholder={
                  selectedOpp.Approval_Status === "Approved"
                    ? "Type a message..."
                    : "You cannot send messages until this opportunity is approved."
                }
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                sx={{
                  bgcolor: "#F3F4F6",
                  borderRadius: "12px",
                }}
              />

              <Button
                variant="contained"
                disabled={selectedOpp.Approval_Status !== "Approved"}
                sx={{
                  bgcolor:
                    selectedOpp.Approval_Status === "Approved"
                      ? "#0B3D2E"
                      : "#9CA3AF",
                  px: 4,
                  borderRadius: "12px",
                  "&:hover": {
                    bgcolor:
                      selectedOpp.Approval_Status === "Approved"
                        ? "#0d4d38"
                        : "#9CA3AF",
                  },
                }}
                onClick={sendMessage}
              >
                SEND
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
