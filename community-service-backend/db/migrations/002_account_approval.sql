-- 002: Account approval (P5a)
--
-- New student/faculty accounts can be made to wait for an admin's approval.
-- Admins switch this on or off per role from the Admin Dashboard; the switches
-- and the office contact shown in the approval messages live in app_settings.

-- 1. Account status on every user. Everyone who already exists is approved,
--    so no current account is locked out.
ALTER TABLE users
    ADD COLUMN "Account_Status" varchar(10) NOT NULL DEFAULT 'approved'
        CHECK ("Account_Status" IN ('pending', 'approved', 'declined')),
    ADD COLUMN "Created_At" timestamptz NOT NULL DEFAULT now();

CREATE INDEX users_account_status_idx ON users ("Account_Status");

-- 2. App-wide settings, editable by admins (key -> text value)
CREATE TABLE app_settings (
    "Key"        varchar(50) PRIMARY KEY,
    "Value"      text NOT NULL,
    "Updated_At" timestamptz NOT NULL DEFAULT now()
);

-- Starting values: both roles are approved automatically (for testing);
-- turning approval on is part of the launch checklist.
INSERT INTO app_settings ("Key", "Value") VALUES
    ('require_approval_student', 'false'),
    ('require_approval_faculty', 'false'),
    ('office_contact', 'Community Service office');

-- 3. Same lock-down as every other table: backend-only access
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_settings FROM anon, authenticated;
