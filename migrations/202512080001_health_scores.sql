-- Product Health Score Migration
-- Creates the health_scores table for storing calculated health scores

-- Create health_scores table
CREATE TABLE IF NOT EXISTS health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID, -- Optional link to feedback analysis session
  product_name TEXT,
  
  -- Score data
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT NOT NULL,
  components JSONB NOT NULL,
  actions JSONB NOT NULL,
  interpretation TEXT,
  
  -- Sharing
  share_token TEXT UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_health_scores_share_token 
ON health_scores(share_token) WHERE share_token IS NOT NULL;

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_health_scores_created_at 
ON health_scores(created_at DESC);

-- Create index on session_id for linking to analysis sessions
CREATE INDEX IF NOT EXISTS idx_health_scores_session_id 
ON health_scores(session_id) WHERE session_id IS NOT NULL;

-- Add comment to table
COMMENT ON TABLE health_scores IS 'Stores calculated product health scores with shareable badges';

-- RLS Policies (disabled for demo purposes, enable for production)
-- ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;

-- Policy for public read access via share_token
-- CREATE POLICY "Public can view shared health scores"
--   ON health_scores FOR SELECT
--   USING (share_token IS NOT NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_health_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS health_scores_updated_at ON health_scores;
CREATE TRIGGER health_scores_updated_at
  BEFORE UPDATE ON health_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_health_scores_updated_at();
