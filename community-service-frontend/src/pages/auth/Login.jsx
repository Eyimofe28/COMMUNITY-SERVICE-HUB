import { Box, Button, TextField, Typography, Paper, Link, IconButton } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
  try {
    const res = await axios.post("http://localhost:5000/api/auth/login", {
      email,
      password
    });

    const { token, role, userId, profile } = res.data;

    // Store auth data
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("userId", userId);

    // Store first name for "Hello, ___"
    if (profile?.First_Name) {
      localStorage.setItem("firstName", profile.First_Name);
    }

    // Route user
    if (role === "student") navigate("/student/dashboard");
    else if (role === "approver") navigate("/approver/dashboard");
    else if (role === "faculty") navigate("/faculty/dashboard");
    else navigate("/welcome");

  } catch (error) {
    alert(error.response?.data?.message || "Login failed.");
  }
};


  // const handleLogin = async () => {
  //   try {
  //     const res = await axios.post("http://localhost:5000/api/auth/login", {
  //       email,
  //       password
  //     });

  //     // Save JWT token
  //     localStorage.setItem("token", res.data.token);
  //     localStorage.setItem("role", res.data.role);
  //     localStorage.setItem("userId", res.data.userId);

  //     // Navigate based on role
  //     if (res.data.role === "student") navigate("/student/dashboard");
  //     else if (res.data.role === "approver") navigate("/approver/dashboard");
  //     else if (res.data.role === "faculty") navigate("/faculty/dashboard");
  //     else if (res.data.role === "admin") navigate("/admin/dashboard");
      

  //   } catch (error) {
  //     alert(error.response?.data?.message || "Login failed.");
  //   }
  // };

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

        <TextField
          fullWidth
          label="Email"
          variant="outlined"
          sx={{ mb: 2 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          variant="outlined"
          sx={{ mb: 3 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          variant="contained"
          fullWidth
          sx={{
            background: "#0B3D2E",
            py: 1.4,
            borderRadius: "10px",
            fontWeight: "bold",
            "&:hover": { background: "#0d4d38" },
          }}
          onClick={handleLogin}
        >
          LOGIN
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
