-- Fix Anonymous Voting Schema - Safe to run multiple times
-- This script handles existing objects gracefully

-- Add anonymous_id field to votes table for public voting
ALTER TABLE votes ADD COLUMN IF NOT EXISTS anonymous_id VARCHAR(255);

-- Create index for anonymous_id if not exists
CREATE INDEX IF NOT EXISTS idx_votes_anonymous_id ON votes(anonymous_id);

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can vote on posts" ON votes;
DROP POLICY IF EXISTS "Users can remove their votes" ON votes;
DROP POLICY IF EXISTS "Allow anonymous voting" ON votes;
DROP POLICY IF EXISTS "Allow authenticated voting" ON votes;
DROP POLICY IF EXISTS "Service role can manage votes" ON votes;

-- Create new RLS policies for anonymous voting
CREATE POLICY "Allow anonymous voting" ON votes
  FOR ALL TO anon USING (
    ip_address IS NOT NULL OR anonymous_id IS NOT NULL
  );

CREATE POLICY "Allow authenticated voting" ON votes
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role can manage votes" ON votes
  FOR ALL TO service_role USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON votes TO anon;
GRANT SELECT, INSERT, DELETE ON votes TO authenticated;
GRANT ALL ON votes TO service_role;
