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

// Current date and time on campus: { date: "YYYY-MM-DD", time: "HH:MM" }
export function nowOnCampus() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

// True once an event's start time has passed on campus (same rule as the backend:
// registration closes, approval is no longer possible, attendance opens)
export function hasStarted(date, startTime) {
  if (!date || !startTime) return false;
  const now = nowOnCampus();
  const day = String(date).slice(0, 10);
  return day < now.date || (day === now.date && startTime.slice(0, 5) <= now.time);
}

// "YYYY-MM-DD" plus n days
export function addDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Times (same rules as the backend): 30-minute steps, 6:00 AM - 10:00 PM,
// events last 30 minutes to 12 hours. Times travel as "HH:MM" (24-hour);
// the database returns them as "HH:MM:SS".
// ---------------------------------------------------------------------------
export const TIME_STEP_MINUTES = 30;
export const EARLIEST_START = "06:00";
export const LATEST_END = "22:00";
export const MIN_LENGTH_MINUTES = 30;
export const MAX_LENGTH_MINUTES = 12 * 60;

// "14:30" or "14:30:00" -> 870 (minutes since midnight)
export const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// 870 -> "14:30"
const fromMinutes = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Every allowed time between 6:00 AM and 10:00 PM: ["06:00", "06:30", ... "22:00"]
export const TIME_OPTIONS = (() => {
  const list = [];
  for (let m = toMinutes(EARLIEST_START); m <= toMinutes(LATEST_END); m += TIME_STEP_MINUTES) {
    list.push(fromMinutes(m));
  }
  return list;
})();

// "14:30" / "14:30:00" -> "2:30 PM"
export function formatTime(time) {
  if (!time) return "";
  const minutes = toMinutes(time);
  const h24 = Math.floor(minutes / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(minutes % 60).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

// ("09:00", "11:30") -> "9:00 AM – 11:30 AM"
export const formatTimeRange = (start, end) =>
  start && end ? `${formatTime(start)} – ${formatTime(end)}` : "";

// 150 -> "2 hours 30 minutes"
export function formatDurationMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m) parts.push(`${m} minutes`);
  return parts.join(" ");
}

// Hours from the database ("2.50", "3.00") -> "2.5 hrs", "3 hrs", "1 hr"
export function formatHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${n} hr${n === 1 ? "" : "s"}`;
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
