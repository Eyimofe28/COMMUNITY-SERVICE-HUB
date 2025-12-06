import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0B3D2E",   // deep MVSU green
    },
    secondary: {
      main: "#1D6F5F",   // lighter green
    },
    background: {
      default: "#F0F4F3",
    }
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  shape: {
    borderRadius: 16,
  }
});

export default theme;
