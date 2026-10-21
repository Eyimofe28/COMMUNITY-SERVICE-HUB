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
  MenuItem,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import FacultySidebar from "./FacultySidebar";
import {
  todayOnCampus,
  addDays,
  MAX_DAYS_AHEAD,
  TIME_OPTIONS,
  LATEST_END,
  MIN_LENGTH_MINUTES,
  MAX_LENGTH_MINUTES,
  toMinutes,
  formatTime,
  formatDurationMinutes,
} from "../../utils/dates";

export default function FacultyCreateOpportunity() {
  const [form, setForm] = useState({
    Title: "",
    Description: "",
    Location: "",
    Date: "",
    Start_Time: "",
    End_Time: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [openModal, setOpenModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // A new start time can make the chosen end time invalid - clear it
      if (name === "Start_Time" && next.End_Time && !endTimeChoices(value).includes(next.End_Time)) {
        next.End_Time = "";
      }
      return next;
    });
  };

  // Allowed date window (campus time): tomorrow .. MAX_DAYS_AHEAD days ahead.
  // Same rule as the backend (utils/dates.js), which re-checks it.
  const earliestDate = addDays(todayOnCampus(), 1);
  const latestDate = addDays(todayOnCampus(), MAX_DAYS_AHEAD);

  // Time choices (30-minute steps, 6:00 AM - 10:00 PM). Start can be at most
  // 30 minutes before 10 PM; End is always 30 min - 12 hrs after the start.
  const startTimeChoices = TIME_OPTIONS.filter(
    (t) => toMinutes(t) <= toMinutes(LATEST_END) - MIN_LENGTH_MINUTES
  );
  function endTimeChoices(start) {
    if (!start) return [];
    return TIME_OPTIONS.filter((t) => {
      const length = toMinutes(t) - toMinutes(start);
      return length >= MIN_LENGTH_MINUTES && length <= MAX_LENGTH_MINUTES;
    });
  }

  // Duration is calculated from the times (never typed in), e.g. 150 minutes
  const durationMinutes =
    form.Start_Time && form.End_Time ? toMinutes(form.End_Time) - toMinutes(form.Start_Time) : null;

  const showError = (msg) => {
    setErrorMessage(msg);
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const requiredFields = ["Title", "Location", "Date", "Start_Time", "End_Time"];

    const missing = requiredFields.filter((f) => !form[f]);

    if (missing.length > 0) {
      return showError(`Opportunity cannot be created because the following fields are missing: ${missing.join(", ")}`);
    }

    // Only future dates (tomorrow or later), at most 1 year ahead.
    // "YYYY-MM-DD" strings compare correctly as plain text - no Date objects,
    // so there is no time-zone shift.
    if (form.Date < earliestDate) {
      return showError("Opportunities must be scheduled for a future date (tomorrow or later).");
    }

    if (form.Date > latestDate) {
      return showError(`Opportunities can be scheduled at most ${MAX_DAYS_AHEAD} days ahead.`);
    }

    // The dropdowns only offer valid times, so this is a safety net
    if (!endTimeChoices(form.Start_Time).includes(form.End_Time)) {
      return showError("Please choose an End Time 30 minutes to 12 hours after the Start Time.");
    }

    try {
      setLoading(true);

      // No duration is sent - the backend calculates it from the times
      const payload = {
        title: form.Title,
        description: form.Description,
        location: form.Location,
        date: form.Date,
        startTime: form.Start_Time,
        endTime: form.End_Time,
      };

      await api.post("/opportunity/create", payload);


      window.location.href = `${process.env.PUBLIC_URL}/faculty/dashboard`;
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

        {/* FORM - MUI v7 Grid: each item takes `size` (columns out of 12 per screen width) */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Title" name="Title" value={form.Title} onChange={handleChange} />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Location" name="Location" value={form.Location} onChange={handleChange} />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            {/* Native date picker; days outside tomorrow .. 1 year ahead are disabled */}
            <TextField
              fullWidth
              type="date"
              label="Date"
              name="Date"
              value={form.Date}
              onChange={handleChange}
              helperText="Tomorrow or later, up to 1 year ahead"
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: earliestDate, max: latestDate },
              }}
            />
          </Grid>

          {/* Times: dropdowns of valid choices only (30-minute steps, shown as 12-hour) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Start Time"
              name="Start_Time"
              value={form.Start_Time}
              onChange={handleChange}
            >
              {startTimeChoices.map((t) => (
                <MenuItem key={t} value={t}>
                  {formatTime(t)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="End Time"
              name="End_Time"
              value={form.End_Time}
              onChange={handleChange}
              disabled={!form.Start_Time}
              helperText={form.Start_Time ? " " : "Choose a start time first"}
            >
              {endTimeChoices(form.Start_Time).map((t) => (
                <MenuItem key={t} value={t}>
                  {formatTime(t)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Duration: calculated from the times, not typed */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Duration"
              value={durationMinutes ? formatDurationMinutes(durationMinutes) : ""}
              placeholder="Calculated from the times"
              helperText="Calculated automatically"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { readOnly: true, tabIndex: -1 } }}
            />
          </Grid>

          {/* Info tooltip about the time rules */}
          <Grid size={12} sx={{ display: "flex", alignItems: "center", gap: 1, mt: -2 }}>
            <Tooltip title="Times are in 30-minute steps" arrow>
              <InfoRoundedIcon sx={{ fontSize: 20, color: "#0B3D2E", cursor: "pointer" }} />
            </Tooltip>
            <Typography variant="body2" sx={{ color: "#6B7280" }}>
              Opportunities run between 6:00 AM and 10:00 PM and last 30 minutes to 12 hours.
            </Typography>
          </Grid>

          {/* Description */}
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              name="Description"
              value={form.Description}
              onChange={handleChange}
            />
          </Grid>

          {/* Button */}
          <Grid size={12} sx={{ textAlign: "center" }}>
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
