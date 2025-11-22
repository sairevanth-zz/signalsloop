-- Phase 1: Signal Correlation Infrastructure
-- Created: 2025-11-23
-- Purpose: Track and visualize correlations between feedback, competitors, and roadmap

-- ============================================================================
-- 1. SIGNAL CORRELATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS signal_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Correlation type
  correlation_type TEXT NOT NULL CHECK (correlation_type IN (
    'feedback_to_competitor',  -- Feedback spike → Competitor action
    'feedback_to_roadmap',     -- Feedback → Roadmap prioritization
    'competitor_to_roadmap',   -- Competitor move → Roadmap adjustment
    'sentiment_to_feature',    -- Sentiment change → Specific feature
    'feedback_to_theme',       -- Feedback → Emerging theme
    'theme_to_roadmap'         -- Theme threshold → Roadmap item
  )),

  -- Source signal
  source_type TEXT NOT NULL CHECK (source_type IN ('feedback', 'competitor', 'theme', 'sentiment', 'roadmap')),
  source_id UUID NOT NULL, -- References posts, competitors, themes, roadmap_items, etc.
  source_description TEXT,

  -- Target signal
  target_type TEXT NOT NULL CHECK (target_type IN ('feedback', 'competitor', 'theme', 'sentiment', 'roadmap')),
  target_id UUID NOT NULL,
  target_description TEXT,

  -- Correlation strength
  correlation_score NUMERIC NOT NULL CHECK (correlation_score BETWEEN 0 AND 1),
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),

  -- Metadata
  evidence JSONB DEFAULT '{}'::jsonb, -- Supporting data for correlation
  detected_by TEXT DEFAULT 'auto', -- 'auto' or 'manual'

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved')),
  dismissed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signal_correlations_project ON signal_correlations(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_correlations_type ON signal_correlations(correlation_type, project_id);
CREATE INDEX IF NOT EXISTS idx_signal_correlations_source ON signal_correlations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_signal_correlations_target ON signal_correlations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_signal_correlations_active ON signal_correlations(project_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_signal_correlations_score ON signal_correlations(correlation_score DESC, project_id) WHERE status = 'active';

-- ============================================================================
-- 2. SIGNAL EVENTS (Time-series data for correlation detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS signal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'feedback_spike',         -- Unusual increase in feedback volume
    'sentiment_drop',         -- Significant sentiment decrease
    'theme_emerged',          -- New theme detected
    'competitor_action',      -- Competitor launched feature/changed pricing
    'roadmap_prioritized',    -- Roadmap item priority changed
    'feature_released',       -- Feature launched
    'churn_risk_increase'     -- Customer churn risk increased
  )),

  -- Event details
  entity_type TEXT NOT NULL, -- 'post', 'theme', 'competitor', 'roadmap_item', etc.
  entity_id UUID NOT NULL,
  entity_name TEXT,

  -- Metrics at time of event
  metric_value NUMERIC, -- E.g., feedback count, sentiment score, priority level
  baseline_value NUMERIC, -- Expected/average value
  deviation NUMERIC, -- How much it deviated from baseline

  -- Context
  metadata JSONB DEFAULT '{}'::jsonb,

  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signal_events_project ON signal_events(project_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_events_type ON signal_events(event_type, project_id);
CREATE INDEX IF NOT EXISTS idx_signal_events_entity ON signal_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_signal_events_time ON signal_events(detected_at DESC);

-- Partitioning for performance (optional, for scale)
-- CREATE INDEX IF NOT EXISTS idx_signal_events_partition ON signal_events(detected_at) WHERE detected_at > NOW() - INTERVAL '90 days';

-- ============================================================================
-- 3. DATABASE FUNCTIONS
-- ============================================================================

-- Function to detect feedback spikes
CREATE OR REPLACE FUNCTION detect_feedback_spike(
  p_project_id UUID,
  p_theme TEXT DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
) RETURNS JSON AS $$
DECLARE
  current_count INTEGER;
  baseline_count NUMERIC;
  spike_detected BOOLEAN;
  result JSON;
BEGIN
  -- Count feedback in last p_hours
  IF p_theme IS NOT NULL THEN
    SELECT COUNT(*) INTO current_count
    FROM posts
    WHERE project_id = p_project_id
      AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
      AND category = p_theme;

    -- Baseline: average per day over last 30 days
    SELECT COUNT(*)::NUMERIC / 30 INTO baseline_count
    FROM posts
    WHERE project_id = p_project_id
      AND created_at > NOW() - INTERVAL '30 days'
      AND created_at < NOW() - (p_hours || ' hours')::INTERVAL
      AND category = p_theme;
  ELSE
    SELECT COUNT(*) INTO current_count
    FROM posts
    WHERE project_id = p_project_id
      AND created_at > NOW() - (p_hours || ' hours')::INTERVAL;

    SELECT COUNT(*)::NUMERIC / 30 INTO baseline_count
    FROM posts
    WHERE project_id = p_project_id
      AND created_at > NOW() - INTERVAL '30 days'
      AND created_at < NOW() - (p_hours || ' hours')::INTERVAL;
  END IF;

  -- Detect spike if current > 2x baseline
  spike_detected := current_count > (baseline_count * 2);

  SELECT json_build_object(
    'spike_detected', spike_detected,
    'current_count', current_count,
    'baseline_count', COALESCE(baseline_count, 0),
    'deviation_percentage',
      CASE
        WHEN baseline_count > 0 THEN ((current_count - baseline_count) / baseline_count * 100)::INTEGER
        ELSE 0
      END,
    'theme', p_theme,
    'period_hours', p_hours
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find temporal correlations
CREATE OR REPLACE FUNCTION find_temporal_correlations(
  p_project_id UUID,
  p_time_window_hours INTEGER DEFAULT 48
) RETURNS TABLE (
  event1_type TEXT,
  event1_id UUID,
  event1_time TIMESTAMPTZ,
  event2_type TEXT,
  event2_id UUID,
  event2_time TIMESTAMPTZ,
  time_diff_hours INTEGER,
  correlation_score NUMERIC
) AS $$
BEGIN
  -- Find pairs of events that occurred within time window
  RETURN QUERY
  SELECT
    e1.event_type as event1_type,
    e1.entity_id as event1_id,
    e1.detected_at as event1_time,
    e2.event_type as event2_type,
    e2.entity_id as event2_id,
    e2.detected_at as event2_time,
    EXTRACT(EPOCH FROM (e2.detected_at - e1.detected_at))::INTEGER / 3600 as time_diff_hours,
    -- Simple correlation score based on temporal proximity
    1.0 - (EXTRACT(EPOCH FROM (e2.detected_at - e1.detected_at)) / (p_time_window_hours * 3600)) as correlation_score
  FROM signal_events e1
  JOIN signal_events e2 ON e1.project_id = e2.project_id
  WHERE e1.project_id = p_project_id
    AND e1.id != e2.id
    AND e2.detected_at > e1.detected_at
    AND e2.detected_at <= e1.detected_at + (p_time_window_hours || ' hours')::INTERVAL
    AND e1.detected_at > NOW() - INTERVAL '30 days'
  ORDER BY correlation_score DESC, e1.detected_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get correlation network (for graph visualization)
CREATE OR REPLACE FUNCTION get_correlation_network(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'nodes', (
      SELECT json_agg(DISTINCT jsonb_build_object(
        'id', source_id,
        'type', source_type,
        'description', source_description
      ))
      FROM signal_correlations
      WHERE project_id = p_project_id
        AND status = 'active'
        AND correlation_score >= 0.5
    ),
    'edges', (
      SELECT json_agg(jsonb_build_object(
        'id', id,
        'source', source_id,
        'target', target_id,
        'correlation_type', correlation_type,
        'score', correlation_score,
        'confidence', confidence_level
      ))
      FROM signal_correlations
      WHERE project_id = p_project_id
        AND status = 'active'
        AND correlation_score >= 0.5
      ORDER BY correlation_score DESC
      LIMIT 100
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record signal event
CREATE OR REPLACE FUNCTION record_signal_event(
  p_project_id UUID,
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_metric_value NUMERIC,
  p_baseline_value NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
  deviation_val NUMERIC;
BEGIN
  -- Calculate deviation
  IF p_baseline_value IS NOT NULL AND p_baseline_value > 0 THEN
    deviation_val := (p_metric_value - p_baseline_value) / p_baseline_value;
  ELSE
    deviation_val := NULL;
  END IF;

  -- Insert event
  INSERT INTO signal_events (
    project_id,
    event_type,
    entity_type,
    entity_id,
    entity_name,
    metric_value,
    baseline_value,
    deviation,
    metadata
  ) VALUES (
    p_project_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_metric_value,
    p_baseline_value,
    deviation_val,
    p_metadata
  ) RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Update correlation timestamp
CREATE OR REPLACE FUNCTION update_correlation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_correlation_timestamp
  BEFORE UPDATE ON signal_correlations
  FOR EACH ROW
  EXECUTE FUNCTION update_correlation_timestamp();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE signal_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case of re-run)
DROP POLICY IF EXISTS signal_correlations_select_policy ON signal_correlations;
DROP POLICY IF EXISTS signal_correlations_insert_policy ON signal_correlations;
DROP POLICY IF EXISTS signal_correlations_update_policy ON signal_correlations;
DROP POLICY IF EXISTS signal_events_select_policy ON signal_events;
DROP POLICY IF EXISTS signal_events_insert_policy ON signal_events;

-- Correlations policies
CREATE POLICY signal_correlations_select_policy ON signal_correlations
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY signal_correlations_insert_policy ON signal_correlations
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY signal_correlations_update_policy ON signal_correlations
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Events policies
CREATE POLICY signal_events_select_policy ON signal_events
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY signal_events_insert_policy ON signal_events
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON signal_correlations TO service_role;
GRANT ALL ON signal_events TO service_role;

GRANT SELECT, UPDATE ON signal_correlations TO authenticated;
GRANT SELECT ON signal_events TO authenticated;

GRANT EXECUTE ON FUNCTION detect_feedback_spike(UUID, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_temporal_correlations(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_correlation_network(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_signal_event(UUID, TEXT, TEXT, UUID, TEXT, NUMERIC, NUMERIC, JSONB) TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE signal_correlations IS 'Tracks correlations between feedback, competitors, and roadmap items';
COMMENT ON TABLE signal_events IS 'Time-series events for correlation detection';
