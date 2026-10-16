// src/pages/FacultyCreateOpportunity.jsx
import { useState } from "react";
import api from "../../api/axios";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  Modal,
  Tooltip,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import FacultySidebar from "./FacultySidebar";

export default function FacultyCreateOpportunity() {
  const [form, setForm] = useState({
    Title: "",
    Description: "",
    Location: "",
    Date: "",
    Start_Time: "",
    End_Time: "",
    Duration: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [openModal, setOpenModal] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const calculateDuration = () => {
    if (!form.Start_Time || !form.End_Time) return null;

    const start = new Date(`2025-01-01 ${form.Start_Time}`);
    const end = new Date(`2025-01-01 ${form.End_Time}`);

    const diff = (end - start) / (1000 * 60 * 60);
    return diff > 0 ? diff : null;
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const requiredFields = ["Title", "Location", "Date", "Start_Time", "End_Time", "Duration"];

    const missing = requiredFields.filter((f) => !form[f]);

    if (missing.length > 0) {
      return showError(`Opportunity cannot be created because the following fields are missing: ${missing.join(", ")}`);
    }

    // Prevent creating opportunities in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(form.Date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return showError("The date you selected has already passed. Please choose a future date.");
    }
    
    // Enforce hourly times on frontend
    const validHourly = (t) => t.endsWith(":00");

    if (!validHourly(form.Start_Time) || !validHourly(form.End_Time)) {
      return showError("Start and End times must fall on the hour (e.g., 09:00, 14:00).");
    }


    const calculated = calculateDuration();
    const manualDuration = parseFloat(form.Duration);

    if (calculated === null || calculated <= 0) {
      return showError("Duration cannot be calculated. Ensure start and end times are valid.");
    }

    if (manualDuration !== calculated) {
      return showError(
        `Duration mismatch: Expected ${calculated} hours based on times entered, but received ${manualDuration} hours.`
      );
    }

    try {
      setLoading(true);

      const payload = {
      title: form.Title,
      description: form.Description,
      location: form.Location,
      date: form.Date,
      startTime: form.Start_Time,
      endTime: form.End_Time,
      duration: form.Duration,
    };



      await api.post("/opportunity/create", payload);


      window.location.href = "/faculty/dashboard";
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create opportunity.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>

      <FacultySidebar active="create" />

      <Box
        sx={{
          flex: 1,
          bgcolor: "#fff",
          borderRadius: "30px",
          p: 3.5,
          overflow: "auto",
        }}
      >
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Create New Opportunity
          </Typography>

          <IconButton sx={{ bgcolor: "#F3F4F6", width: 44, height: 44 }}>
            <SearchRoundedIcon />
          </IconButton>
        </Box>

        {/* BANNER */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "24px",
            bgcolor: "#F0F9F5",
            px: 4,
            py: 3,
            mb: 4,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Add a New Service Opportunity
          </Typography>
          <Typography sx={{ color: "#4B5563" }}>
            Fill out the details below to create a new community service assignment.
          </Typography>
        </Paper>

        {/* FORM */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Title" name="Title" value={form.Title} onChange={handleChange} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Location" name="Location" value={form.Location} onChange={handleChange} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              name="Date"
              value={form.Date}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="time"
              label="Start Time"
              InputLabelProps={{ shrink: true }}
              name="Start_Time"
              value={form.Start_Time}
              onChange={handleChange}
              inputProps={{ step: 3600 }}   // ⬅ Only hourly increments  
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="time"
              label="End Time"
              InputLabelProps={{ shrink: true }}
              name="End_Time"
              value={form.End_Time}
              onChange={handleChange}
              inputProps={{ step: 3600 }}   // ⬅ Only hourly
            />
          </Grid>
          
          {/* Info tooltip about time format */}
          <Tooltip title="24 Hour Format Timing" arrow>
                <InfoRoundedIcon sx={{ fontSize: 20, color: "#0B3D2E", cursor: "pointer" }} />
          </Tooltip>

          {/* Duration */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Duration (hrs)"
              name="Duration"
              value={form.Duration}
              onChange={handleChange}
            />
          </Grid>

          {/* Description */}
          {/* <Grid item xs={12}> */}
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              name="Description"
              value={form.Description}
              onChange={handleChange}
            />
          {/* </Grid> */}

          {/* Button */}
          <Grid item xs={12} sx={{ textAlign: "center" }}>
            <Button
              variant="contained"
              sx={{
                bgcolor: "#0B3D2E",
                py: 1.5,
                px: 6,
                borderRadius: "12px",
                fontWeight: 700,
                "&:hover": { bgcolor: "#0d4d38" },
              }}
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Submitting..." : "Create Opportunity"}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* ❗ ERROR MODAL ❗ */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "white",
            borderRadius: "20px",
            p: 4,
            width: 420,
            boxShadow: 24,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            ⚠️ Cannot Create Opportunity
          </Typography>

          <Typography sx={{ color: "#4B5563", mb: 2 }}>{errorMessage}</Typography>

          <Button
            fullWidth
            variant="contained"
            sx={{ bgcolor: "#0B3D2E", borderRadius: "10px", "&:hover": { bgcolor: "#0d4d38" } }}
            onClick={() => setOpenModal(false)}
          >
            Close
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
