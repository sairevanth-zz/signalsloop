-- User Intelligence Table
-- Stores enriched user data from various sources (web search, GitHub, social profiles, etc.)

CREATE TABLE IF NOT EXISTS user_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  email TEXT NOT NULL,
  name TEXT,

  -- Company Information
  company_name TEXT,
  company_domain TEXT,
  company_size TEXT,
  industry TEXT,

  -- Role Information
  role TEXT,
  seniority_level TEXT,

  -- Social Profiles
  linkedin_url TEXT,
  twitter_url TEXT,
  github_url TEXT,
  github_username TEXT,

  -- Additional Context
  bio TEXT,
  location TEXT,
  website TEXT,

  -- Enrichment Metadata
  confidence_score NUMERIC(3, 2), -- 0.00 to 1.00
  data_sources JSONB DEFAULT '[]'::jsonb, -- Array of sources used: ["github", "web_search", "emailrep", etc.]
  raw_data JSONB DEFAULT '{}'::jsonb, -- Store raw API responses for debugging

  -- Plan Information (from signup)
  plan_type TEXT, -- 'free', 'pro-monthly', 'pro-annual', 'pro-gift', 'pro-discount'
  discount_code TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enriched_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT user_intelligence_user_id_unique UNIQUE(user_id),
  CONSTRAINT confidence_score_range CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Enable RLS
ALTER TABLE user_intelligence ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own intelligence data" ON user_intelligence
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all intelligence data" ON user_intelligence
  FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_intelligence_user_id ON user_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_intelligence_company_domain ON user_intelligence(company_domain);
CREATE INDEX IF NOT EXISTS idx_user_intelligence_created_at ON user_intelligence(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_intelligence_confidence_score ON user_intelligence(confidence_score DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_intelligence_updated_at ON user_intelligence;
CREATE TRIGGER trigger_update_user_intelligence_updated_at
  BEFORE UPDATE ON user_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_intelligence_updated_at();

COMMENT ON TABLE user_intelligence IS 'Stores enriched user intelligence data gathered from various sources including web search, GitHub, LinkedIn, Twitter, and other APIs';
COMMENT ON COLUMN user_intelligence.confidence_score IS 'Overall confidence score (0-1) of the enriched data quality';
COMMENT ON COLUMN user_intelligence.data_sources IS 'Array of data sources used for enrichment: github, web_search, emailrep, twitter, hunter, etc.';
COMMENT ON COLUMN user_intelligence.raw_data IS 'Raw API responses stored as JSONB for debugging and future re-processing';
