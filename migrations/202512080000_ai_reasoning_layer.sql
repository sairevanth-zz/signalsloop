-- =====================================================
-- Feature F: AI Reasoning Layer
-- Database Migration
-- =====================================================
-- Creates tables for transparent AI reasoning capture
-- Users can click "Why?" to see what data and logic led to any recommendation
-- =====================================================

-- =====================================================
-- REASONING TRACES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reasoning_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Feature that generated this reasoning
  feature TEXT NOT NULL CHECK (feature IN (
    'devils_advocate',
    'prediction',
    'prioritization',
    'classification',
    'sentiment_analysis',
    'theme_detection',
    'spec_writer',
    'roadmap_suggestion',
    'competitive_intel',
    'anomaly_detection',
    'churn_prediction',
    'impact_simulation',
    'stakeholder_response'
  )),
  
  -- Decision type (e.g., 'risk_alert_created', 'adoption_predicted', 'priority_changed')
  decision_type TEXT NOT NULL,
  
  -- Human-readable summary of the decision
  decision_summary TEXT NOT NULL,
  
  -- Input data that was used for the decision
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "data_sources": [
      { "type": "feedback", "count": 45, "ids": ["uuid1", "uuid2"] },
      { "type": "sentiment_scores", "count": 45, "average": 0.65 },
      { "type": "competitor_data", "count": 3 }
    ],
    "context": {
      "project_name": "MyApp",
      "time_range": "30_days",
      "filters_applied": ["enterprise_customers"]
    }
  }
  */
  
  -- Step-by-step reasoning process
  reasoning_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  /* Structure:
  [
    {
      "step_number": 1,
      "description": "Analyzed feedback volume trends",
      "evidence": ["45 feedback items in last 30 days", "20% increase from previous period"],
      "conclusion": "High user engagement with this feature area",
      "confidence": 0.85
    },
    {
      "step_number": 2,
      "description": "Evaluated sentiment distribution",
      "evidence": ["65% positive", "25% neutral", "10% negative"],
      "conclusion": "Generally positive reception",
      "confidence": 0.90
    }
  ]
  */
  
  -- Output of the decision
  outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "decision": "Priority set to P1",
    "confidence": 0.85,
    "alternatives_considered": [
      {
        "alternative": "Set priority to P2",
        "why_rejected": "High feedback volume and positive sentiment suggest higher urgency"
      },
      {
        "alternative": "Defer to next quarter",
        "why_rejected": "Enterprise customers explicitly requesting this feature"
      }
    ]
  }
  */
  
  -- Metadata about the AI call
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "model_used": "gpt-4o",
    "tokens_used": 1245,
    "latency_ms": 2340,
    "timestamp": "2025-12-08T10:30:00Z",
    "prompt_version": "v1.2"
  }
  */
  
  -- Reference to the entity this reasoning is about
  entity_type TEXT, -- 'post', 'spec', 'roadmap_item', 'theme', 'competitor', etc.
  entity_id UUID,
  
  -- User who triggered the AI action (if applicable)
  triggered_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT reasoning_traces_valid_inputs CHECK (jsonb_typeof(inputs) = 'object'),
  CONSTRAINT reasoning_traces_valid_steps CHECK (jsonb_typeof(reasoning_steps) = 'array'),
  CONSTRAINT reasoning_traces_valid_outputs CHECK (jsonb_typeof(outputs) = 'object')
);

