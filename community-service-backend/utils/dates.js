// =============================================================================
// Date and time rules for opportunities (campus time zone)
// -----------------------------------------------------------------------------
// Why this exists: JavaScript's new Date("2026-10-21") means midnight in UTC,
// which is still Oct 20 in Mississippi, and the database's CURRENT_DATE is also
// UTC. That made "today" off by one for part of every day. Here dates are kept as
// plain "YYYY-MM-DD" text and "today" is worked out in the campus time zone.
//
// INPUT VALIDATION: validateOpportunitySchedule checks the date and times sent by
// the Create Opportunity form before anything is stored.
// REUSABILITY: shared by the opportunity controller and the seed script. The
// frontend mirrors these rules in community-service-frontend/src/utils/dates.js.
// =============================================================================

// MVSU is in the US Central time zone (handles daylight saving automatically)
const CAMPUS_TIME_ZONE = process.env.APP_TIMEZONE || "America/Chicago";

// Opportunities can be scheduled from tomorrow up to this many days ahead
const MAX_DAYS_AHEAD = 365;

// Time rules: 30-minute steps, events between 6:00 AM and 10:00 PM,
// lasting 30 minutes to 12 hours (same-day only)
const EARLIEST_START = "06:00";
const LATEST_END = "22:00";
const MIN_LENGTH_MINUTES = 30;
const MAX_LENGTH_MINUTES = 12 * 60;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HALF_HOUR_TIME_REGEX = /^([01]\d|2[0-3]):(00|30)$/; // "09:00", "14:30"

// "HH:MM" -> minutes since midnight ("14:30" -> 870)
const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// Length of an event in hours, e.g. "09:00" -> "11:30" = 2.5 (stored as Duration)
const durationHours = (startTime, endTime) => (toMinutes(endTime) - toMinutes(startTime)) / 60;

// Today's date on campus as "YYYY-MM-DD"
function todayOnCampus(now = new Date()) {
    // en-CA formats dates as YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", { timeZone: CAMPUS_TIME_ZONE }).format(now);
}

// "YYYY-MM-DD" plus n days (calendar arithmetic in UTC, so no time-zone shifts)
function addDays(ymd, days) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// True for a real calendar date in "YYYY-MM-DD" form (rejects 2026-02-30)
function isValidDate(ymd) {
    if (typeof ymd !== "string" || !DATE_REGEX.test(ymd)) return false;
    const [y, m, d] = ymd.split("-").map(Number);
    const check = new Date(Date.UTC(y, m - 1, d));
    return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

// Checks an opportunity's date and start/end times. (Duration is not taken from
// the user - it is calculated from the times with durationHours.)
// Returns an error message, or null when everything is valid.
function validateOpportunitySchedule({ date, startTime, endTime }) {
    if (!isValidDate(date)) {
        return "Please choose a valid date.";
    }

    // "YYYY-MM-DD" strings compare correctly as plain text
    const earliest = addDays(todayOnCampus(), 1);
    const latest = addDays(todayOnCampus(), MAX_DAYS_AHEAD);
    if (date < earliest) {
        return "Opportunities must be scheduled for a future date (tomorrow or later).";
    }
    if (date > latest) {
        return `Opportunities can be scheduled at most ${MAX_DAYS_AHEAD} days ahead.`;
    }

    if (typeof startTime !== "string" || typeof endTime !== "string" ||
        !HALF_HOUR_TIME_REGEX.test(startTime) || !HALF_HOUR_TIME_REGEX.test(endTime)) {
        return "Start Time and End Time must be on the hour or half hour (e.g., 9:00 AM, 2:30 PM).";
    }

    if (startTime < EARLIEST_START || endTime > LATEST_END) {
        return "Opportunities must take place between 6:00 AM and 10:00 PM.";
    }

    const minutes = toMinutes(endTime) - toMinutes(startTime);
    if (minutes <= 0) {
        return "End Time must be later than Start Time.";
    }
    if (minutes < MIN_LENGTH_MINUTES || minutes > MAX_LENGTH_MINUTES) {
        return "Opportunities must last between 30 minutes and 12 hours.";
    }

    return null;
}

// ---------------------------------------------------------------------------
// Event timing rules (registration, attendance, approval)
// ---------------------------------------------------------------------------

// Faculty can submit or correct attendance for this many days after the event date
const ATTENDANCE_EDIT_DAYS = 14;

// Current date and time on campus: { date: "YYYY-MM-DD", time: "HH:MM" }
function nowOnCampus(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: CAMPUS_TIME_ZONE,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type).value;
    return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

// True once the event's start time has passed on campus.
// date = "YYYY-MM-DD", startTime = "HH:MM" or "HH:MM:SS" (as stored)
function hasStarted(date, startTime, now = nowOnCampus()) {
    return date < now.date || (date === now.date && startTime.slice(0, 5) <= now.time);
}

// Whether faculty may submit/correct attendance right now:
// from the event's start time until ATTENDANCE_EDIT_DAYS days after its date.
// Returns { open, closesOn, reason } - reason explains why it is closed.
function attendanceWindow(date, startTime, now = nowOnCampus()) {
    const closesOn = addDays(date, ATTENDANCE_EDIT_DAYS);
    if (!hasStarted(date, startTime, now)) {
        return { open: false, closesOn, reason: "Attendance opens when the event starts." };
    }
    if (now.date > closesOn) {
        return {
            open: false,
            closesOn,
            reason: `Attendance can only be submitted or corrected within ${ATTENDANCE_EDIT_DAYS} days of the event.`,
        };
    }
    return { open: true, closesOn, reason: null };
}

module.exports = {
    CAMPUS_TIME_ZONE, MAX_DAYS_AHEAD, ATTENDANCE_EDIT_DAYS,
    todayOnCampus, nowOnCampus, addDays, isValidDate, durationHours,
    hasStarted, attendanceWindow, validateOpportunitySchedule,
};
