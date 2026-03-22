import { useEffect, useState } from "react";
import axios from "axios";

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
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import FacultySidebar from "./FacultySidebar";

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

export default function FacultyAttendance() {
  const token = localStorage.getItem("token");
  const firstName = localStorage.getItem("firstName") || "Faculty";

  const [opps, setOpps] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [selectedOppId, setSelectedOppId] = useState(null);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [attendanceMap, setAttendanceMap] = useState({});
  const [saving, setSaving] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  // ---------------------------------------------------
  // 1. Load approved opportunities
  // ---------------------------------------------------
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoadingOpps(true);
      try {
        const res = await axios.get(
          "http://localhost:5000/api/opportunity/my-submissions",
          { headers: { Authorization: `Bearer ${token}` } }
        );

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
  // 2. Load registered students
  // ---------------------------------------------------
  useEffect(() => {
    if (!selectedOppId) return;

    const fetchStudents = async () => {
      setLoadingStudents(true);

      try {
        const res = await axios.get(
          `http://localhost:5000/api/opportunity/${selectedOppId}/registrations`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const list = res.data.students || [];
        setStudents(list);

        const selectedOpp = opps.find((o) => o.Opportunity_ID === selectedOppId);
        const defaultHours = selectedOpp?.Duration || 0;

        // NEW: detect submitted
        const alreadySubmitted = list.some(stu => stu.Attended !== null && stu.Attended !== undefined);
        setSubmitted(alreadySubmitted);

        const initial = {};
        list.forEach((stu) => {
          initial[stu.Student_ID] = {
            attended: stu.Attended === 1,
            hoursEarned: stu.Hours_Earned ?? defaultHours,
          };
        });

        setAttendanceMap(initial);


      } catch (err) {
        console.error("Load registrations error:", err);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedOppId, token, opps]);

  // ---------------------------------------------------
  // 3. Toggle attendance
  // ---------------------------------------------------
  const handleToggleAttended = (studentId) => {
    if (submitted) return; // disallow edits

    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        attended: !prev[studentId].attended,
      },
    }));
  };

  const handleHoursChange = (studentId, value) => {
    if (submitted) return; // disallow edits

    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        hoursEarned: value,
      },
    }));
  };

  // ---------------------------------------------------
  // 4. FINAL SAVE (after confirmation)
  // ---------------------------------------------------
  const confirmSaveAttendance = async () => {
    setOpenConfirm(false);
    setSaving(true);

    try {
      const payload = Object.entries(attendanceMap).map(
        ([studentId, { attended, hoursEarned }]) => ({
          studentId: Number(studentId),
          attended: !!attended,
          hoursEarned: attended ? Number(hoursEarned) || 0 : 0,
        })
      );

      await axios.post(
        `http://localhost:5000/api/opportunity/${selectedOppId}/attendance`,
        { attendance: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubmitted(true);
      setOpenSuccess(true);

    } catch (err) {
      console.error("Submit attendance error:", err);
      alert("Failed to submit attendance.");
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
                    secondary={
                      opp.Date
                        ? new Date(opp.Date).toLocaleDateString()
                        : ""
                    }
                    primaryTypographyProps={{ fontWeight: 600 }}
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
                          onChange={(e) =>
                            handleHoursChange(
                              stu.Student_ID,
                              e.target.value
                            )
                          }
                          sx={{ width: 110 }}
                          inputProps={{ min: 0 }}
                        />
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>

              {/* SAVE BUTTON + CONFIRM DIALOG */}
                {students.length > 0 && (
                <Box sx={{ textAlign: "right", mt: 3 }}>
                    <Button
                    variant="contained"
                    sx={{
                        bgcolor: submitted ? "#6B7280" : "#0B3D2E",
                        cursor: submitted ? "not-allowed" : "pointer",
                        px: 4,
                    }}
                    disabled={saving || submitted}
                    onClick={() => setOpenConfirm(true)}
                    >
                    {submitted ? "Attendance Submitted" : saving ? "Saving..." : "Save Attendance"}
                    </Button>
                </Box>
                )}
            </>
          )}

          {/* CONFIRMATION MODAL */}
          <Modal open={openConfirm} onClose={() => setOpenConfirm(false)}>
            <Box sx={modalStyle}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Finalize Attendance?
              </Typography>

              <Typography sx={{ color: "#4B5563", mb: 3 }}>
                Once you submit attendance, <strong>you will not be able to make adjustments</strong>.
                Are you sure you want to continue?
              </Typography>

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  sx={{ px: 3 }}
                  onClick={() => setOpenConfirm(false)}
                >
                  No
                </Button>

                <Button
                  variant="contained"
                  sx={{ bgcolor: "#0B3D2E", px: 3 }}
                  onClick={confirmSaveAttendance}
                >
                  Yes, Submit
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
                Attendance Submitted!
              </Typography>

              <Typography sx={{ color: "#4B5563", mb: 4 }}>
                Attendance records have been successfully saved. Students will be notified of their hours earned.
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
