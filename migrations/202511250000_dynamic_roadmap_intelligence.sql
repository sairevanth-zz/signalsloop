-- =====================================================
-- Dynamic Roadmap Intelligence Feature (Safe Version)
-- =====================================================
-- Enables automatic roadmap priority adjustments based on:
-- - Feedback velocity changes
-- - Sentiment deterioration
-- - Competitive pressure
-- - Revenue impact signals
-- =====================================================

-- Drop existing objects if they exist (for clean reinstall)
DROP TABLE IF EXISTS roadmap_priority_history CASCADE;
DROP TABLE IF EXISTS team_capacity CASCADE;
DROP TABLE IF EXISTS feature_impact_history CASCADE;

DROP FUNCTION IF EXISTS get_recent_priority_changes(UUID, INT);
DROP FUNCTION IF EXISTS calculate_team_velocity(UUID, INT);
DROP FUNCTION IF EXISTS get_feature_impact_stats(UUID, TEXT);

-- =====================================================
-- 1. ROADMAP PRIORITY HISTORY TABLE
-- =====================================================
-- Tracks all automatic and manual priority adjustments over time
CREATE TABLE roadmap_priority_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    suggestion_id UUID NOT NULL REFERENCES roadmap_suggestions(id) ON DELETE CASCADE,

    -- Theme info (denormalized for easy access)
    theme_name TEXT NOT NULL,

    -- Priority change details
    old_priority TEXT NOT NULL CHECK (old_priority IN ('critical', 'high', 'medium', 'low')),
    new_priority TEXT NOT NULL CHECK (new_priority IN ('critical', 'high', 'medium', 'low')),
    old_score DECIMAL(5,2) NOT NULL,
    new_score DECIMAL(5,2) NOT NULL,
    score_change DECIMAL(5,2) GENERATED ALWAYS AS (new_score - old_score) STORED,

    -- Adjustment details
    adjustment_type TEXT NOT NULL DEFAULT 'automatic' CHECK (adjustment_type IN ('automatic', 'manual')),
    adjustment_reason TEXT NOT NULL,
    triggers TEXT[] NOT NULL DEFAULT '{}', -- ['feedback_velocity_spike', 'sentiment_drop', etc.]

    -- Agent or user who made the change
    adjusted_by_agent TEXT, -- e.g., 'dynamic-roadmap-agent'
    adjusted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Additional context
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. CAPACITY PLANNING TABLE
-- =====================================================
-- Tracks team velocity and capacity for intelligent recommendations
CREATE TABLE team_capacity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Time period
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,

    -- Capacity metrics
    team_size INT NOT NULL DEFAULT 1,
    available_story_points DECIMAL(5,1),
    available_dev_days DECIMAL(5,1),

    -- Actual delivery
    completed_story_points DECIMAL(5,1),
    completed_features INT DEFAULT 0,

    -- Velocity calculation
    velocity_story_points DECIMAL(5,1), -- Moving average
    velocity_features DECIMAL(5,1),

    -- Planning
    committed_story_points DECIMAL(5,1),
    committed_features INT DEFAULT 0,

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One record per week per project
    UNIQUE(project_id, week_start_date)
);

-- =====================================================
-- 3. FEATURE IMPACT HISTORY TABLE
-- =====================================================
-- Stores historical data correlating features with outcomes
-- Used for impact simulation and predictions
CREATE TABLE feature_impact_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    suggestion_id UUID REFERENCES roadmap_suggestions(id) ON DELETE SET NULL,

    -- Feature details
    feature_name TEXT NOT NULL,
    feature_category TEXT,

    -- Launch details
    launched_at TIMESTAMPTZ,
    effort_estimate TEXT CHECK (effort_estimate IN ('low', 'medium', 'high', 'very_high')),
    actual_effort_days INT,

    -- Pre-launch metrics (baseline)
    pre_sentiment_avg DECIMAL(3,2),
    pre_feedback_volume_weekly INT,
    pre_churn_rate DECIMAL(5,4),
    pre_nps_score INT,

    -- Post-launch metrics (30 days after)
    post_sentiment_avg DECIMAL(3,2),
    post_feedback_volume_weekly INT,
    post_churn_rate DECIMAL(5,4),
    post_nps_score INT,
    post_adoption_rate DECIMAL(5,4), -- % of users who adopted feature

    -- Impact calculations
    sentiment_impact DECIMAL(3,2) GENERATED ALWAYS AS (post_sentiment_avg - pre_sentiment_avg) STORED,
    churn_impact DECIMAL(5,4) GENERATED ALWAYS AS (pre_churn_rate - post_churn_rate) STORED,
    feedback_volume_impact INT GENERATED ALWAYS AS (post_feedback_volume_weekly - pre_feedback_volume_weekly) STORED,

    -- Business impact
    revenue_impact_estimate DECIMAL(12,2),
    customer_segments_affected TEXT[], -- ['enterprise', 'smb', 'individual']

    -- Success assessment
    success_rating INT CHECK (success_rating >= 1 AND success_rating <= 5),
    lessons_learned TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Priority History Indexes
