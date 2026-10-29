// =============================================================================
// Create Opportunity page (faculty)
// -----------------------------------------------------------------------------
// Routes (App.js, via ProtectedRoute):
//   /faculty/create      - new opportunity (faculty only)
//   /faculty/edit/:id    - edit a Pending one, or edit + resubmit a Rejected one
//                          (F1 / F2; faculty, and approvers for their own)
//
// Flow:
//   1. The faculty member fills in Title, Location, Date, Start/End Time and an
//      optional Description. Duration is calculated from the times, not typed.
//   2. handleSubmit checks the form (required fields, date window, end time).
//   3. The form is sent to POST /api/opportunity/create, where the backend
//      checks every rule again (controllers/opportunityController.js).
//   4. On success the user goes to the faculty dashboard, where the new
//      opportunity appears under "Pending" until an approver decides.
//
// Rules (shared with the backend through utils/dates.js):
//   - Date: tomorrow up to MAX_DAYS_AHEAD (365) days ahead, campus time
//   - Times: 30-minute steps between 6:00 AM and 10:00 PM
//   - Length: 30 minutes to 12 hours
// =============================================================================

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getErrorMessage } from "../../api/axios";
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
  Alert,
  CircularProgress,
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
  // Form values. Keys match the database column names. Dates are "YYYY-MM-DD"
  // and times are "HH:MM" (24-hour), exactly as the API expects them.
  const [form, setForm] = useState({
    Title: "",
    Description: "",
    Location: "",
    Date: "",
    Start_Time: "",
    End_Time: "",
    Capacity: "", // max students; "" = no limit
  });

  // Edit mode (F1 / F2): /faculty/edit/:id loads that opportunity into the form.
  // mode: "create" | "edit" (Pending) | "resubmit" (Rejected)
  const { id: editId } = useParams();
  const [mode, setMode] = useState(editId ? null : "create"); // null while loading
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadError, setLoadError] = useState("");

  // Loads the opportunity being edited from the faculty member's own submissions
  useEffect(() => {
    if (!editId) return;
    api
      .get("/opportunity/my-submissions")
      .then((res) => {
        const opp = (res.data.submissions || []).find((o) => String(o.Opportunity_ID) === String(editId));
        if (!opp) {
          setLoadError("Opportunity not found.");
          return;
        }
        if (!["Pending", "Rejected"].includes(opp.Approval_Status)) {
          setLoadError(`This opportunity is ${opp.Approval_Status.toLowerCase()} and can no longer be edited.`);
          return;
        }
        setForm({
          Title: opp.Title || "",
          Description: opp.Description || "",
          Location: opp.Location || "",
          Date: opp.Date || "",
          Start_Time: (opp.Start_Time || "").slice(0, 5), // "09:00:00" -> "09:00"
          End_Time: (opp.End_Time || "").slice(0, 5),
          Capacity: opp.Capacity ? String(opp.Capacity) : "",
        });
        setRejectionReason(opp.Rejection_Reason || "");
        setMode(opp.Approval_Status === "Rejected" ? "resubmit" : "edit");
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Failed to load the opportunity.")));
  }, [editId]);

  // Wording that changes with the mode
  const TEXT = {
    create: { heading: "Create New Opportunity", banner: "Add a New Service Opportunity", button: "Create Opportunity", busy: "Submitting..." },
    edit: { heading: "Edit Opportunity", banner: "Edit Your Pending Opportunity", button: "Save Changes", busy: "Saving..." },
    resubmit: { heading: "Edit & Resubmit", banner: "Fix and Resubmit Your Opportunity", button: "Resubmit for Approval", busy: "Resubmitting..." },
  }[mode || "create"];

  // true while the request is being sent (disables the Create button)
  const [loading, setLoading] = useState(false);
  // Text shown in the error popup, and whether the popup is open
  const [errorMessage, setErrorMessage] = useState("");
  const [openModal, setOpenModal] = useState(false);

  // Updates one form field (the input's "name" attribute says which one).
  // Uses the previous state so quick successive changes are never lost.
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
  // End Time choices for a given start: every allowed time that makes the
  // event 30 minutes to 12 hours long (and never later than 10:00 PM)
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

  // Opens the error popup with a message
  const showError = (msg) => {
    setErrorMessage(msg);
    setOpenModal(true);
  };

  // Title / location / description / capacity limits (mirror the backend).
  // Returns the first problem as a message, or "" when they are all fine.
  function detailErrors() {
    if (form.Title.trim().length < 3 || form.Title.trim().length > 100) return "Title must be 3-100 characters.";
    if (form.Location.trim().length < 2 || form.Location.trim().length > 150) return "Location must be 2-150 characters.";
    if (form.Description.length > 1000) return "Description must be 1000 characters or fewer.";
    if (form.Capacity !== "") {
      const n = Number(form.Capacity);
      if (!Number.isInteger(n) || n < 1 || n > 500) return "Max students must be a whole number from 1 to 500 (or leave it empty).";
    }
    return "";
  }

  // Validates the form, sends it to the backend, then goes to the dashboard.
  // Any problem (from these checks or from the server) is shown in the popup.
  const handleSubmit = async () => {
    // 1. Required fields (Description is optional)
    const requiredFields = ["Title", "Location", "Date", "Start_Time", "End_Time"];

    // Names of the required fields that are still empty
    const missing = requiredFields.filter((f) => !form[f]);

    if (missing.length > 0) {
      return showError(`Opportunity cannot be saved because the following fields are missing: ${missing.join(", ")}`);
    }

    // 1b. Details (same limits as the backend, utils/validation.js)
    const detailsError = detailErrors();
    if (detailsError) {
      return showError(detailsError);
    }

    // 2. Only future dates (tomorrow or later), at most 1 year ahead.
    // "YYYY-MM-DD" strings compare correctly as plain text - no Date objects,
    // so there is no time-zone shift.
    if (form.Date < earliestDate) {
      return showError("Opportunities must be scheduled for a future date (tomorrow or later).");
    }

    if (form.Date > latestDate) {
      return showError(`Opportunities can be scheduled at most ${MAX_DAYS_AHEAD} days ahead.`);
    }

    // 3. The dropdowns only offer valid times, so this is a safety net
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
        capacity: form.Capacity === "" ? null : Number(form.Capacity),
      };

      // 4. Send it. The shared api client adds the login token. The backend
      //    re-checks every rule and saves the opportunity as "Pending"
      //    (an edit stays Pending; a resubmitted one goes back to Pending).
      if (editId) {
        await api.put(`/opportunity/${editId}`, payload);
      } else {
        await api.post("/opportunity/create", payload);
      }

      // 5. Success - the new opportunity is listed under "Pending" on the dashboard
      window.location.href = `${process.env.PUBLIC_URL}/faculty/dashboard`;
    } catch (err) {
      // The backend's message explains what was wrong (e.g. a rule it rejected)
      showError(getErrorMessage(err, "Failed to save the opportunity."));
    } finally {
      setLoading(false);
    }
  };

  return (
      <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>

      <FacultySidebar active={mode === "create" ? "create" : "dashboard"} />

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
            {TEXT.heading}
          </Typography>

          {/* Search button - decorative for now, not connected yet (task L1) */}
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
            {TEXT.banner}
          </Typography>
          <Typography sx={{ color: "#4B5563" }}>
            {mode === "resubmit"
              ? "Update the details below, then resubmit. It will go back to the approvers as Pending."
              : mode === "edit"
              ? "Update the details below. It stays pending until an approver reviews it."
              : "Fill out the details below to create a new community service assignment."}
          </Typography>
        </Paper>

        {/* Why it was rejected (resubmit mode) */}
        {mode === "resubmit" && rejectionReason && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Rejected:</strong> {rejectionReason}
          </Alert>
        )}

        {/* Could not load the opportunity to edit */}
        {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}
        {editId && !mode && !loadError && <CircularProgress size={28} sx={{ mb: 3 }} />}

        {mode && (
        <>

        {/* FORM - MUI v7 Grid: each item takes `size` (columns out of 12 per screen width) */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Title"
              name="Title"
              value={form.Title}
              onChange={handleChange}
              helperText={`3-100 characters (${form.Title.trim().length}/100)`}
              error={form.Title.length > 0 && (form.Title.trim().length < 3 || form.Title.trim().length > 100)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Location"
              name="Location"
              value={form.Location}
              onChange={handleChange}
              helperText="Required"
              error={form.Location.length > 0 && (form.Location.trim().length < 2 || form.Location.trim().length > 150)}
            />
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

          {/* Capacity: optional maximum number of students */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Max students (optional)"
              name="Capacity"
              value={form.Capacity}
              onChange={handleChange}
              helperText="Leave empty for no limit (1-500)"
              error={form.Capacity !== "" && (!Number.isInteger(Number(form.Capacity)) || Number(form.Capacity) < 1 || Number(form.Capacity) > 500)}
              slotProps={{ htmlInput: { min: 1, max: 500, step: 1 } }}
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
              helperText={`Optional (${form.Description.length}/1000)`}
              error={form.Description.length > 1000}
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
              {loading ? TEXT.busy : TEXT.button}
            </Button>
          </Grid>
        </Grid>
        </>
        )}
      </Box>

      {/* ERROR POPUP - shows messages from handleSubmit / the server */}
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
            ⚠️ Cannot Save Opportunity
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
