import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Fade } from "@mui/material";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/welcome"), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Fade in timeout={2000}>
      <Box 
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0B3D2E, #1D6F5F)"
        }}
      >
        <Typography
          variant="h3"
          sx={{ color: "#fff", fontWeight: "bold", mb: 2 }}
        >
          Community Service Hub
        </Typography>

        <Typography sx={{ color: "#fff", opacity: 0.8 }}>
          Making service easier, faster, and smarter ✨
        </Typography>
      </Box>
    </Fade>
  );
}
