-- Complete Database Setup for SignalsLoop
-- This script safely sets up all required database objects
-- Safe to run multiple times - handles existing objects gracefully

-- ==============================================
-- 1. ANALYTICS EVENTS TABLE
-- ==============================================

-- Create analytics_events table if not exists
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  referer TEXT,
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_api_key ON analytics_events(api_key);
CREATE INDEX IF NOT EXISTS idx_analytics_events_project ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_ip_address ON analytics_events(ip_address);

-- Enable RLS for analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can view their project analytics" ON analytics_events;
DROP POLICY IF EXISTS "Service role can manage analytics events" ON analytics_events;

-- Create new policies for analytics_events
CREATE POLICY "Service role can insert analytics events" ON analytics_events
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can manage analytics events" ON analytics_events
  FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view their project analytics" ON analytics_events
  FOR SELECT TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN members m ON p.id = m.project_id
      WHERE m.user_id = auth.uid()
    )
  );

-- ==============================================
-- 2. ANONYMOUS VOTING SCHEMA
-- ==============================================

-- Add anonymous_id field to votes table
ALTER TABLE votes ADD COLUMN IF NOT EXISTS anonymous_id VARCHAR(255);

-- Create index for anonymous_id
CREATE INDEX IF NOT EXISTS idx_votes_anonymous_id ON votes(anonymous_id);

-- Drop existing vote policies to avoid conflicts
DROP POLICY IF EXISTS "Users can vote on posts" ON votes;
DROP POLICY IF EXISTS "Users can remove their votes" ON votes;
DROP POLICY IF EXISTS "Allow anonymous voting" ON votes;
DROP POLICY IF EXISTS "Allow authenticated voting" ON votes;
DROP POLICY IF EXISTS "Service role can manage votes" ON votes;

-- Create new RLS policies for votes
CREATE POLICY "Allow anonymous voting" ON votes
  FOR ALL TO anon USING (
    ip_address IS NOT NULL OR anonymous_id IS NOT NULL
  );

CREATE POLICY "Allow authenticated voting" ON votes
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Service role can manage votes" ON votes
  FOR ALL TO service_role USING (true);

-- ==============================================
-- 3. VOTE COUNT FUNCTIONS
-- ==============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS increment_vote_count(UUID);
DROP FUNCTION IF EXISTS decrement_vote_count(UUID);

-- Create vote count increment function
CREATE OR REPLACE FUNCTION increment_vote_count(post_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE posts 
  SET vote_count = vote_count + 1 
  WHERE id = post_id_param
  RETURNING vote_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create vote count decrement function
CREATE OR REPLACE FUNCTION decrement_vote_count(post_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE posts 
  SET vote_count = GREATEST(vote_count - 1, 0) 
  WHERE id = post_id_param
  RETURNING vote_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 4. GRANT PERMISSIONS
-- ==============================================

-- Analytics events permissions
GRANT SELECT ON analytics_events TO authenticated;
GRANT INSERT ON analytics_events TO service_role;
GRANT ALL ON analytics_events TO service_role;

-- Votes permissions
GRANT SELECT, INSERT, DELETE ON votes TO anon;
GRANT SELECT, INSERT, DELETE ON votes TO authenticated;
GRANT ALL ON votes TO service_role;

-- Function permissions
GRANT EXECUTE ON FUNCTION increment_vote_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_vote_count(UUID) TO service_role;

-- ==============================================
-- 5. VERIFICATION
-- ==============================================

-- Verify tables exist
SELECT 'analytics_events table exists' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events');

-- Verify functions exist
SELECT 'vote functions exist' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'increment_vote_count');

-- Verify policies exist
SELECT 'RLS policies created' as status 
WHERE EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE tablename = 'analytics_events' 
  AND policyname = 'Service role can insert analytics events'
);

SELECT 'Setup completed successfully!' as result;
