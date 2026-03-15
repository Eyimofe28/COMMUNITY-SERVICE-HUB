// src/components/FacultySidebar.jsx
import { Box, IconButton, Stack } from "@mui/material";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";   // ✅ NEW
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

export default function FacultySidebar({ active }) {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const navItems = [
    { icon: <HomeRoundedIcon />, route: "/faculty/dashboard", key: "dashboard" },
    {
      icon: <DriveFileRenameOutlineRoundedIcon />,
      route: "/faculty/create",
      key: "create",
    },
    {
      icon: <MailOutlineRoundedIcon />,
      route: "/faculty/messages",
      key: "messages",
    },
    // ✅ Replaced settings with attendance/checklist
    {
      icon: <ChecklistRoundedIcon />,
      route: "/faculty/attendance",
      key: "attendance",
    },
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

      {/* Navigation */}
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
            onClick={() => (window.location.href = item.route)}
          >
            {item.icon}
          </IconButton>
        ))}
      </Stack>

      {/* Logout */}
      <IconButton sx={{ color: "#fff", mt: 2 }} onClick={handleLogout}>
        <LogoutRoundedIcon />
      </IconButton>
    </Box>
  );
}
