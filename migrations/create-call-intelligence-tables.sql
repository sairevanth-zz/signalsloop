-- Migration: Create Call Intelligence Engine Tables
-- Description: Tables for ingesting and analyzing customer call transcripts
-- Created: 2025-11-19

-- ============================================================================
-- 1. Create call_ingests table
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_ingests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Ingestion metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  source TEXT NOT NULL CHECK (source IN ('csv', 'zip', 'api', 'manual')),
  file_url TEXT,

  -- Progress tracking
  total_calls INTEGER NOT NULL DEFAULT 0,
  processed_calls INTEGER NOT NULL DEFAULT 0,

  -- Error tracking
  errors JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_call_ingests_project_id ON call_ingests(project_id);
CREATE INDEX IF NOT EXISTS idx_call_ingests_status ON call_ingests(status);
CREATE INDEX IF NOT EXISTS idx_call_ingests_created_at ON call_ingests(created_at DESC);

-- ============================================================================
-- 2. Create call_records table
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_id UUID NOT NULL REFERENCES call_ingests(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Call metadata
  customer TEXT,
  deal_id TEXT,
  amount NUMERIC(12, 2),
  stage TEXT,

  -- Transcript data
  transcript TEXT NOT NULL,
  transcript_url TEXT,
  duration INTEGER, -- in seconds

  -- Analysis results
  analyzed_at TIMESTAMPTZ,
  highlight_summary TEXT,
  sentiment DECIMAL(3, 2), -- -1 to 1
  priority_score INTEGER, -- 1-100

  -- Extracted insights (stored as JSONB for flexibility)
  feature_requests JSONB DEFAULT '[]'::jsonb,
  objections JSONB DEFAULT '[]'::jsonb,
  competitors JSONB DEFAULT '[]'::jsonb,
  expansion_signals JSONB DEFAULT '[]'::jsonb,
  churn_signals JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_records_ingest_id ON call_records(ingest_id);
CREATE INDEX IF NOT EXISTS idx_call_records_project_id ON call_records(project_id);
CREATE INDEX IF NOT EXISTS idx_call_records_analyzed_at ON call_records(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_call_records_customer ON call_records(customer);
CREATE INDEX IF NOT EXISTS idx_call_records_created_at ON call_records(created_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_call_records_feature_requests ON call_records USING GIN (feature_requests);
CREATE INDEX IF NOT EXISTS idx_call_records_objections ON call_records USING GIN (objections);
CREATE INDEX IF NOT EXISTS idx_call_records_competitors ON call_records USING GIN (competitors);

-- ============================================================================
-- 3. Extend posts table to support call metadata
-- ============================================================================
-- Add call-related columns to existing posts table
DO $$
BEGIN
  -- Check if column exists before adding
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'posts' AND column_name = 'call_record_id') THEN
    ALTER TABLE posts ADD COLUMN call_record_id UUID REFERENCES call_records(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'posts' AND column_name = 'call_metadata') THEN
    ALTER TABLE posts ADD COLUMN call_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'posts' AND column_name = 'arr_hint') THEN
    ALTER TABLE posts ADD COLUMN arr_hint NUMERIC(12, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'posts' AND column_name = 'competitor_mentioned') THEN
    ALTER TABLE posts ADD COLUMN competitor_mentioned TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'posts' AND column_name = 'objection_type') THEN
    ALTER TABLE posts ADD COLUMN objection_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'posts' AND column_name = 'timestamp_text') THEN
    ALTER TABLE posts ADD COLUMN timestamp_text TEXT;
  END IF;
END $$;

-- Index for call-related posts
CREATE INDEX IF NOT EXISTS idx_posts_call_record_id ON posts(call_record_id);
CREATE INDEX IF NOT EXISTS idx_posts_competitor_mentioned ON posts(competitor_mentioned) WHERE competitor_mentioned IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_objection_type ON posts(objection_type) WHERE objection_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_call_metadata ON posts USING GIN (call_metadata);

-- ============================================================================
-- 4. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE call_ingests ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Create RLS Policies
-- ============================================================================

