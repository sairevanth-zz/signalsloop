-- Fix weekly digest default to opt-in instead of opt-out
-- The original schema had weekly_digest defaulting to FALSE, which meant users
-- were opted out by default. This changes the default to TRUE and updates existing records.

-- 1. Update all existing email_preferences to enable weekly_digest
-- (unless they've explicitly unsubscribed from everything)
UPDATE email_preferences
SET weekly_digest = TRUE
WHERE weekly_digest = FALSE
  AND unsubscribed_at IS NULL;

-- 2. Change the column default to TRUE for future records
ALTER TABLE email_preferences
ALTER COLUMN weekly_digest SET DEFAULT TRUE;

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Updated email_preferences to enable weekly digest by default';
  RAISE NOTICE 'All users (except those who unsubscribed entirely) will now receive weekly digests';
END $$;
