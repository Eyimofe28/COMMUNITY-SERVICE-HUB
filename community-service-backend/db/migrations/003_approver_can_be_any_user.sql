-- 003: Opportunity decisions can be recorded for admins too (M2)
--
-- opportunity."Approver_ID" used to reference faculty, so an admin approving or
-- rejecting an opportunity could not be recorded (the admin endpoint stored
-- NULL, and an admin using the approver endpoint caused a database error).
-- It now references users, so the person who decided - approver OR admin - is
-- always on record. Existing values are faculty user IDs, which are users too.

-- (the name is mixed case because the column is, so it must be quoted)
ALTER TABLE opportunity DROP CONSTRAINT "opportunity_Approver_ID_fkey";

ALTER TABLE opportunity
    ADD CONSTRAINT opportunity_approver_user_fkey
    FOREIGN KEY ("Approver_ID") REFERENCES users ("User_ID")
    ON DELETE SET NULL ON UPDATE CASCADE;
