-- Smart Polls & Surveys Database Schema
-- Created: 2025-12-24
-- Purpose: Add poll and survey primitives with voting, results, and AI integration

-- ============================================================================
-- 1. POLLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL CHECK (poll_type IN ('single_choice', 'multiple_choice', 'ranked')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  
  -- Scheduling
  closes_at TIMESTAMPTZ,
  
  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Targeting
  target_segments TEXT[] DEFAULT '{}', -- Enterprise, SMB, Individual, etc.
  target_customer_ids UUID[] DEFAULT '{}', -- Specific customer_ids from CRM
  
  -- Linking to existing entities
  related_theme_id UUID, -- Theme that prompted this poll
  related_feedback_ids UUID[] DEFAULT '{}', -- Feedback that prompted this poll
  
  -- Analytics
  vote_count INTEGER DEFAULT 0,
  unique_voter_count INTEGER DEFAULT 0,
  
  -- Configuration
  allow_anonymous BOOLEAN DEFAULT true,
  require_explanation BOOLEAN DEFAULT false,
  show_results_before_vote BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for polls
CREATE INDEX IF NOT EXISTS idx_polls_project ON polls(project_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(project_id, status);
CREATE INDEX IF NOT EXISTS idx_polls_created ON polls(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_theme ON polls(related_theme_id) WHERE related_theme_id IS NOT NULL;

-- ============================================================================
-- 2. POLL OPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  description TEXT,
  
  -- AI context
  linked_feedback_ids UUID[] DEFAULT '{}', -- Feedback items that support this option
  ai_generated BOOLEAN DEFAULT false, -- Whether this was AI-suggested
  
  -- Ordering
  display_order INTEGER DEFAULT 0,
  
  -- Analytics (denormalized for performance)
  vote_count INTEGER DEFAULT 0,
  weighted_vote_count NUMERIC DEFAULT 0, -- Revenue-weighted
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for poll options
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_order ON poll_options(poll_id, display_order);

-- ============================================================================
-- 3. POLL VOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  
  -- Voter identification (at least one required)
  voter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Authenticated user
  voter_email TEXT, -- Email if provided
  voter_hash TEXT NOT NULL, -- Hash for deduplication (hash of email or IP + user_agent)
  
  -- Ranked choice support
  rank_position INTEGER, -- For ranked polls: 1 = first choice, 2 = second, etc.
  
  -- Optional explanation
  explanation_text TEXT,
  explanation_sentiment NUMERIC, -- Computed sentiment score
  
  -- CRM linking for revenue weighting
  customer_id UUID, -- Link to CRM customer
  customer_mrr NUMERIC, -- Cached MRR at vote time for weighting
  customer_segment TEXT, -- Enterprise, SMB, etc.
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate votes (one vote per voter per poll)
  CONSTRAINT unique_poll_vote UNIQUE (poll_id, voter_hash)
);

-- Indexes for poll votes
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voter ON poll_votes(voter_id) WHERE voter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poll_votes_customer ON poll_votes(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poll_votes_segment ON poll_votes(poll_id, customer_segment);

-- ============================================================================
-- 4. SURVEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  
  -- Messaging
  thank_you_message TEXT DEFAULT 'Thank you for your feedback!',
  
  -- Scheduling
  closes_at TIMESTAMPTZ,
  
  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Analytics
  response_count INTEGER DEFAULT 0,
  completion_rate NUMERIC, -- Percentage of started surveys that were completed
  avg_sentiment NUMERIC, -- Average sentiment across text responses
  
  -- Configuration
  allow_anonymous BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for surveys
CREATE INDEX IF NOT EXISTS idx_surveys_project ON surveys(project_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(project_id, status);
CREATE INDEX IF NOT EXISTS idx_surveys_created ON surveys(project_id, created_at DESC);

-- ============================================================================
-- 5. SURVEY QUESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  
  -- Question definition
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'single_select', 'multi_select', 'rating', 'nps')),
  question_text TEXT NOT NULL,
  
  -- Options for select types
  options JSONB, -- ["Option A", "Option B", "Option C"]
  
  -- Configuration
  required BOOLEAN DEFAULT false,
  
  -- For rating type
  min_value INTEGER DEFAULT 1,
  max_value INTEGER DEFAULT 5,
  min_label TEXT, -- "Not satisfied"
  max_label TEXT, -- "Very satisfied"
  
  -- Ordering
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for survey questions
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON survey_questions(survey_id, display_order);

-- ============================================================================
-- 6. SURVEY RESPONSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  
  -- Respondent identification
  respondent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  respondent_email TEXT,
  respondent_hash TEXT NOT NULL, -- For deduplication
  
  -- Response data
  answers JSONB NOT NULL, -- { "question_id": "answer_value" }
  
  -- AI-computed analytics
  sentiment_score NUMERIC, -- Overall sentiment from text answers
  detected_themes TEXT[], -- Themes detected in text answers
  
  -- CRM linking
  customer_id UUID,
  customer_mrr NUMERIC,
  customer_segment TEXT,
  
  -- Completion tracking
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_complete BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One response per respondent per survey
  CONSTRAINT unique_survey_response UNIQUE (survey_id, respondent_hash)
);

-- Indexes for survey responses
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_complete ON survey_responses(survey_id, is_complete);
CREATE INDEX IF NOT EXISTS idx_survey_responses_customer ON survey_responses(customer_id) WHERE customer_id IS NOT NULL;

-- ============================================================================
-- 7. DATABASE FUNCTIONS
-- ============================================================================

-- Function to get poll results with vote counts and percentages
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (
  option_id UUID,
  option_text TEXT,
  vote_count BIGINT,
  weighted_vote_count NUMERIC,
  percentage NUMERIC,
  weighted_percentage NUMERIC
) AS $$
DECLARE
  total_votes BIGINT;
  total_weighted NUMERIC;
BEGIN
  -- Get totals
  SELECT COUNT(*), COALESCE(SUM(COALESCE(customer_mrr, 1)), 0)
  INTO total_votes, total_weighted
  FROM poll_votes
  WHERE poll_id = p_poll_id;
  
  RETURN QUERY
  SELECT
    po.id as option_id,
    po.option_text,
    COUNT(pv.id) as vote_count,
    COALESCE(SUM(COALESCE(pv.customer_mrr, 1)), 0) as weighted_vote_count,
    CASE WHEN total_votes > 0 
      THEN ROUND((COUNT(pv.id)::NUMERIC / total_votes) * 100, 1)
      ELSE 0 
    END as percentage,
    CASE WHEN total_weighted > 0 
      THEN ROUND((COALESCE(SUM(COALESCE(pv.customer_mrr, 1)), 0) / total_weighted) * 100, 1)
      ELSE 0 
    END as weighted_percentage
  FROM poll_options po
  LEFT JOIN poll_votes pv ON po.id = pv.option_id
  WHERE po.poll_id = p_poll_id
  GROUP BY po.id, po.option_text, po.display_order
  ORDER BY po.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get poll results by segment
CREATE OR REPLACE FUNCTION get_poll_results_by_segment(p_poll_id UUID)
RETURNS TABLE (
  option_id UUID,
  option_text TEXT,
  segment TEXT,
  vote_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH segment_totals AS (
    SELECT 
      COALESCE(pv.customer_segment, 'Unknown') as seg,
      COUNT(*) as total
    FROM poll_votes pv
    WHERE pv.poll_id = p_poll_id
    GROUP BY COALESCE(pv.customer_segment, 'Unknown')
  )
  SELECT
    po.id as option_id,
    po.option_text,
    COALESCE(pv.customer_segment, 'Unknown') as segment,
    COUNT(pv.id) as vote_count,
    CASE WHEN st.total > 0 
      THEN ROUND((COUNT(pv.id)::NUMERIC / st.total) * 100, 1)
      ELSE 0 
    END as percentage
  FROM poll_options po
  CROSS JOIN (SELECT DISTINCT COALESCE(customer_segment, 'Unknown') as seg FROM poll_votes WHERE poll_id = p_poll_id) segments
  LEFT JOIN poll_votes pv ON po.id = pv.option_id AND COALESCE(pv.customer_segment, 'Unknown') = segments.seg
  LEFT JOIN segment_totals st ON st.seg = segments.seg
  WHERE po.poll_id = p_poll_id
  GROUP BY po.id, po.option_text, po.display_order, segments.seg, st.total, pv.customer_segment
  ORDER BY po.display_order, segments.seg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update poll vote counts (called by trigger)
CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update poll total
    UPDATE polls 
    SET vote_count = vote_count + 1,
        unique_voter_count = (
          SELECT COUNT(DISTINCT voter_hash) FROM poll_votes WHERE poll_id = NEW.poll_id
        ),
        updated_at = NOW()
    WHERE id = NEW.poll_id;
    
    -- Update option count
    UPDATE poll_options
    SET vote_count = vote_count + 1,
        weighted_vote_count = weighted_vote_count + COALESCE(NEW.customer_mrr, 1)
    WHERE id = NEW.option_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update poll total
    UPDATE polls 
    SET vote_count = GREATEST(0, vote_count - 1),
        unique_voter_count = (
          SELECT COUNT(DISTINCT voter_hash) FROM poll_votes WHERE poll_id = OLD.poll_id
        ),
        updated_at = NOW()
    WHERE id = OLD.poll_id;
    
    -- Update option count
    UPDATE poll_options
    SET vote_count = GREATEST(0, vote_count - 1),
        weighted_vote_count = GREATEST(0, weighted_vote_count - COALESCE(OLD.customer_mrr, 1))
    WHERE id = OLD.option_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update survey response counts
CREATE OR REPLACE FUNCTION update_survey_response_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE surveys 
    SET response_count = (
          SELECT COUNT(*) FROM survey_responses WHERE survey_id = NEW.survey_id AND is_complete = true
        ),
        completion_rate = (
          SELECT ROUND(
            (COUNT(*) FILTER (WHERE is_complete = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1
          ) FROM survey_responses WHERE survey_id = NEW.survey_id
        ),
        avg_sentiment = (
          SELECT AVG(sentiment_score) FROM survey_responses 
          WHERE survey_id = NEW.survey_id AND sentiment_score IS NOT NULL
        ),
        updated_at = NOW()
    WHERE id = NEW.survey_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE surveys 
    SET response_count = GREATEST(0, response_count - 1),
        updated_at = NOW()
    WHERE id = OLD.survey_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Trigger to update vote counts
DROP TRIGGER IF EXISTS trigger_update_poll_vote_counts ON poll_votes;
CREATE TRIGGER trigger_update_poll_vote_counts
  AFTER INSERT OR DELETE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_vote_counts();

-- Trigger to update survey response counts
DROP TRIGGER IF EXISTS trigger_update_survey_response_counts ON survey_responses;
CREATE TRIGGER trigger_update_survey_response_counts
  AFTER INSERT OR UPDATE OR DELETE ON survey_responses
  FOR EACH ROW EXECUTE FUNCTION update_survey_response_counts();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_polls_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_polls_timestamp ON polls;
CREATE TRIGGER trigger_update_polls_timestamp
  BEFORE UPDATE ON polls
  FOR EACH ROW EXECUTE FUNCTION update_polls_timestamp();

DROP TRIGGER IF EXISTS trigger_update_surveys_timestamp ON surveys;
CREATE TRIGGER trigger_update_surveys_timestamp
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_polls_timestamp();

-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS polls_select_policy ON polls;
DROP POLICY IF EXISTS polls_insert_policy ON polls;
DROP POLICY IF EXISTS polls_update_policy ON polls;
DROP POLICY IF EXISTS polls_delete_policy ON polls;

DROP POLICY IF EXISTS poll_options_select_policy ON poll_options;
DROP POLICY IF EXISTS poll_options_insert_policy ON poll_options;
DROP POLICY IF EXISTS poll_options_update_policy ON poll_options;
DROP POLICY IF EXISTS poll_options_delete_policy ON poll_options;

DROP POLICY IF EXISTS poll_votes_select_policy ON poll_votes;
DROP POLICY IF EXISTS poll_votes_insert_policy ON poll_votes;

DROP POLICY IF EXISTS surveys_select_policy ON surveys;
DROP POLICY IF EXISTS surveys_insert_policy ON surveys;
DROP POLICY IF EXISTS surveys_update_policy ON surveys;
DROP POLICY IF EXISTS surveys_delete_policy ON surveys;

DROP POLICY IF EXISTS survey_questions_select_policy ON survey_questions;
DROP POLICY IF EXISTS survey_questions_insert_policy ON survey_questions;
DROP POLICY IF EXISTS survey_questions_update_policy ON survey_questions;
DROP POLICY IF EXISTS survey_questions_delete_policy ON survey_questions;

DROP POLICY IF EXISTS survey_responses_select_policy ON survey_responses;
DROP POLICY IF EXISTS survey_responses_insert_policy ON survey_responses;

-- Polls policies
CREATE POLICY polls_select_policy ON polls
  FOR SELECT USING (
    -- Public active polls are viewable
    status = 'active' OR
    -- Project owners can see all
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY polls_insert_policy ON polls
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY polls_update_policy ON polls
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY polls_delete_policy ON polls
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Poll options policies
CREATE POLICY poll_options_select_policy ON poll_options
  FOR SELECT USING (
    poll_id IN (SELECT id FROM polls WHERE status = 'active') OR
    poll_id IN (SELECT id FROM polls WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

CREATE POLICY poll_options_insert_policy ON poll_options
  FOR INSERT WITH CHECK (
    poll_id IN (SELECT id FROM polls WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

CREATE POLICY poll_options_update_policy ON poll_options
  FOR UPDATE USING (
    poll_id IN (SELECT id FROM polls WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

CREATE POLICY poll_options_delete_policy ON poll_options
  FOR DELETE USING (
    poll_id IN (SELECT id FROM polls WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

-- Poll votes policies (anyone can vote, owners can view all)
CREATE POLICY poll_votes_select_policy ON poll_votes
  FOR SELECT USING (
    -- Users can see their own votes
    voter_id = auth.uid() OR
    -- Project owners can see all votes
    poll_id IN (SELECT id FROM polls WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

CREATE POLICY poll_votes_insert_policy ON poll_votes
  FOR INSERT WITH CHECK (
    -- Anyone can vote on active polls
    poll_id IN (SELECT id FROM polls WHERE status = 'active')
  );

-- Surveys policies
CREATE POLICY surveys_select_policy ON surveys
  FOR SELECT USING (
    status = 'active' OR
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY surveys_insert_policy ON surveys
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY surveys_update_policy ON surveys
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY surveys_delete_policy ON surveys
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Survey questions policies
CREATE POLICY survey_questions_select_policy ON survey_questions
  FOR SELECT USING (
    survey_id IN (SELECT id FROM surveys WHERE status = 'active') OR
    survey_id IN (SELECT id FROM surveys WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

CREATE POLICY survey_questions_insert_policy ON survey_questions
  FOR INSERT WITH CHECK (
    survey_id IN (SELECT id FROM surveys WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

CREATE POLICY survey_questions_update_policy ON survey_questions
  FOR UPDATE USING (
    survey_id IN (SELECT id FROM surveys WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

CREATE POLICY survey_questions_delete_policy ON survey_questions
  FOR DELETE USING (
    survey_id IN (SELECT id FROM surveys WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

-- Survey responses policies
CREATE POLICY survey_responses_select_policy ON survey_responses
  FOR SELECT USING (
    respondent_id = auth.uid() OR
    survey_id IN (SELECT id FROM surveys WHERE project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  );

CREATE POLICY survey_responses_insert_policy ON survey_responses
  FOR INSERT WITH CHECK (
    survey_id IN (SELECT id FROM surveys WHERE status = 'active')
  );

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Service role (for API routes)
GRANT ALL ON polls TO service_role;
GRANT ALL ON poll_options TO service_role;
GRANT ALL ON poll_votes TO service_role;
GRANT ALL ON surveys TO service_role;
GRANT ALL ON survey_questions TO service_role;
GRANT ALL ON survey_responses TO service_role;

-- Authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON polls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON poll_options TO authenticated;
GRANT SELECT, INSERT ON poll_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON surveys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON survey_questions TO authenticated;
GRANT SELECT, INSERT ON survey_responses TO authenticated;

-- Anonymous users (for public voting)
GRANT SELECT ON polls TO anon;
GRANT SELECT ON poll_options TO anon;
GRANT INSERT ON poll_votes TO anon;
GRANT SELECT ON surveys TO anon;
GRANT SELECT ON survey_questions TO anon;
GRANT INSERT ON survey_responses TO anon;

-- Function permissions
GRANT EXECUTE ON FUNCTION get_poll_results(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_poll_results_by_segment(UUID) TO authenticated, service_role;

-- ============================================================================
-- 11. UPDATE UNIFIED ACTION QUEUE FOR POLL SUGGESTIONS
-- ============================================================================

-- Add poll_suggested to action types
ALTER TABLE unified_action_queue 
DROP CONSTRAINT IF EXISTS unified_action_queue_action_type_check;

ALTER TABLE unified_action_queue 
ADD CONSTRAINT unified_action_queue_action_type_check 
CHECK (action_type IN (
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
  'pm_assignment_needed',
  'poll_suggested',
  'knowledge_gap_detected'
));

-- Add poll reference column
ALTER TABLE unified_action_queue
ADD COLUMN IF NOT EXISTS related_poll_id UUID REFERENCES polls(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_action_queue_poll ON unified_action_queue(related_poll_id) WHERE related_poll_id IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE polls IS 'Polls for gathering structured feedback from users';
COMMENT ON TABLE poll_options IS 'Options for each poll with vote tracking';
COMMENT ON TABLE poll_votes IS 'Individual votes with CRM linking for revenue weighting';
COMMENT ON TABLE surveys IS 'Multi-question surveys for detailed feedback collection';
COMMENT ON TABLE survey_questions IS 'Question definitions for surveys';
COMMENT ON TABLE survey_responses IS 'Individual survey responses with sentiment analysis';