CREATE INDEX idx_priority_history_project ON roadmap_priority_history(project_id);
CREATE INDEX idx_priority_history_suggestion ON roadmap_priority_history(suggestion_id);
CREATE INDEX idx_priority_history_created_at ON roadmap_priority_history(created_at DESC);
CREATE INDEX idx_priority_history_triggers ON roadmap_priority_history USING GIN(triggers);
CREATE INDEX idx_priority_history_project_created ON roadmap_priority_history(project_id, created_at DESC);

-- Capacity Planning Indexes
CREATE INDEX idx_team_capacity_project ON team_capacity(project_id);
CREATE INDEX idx_team_capacity_week ON team_capacity(week_start_date DESC);
CREATE INDEX idx_team_capacity_project_week ON team_capacity(project_id, week_start_date DESC);

-- Feature Impact History Indexes
CREATE INDEX idx_feature_impact_project ON feature_impact_history(project_id);
CREATE INDEX idx_feature_impact_suggestion ON feature_impact_history(suggestion_id);
CREATE INDEX idx_feature_impact_launched_at ON feature_impact_history(launched_at DESC);
CREATE INDEX idx_feature_impact_success ON feature_impact_history(success_rating DESC) WHERE success_rating IS NOT NULL;
CREATE INDEX idx_feature_impact_category ON feature_impact_history(feature_category);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update updated_at timestamp for team_capacity
CREATE OR REPLACE FUNCTION update_team_capacity_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_team_capacity_updated_at
BEFORE UPDATE ON team_capacity
FOR EACH ROW
EXECUTE FUNCTION update_team_capacity_updated_at();

-- Update updated_at timestamp for feature_impact_history
CREATE OR REPLACE FUNCTION update_feature_impact_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_feature_impact_updated_at
BEFORE UPDATE ON feature_impact_history
FOR EACH ROW
EXECUTE FUNCTION update_feature_impact_updated_at();