-- call_ingests policies
DROP POLICY IF EXISTS "Users can view call_ingests for their projects" ON call_ingests;
CREATE POLICY "Users can view call_ingests for their projects" ON call_ingests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = call_ingests.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert call_ingests for their projects" ON call_ingests;
CREATE POLICY "Users can insert call_ingests for their projects" ON call_ingests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = call_ingests.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update call_ingests for their projects" ON call_ingests;
CREATE POLICY "Users can update call_ingests for their projects" ON call_ingests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = call_ingests.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to call_ingests" ON call_ingests;
CREATE POLICY "Service role full access to call_ingests" ON call_ingests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- call_records policies
DROP POLICY IF EXISTS "Users can view call_records for their projects" ON call_records;
CREATE POLICY "Users can view call_records for their projects" ON call_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = call_records.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert call_records for their projects" ON call_records;
CREATE POLICY "Users can insert call_records for their projects" ON call_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = call_records.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update call_records for their projects" ON call_records;
CREATE POLICY "Users can update call_records for their projects" ON call_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = call_records.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to call_records" ON call_records;
CREATE POLICY "Service role full access to call_records" ON call_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. Create helper functions
-- ============================================================================

-- Function to update call_ingests updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_ingests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER call_ingests_updated_at
  BEFORE UPDATE ON call_ingests
  FOR EACH ROW
  EXECUTE FUNCTION update_call_ingests_updated_at();

-- Function to update call_records updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER call_records_updated_at
  BEFORE UPDATE ON call_records
  FOR EACH ROW
  EXECUTE FUNCTION update_call_records_updated_at();

-- ============================================================================
-- 7. Create view for call analytics
-- ============================================================================
CREATE OR REPLACE VIEW call_analytics_summary AS
SELECT
  ci.project_id,
  ci.id as ingest_id,
  ci.status,
  ci.source,
  ci.total_calls,
  ci.processed_calls,
  COUNT(cr.id) as total_records,
  COUNT(cr.analyzed_at) as analyzed_records,
  SUM(CASE WHEN cr.amount IS NOT NULL AND COALESCE((cr.expansion_signals->>'score')::numeric, 0) > 50 THEN cr.amount ELSE 0 END) as expansion_revenue,
  SUM(CASE WHEN cr.amount IS NOT NULL AND COALESCE((cr.churn_signals->>'score')::numeric, 0) > 50 THEN cr.amount ELSE 0 END) as churn_risk_revenue,
  AVG(cr.sentiment) as avg_sentiment,
  AVG(cr.priority_score) as avg_priority,
  ci.created_at,
  ci.completed_at
FROM call_ingests ci
LEFT JOIN call_records cr ON cr.ingest_id = ci.id
GROUP BY ci.id, ci.project_id, ci.status, ci.source, ci.total_calls, ci.processed_calls, ci.created_at, ci.completed_at;

-- Grant permissions on view
GRANT SELECT ON call_analytics_summary TO authenticated;
GRANT SELECT ON call_analytics_summary TO service_role;

-- ============================================================================
-- 8. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE call_ingests IS 'Tracks batch uploads of customer call transcripts';
COMMENT ON TABLE call_records IS 'Individual call records with transcripts and AI analysis results';
COMMENT ON COLUMN call_records.sentiment IS 'Sentiment score from -1 (very negative) to 1 (very positive)';
COMMENT ON COLUMN call_records.priority_score IS 'AI-generated priority score from 1-100';
COMMENT ON COLUMN call_records.feature_requests IS 'Extracted feature requests as JSON array';
COMMENT ON COLUMN call_records.objections IS 'Customer objections detected in the call';
COMMENT ON COLUMN call_records.competitors IS 'Competitor mentions and context';
COMMENT ON COLUMN posts.call_record_id IS 'Link to originating call record if post was generated from a call';
COMMENT ON COLUMN posts.call_metadata IS 'Additional metadata from call analysis (timestamps, context, etc.)';
COMMENT ON COLUMN posts.arr_hint IS 'Annual Recurring Revenue hint from call context';

-- ============================================================================
-- Migration complete
-- ============================================================================
