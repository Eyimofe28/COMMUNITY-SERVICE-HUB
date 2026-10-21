-- 001: Attendance hours rules + recalculate service-hour totals
--
-- Before this, re-submitting attendance added hours to student."Service_Hours_Total"
-- a second time. The backend now recalculates totals from attendance records;
-- this migration brings existing data in line and lets the database enforce
-- the basic hours rules itself.

-- 1. Clean existing rows so the new rules can be added safely
UPDATE attendance SET "Hours_Earned" = 0 WHERE "Hours_Earned" < 0;
UPDATE attendance SET "Hours_Earned" = 0 WHERE NOT "Attended" AND "Hours_Earned" <> 0;

-- 2. Rules enforced by the database
ALTER TABLE attendance
    ADD CONSTRAINT attendance_hours_not_negative CHECK ("Hours_Earned" >= 0),
    ADD CONSTRAINT attendance_absent_has_no_hours CHECK ("Attended" OR "Hours_Earned" = 0);

-- 3. Every student's total = sum of hours from attendance they actually attended
--    (fixes any totals that were double-counted)
UPDATE student s
SET "Service_Hours_Total" = COALESCE((
    SELECT SUM(a."Hours_Earned")
    FROM attendance a
    WHERE a."Student_ID" = s."User_ID" AND a."Attended"
), 0);
