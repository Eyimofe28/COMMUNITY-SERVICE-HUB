// src/components/StudentSidebar.jsx
import { Box, IconButton, Stack } from "@mui/material";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { logout } from "../../utils/auth";

export default function StudentSidebar({ active }) {

  const navItems = [
    { icon: <HomeRoundedIcon />, route: "/student/dashboard", key: "dashboard" },
    { icon: <ListAltRoundedIcon />, route: "/student/registered", key: "registered" },
    { icon: <EmojiEventsRoundedIcon />, route: "/student/completed", key: "completed" },
    { icon: <MailOutlineRoundedIcon />, route: "/student/messages", key: "messages" },
    // { icon: <SettingsRoundedIcon />, route: "/student/settings", key: "settings" },
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
          <IconButton
            key={item.key}
            sx={{
              color: "#fff",
              bgcolor: active === item.key ? "#164F3C" : "transparent",
              width: 50,
              height: 70,
              borderRadius: "14px",
            }}
            onClick={() => (window.location.href = `${process.env.PUBLIC_URL}${item.route}`)}
          >
            {item.icon}
          </IconButton>
        ))}
      </Stack>

      {/* Logout */}
      <IconButton sx={{ color: "#fff", mt: 2 }} onClick={() => logout()}>
        <LogoutRoundedIcon />
      </IconButton>
    </Box>
  );
}