-- Indexes for efficient querying
CREATE INDEX idx_reasoning_traces_project ON reasoning_traces(project_id);
CREATE INDEX idx_reasoning_traces_feature ON reasoning_traces(feature);
CREATE INDEX idx_reasoning_traces_decision_type ON reasoning_traces(decision_type);
CREATE INDEX idx_reasoning_traces_entity ON reasoning_traces(entity_type, entity_id);
CREATE INDEX idx_reasoning_traces_created ON reasoning_traces(created_at DESC);
CREATE INDEX idx_reasoning_traces_project_feature ON reasoning_traces(project_id, feature, created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX idx_reasoning_traces_inputs_gin ON reasoning_traces USING gin(inputs);
CREATE INDEX idx_reasoning_traces_outputs_gin ON reasoning_traces USING gin(outputs);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE reasoning_traces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS reasoning_traces_select_policy ON reasoning_traces;
DROP POLICY IF EXISTS reasoning_traces_insert_policy ON reasoning_traces;
DROP POLICY IF EXISTS reasoning_traces_delete_policy ON reasoning_traces;

-- Select: Users can view reasoning traces for their projects
CREATE POLICY reasoning_traces_select_policy ON reasoning_traces
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    OR project_id IS NULL -- Allow system-level traces
  );

-- Insert: Users can create reasoning traces for their projects
CREATE POLICY reasoning_traces_insert_policy ON reasoning_traces
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    OR project_id IS NULL
  );

-- Delete: Users can delete reasoning traces for their projects
CREATE POLICY reasoning_traces_delete_policy ON reasoning_traces
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get reasoning trace for a specific entity
CREATE OR REPLACE FUNCTION get_reasoning_for_entity(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  feature TEXT,
  decision_type TEXT,
  decision_summary TEXT,
  reasoning_steps JSONB,
  outputs JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id,
    rt.feature,
    rt.decision_type,
    rt.decision_summary,
    rt.reasoning_steps,
    rt.outputs,
    rt.metadata,
    rt.created_at
  FROM reasoning_traces rt
  WHERE rt.entity_type = p_entity_type
    AND rt.entity_id = p_entity_id
  ORDER BY rt.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get latest reasoning traces for a project
CREATE OR REPLACE FUNCTION get_project_reasoning_traces(
  p_project_id UUID,
  p_feature TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  feature TEXT,
  decision_type TEXT,
  decision_summary TEXT,
  reasoning_steps JSONB,
  outputs JSONB,
  metadata JSONB,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id,
    rt.feature,
    rt.decision_type,
    rt.decision_summary,
    rt.reasoning_steps,
    rt.outputs,
    rt.metadata,
    rt.entity_type,
    rt.entity_id,
    rt.created_at
  FROM reasoning_traces rt
  WHERE rt.project_id = p_project_id
    AND (p_feature IS NULL OR rt.feature = p_feature)
  ORDER BY rt.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get reasoning statistics for a project
CREATE OR REPLACE FUNCTION get_reasoning_stats(p_project_id UUID)
RETURNS TABLE (
  total_traces INTEGER,
  traces_by_feature JSONB,
  avg_confidence DECIMAL,
  avg_latency_ms DECIMAL,
  most_common_decision_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_traces,
    jsonb_object_agg(
      rt.feature,
      feature_count
    ) as traces_by_feature,
    AVG((rt.outputs->>'confidence')::DECIMAL)::DECIMAL as avg_confidence,
    AVG((rt.metadata->>'latency_ms')::DECIMAL)::DECIMAL as avg_latency_ms,
    (
      SELECT jsonb_agg(jsonb_build_object('decision_type', dt, 'count', dt_count))
      FROM (
        SELECT decision_type as dt, COUNT(*) as dt_count
        FROM reasoning_traces
        WHERE project_id = p_project_id
        GROUP BY decision_type
        ORDER BY dt_count DESC
        LIMIT 10
      ) top_types
    ) as most_common_decision_types
  FROM reasoning_traces rt
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as feature_count
    FROM reasoning_traces rt2
    WHERE rt2.project_id = p_project_id AND rt2.feature = rt.feature
  ) fc ON true
  WHERE rt.project_id = p_project_id
  GROUP BY rt.project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP OLD TRACES (Optional scheduled job)
-- =====================================================

-- Function to clean up old reasoning traces (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_reasoning_traces()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM reasoning_traces
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Migration Complete
-- =====================================================
