// =============================================================================
// PasswordField - a password input with a show / hide eye button (U2)
// -----------------------------------------------------------------------------
// Drop-in replacement for <TextField type="password" ...>: accepts the same
// props (label, value, onChange, error, helperText, autoComplete, sx, ...).
// The eye icon toggles between hidden (dots) and visible text:
//   eye        -> password hidden, click to show
//   eye-off    -> password visible, click to hide
// REUSABILITY: used by Login, Signup, the admin forms and the Settings page.
// =============================================================================

import { useState } from "react";
import { TextField, InputAdornment, IconButton, Tooltip } from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

export default function PasswordField(props) {
  // false = hidden (default), true = shown as plain text
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      slotProps={{
        ...props.slotProps,
        input: {
          ...props.slotProps?.input,
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={label}>
                <IconButton
                  aria-label={label}
                  onClick={() => setVisible((v) => !v)}
                  // keep focus (and the cursor) in the text box when clicking the eye
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                >
                  {visible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
