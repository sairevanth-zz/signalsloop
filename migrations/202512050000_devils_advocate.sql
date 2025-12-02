-- Devil's Advocate Agent Migration
-- Creates tables for adversarial AI agent that challenges PRDs
-- Monitors competitor activity and posts risk alerts on documents

-- ============================================================================
-- 1. Enable pgvector extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. Create competitor_events table (with vector embeddings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS competitor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'feature_launch', 'pricing_change', 'funding', 'acquisition',
    'partnership', 'executive_change', 'product_sunset', 'expansion'
  )),
  event_title TEXT NOT NULL,
  event_summary TEXT NOT NULL,
  event_date DATE NOT NULL,

  -- Source tracking
  source_url TEXT,
  source_type TEXT CHECK (source_type IN (
    'changelog', 'press_release', 'news', 'social', 'sec_filing', 'job_posting'
  )),

  -- AI analysis
  impact_assessment TEXT CHECK (impact_assessment IN (
    'critical', 'high', 'medium', 'low', 'informational'
  )),
  strategic_implications JSONB,

  -- Vector embedding for semantic search (OpenAI text-embedding-3-small)
  embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Create prd_risk_alerts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS prd_risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Alert content
  risk_type TEXT NOT NULL CHECK (risk_type IN (
    'competitive_threat', 'data_contradiction', 'assumption_challenge',
    'market_shift', 'technical_risk', 'resource_constraint'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Evidence
  evidence JSONB NOT NULL,  -- { sources: [], data_points: [], quotes: [] }
  recommended_action TEXT NOT NULL,

  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  -- AI reasoning
  reasoning_trace JSONB,
  confidence_score DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Create indexes
-- ============================================================================

-- Competitor events indexes
CREATE INDEX IF NOT EXISTS idx_competitor_events_project ON competitor_events(project_id);
CREATE INDEX IF NOT EXISTS idx_competitor_events_competitor ON competitor_events(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_events_type ON competitor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_competitor_events_date ON competitor_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_events_impact ON competitor_events(impact_assessment);

-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_competitor_events_embedding ON competitor_events
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- PRD risk alerts indexes
CREATE INDEX IF NOT EXISTS idx_prd_risk_alerts_spec ON prd_risk_alerts(spec_id);
CREATE INDEX IF NOT EXISTS idx_prd_risk_alerts_project ON prd_risk_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_prd_risk_alerts_status ON prd_risk_alerts(status);
CREATE INDEX IF NOT EXISTS idx_prd_risk_alerts_severity ON prd_risk_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_prd_risk_alerts_type ON prd_risk_alerts(risk_type);
CREATE INDEX IF NOT EXISTS idx_prd_risk_alerts_created ON prd_risk_alerts(created_at DESC);

-- ============================================================================
-- 5. Enable Row Level Security
-- ============================================================================

ALTER TABLE competitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_risk_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS Policies for competitor_events
-- ============================================================================

-- Users can view competitor events for their projects
CREATE POLICY "Users can view competitor events for their projects" ON competitor_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = competitor_events.project_id AND projects.owner_id = auth.uid()
    )
  );

-- System can insert/update competitor events
CREATE POLICY "System can insert competitor events" ON competitor_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update competitor events" ON competitor_events
  FOR UPDATE USING (true);

-- Users can delete competitor events for their projects
CREATE POLICY "Users can delete competitor events for their projects" ON competitor_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = competitor_events.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. RLS Policies for prd_risk_alerts
-- ============================================================================

-- Users can view risk alerts for their projects
CREATE POLICY "Users can view risk alerts for their projects" ON prd_risk_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = prd_risk_alerts.project_id AND projects.owner_id = auth.uid()
    )
  );

-- System can insert risk alerts
CREATE POLICY "System can insert risk alerts" ON prd_risk_alerts
  FOR INSERT WITH CHECK (true);

-- Users can update risk alerts for their projects (for resolution)
CREATE POLICY "Users can update risk alerts for their projects" ON prd_risk_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = prd_risk_alerts.project_id AND projects.owner_id = auth.uid()
    )
  );

-- Users can delete risk alerts for their projects
CREATE POLICY "Users can delete risk alerts for their projects" ON prd_risk_alerts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = prd_risk_alerts.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. Create update trigger for prd_risk_alerts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_prd_risk_alerts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prd_risk_alerts_timestamp
  BEFORE UPDATE ON prd_risk_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_prd_risk_alerts_timestamp();

-- ============================================================================
-- 9. Create helper functions
-- ============================================================================

-- Function to get risk alerts summary for a project
CREATE OR REPLACE FUNCTION get_risk_alerts_summary(p_project_id UUID)
RETURNS TABLE (
  total_alerts BIGINT,
  critical_alerts BIGINT,
  high_alerts BIGINT,
  open_alerts BIGINT,
  alerts_last_7d BIGINT,
  top_risk_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_alerts,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
    COUNT(*) FILTER (WHERE severity = 'high') as high_alerts,
    COUNT(*) FILTER (WHERE status = 'open') as open_alerts,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as alerts_last_7d,
    jsonb_agg(DISTINCT jsonb_build_object(
      'risk_type', risk_type,
      'count', (SELECT COUNT(*) FROM prd_risk_alerts WHERE project_id = p_project_id AND risk_type = prd_risk_alerts.risk_type)
    )) as top_risk_types
  FROM prd_risk_alerts
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search competitor events by similarity
CREATE OR REPLACE FUNCTION search_competitor_events_by_similarity(
  p_embedding vector(1536),
  p_project_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  competitor_id UUID,
  event_type TEXT,
  event_title TEXT,
  event_summary TEXT,
  event_date DATE,
  impact_assessment TEXT,
  strategic_implications JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.competitor_id,
    ce.event_type,
    ce.event_title,
    ce.event_summary,
    ce.event_date,
    ce.impact_assessment,
    ce.strategic_implications,
    1 - (ce.embedding <=> p_embedding) as similarity
  FROM competitor_events ce
  WHERE ce.project_id = p_project_id
  ORDER BY ce.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_risk_alerts_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_risk_alerts_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION search_competitor_events_by_similarity(vector, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_competitor_events_by_similarity(vector, UUID, INTEGER) TO service_role;

-- ============================================================================
-- 11. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE competitor_events IS 'Competitor intelligence events scraped from external sources with vector embeddings for semantic search';
COMMENT ON TABLE prd_risk_alerts IS 'AI-generated risk alerts that challenge PRDs based on competitor intelligence and internal data';

COMMENT ON COLUMN competitor_events.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions) for semantic similarity search';
COMMENT ON COLUMN prd_risk_alerts.reasoning_trace IS 'Detailed AI reasoning trace showing how the alert was generated';
COMMENT ON COLUMN prd_risk_alerts.evidence IS 'Structured evidence supporting the alert: sources, data points, quotes';
