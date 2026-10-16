// =============================================================================
// Live checklist of password rules, shown under a password field
// -----------------------------------------------------------------------------
// INPUT VALIDATION: each rule turns green as soon as the typed password meets it.
// REUSABILITY: one component used on Signup, Add Admin and Change Password -
//   usage: <PasswordRequirements password={value} />
// =============================================================================
import { Box, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";

import { PASSWORD_RULES } from "../utils/passwordRules";

export default function PasswordRequirements({ password }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5, textAlign: "left" }}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <Box key={rule.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {met ? (
              <CheckCircleRoundedIcon sx={{ fontSize: 18, color: "#166534" }} />
            ) : (
              <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: "#9CA3AF" }} />
            )}
            <Typography variant="body2" sx={{ color: met ? "#166534" : "#6B7280" }}>
              {rule.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
