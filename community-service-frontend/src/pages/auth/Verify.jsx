import { Box, Button, TextField, Typography, Paper } from "@mui/material";
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Verify() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email");

  // Verification code input
  const [code, setCode] = useState("");

  // Timer (10 minutes → 600 seconds)
  const [timeLeft, setTimeLeft] = useState(600);

  // Countdown effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // Convert seconds → mm:ss format
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Handle verification request
  const handleVerify = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/verify", {
        email,
        code,
      });

      alert("Account verified successfully!");
      navigate("/login");
    } catch (error) {
      alert(error.response?.data?.message || "Verification failed.");
    }
  };

  // Handle resend logic
  const handleResend = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/signup", {
        email,
        resend: true,
      });

      alert("A new verification code has been sent!");
      setTimeLeft(600); // reset timer
    } catch (error) {
      alert(error.response?.data?.message || "Failed to resend code.");
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        background: "#0B3D2E",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* 🌿 Outer Light Green Box */}
      <Box
        sx={{
          width: "90%",
          maxWidth: 900,
          height: "75%",
          background: "#1A5F49",
          borderRadius: "30px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 0 25px rgba(0, 255, 140, 0.2)",
        }}
      >
        {/* White Card */}
        <Paper
          elevation={8}
          sx={{
            padding: 6,
            width: "70%",
            maxWidth: 650,
            borderRadius: "25px",
            background: "#fff",
            textAlign: "center",
            mb: 3, // space for resend button
          }}
        >
          <Typography
            variant="h4"
            sx={{ mb: 2, fontWeight: "bold", color: "#0B3D2E" }}
          >
            Verify Your Email
          </Typography>

          <Typography sx={{ mb: 2, opacity: 0.8 }}>
            A 6-digit verification code has been sent to:
            <br />
            <strong>{email}</strong>
          </Typography>

          {/* Red Expiration Warning + Timer */}
          <Typography
            sx={{
              mb: 2,
              color: "red",
              fontWeight: "bold",
              fontSize: "1.1rem",
            }}
          >
            Code will expire in {formatTime(timeLeft)}
          </Typography>

          <TextField
            fullWidth
            label="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            variant="contained"
            sx={{
              background: "#0B3D2E",
              py: 1.4,
              borderRadius: "10px",
              fontWeight: "bold",
              "&:hover": { background: "#0d4d38" },
            }}
            onClick={handleVerify}
            disabled={timeLeft <= 0}
          >
            VERIFY
          </Button>

          {timeLeft <= 0 && (
            <Typography sx={{ color: "red", mt: 1, fontWeight: "bold" }}>
              Code expired — please resend.
            </Typography>
          )}
        </Paper>

        {/* 🌿 RESEND BUTTON */}
        <Button
          variant="text"
          sx={{
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.1rem",
            textDecoration: "underline",
          }}
          onClick={handleResend}
        >
          Resend Code
        </Button>
      </Box>
    </Box>
  );
}
