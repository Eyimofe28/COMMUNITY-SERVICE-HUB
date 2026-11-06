// =============================================================================
// Faculty sidebar - the vertical navigation shown on faculty AND approver pages
// -----------------------------------------------------------------------------
// Usage: <FacultySidebar active="create" />  (active = key of the current page,
// which gets a highlighted background)
//
// The items depend on the role saved at login (refreshed on page load):
//   faculty  -> Dashboard, Create Opportunity, Messages, Attendance
//   approver -> Approvals, My Opportunities, Messages, Attendance
// Approvers keep managing the opportunities they created before being promoted,
// but cannot create new ones (so there is no Create item for them).
// Hovering an icon shows its label (SidebarButton, task U1).
// =============================================================================

import { Box, Stack } from "@mui/material";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { logout, getSession } from "../../utils/auth";
import SidebarButton from "../../components/SidebarButton";

// Pages shared by faculty and approvers
const SHARED_ITEMS = [
  { icon: <MailOutlineRoundedIcon />, route: "/faculty/messages", key: "messages", label: "Messages" },
  // Attendance page (mark attended / absent and hours)
  { icon: <ChecklistRoundedIcon />, route: "/faculty/attendance", key: "attendance", label: "Attendance" },
];

const FACULTY_ITEMS = [
  { icon: <HomeRoundedIcon />, route: "/faculty/dashboard", key: "dashboard", label: "Dashboard" },
  { icon: <DriveFileRenameOutlineRoundedIcon />, route: "/faculty/create", key: "create", label: "Create Opportunity" },
  ...SHARED_ITEMS,
];

const APPROVER_ITEMS = [
  { icon: <FactCheckRoundedIcon />, route: "/approver/dashboard", key: "approvals", label: "Approvals" },
  { icon: <ListAltRoundedIcon />, route: "/faculty/dashboard", key: "dashboard", label: "My Opportunities" },
  ...SHARED_ITEMS,
];

export default function FacultySidebar({ active }) {
  // One entry per page: icon, address (route), key (matched against "active") and hover label
  const navItems = getSession().role === "approver" ? APPROVER_ITEMS : FACULTY_ITEMS;

  return (
    <Box
      sx={{
        width: 90,
        bgcolor: "#0B3D2E",
        borderRadius: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 3,
        mr: 3,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          width: 46,
          height: 46,
          borderRadius: "16px",
          bgcolor: "#fff",
          color: "#0B3D2E",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: "800",
          fontSize: 22,
          mb: 5,
        }}
      >
        C
      </Box>

      {/* Navigation */}
      <Stack spacing={3} flexGrow={1} alignItems="center">
        {navItems.map((item) => (
          <SidebarButton
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={active === item.key}
            onClick={() => (window.location.href = `${process.env.PUBLIC_URL}${item.route}`)}
          />
        ))}
      </Stack>

      {/* Settings (F3) */}
      <SidebarButton
        icon={<SettingsRoundedIcon />}
        label="Settings"
        active={active === "settings"}
        onClick={() => (window.location.href = `${process.env.PUBLIC_URL}/settings`)}
        sx={{ height: 50 }}
      />

      {/* Logout */}
      <SidebarButton
        icon={<LogoutRoundedIcon />}
        label="Log out"
        onClick={() => logout()}
        sx={{ height: 50, mt: 2 }}
      />
    </Box>
  );
}
