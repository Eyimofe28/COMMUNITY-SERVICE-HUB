// =============================================================================
// SidebarButton - one icon in a sidebar, with a hover label (U1)
// -----------------------------------------------------------------------------
// Shows a dark-green label to the right of the icon on hover or keyboard focus
// (like Canvas), and gives screen readers the same label via aria-label.
// Used by FacultySidebar (faculty + approver) and StudentSidebar.
//
// Props: icon, label, active (highlighted background), onClick
// =============================================================================

import { IconButton, Tooltip } from "@mui/material";

// Label bubble styling - matches the sidebar's green
const tooltipSlotProps = {
  tooltip: {
    sx: {
      bgcolor: "#0B3D2E",
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      px: 1.5,
      py: 0.75,
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
  },
  arrow: { sx: { color: "#0B3D2E" } },
};

export default function SidebarButton({ icon, label, active = false, onClick, sx }) {
  return (
    <Tooltip title={label} placement="right" arrow slotProps={tooltipSlotProps}>
      <IconButton
        aria-label={label}
        onClick={onClick}
        sx={{
          color: "#fff",
          bgcolor: active ? "#164F3C" : "transparent",
          width: 50,
          height: 70,
          borderRadius: "14px",
          "&:hover": { bgcolor: "#164F3C" },
          ...sx,
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
