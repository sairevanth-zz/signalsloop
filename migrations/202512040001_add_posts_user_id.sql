-- Ensure posts table has a user_id column (triggers/functions expect OLD.user_id/NEW.user_id)
-- Safe to run multiple times.

ALTER TABLE IF EXISTS posts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill user_id using author_email when possible
UPDATE posts p
SET user_id = u.id
FROM auth.users u
WHERE p.user_id IS NULL
  AND p.author_email IS NOT NULL
  AND LOWER(p.author_email) = LOWER(u.email);
