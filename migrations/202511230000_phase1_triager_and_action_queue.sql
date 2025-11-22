-- Phase 1: Triager Agent & Action Queue Infrastructure
-- Created: 2025-11-23
-- Purpose: Add triaging, PM assignment, auto-merge, and unified action queue

-- ============================================================================
-- 1. PM ASSIGNMENT CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS pm_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  pm_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pm_name TEXT NOT NULL,
  pm_email TEXT NOT NULL,

  -- Assignment rules
  product_areas TEXT[] DEFAULT '{}', -- themes/categories to handle
  priority_threshold INTEGER DEFAULT 3 CHECK (priority_threshold BETWEEN 1 AND 3), -- P1, P2, P3
  customer_segments TEXT[] DEFAULT '{}', -- Enterprise, SMB, Individual

  -- Auto-assign settings
  auto_assign_enabled BOOLEAN DEFAULT true,
  auto_merge_enabled BOOLEAN DEFAULT false,
  auto_merge_confidence_threshold NUMERIC DEFAULT 0.85 CHECK (auto_merge_confidence_threshold BETWEEN 0 AND 1),

  -- Notifications
  notify_on_assignment BOOLEAN DEFAULT true,
  notify_on_merge BOOLEAN DEFAULT true,
  daily_digest_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add PM assignment columns to posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS assigned_pm_id UUID REFERENCES pm_assignments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false;

-- Add merge tracking columns to posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES posts(id) ON DELETE SET NULL;

-- Indexes for PM assignments
CREATE INDEX IF NOT EXISTS idx_pm_assignments_project ON pm_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_assignments_enabled ON pm_assignments(project_id, auto_assign_enabled) WHERE auto_assign_enabled = true;
CREATE INDEX IF NOT EXISTS idx_posts_assigned_pm ON posts(assigned_pm_id) WHERE assigned_pm_id IS NOT NULL;

-- ============================================================================
-- 2. FEEDBACK MERGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  primary_post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  merged_post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,

  similarity_score NUMERIC NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
  merge_reason TEXT,
  auto_merged BOOLEAN DEFAULT false,
  merged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  merged_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate merges
  CONSTRAINT unique_merge_pair UNIQUE (primary_post_id, merged_post_id)
);

-- Indexes for merges
CREATE INDEX IF NOT EXISTS idx_feedback_merges_primary ON feedback_merges(primary_post_id);
CREATE INDEX IF NOT EXISTS idx_feedback_merges_merged ON feedback_merges(merged_post_id);
CREATE INDEX IF NOT EXISTS idx_feedback_merges_project ON feedback_merges(project_id, merged_at DESC);

-- ============================================================================
-- 3. TRIAGE QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS triage_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,

  -- Triage status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- AI analysis suggestions
  suggested_category TEXT,
  suggested_priority INTEGER CHECK (suggested_priority BETWEEN 1 AND 3),
  suggested_pm_id UUID REFERENCES pm_assignments(id) ON DELETE SET NULL,
  duplicate_of UUID REFERENCES posts(id) ON DELETE SET NULL,
  similarity_score NUMERIC CHECK (similarity_score IS NULL OR (similarity_score BETWEEN 0 AND 1)),

  -- Actions taken
  auto_categorized BOOLEAN DEFAULT false,
  auto_prioritized BOOLEAN DEFAULT false,
  auto_assigned BOOLEAN DEFAULT false,
  auto_merged BOOLEAN DEFAULT false,

  -- Error handling
  error_message TEXT,

  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate queue entries
  CONSTRAINT unique_post_in_queue UNIQUE (post_id)
);

-- Indexes for triage queue
CREATE INDEX IF NOT EXISTS idx_triage_queue_status ON triage_queue(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_queue_pending ON triage_queue(project_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_triage_queue_post ON triage_queue(post_id);

-- ============================================================================
-- 4. UNIFIED ACTION QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS unified_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'merge_suggestion',
    'priority_change',
    'competitive_threat',
    'anomaly_detected',
    'spec_ready_for_review',
    'roadmap_adjustment',
    'customer_at_risk',
    'opportunity_identified',
    'release_ready',
    'feature_gap_detected',
    'sentiment_drop',
    'feedback_spike',
    'pm_assignment_needed'
  )),

  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3), -- 1=High, 2=Medium, 3=Low
  severity TEXT DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info', 'success')),

  title TEXT NOT NULL,
  description TEXT,

  -- Related entities
  related_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  related_roadmap_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
  related_competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  related_spec_id UUID REFERENCES specs(id) ON DELETE CASCADE,

  -- Metadata (flexible JSON for action-specific data)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Action execution
  requires_approval BOOLEAN DEFAULT true,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  executed BOOLEAN DEFAULT false,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ,
  execution_result JSONB,

  -- Dismissal
  dismissed BOOLEAN DEFAULT false,
  dismissed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiry for time-sensitive actions
);

-- Indexes for action queue
CREATE INDEX IF NOT EXISTS idx_action_queue_project_active ON unified_action_queue(project_id, priority, created_at DESC)
  WHERE executed = false AND dismissed = false;
CREATE INDEX IF NOT EXISTS idx_action_queue_type ON unified_action_queue(action_type, project_id);
CREATE INDEX IF NOT EXISTS idx_action_queue_severity ON unified_action_queue(severity, project_id)
  WHERE executed = false AND dismissed = false;
