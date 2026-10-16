import { Box, Button, TextField, Typography, Paper, IconButton } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import PasswordRequirements from "../../components/PasswordRequirements";
import { isPasswordValid } from "../../utils/passwordRules";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student",
    department: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    try {
      await api.post("/auth/signup", form);
      alert("Account created! You can now log in.");
      navigate("/login");
    } catch (error) {
      alert(error.response?.data?.message || "Signup failed.");
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
        position: "relative",
      }}
    >
      {/* FLOATING GLOW EFFECT */}
      <Box
        sx={{
          position: "absolute",
          width: 480,
          height: 680,
          filter: "blur(60px)",
          background: "rgba(0, 255, 120, 0.18)",
          borderRadius: "40px",
          animation: "pulse 4s infinite ease-in-out",
          "@keyframes pulse": {
            "0%": { opacity: 0.5 },
            "50%": { opacity: 0.9 },
            "100%": { opacity: 0.5 }
          }
        }}
      />

      {/* MAIN CARD */}
      <Paper
        elevation={8}
        sx={{
          padding: 5,
          width: 570,
          borderRadius: "30px",
          textAlign: "center",
          backdropFilter: "blur(6px)",
          position: "relative",
          // ✨ GLOW AROUND CARD
          boxShadow: "0 0 25px 5px rgba(0, 255, 140, 1)",
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

        {/* TITLE */}
        <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold", mt: 1 }}>
          Create Account
        </Typography>

        {/* INPUTS */}
        <TextField
          label="First Name"
          name="firstName"
          fullWidth
          sx={{ mb: 2 }}
          onChange={handleChange}
        />

        <TextField
          label="Last Name"
          name="lastName"
          fullWidth
          sx={{ mb: 2 }}
          onChange={handleChange}
        />

        <TextField
          label="Email"
          name="email"
          fullWidth
          sx={{ mb: 2 }}
          onChange={handleChange}
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          fullWidth
          sx={{ mb: 1 }}
          onChange={handleChange}
        />

        <Box sx={{ mb: 2, px: 0.5 }}>
          <PasswordRequirements password={form.password} />
        </Box>

        <TextField
          label="Role"
          select
          name="role"
          fullWidth
          SelectProps={{ native: true }}
          sx={{ mb: 2 }}
          onChange={handleChange}
        >
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
        </TextField>

        {form.role === "faculty" && (
          <TextField
            label="Department"
            name="department"
            fullWidth
            sx={{ mb: 2 }}
            onChange={handleChange}
          />
        )}

        {/* SUBMIT BUTTON */}
        <Button
          variant="contained"
          fullWidth
          sx={{ py: 1.4, fontSize: "1rem" }}
          disabled={!isPasswordValid(form.password)}
          onClick={handleSignup}
        >
          Continue
        </Button>
      </Paper>
    </Box>
  );
}
