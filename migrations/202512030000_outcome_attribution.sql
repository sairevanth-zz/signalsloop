-- =====================================================
-- Outcome Attribution Loop Feature
-- =====================================================
-- Automatically connects the dots: Feedback -> Feature -> Ship -> Outcome -> Learning
-- The system gets smarter with every launch by tracking what actually happened after shipping.
-- =====================================================

-- =====================================================
-- 1. FEATURE OUTCOMES TABLE
-- =====================================================
-- Tracks feature outcomes after shipping (status = 'completed')
CREATE TABLE IF NOT EXISTS feature_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    suggestion_id UUID NOT NULL REFERENCES roadmap_suggestions(id) ON DELETE CASCADE,

    -- Timestamps
    shipped_at TIMESTAMPTZ NOT NULL,
    monitor_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monitor_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

    -- Pre-ship metrics (captured at ship time)
    pre_ship_sentiment DECIMAL(5,4),        -- -1.0000 to 1.0000
    pre_ship_theme_volume INTEGER,          -- Count of related theme mentions in last 30 days
    pre_ship_churn_risk DECIMAL(5,4),       -- 0.0000 to 1.0000

    -- Post-ship metrics (updated during monitor window)
    post_ship_sentiment DECIMAL(5,4),
    post_ship_theme_volume INTEGER,
    post_ship_churn_risk DECIMAL(5,4),

    -- Calculated deltas
    sentiment_delta DECIMAL(5,4) GENERATED ALWAYS AS
        (post_ship_sentiment - pre_ship_sentiment) STORED,
    theme_volume_delta INTEGER GENERATED ALWAYS AS
        (post_ship_theme_volume - pre_ship_theme_volume) STORED,

    -- AI classification
    outcome_classification TEXT CHECK (outcome_classification IN
        ('success', 'partial_success', 'no_impact', 'negative_impact', 'pending')),
    classification_confidence DECIMAL(5,4),
    classification_reasoning JSONB,

    -- Linked data
    related_themes TEXT[],
    related_feedback_ids UUID[],

    -- Sample feedback for analysis
    sample_feedback JSONB DEFAULT '[]',

    -- Metadata
    status TEXT DEFAULT 'monitoring' CHECK (status IN
        ('monitoring', 'completed', 'cancelled')),

    -- Notification tracking
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One outcome record per suggestion
    UNIQUE(suggestion_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_feature_outcomes_project ON feature_outcomes(project_id);
CREATE INDEX IF NOT EXISTS idx_feature_outcomes_suggestion ON feature_outcomes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_feature_outcomes_status ON feature_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_feature_outcomes_monitor_end ON feature_outcomes(monitor_end);
CREATE INDEX IF NOT EXISTS idx_feature_outcomes_classification ON feature_outcomes(outcome_classification);
CREATE INDEX IF NOT EXISTS idx_feature_outcomes_project_status ON feature_outcomes(project_id, status);

-- Composite index for cron job queries
CREATE INDEX IF NOT EXISTS idx_feature_outcomes_active_monitors
ON feature_outcomes(status, monitor_end)
WHERE status = 'monitoring';

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_outcomes_updated_at()
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

DROP TRIGGER IF EXISTS trigger_update_feature_outcomes_updated_at ON feature_outcomes;
CREATE TRIGGER trigger_update_feature_outcomes_updated_at
BEFORE UPDATE ON feature_outcomes
FOR EACH ROW
EXECUTE FUNCTION update_feature_outcomes_updated_at();

-- =====================================================
-- Function to calculate pre-ship metrics for a theme
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_pre_ship_metrics(
    p_project_id UUID,
    p_theme_name TEXT
)
RETURNS TABLE (
    avg_sentiment DECIMAL,
    theme_volume INTEGER,
    churn_risk DECIMAL
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(AVG(sa.sentiment_score), 0)::DECIMAL as avg_sentiment,
        COUNT(*)::INTEGER as theme_volume,
        0.0::DECIMAL as churn_risk -- Placeholder, can be enhanced with actual churn data
    FROM posts p
    LEFT JOIN sentiment_analysis sa ON p.id = sa.post_id
    WHERE p.project_id = p_project_id
      AND p.category ILIKE '%' || p_theme_name || '%'
      AND p.created_at >= NOW() - INTERVAL '30 days';
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE feature_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can view outcomes for their projects
CREATE POLICY "Users can view outcomes for their projects"
ON feature_outcomes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = feature_outcomes.project_id
          AND p.owner_id = auth.uid()
    )
);

-- Users can insert outcomes for their projects
CREATE POLICY "Users can insert outcomes for their projects"
ON feature_outcomes FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = feature_outcomes.project_id
          AND p.owner_id = auth.uid()
    )
);

-- Users can update outcomes for their projects
CREATE POLICY "Users can update outcomes for their projects"
ON feature_outcomes FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = feature_outcomes.project_id
          AND p.owner_id = auth.uid()
    )
);

-- Users can delete outcomes for their projects
CREATE POLICY "Users can delete outcomes for their projects"
ON feature_outcomes FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = feature_outcomes.project_id
          AND p.owner_id = auth.uid()
    )
);

-- Service role has full access
CREATE POLICY "Service role has full access to feature outcomes"
ON feature_outcomes FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- VIEW: Feature outcomes with details
-- =====================================================
CREATE OR REPLACE VIEW feature_outcomes_detailed AS
SELECT
    fo.*,
    rs.priority_score,
    rs.priority_level,
    t.theme_name,
    t.frequency as mention_count,
    t.avg_sentiment as theme_avg_sentiment,
    p.name as project_name,
    p.owner_id,
    CASE
        WHEN fo.monitor_end <= NOW() THEN 'expired'
        WHEN fo.status = 'monitoring' THEN 'active'
        ELSE fo.status
    END as monitor_status,
    EXTRACT(DAY FROM (fo.monitor_end - NOW())) as days_remaining
FROM feature_outcomes fo
JOIN roadmap_suggestions rs ON fo.suggestion_id = rs.id
JOIN themes t ON rs.theme_id = t.id
JOIN projects p ON fo.project_id = p.id;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE feature_outcomes IS 'Tracks feature outcomes after shipping to enable learning from launches';
COMMENT ON COLUMN feature_outcomes.pre_ship_sentiment IS 'Average sentiment of related feedback before feature shipped';
COMMENT ON COLUMN feature_outcomes.post_ship_sentiment IS 'Average sentiment of related feedback after feature shipped';
COMMENT ON COLUMN feature_outcomes.outcome_classification IS 'AI-generated classification of feature success';
COMMENT ON COLUMN feature_outcomes.classification_reasoning IS 'JSON object with AI reasoning, key factors, and recommendations';