CREATE INDEX IF NOT EXISTS idx_action_queue_related_post ON unified_action_queue(related_post_id) WHERE related_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_queue_expires ON unified_action_queue(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 5. DATABASE FUNCTIONS
-- ============================================================================

-- Function to get pending actions
CREATE OR REPLACE FUNCTION get_pending_actions(p_project_id UUID)
RETURNS TABLE (
  action JSON,
  age_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    row_to_json(uaq.*) as action,
    EXTRACT(EPOCH FROM (NOW() - uaq.created_at))::INTEGER / 60 as age_minutes
  FROM unified_action_queue uaq
  WHERE uaq.project_id = p_project_id
    AND uaq.executed = false
    AND uaq.dismissed = false
    AND (uaq.expires_at IS NULL OR uaq.expires_at > NOW())
  ORDER BY
    -- Critical items first
    CASE WHEN uaq.severity = 'critical' THEN 1 ELSE 2 END,
    uaq.priority ASC,
    uaq.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get triage statistics
CREATE OR REPLACE FUNCTION get_triage_stats(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'total', COUNT(*),
    'avg_processing_time_minutes',
      COALESCE(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) / 60) FILTER (WHERE status = 'completed'), 0)::INTEGER,
    'auto_categorized_count', COUNT(*) FILTER (WHERE auto_categorized = true),
    'auto_assigned_count', COUNT(*) FILTER (WHERE auto_assigned = true),
    'auto_merged_count', COUNT(*) FILTER (WHERE auto_merged = true)
  ) INTO result
  FROM triage_queue
  WHERE project_id = p_project_id
    AND created_at > NOW() - INTERVAL '30 days';

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get action queue statistics
CREATE OR REPLACE FUNCTION get_action_queue_stats(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pending', COUNT(*) FILTER (WHERE executed = false AND dismissed = false),
    'executed', COUNT(*) FILTER (WHERE executed = true),
    'dismissed', COUNT(*) FILTER (WHERE dismissed = true),
    'critical', COUNT(*) FILTER (WHERE severity = 'critical' AND executed = false AND dismissed = false),
    'high_priority', COUNT(*) FILTER (WHERE priority = 1 AND executed = false AND dismissed = false),
    'by_type', json_object_agg(
      action_type,
      type_count
    )
  ) INTO result
  FROM (
    SELECT
      action_type,
      COUNT(*) as type_count
    FROM unified_action_queue
    WHERE project_id = p_project_id
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY action_type
  ) type_stats;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment post stats (for merging)
CREATE OR REPLACE FUNCTION increment_post_stats(
  p_post_id UUID,
  p_votes INTEGER DEFAULT 0,
  p_comments INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET
    vote_count = vote_count + p_votes,
    comment_count = comment_count + p_comments,
    updated_at = NOW()
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Auto-create triage queue entry when feedback is created
CREATE OR REPLACE FUNCTION auto_enqueue_for_triage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enqueue if not already triaged
  IF NEW.category IS NULL OR NEW.priority IS NULL OR NEW.assigned_pm_id IS NULL THEN
    INSERT INTO triage_queue (project_id, post_id, status)
    VALUES (NEW.project_id, NEW.id, 'pending')
    ON CONFLICT (post_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_enqueue_for_triage
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_enqueue_for_triage();

-- Update action queue timestamp
CREATE OR REPLACE FUNCTION update_action_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_action_queue_timestamp
  BEFORE UPDATE ON unified_action_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_action_queue_timestamp();

-- Update PM assignment timestamp
CREATE OR REPLACE FUNCTION update_pm_assignment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pm_assignment_timestamp
  BEFORE UPDATE ON pm_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_pm_assignment_timestamp();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE pm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_action_queue ENABLE ROW LEVEL SECURITY;

-- PM Assignments policies
CREATE POLICY pm_assignments_select_policy ON pm_assignments
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY pm_assignments_insert_policy ON pm_assignments
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY pm_assignments_update_policy ON pm_assignments
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY pm_assignments_delete_policy ON pm_assignments
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Feedback Merges policies
CREATE POLICY feedback_merges_select_policy ON feedback_merges
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY feedback_merges_insert_policy ON feedback_merges
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Triage Queue policies
CREATE POLICY triage_queue_select_policy ON triage_queue
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY triage_queue_insert_policy ON triage_queue
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY triage_queue_update_policy ON triage_queue
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Action Queue policies
CREATE POLICY action_queue_select_policy ON unified_action_queue
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY action_queue_insert_policy ON unified_action_queue
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY action_queue_update_policy ON unified_action_queue
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY action_queue_delete_policy ON unified_action_queue
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant service role access for agents
GRANT ALL ON pm_assignments TO service_role;
GRANT ALL ON feedback_merges TO service_role;
GRANT ALL ON triage_queue TO service_role;
GRANT ALL ON unified_action_queue TO service_role;

-- Grant authenticated user access
GRANT SELECT, INSERT, UPDATE ON pm_assignments TO authenticated;
GRANT SELECT ON feedback_merges TO authenticated;
GRANT SELECT, UPDATE ON triage_queue TO authenticated;
GRANT SELECT, UPDATE ON unified_action_queue TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION get_pending_actions(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_triage_stats(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_action_queue_stats(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_post_stats(UUID, INTEGER, INTEGER) TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comment
COMMENT ON TABLE pm_assignments IS 'PM assignment rules and auto-triage configuration';
COMMENT ON TABLE feedback_merges IS 'Track feedback merges (manual and automatic)';
COMMENT ON TABLE triage_queue IS 'Queue for automatic feedback triage processing';
COMMENT ON TABLE unified_action_queue IS 'Centralized AI-recommended actions requiring PM attention';
