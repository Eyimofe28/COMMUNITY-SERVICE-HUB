-- 004: Registration capacity + cancelling approved opportunities (faculty batch)
--
-- Capacity: optional maximum number of students who can register (NULL = no limit).
-- Cancelled: faculty can cancel an approved opportunity before it starts; the
-- reason is shown to registered students. Registrations are kept so students
-- see the cancellation on their Registered page.

-- 1. Capacity (1-500, or NULL for unlimited)
ALTER TABLE opportunity
    ADD COLUMN "Capacity" integer CHECK ("Capacity" IS NULL OR "Capacity" BETWEEN 1 AND 500);

-- 2. New status "Cancelled" (the constraint name is mixed case, so it is quoted)
ALTER TABLE opportunity DROP CONSTRAINT "opportunity_Approval_Status_check";
ALTER TABLE opportunity
    ADD CONSTRAINT opportunity_approval_status_check
    CHECK ("Approval_Status" IN ('Pending', 'Approved', 'Rejected', 'Cancelled'));

-- 3. Why and when it was cancelled
ALTER TABLE opportunity
    ADD COLUMN "Cancellation_Reason" text,
    ADD COLUMN "Cancelled_At" timestamptz;
