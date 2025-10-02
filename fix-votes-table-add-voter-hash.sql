-- Fix votes table - Add voter_hash column for Vote on Behalf feature
-- Run this in your Supabase SQL Editor

-- 1. Add voter_hash column to votes table
ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS voter_hash VARCHAR(255);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_votes_voter_hash ON votes(voter_hash);

-- 3. Create composite index for checking existing votes
CREATE INDEX IF NOT EXISTS idx_votes_post_voter ON votes(post_id, voter_hash);

-- 4. Update existing votes to have a voter_hash (based on user_id if available)
-- This is for backward compatibility with existing votes
UPDATE votes 
SET voter_hash = MD5(COALESCE(user_id::text, 'anonymous-' || id::text))
WHERE voter_hash IS NULL;

-- 5. Verify the change
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'votes' 
AND column_name IN ('id', 'post_id', 'user_id', 'voter_hash', 'created_at')
ORDER BY ordinal_position;

