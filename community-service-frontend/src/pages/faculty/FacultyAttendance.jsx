// =============================================================================
// Faculty attendance page
// -----------------------------------------------------------------------------
// Rules (enforced by the backend, mirrored here so the page explains them):
//   - attendance opens when the event starts and can be submitted or CORRECTED
//     until 14 days after the event date (attendanceWindow from the API)
//   - only registered students can be marked; absent students earn 0 hours
//   - hours earned: 0.5-hour steps from 0.5 up to the event's duration
//   - saving again never double-counts: the backend recalculates each
//     student's total from their attendance records
// =============================================================================

import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api/axios";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Checkbox,
  TextField,
  Button,
  Stack,
  Modal,
  Alert,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import FacultySidebar from "./FacultySidebar";
import { formatDate } from "../../utils/dates";

// =============================================================
//                     MODAL STYLING
// =============================================================
const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 420,
  bgcolor: "background.paper",
  borderRadius: "18px",
  boxShadow: 24,
  p: 4,
  textAlign: "center",
};

// Hours earned must be 0.5-hour steps between 0.5 and the event's duration
const hoursError = (value, maxHours) => {
  const h = Number(value);
  if (!Number.isFinite(h) || h < 0.5 || h > maxHours || !Number.isInteger(h * 2)) {
    return `0.5 – ${maxHours} hrs, in half-hour steps`;
  }
  return "";
};

