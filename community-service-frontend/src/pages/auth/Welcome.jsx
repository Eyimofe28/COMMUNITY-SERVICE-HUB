import { Box, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import treeImage from "./tree4.jpg"; // <-- your local image

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100vh",
        position: "relative",
        background: "#43af8fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        px: 2,
      }}
    >
      {/* ---- BACKGROUND BLOBS ---- */}
      <Box sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {/* Brighter green circles */}
        {[...Array(9)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              width: `${60 + Math.random() * 80}px`,
              height: `${60 + Math.random() * 80}px`,
              background: "#144C3A", // brighter green
              borderRadius: "50%",
              top: `${Math.random() * 90}%`,
              left: `${Math.random() * 90}%`,
              filter: "blur(15px)",
            }}
          />
        ))}
      </Box>

      {/* ---- MAIN CARD ---- */}
      <Paper
        elevation={10}
        sx={{
          width: "80%",
          maxWidth: 1100,
          height: "70%",
          borderRadius: "40px",
          display: "flex",
          overflow: "hidden",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* ---- Left Side ---- */}
        <Box
          sx={{
            flex: 1,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            p: 4,
          }}
        >
          <img
            src={treeImage}
            alt="welcome illustration"
            style={{
              width: "55%",
              marginBottom: 20,
              objectFit: "contain",
            }}
          />

          <Typography variant="h5" sx={{ color: "#0B3D2E", fontWeight: "bold" }}>
            Welcome to the Community Service Hub
          </Typography>

          <Typography sx={{ textAlign: "center", mt: 1, opacity: 0.7 }}>
            Find opportunities • Track hours • Build Connections
          </Typography>
        </Box>

        {/* ---- Right Side ---- */}
        <Box
          sx={{
            flex: 1,
            background: "linear-gradient(135deg, #0B3D2E, #144C3A)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            p: 4,
          }}
        >
          <Typography variant="h4" sx={{ color: "#fff", mb: 4, fontWeight: "bold" }}>
            Get Started
          </Typography>

          <Button
            variant="contained"
            fullWidth
            sx={{ maxWidth: 300, mb: 2, py: 1.5, borderRadius: 3 }}
            onClick={() => navigate("/login")}
          >
            Login
          </Button>

          <Button
            variant="outlined"
            fullWidth
            sx={{
              maxWidth: 300,
              py: 1.5,
              borderRadius: 3,
              color: "#fff",
              borderColor: "#fff",
            }}
            onClick={() => navigate("/signup")}
          >
            Create Account
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
