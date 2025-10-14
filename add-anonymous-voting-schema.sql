-- Add anonymous_id field to votes table for public voting
ALTER TABLE votes 
  ADD COLUMN IF NOT EXISTS anonymous_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50)
    CHECK (priority IN ('must_have', 'important', 'nice_to_have'))
    DEFAULT 'important';

-- Create index for anonymous_id
CREATE INDEX IF NOT EXISTS idx_votes_anonymous_id ON votes(anonymous_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_post_anonymous_unique
  ON votes(post_id, anonymous_id)
  WHERE anonymous_id IS NOT NULL;

UPDATE votes
SET priority = COALESCE(priority, 'important')
WHERE priority IS NULL;

-- Update RLS policies to allow anonymous voting
DROP POLICY IF EXISTS "Users can vote on posts" ON votes;
DROP POLICY IF EXISTS "Users can remove their votes" ON votes;

-- Allow anonymous users to vote (using IP or anonymous_id)
CREATE POLICY "Allow anonymous voting" ON votes
  FOR ALL TO anon USING (
    ip_address IS NOT NULL OR anonymous_id IS NOT NULL
  );

-- Allow authenticated users to vote
CREATE POLICY "Allow authenticated voting" ON votes
  FOR ALL TO authenticated USING (true);

-- Allow service role full access
CREATE POLICY "Service role can manage votes" ON votes
  FOR ALL TO service_role USING (true);
