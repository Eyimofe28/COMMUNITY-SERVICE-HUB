// =============================================================================
// Login page
// -----------------------------------------------------------------------------
// Flow: user submits email + password -> POST /api/auth/login -> on success the
// session (token, role, name) is saved with saveSession() and the user is sent
// to their role's dashboard.
//
// INPUT VALIDATION: empty fields are caught here before any request is sent;
//   the backend validates again (the real check).
// SECURITY: the password only lives in this component's state and is sent once,
//   over HTTPS on the school server. It is never stored in the browser.
// ERROR HANDLING: wrong credentials, too many attempts, server/network problems
//   and "session expired" all appear as a message in the card.
// REUSABILITY: uses the shared api client, session helpers and error formatter.
// =============================================================================

import { Box, Button, TextField, Typography, Paper, Link, IconButton, Alert } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import api, { getErrorMessage } from "../../api/axios";
import { saveSession, dashboardPathFor, takeLoginNotice } from "../../utils/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Message shown in the card - starts with any notice left for this page
  // (e.g. "Account created", "Your session has expired")
  const [status, setStatus] = useState(() => {
    const notice = takeLoginNotice();
    return notice ? { type: "info", text: notice } : null;
  });

  const handleLogin = async (e) => {
    e.preventDefault(); // stay on the page; the form is handled here
    setStatus(null);

    // Client-side check: both fields are required
    if (!email.trim() || !password) {
      setStatus({ type: "error", text: "Please enter your email and password." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      // Save { token, role, userId, firstName } and go to the right dashboard
      saveSession(res.data);
      navigate(dashboardPathFor(res.data.role));
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error, "Login failed. Please try again.") });
    } finally {
      setSubmitting(false);
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
      <Paper
        component="form"
        noValidate
        onSubmit={handleLogin}
        elevation={0}
        sx={{
          width: "90%",
          maxWidth: 500,
          padding: 5,
          borderRadius: "25px",
          background: "#fff",
          position: "relative",
          animation: "float 4s ease-in-out infinite",

          // Green glow around card ✨
          boxShadow: "0 0 25px 5px rgba(0, 255, 140, 1)",

          "@keyframes float": {
            "0%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-12px)" },
            "100%": { transform: "translateY(0px)" },
          },
        }}
      >
        {/* BACK BUTTON */}
        <IconButton
          onClick={() => navigate("/welcome")}
          sx={{
            position: "absolute",
            top: 20,
            left: 20,
            color: "#0B3D2E",
          }}
        >
          <ArrowBackIosNewIcon />
        </IconButton>

        <Typography
          variant="h4"
          sx={{ textAlign: "center", mb: 4, fontWeight: "700", color: "#0B3D2E" }}
        >
          Login
        </Typography>

        {status && (
          <Alert severity={status.type} sx={{ mb: 2 }}>
            {status.text}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Email"
          type="email"
          autoComplete="username"
          variant="outlined"
          sx={{ mb: 2 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          autoComplete="current-password"
          variant="outlined"
          sx={{ mb: 3 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          sx={{
            background: "#0B3D2E",
            py: 1.4,
            borderRadius: "10px",
            fontWeight: "bold",
            "&:hover": { background: "#0d4d38" },
          }}
        >
          {submitting ? "Logging in..." : "LOGIN"}
        </Button>

        <Typography sx={{ textAlign: "center", mt: 3 }}>
          Don’t have an account?{" "}
          <Link
            onClick={() => navigate("/signup")}
            underline="hover"
            sx={{ cursor: "pointer", fontWeight: "bold" }}
          >
            Sign up
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
