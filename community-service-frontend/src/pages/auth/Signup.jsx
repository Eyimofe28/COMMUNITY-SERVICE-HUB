import { Box, Button, TextField, Typography, Paper, IconButton } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import PasswordRequirements from "../../components/PasswordRequirements";
import { isPasswordValid } from "../../utils/passwordRules";
import { validateName, validateEmail, validateDepartment } from "../../utils/validation";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    department: ""
  });

  // Fields the user has left (errors only show after that, or after pressing Continue)
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    firstName: validateName(form.firstName, "First name"),
    lastName: validateName(form.lastName, "Last name"),
    email: validateEmail(form.email),
    password: isPasswordValid(form.password) ? "" : "Password does not meet all the requirements below.",
    confirmPassword:
      form.confirmPassword === form.password && form.confirmPassword ? "" : "Passwords do not match.",
    department: form.role === "faculty" ? validateDepartment(form.department) : "",
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const showError = (field) => (touched[field] || submitted) && !!errors[field];
  const fieldProps = (field) => ({
    name: field,
    value: form[field],
    onChange: handleChange,
    onBlur: () => setTouched((prev) => ({ ...prev, [field]: true })),
    error: showError(field),
    helperText: showError(field) ? errors[field] : " ",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  const handleSignup = async () => {
    setSubmitted(true);
    if (hasErrors) return;

    try {
      await api.post("/auth/signup", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        department: form.role === "faculty" ? form.department : undefined,
      });
      alert("Account created! You can now log in.");
      navigate("/login");
    } catch (error) {
      alert(error.response?.data?.message || "Signup failed.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 4,
        boxSizing: "border-box",
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
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField label="First Name" fullWidth sx={{ mb: 0.5 }} {...fieldProps("firstName")} />
          <TextField label="Last Name" fullWidth sx={{ mb: 0.5 }} {...fieldProps("lastName")} />
        </Box>

        <TextField
          label="MVSU Email"
          placeholder="first.last@mvsu.edu"
          fullWidth
          sx={{ mb: 0.5 }}
          {...fieldProps("email")}
        />

        <TextField label="Password" type="password" fullWidth sx={{ mb: 0.5 }} {...fieldProps("password")} />

        <Box sx={{ mb: 2, px: 0.5 }}>
          <PasswordRequirements password={form.password} />
        </Box>

        <TextField
          label="Confirm Password"
          type="password"
          fullWidth
          sx={{ mb: 0.5 }}
          {...fieldProps("confirmPassword")}
        />

        <TextField
          label="Role"
          select
          name="role"
          value={form.role}
          fullWidth
          SelectProps={{ native: true }}
          sx={{ mb: 2.5 }}
          onChange={handleChange}
        >
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
        </TextField>

        {form.role === "faculty" && (
          <TextField label="Department" fullWidth sx={{ mb: 0.5 }} {...fieldProps("department")} />
        )}

        {/* SUBMIT BUTTON */}
        <Button
          variant="contained"
          fullWidth
          sx={{ py: 1.4, fontSize: "1rem" }}
          onClick={handleSignup}
        >
          Continue
        </Button>
      </Paper>
    </Box>
  );
}