export default function FacultyAttendance() {
  const token = localStorage.getItem("token");
  const firstName = localStorage.getItem("firstName") || "Faculty";

  const [opps, setOpps] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [selectedOppId, setSelectedOppId] = useState(null);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // From the API: may attendance be saved right now, and until when
  const [attendanceWindow, setAttendanceWindow] = useState(null);
  const [maxHours, setMaxHours] = useState(0);
  const [hasRecords, setHasRecords] = useState(false);

  const [attendanceMap, setAttendanceMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  const canEdit = Boolean(attendanceWindow?.open);

  // ---------------------------------------------------
  // 1. Load approved opportunities
  // ---------------------------------------------------
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoadingOpps(true);
      try {
        const res = await api.get("/opportunity/my-submissions");

        const rows = res.data.submissions || [];
        const approved = rows.filter((o) => o.Approval_Status === "Approved");

        setOpps(approved);

        if (approved.length > 0) {
          setSelectedOppId(approved[0].Opportunity_ID);
        }
      } catch (err) {
        console.error("Load submissions error:", err);
      } finally {
        setLoadingOpps(false);
      }
    };

    if (token) fetchSubmissions();
  }, [token]);

  // ---------------------------------------------------
  // 2. Load registered students + attendance window
  // ---------------------------------------------------
  const loadStudents = async (opportunityId) => {
    setLoadingStudents(true);
    setErrorText("");

    try {
      const res = await api.get(`/opportunity/${opportunityId}/registrations`);

      const list = res.data.students || [];
      const max = Number(res.data.maxHours) || 0;
      setStudents(list);
      setMaxHours(max);
      setAttendanceWindow(res.data.attendanceWindow || null);
      setHasRecords(list.some((stu) => stu.Attended !== null && stu.Attended !== undefined));

      // Start from saved values; unsaved students default to attended for the full duration
      const initial = {};
      list.forEach((stu) => {
        const saved = stu.Attended !== null && stu.Attended !== undefined;
        initial[stu.Student_ID] = {
          attended: saved ? stu.Attended === true : true,
          hoursEarned: saved && stu.Attended ? Number(stu.Hours_Earned) : max,
        };
      });

      setAttendanceMap(initial);
    } catch (err) {
      console.error("Load registrations error:", err);
      setStudents([]);
      setErrorText(getErrorMessage(err, "Failed to load registered students."));
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedOppId) loadStudents(selectedOppId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOppId]);

  // ---------------------------------------------------
  // 3. Mark attended / absent, change hours
  // ---------------------------------------------------
  const handleToggleAttended = (studentId) => {
    if (!canEdit) return;

    setAttendanceMap((prev) => {
      const attended = !prev[studentId].attended;
      return {
        ...prev,
        [studentId]: {
          attended,
          // absent = 0 hours; marking present again restores the full duration
          hoursEarned: attended ? maxHours : 0,
        },
      };
    });
  };

  const handleHoursChange = (studentId, value) => {
    if (!canEdit) return;

    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        hoursEarned: value,
      },
    }));
  };

  const invalidHours = Object.values(attendanceMap).some(
    (e) => e.attended && hoursError(e.hoursEarned, maxHours)
  );

  // ---------------------------------------------------
  // 4. SAVE (after confirmation) - also used for corrections
  // ---------------------------------------------------
  const confirmSaveAttendance = async () => {
    setOpenConfirm(false);
    setSaving(true);
    setErrorText("");

    try {
      const payload = Object.entries(attendanceMap).map(
        ([studentId, { attended, hoursEarned }]) => ({
          studentId: Number(studentId),
          attended: !!attended,
          hoursEarned: attended ? Number(hoursEarned) : 0,
        })
      );

      await api.post(`/opportunity/${selectedOppId}/attendance`, { attendance: payload });

      setHasRecords(true);
      setOpenSuccess(true);
    } catch (err) {
      console.error("Submit attendance error:", err);
      setErrorText(getErrorMessage(err, "Failed to save attendance. Nothing was saved."));
    } finally {
      setSaving(false);
    }
  };

  const selectedOpp = opps.find((o) => o.Opportunity_ID === selectedOppId);

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------
  return (
    <Box sx={{ height: "100vh", bgcolor: "#F5F5F7", display: "flex", gap: 2, paddingLeft: 3}}>
      <FacultySidebar active="attendance" />

      <Box
        sx={{
          flex: 1,
          borderRadius: "30px",
          bgcolor: "#ffffff",
          p: 3.5,
          display: "flex",
          gap: 3,
        }}
      >
        {/* LEFT: Opportunity list */}
        <Paper
          elevation={0}
          sx={{
            width: "30%",
            borderRadius: "20px",
            p: 2.5,
            bgcolor: "#F9FAFB",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              alignItems: "center",
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>Your Opportunities</Typography>
            <IconButton sx={{ bgcolor: "#E5E7EB" }}>
              <SearchRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          <Typography variant="body2" sx={{ color: "#6B7280", mb: 1 }}>
            Select an approved opportunity to mark attendance.
          </Typography>

          {loadingOpps ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : opps.length === 0 ? (
            <Typography sx={{ mt: 2, color: "#6B7280" }}>
              You don&apos;t have any approved opportunities yet.
            </Typography>
          ) : (
            <List>
              {opps.map((opp) => (
                <ListItemButton
                  key={opp.Opportunity_ID}
                  selected={selectedOppId === opp.Opportunity_ID}
                  onClick={() => setSelectedOppId(opp.Opportunity_ID)}
                  sx={{
                    mb: 1,
                    borderRadius: "14px",
                    "&.Mui-selected": {
                      bgcolor: "#E5F6ED",
                    },
                  }}
                >
                  <ListItemText
                    primary={opp.Title}
                    secondary={opp.Date ? formatDate(opp.Date) : ""}
                    slotProps={{ primary: { fontWeight: 600 } }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>

        {/* RIGHT: Student list + attendance */}
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Attendance & Registrations
              </Typography>
              <Typography variant="body2" sx={{ color: "#6B7280" }}>
                {selectedOpp
                  ? `Opportunity: ${selectedOpp.Title}`
                  : "Select an opportunity on the left."}
              </Typography>
            </Box>

            <Box sx={{ textAlign: "right" }}>
              <Typography variant="body2" sx={{ color: "#6B7280" }}>
                Hello, {firstName}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* When attendance can be saved */}
          {selectedOppId && !loadingStudents && attendanceWindow && (
            <Alert severity={canEdit ? "info" : "warning"} sx={{ mb: 2 }}>
              {canEdit
                ? `You can submit or correct attendance until ${formatDate(attendanceWindow.closesOn)}.`
                : attendanceWindow.reason}
            </Alert>
          )}

          {errorText && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorText("")}>
              {errorText}
            </Alert>
          )}

          {!selectedOppId ? (
            <Typography sx={{ color: "#6B7280", mt: 2 }}>
              Select an opportunity to view registered students.
            </Typography>
          ) : loadingStudents ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : students.length === 0 ? (
            <Typography sx={{ color: "#6B7280", mt: 2 }}>
              No students have registered for this opportunity yet.
            </Typography>
          ) : (
            <>
              <Stack spacing={2} sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
                {students.map((stu) => {
                  const entry = attendanceMap[stu.Student_ID] || {
                    attended: false,
                    hoursEarned: 0,
                  };
                  const error = entry.attended ? hoursError(entry.hoursEarned, maxHours) : "";

                  return (
                    <Paper
                      key={stu.Student_ID}
                      sx={{
                        p: 2,
                        borderRadius: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: "#F9FAFB",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <PersonRoundedIcon sx={{ color: "#0B3D2E" }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>
                            {stu.First_Name} {stu.Last_Name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "#6B7280" }}
                          >
                            {stu.Email}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Checkbox
                            checked={entry.attended}
                            disabled={!canEdit}
                            onChange={() =>
                              handleToggleAttended(stu.Student_ID)
                            }
                          />
                          <Typography variant="body2">Attended</Typography>
                        </Box>

                        <TextField
                          size="small"
                          type="number"
                          label="Hours earned"
                          value={entry.hoursEarned}
                          disabled={!canEdit || !entry.attended}
                          error={!!error}
                          helperText={error || " "}
                          onChange={(e) =>
                            handleHoursChange(
                              stu.Student_ID,
                              e.target.value
                            )
                          }
                          sx={{ width: 150 }}
                          slotProps={{ htmlInput: { min: 0.5, max: maxHours, step: 0.5 } }}
                        />
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>

              {/* SAVE BUTTON + CONFIRM DIALOG */}
              <Box sx={{ textAlign: "right", mt: 3 }}>
                <Button
                  variant="contained"
                  sx={{ bgcolor: "#0B3D2E", px: 4 }}
                  disabled={saving || !canEdit || invalidHours}
                  onClick={() => setOpenConfirm(true)}
                >
                  {saving ? "Saving..." : hasRecords ? "Update Attendance" : "Save Attendance"}
                </Button>
              </Box>
            </>
          )}

          {/* CONFIRMATION MODAL */}
          <Modal open={openConfirm} onClose={() => setOpenConfirm(false)}>
            <Box sx={modalStyle}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {hasRecords ? "Update Attendance?" : "Save Attendance?"}
              </Typography>

              <Typography sx={{ color: "#4B5563", mb: 3 }}>
                Students&apos; service hours will be updated.
                {attendanceWindow?.closesOn && (
                  <> You can still make corrections until <strong>{formatDate(attendanceWindow.closesOn)}</strong>.</>
                )}
              </Typography>

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  sx={{ px: 3 }}
                  onClick={() => setOpenConfirm(false)}
                >
                  Cancel
                </Button>

                <Button
                  variant="contained"
                  sx={{ bgcolor: "#0B3D2E", px: 3 }}
                  onClick={confirmSaveAttendance}
                >
                  Yes, Save
                </Button>
              </Stack>
            </Box>
          </Modal>

          {/* SUCCESS MODAL */}
          <Modal open={openSuccess} onClose={() => setOpenSuccess(false)}>
            <Box sx={modalStyle}>
              <CheckCircleRoundedIcon
                sx={{ fontSize: 56, color: "#166534", mb: 2 }}
              />

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Attendance Saved!
              </Typography>

              <Typography sx={{ color: "#4B5563", mb: 4 }}>
                Attendance has been saved and students&apos; service hours are up to date.
              </Typography>

              <Button
                variant="contained"
                sx={{ bgcolor: "#0B3D2E", px: 4 }}
                onClick={() => setOpenSuccess(false)}
              >
                Okay, Got It
              </Button>
            </Box>
          </Modal>
        </Paper>
      </Box>
    </Box>
  );
}
