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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HOURLY_TIME_REGEX = /^([01]\d|2[0-3]):00$/; // "09:00", "14:00"

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

// Checks an opportunity's date, start/end times and duration.
// Returns an error message, or null when everything is valid.
function validateOpportunitySchedule({ date, startTime, endTime, duration }) {
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
        !HOURLY_TIME_REGEX.test(startTime) || !HOURLY_TIME_REGEX.test(endTime)) {
        return "Start Time and End Time must be on the hour (e.g., 09:00, 14:00, 18:00).";
    }

    const hours = Number(endTime.slice(0, 2)) - Number(startTime.slice(0, 2));
    if (hours <= 0) {
        return "End Time must be later than Start Time.";
    }

    if (Number(duration) !== hours) {
        return `Duration must match the times entered (${hours} hour${hours === 1 ? "" : "s"}).`;
    }

    return null;
}

module.exports = { CAMPUS_TIME_ZONE, MAX_DAYS_AHEAD, todayOnCampus, addDays, isValidDate, validateOpportunitySchedule };
