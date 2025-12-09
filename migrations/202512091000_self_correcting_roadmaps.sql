-- Self-Correcting Roadmaps - Database Schema
-- Migration: 202512091000_self_correcting_roadmaps.sql
-- 
-- Creates tables for roadmap adjustment proposals and history tracking.

-- ============================================
-- ROADMAP ADJUSTMENT PROPOSALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roadmap_adjustment_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Trigger information
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('sentiment_shift', 'competitor_move', 'theme_spike', 'churn_signal')),
  trigger_severity TEXT NOT NULL CHECK (trigger_severity IN ('low', 'medium', 'high', 'critical')),
  trigger_description TEXT NOT NULL,
  trigger_data JSONB NOT NULL DEFAULT '{}',
  
  -- Proposal details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  proposed_changes JSONB NOT NULL DEFAULT '[]',
  ai_reasoning TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Approval tracking
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Auto-expiration (7 days by default)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROADMAP ADJUSTMENT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roadmap_adjustment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES roadmap_adjustment_proposals(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- What changed
  suggestion_id UUID NOT NULL REFERENCES roadmap_suggestions(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL,
  old_priority TEXT NOT NULL,
  new_priority TEXT NOT NULL,
  old_score DECIMAL(5,2),
  new_score DECIMAL(5,2),
  
  -- Outcome tracking (filled in later by outcome loop)
  outcome_validated BOOLEAN DEFAULT FALSE,
  outcome_correct BOOLEAN,
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_adj_proposals_project_status 
  ON roadmap_adjustment_proposals(project_id, status);

CREATE INDEX IF NOT EXISTS idx_adj_proposals_expires 
  ON roadmap_adjustment_proposals(expires_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_adj_proposals_trigger_type 
  ON roadmap_adjustment_proposals(trigger_type);

CREATE INDEX IF NOT EXISTS idx_adj_proposals_created_at 
  ON roadmap_adjustment_proposals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adj_history_proposal 
  ON roadmap_adjustment_history(proposal_id);

CREATE INDEX IF NOT EXISTS idx_adj_history_project 
  ON roadmap_adjustment_history(project_id);

CREATE INDEX IF NOT EXISTS idx_adj_history_suggestion 
  ON roadmap_adjustment_history(suggestion_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE roadmap_adjustment_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_adjustment_history ENABLE ROW LEVEL SECURITY;

-- Proposals: Users can view proposals for projects they own
CREATE POLICY "Users can view proposals for their projects"
  ON roadmap_adjustment_proposals FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Proposals: Users can insert proposals for their projects
CREATE POLICY "Users can create proposals for their projects"
  ON roadmap_adjustment_proposals FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Proposals: Users can update proposals for their projects
CREATE POLICY "Users can update proposals for their projects"
  ON roadmap_adjustment_proposals FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- History: Users can view history for their projects
CREATE POLICY "Users can view history for their projects"
  ON roadmap_adjustment_history FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- History: Users can insert history for their projects  
CREATE POLICY "Users can create history for their projects"
  ON roadmap_adjustment_history FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get pending proposals for a project
CREATE OR REPLACE FUNCTION get_pending_proposals(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  trigger_type TEXT,
  trigger_severity TEXT,
  trigger_description TEXT,
  proposed_changes JSONB,
  confidence_score DECIMAL,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    trigger_type,
    trigger_severity,
    trigger_description,
    proposed_changes,
    confidence_score,
    created_at,
    expires_at
  FROM roadmap_adjustment_proposals
  WHERE project_id = p_project_id
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY 
    CASE trigger_severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      ELSE 4 
    END,
    created_at DESC;
$$;

-- Function to get adjustment statistics
CREATE OR REPLACE FUNCTION get_adjustment_stats(p_project_id UUID)
RETURNS TABLE (
  total_proposals BIGINT,
  pending_proposals BIGINT,
  approved_proposals BIGINT,
  rejected_proposals BIGINT,
  approval_rate DECIMAL,
  avg_confidence DECIMAL,
  last_proposal_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as total_proposals,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_proposals,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_proposals,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_proposals,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')) > 0 
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL / 
        COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')) * 100, 
        1
      )
      ELSE 0 
    END as approval_rate,
    ROUND(AVG(confidence_score), 2) as avg_confidence,
    MAX(created_at) as last_proposal_at
  FROM roadmap_adjustment_proposals
  WHERE project_id = p_project_id;
$$;

-- Function to expire old pending proposals
CREATE OR REPLACE FUNCTION expire_old_proposals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE roadmap_adjustment_proposals
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
    
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_adj_proposals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_adj_proposals_updated_at ON roadmap_adjustment_proposals;
CREATE TRIGGER trigger_adj_proposals_updated_at
  BEFORE UPDATE ON roadmap_adjustment_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_adj_proposals_updated_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE ON roadmap_adjustment_proposals TO authenticated;
GRANT SELECT, INSERT ON roadmap_adjustment_history TO authenticated;
