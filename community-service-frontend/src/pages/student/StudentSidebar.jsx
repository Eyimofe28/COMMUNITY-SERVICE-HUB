// =============================================================================
// Student sidebar - the vertical navigation shown on every student page
// -----------------------------------------------------------------------------
// Usage: <StudentSidebar active="registered" />  (active = key of the current page)
// Hovering an icon shows its label (SidebarButton, task U1).
// =============================================================================

import { Box, Stack } from "@mui/material";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { logout } from "../../utils/auth";
import SidebarButton from "../../components/SidebarButton";

export default function StudentSidebar({ active }) {

  // One entry per student page: icon, address, key (matched against "active") and hover label
  const navItems = [
    { icon: <HomeRoundedIcon />, route: "/student/dashboard", key: "dashboard", label: "Dashboard" },
    { icon: <ListAltRoundedIcon />, route: "/student/registered", key: "registered", label: "Registered Opportunities" },
    { icon: <EmojiEventsRoundedIcon />, route: "/student/completed", key: "completed", label: "Completed & Missed" },
    { icon: <MailOutlineRoundedIcon />, route: "/student/messages", key: "messages", label: "Messages" },
  ];

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

      {/* NAVIGATION */}
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
