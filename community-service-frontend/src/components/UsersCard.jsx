// =============================================================================
// Users card (Admin Dashboard - Accounts tab) - P5b
// -----------------------------------------------------------------------------
// Lists every account with its role and status. Filter by role with the tabs,
// search by name or email, and promote/demote faculty with the Approver switch.
//
// Promoting/demoting takes effect immediately (roles are read from the database
// on every request). A promoted approver keeps managing the opportunities they
// already created, but can no longer create new ones or approve their own.
//
// API (admins only): GET /admin/users, PATCH /admin/faculty/:userId/approver
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  Stack,
  Divider,
  Tabs,
  Tab,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import api, { getErrorMessage } from "../api/axios";

// Role filter tabs: label + which users each tab shows
const FILTERS = [
  { label: "All", match: () => true },
  { label: "Students", match: (u) => u.Role === "student" },
  { label: "Faculty", match: (u) => u.Role === "faculty" && !u.Approver },
  { label: "Approvers", match: (u) => u.Role === "faculty" && u.Approver === true },
  { label: "Admins", match: (u) => u.Role === "admin" },
];

// Chip text + colour for a user's role (approvers are faculty with the flag on)
const roleChip = (u) => {
  if (u.Role === "admin") return { label: "Admin", bgcolor: "#FDE68A" };
  if (u.Role === "student") return { label: "Student", bgcolor: "#E5F6ED" };
  if (u.Approver) return { label: "Approver", bgcolor: "#DBEAFE" };
  return { label: "Faculty", bgcolor: "#E0E7FF" };
};

// Chip colour for an account status other than approved
const STATUS_COLORS = { pending: "#FEF9C3", declined: "#FEE2E2" };

export default function UsersCard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Index into FILTERS
  const [filter, setFilter] = useState(0);
  // Text typed in the search box
  const [search, setSearch] = useState("");
  // User_ID whose Approver switch is being saved (disables that switch)
  const [savingId, setSavingId] = useState(null);
  // Result of the last action: { type, text }
  const [status, setStatus] = useState(null);

  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.users || []);
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, "Failed to load users.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Promote (true) or demote (false) a faculty member, then refresh the list
  const setApprover = async (user, approver) => {
    setSavingId(user.User_ID);
    try {
      await api.patch(`/admin/faculty/${user.User_ID}/approver`, { approver });
      setStatus({
        type: "success",
        text: `${user.First_Name} ${user.Last_Name} is ${approver ? "now an approver" : "no longer an approver"}.`,
      });
      await loadUsers();
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err, "Failed to update approver status.") });
    } finally {
      setSavingId(null);
    }
  };

  // Users in the selected tab that match the search (name or email)
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        FILTERS[filter].match(u) &&
        (!q || `${u.First_Name} ${u.Last_Name} ${u.Email}`.toLowerCase().includes(q))
    );
  }, [users, filter, search]);

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Users
          </Typography>
          <Typography variant="body2" sx={{ color: "#6B7280" }}>
            Turn on <strong>Approver</strong> for faculty who should review opportunities.
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {status && (
        <Alert severity={status.type} sx={{ mt: 2 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      <Tabs value={filter} onChange={(e, v) => setFilter(v)} variant="scrollable" sx={{ mt: 1 }}>
        {FILTERS.map((f) => (
          <Tab
            key={f.label}
            label={`${f.label} (${users.filter(f.match).length})`}
            sx={{ fontWeight: 600, textTransform: "none" }}
          />
        ))}
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : visible.length === 0 ? (
        <Typography variant="body2" sx={{ color: "#6B7280", py: 2 }}>
          No users match.
        </Typography>
      ) : (
        <Stack divider={<Divider />} spacing={1.5} sx={{ mt: 2, maxHeight: 420, overflowY: "auto", pr: 1 }}>
          {visible.map((u) => {
            const chip = roleChip(u);
            const isFacultyMember = u.Role === "faculty";
            return (
              <Box
                key={u.User_ID}
                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {u.First_Name} {u.Last_Name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#6B7280" }}>
                    {u.Email}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                    <Chip size="small" label={chip.label} sx={{ bgcolor: chip.bgcolor }} />
                    {isFacultyMember && u.Faculty_Dept && <Chip size="small" variant="outlined" label={u.Faculty_Dept} />}
                    {u.Account_Status !== "approved" && (
                      <Chip
                        size="small"
                        label={u.Account_Status === "pending" ? "Pending approval" : "Declined"}
                        sx={{ bgcolor: STATUS_COLORS[u.Account_Status] }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Approver switch - faculty only */}
                {isFacultyMember && (
                  <FormControlLabel
                    label="Approver"
                    labelPlacement="start"
                    control={
                      <Switch
                        checked={u.Approver === true}
                        disabled={savingId !== null}
                        onChange={(e) => setApprover(u, e.target.checked)}
                      />
                    }
                  />
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