-- =====================================================
-- HELPER FUNCTION: Get Recent Priority Changes
-- =====================================================
CREATE OR REPLACE FUNCTION get_recent_priority_changes(
    p_project_id UUID,
    p_days INT DEFAULT 7
)
RETURNS TABLE (
    theme_name TEXT,
    old_priority TEXT,
    new_priority TEXT,
    score_change DECIMAL,
    adjustment_reason TEXT,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rph.theme_name,
        rph.old_priority,
        rph.new_priority,
        rph.score_change,
        rph.adjustment_reason,
        rph.created_at
    FROM roadmap_priority_history rph
    WHERE rph.project_id = p_project_id
      AND rph.created_at >= NOW() - (p_days || ' days')::INTERVAL
    ORDER BY rph.created_at DESC;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Calculate Team Velocity
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_team_velocity(
    p_project_id UUID,
    p_weeks_lookback INT DEFAULT 4
)
RETURNS TABLE (
    avg_velocity_points DECIMAL,
    avg_velocity_features DECIMAL,
    trend TEXT -- 'increasing', 'stable', 'decreasing'
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_avg_points DECIMAL;
    v_avg_features DECIMAL;
    v_recent_avg DECIMAL;
    v_older_avg DECIMAL;
    v_trend TEXT;
BEGIN
    -- Calculate average velocity over lookback period
    SELECT
        AVG(completed_story_points),
        AVG(completed_features)
    INTO v_avg_points, v_avg_features
    FROM team_capacity
    WHERE project_id = p_project_id
      AND week_start_date >= CURRENT_DATE - (p_weeks_lookback * 7)
      AND completed_story_points IS NOT NULL;

    -- Calculate trend (compare recent half vs older half)
    SELECT AVG(completed_story_points)
    INTO v_recent_avg
    FROM team_capacity
    WHERE project_id = p_project_id
      AND week_start_date >= CURRENT_DATE - ((p_weeks_lookback / 2) * 7)
      AND completed_story_points IS NOT NULL;

    SELECT AVG(completed_story_points)
    INTO v_older_avg
    FROM team_capacity
    WHERE project_id = p_project_id
      AND week_start_date >= CURRENT_DATE - (p_weeks_lookback * 7)
      AND week_start_date < CURRENT_DATE - ((p_weeks_lookback / 2) * 7)
      AND completed_story_points IS NOT NULL;

    -- Determine trend
    IF v_recent_avg IS NULL OR v_older_avg IS NULL THEN
        v_trend := 'unknown';
    ELSIF v_recent_avg > v_older_avg * 1.1 THEN
        v_trend := 'increasing';
    ELSIF v_recent_avg < v_older_avg * 0.9 THEN
        v_trend := 'decreasing';
    ELSE
        v_trend := 'stable';
    END IF;

    RETURN QUERY
    SELECT v_avg_points, v_avg_features, v_trend;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Get Feature Impact Stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_feature_impact_stats(
    p_project_id UUID,
    p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_features INT,
    avg_sentiment_impact DECIMAL,
    avg_churn_impact DECIMAL,
    avg_adoption_rate DECIMAL,
    success_rate DECIMAL -- % of features with rating >= 4
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT as total_features,
        AVG(sentiment_impact) as avg_sentiment_impact,
        AVG(churn_impact) as avg_churn_impact,
        AVG(post_adoption_rate) as avg_adoption_rate,
        (COUNT(*) FILTER (WHERE success_rating >= 4)::DECIMAL / NULLIF(COUNT(*), 0)) as success_rate
    FROM feature_impact_history
    WHERE project_id = p_project_id
      AND (p_category IS NULL OR feature_category = p_category)
      AND launched_at IS NOT NULL;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE roadmap_priority_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_impact_history ENABLE ROW LEVEL SECURITY;

-- Priority History Policies
CREATE POLICY "Users can view priority history for their projects"
ON roadmap_priority_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = roadmap_priority_history.project_id
          AND p.owner_id = auth.uid()
    )
);

CREATE POLICY "Service role has full access to priority history"
ON roadmap_priority_history FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Team Capacity Policies
CREATE POLICY "Project owners can view capacity for their projects"
ON team_capacity FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = team_capacity.project_id
          AND p.owner_id = auth.uid()
    )
);

CREATE POLICY "Project owners can manage capacity for their projects"
ON team_capacity FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = team_capacity.project_id
          AND p.owner_id = auth.uid()
    )
);

CREATE POLICY "Service role has full access to team capacity"
ON team_capacity FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Feature Impact History Policies
CREATE POLICY "Project owners can view impact history for their projects"
ON feature_impact_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = feature_impact_history.project_id
          AND p.owner_id = auth.uid()
    )
);

CREATE POLICY "Project owners can manage impact history for their projects"
ON feature_impact_history FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = feature_impact_history.project_id
          AND p.owner_id = auth.uid()
    )
);

CREATE POLICY "Service role has full access to feature impact history"
ON feature_impact_history FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE roadmap_priority_history IS 'Tracks all automatic and manual priority adjustments to roadmap suggestions over time';
COMMENT ON TABLE team_capacity IS 'Stores team capacity and velocity metrics for capacity-aware roadmap planning';
COMMENT ON TABLE feature_impact_history IS 'Historical data correlating features with outcomes for impact simulation and learning';

COMMENT ON FUNCTION get_recent_priority_changes IS 'Get priority changes for a project in the last N days';
COMMENT ON FUNCTION calculate_team_velocity IS 'Calculate average team velocity and trend over lookback period';
COMMENT ON FUNCTION get_feature_impact_stats IS 'Get aggregate statistics on feature impact for a project';
