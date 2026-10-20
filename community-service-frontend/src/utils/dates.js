// =============================================================================
// Date helpers (frontend copy of community-service-backend/utils/dates.js)
// -----------------------------------------------------------------------------
// Opportunity dates travel between the browser and the API as plain "YYYY-MM-DD"
// text. Never pass them to new Date("YYYY-MM-DD") - that means midnight UTC and
// shows as the previous day in Mississippi. Use formatDate() to display them.
//
// INPUT VALIDATION: the Create Opportunity form uses the same window as the
//   backend (tomorrow .. MAX_DAYS_AHEAD days, campus time zone).
// REUSABILITY: every page shows dates through formatDate(), so they look the same.
// =============================================================================

export const CAMPUS_TIME_ZONE = "America/Chicago";
export const MAX_DAYS_AHEAD = 365;

// Today's date on campus as "YYYY-MM-DD" (en-CA formats as YYYY-MM-DD)
export const todayOnCampus = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: CAMPUS_TIME_ZONE }).format(new Date());

// "YYYY-MM-DD" plus n days
export function addDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// "2026-10-21" -> "Wed, Oct 21, 2026". Built from the date's own parts, so it
// shows the same day in every time zone. Returns "" for empty input.
export function formatDate(ymd) {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
