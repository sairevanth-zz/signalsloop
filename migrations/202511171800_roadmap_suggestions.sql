-- =====================================================
-- AI Roadmap Suggestions Feature
-- =====================================================
-- This migration creates the schema for the AI-powered roadmap
-- suggestions feature that analyzes feedback themes and generates
-- prioritized product roadmap recommendations.
-- =====================================================

-- =====================================================
-- 1. ROADMAP SUGGESTIONS TABLE
-- =====================================================
-- Stores AI-generated roadmap suggestions with multi-factor scoring
CREATE TABLE roadmap_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,

    -- Priority Scoring (0-100 scale)
    priority_score DECIMAL(5,2) NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
    priority_level TEXT NOT NULL CHECK (priority_level IN ('critical', 'high', 'medium', 'low')),

    -- Scoring Breakdown (normalized 0-1 scale, stored as decimals)
    frequency_score DECIMAL(5,4) NOT NULL CHECK (frequency_score >= 0 AND frequency_score <= 1),
    sentiment_score DECIMAL(5,4) NOT NULL CHECK (sentiment_score >= 0 AND sentiment_score <= 1),
    business_impact_score DECIMAL(5,4) NOT NULL CHECK (business_impact_score >= 0 AND business_impact_score <= 1),
    effort_score DECIMAL(5,4) NOT NULL CHECK (effort_score >= 0 AND effort_score <= 1),
    competitive_score DECIMAL(5,4) NOT NULL CHECK (competitive_score >= 0 AND competitive_score <= 1),

    -- AI-Generated Strategic Reasoning
    reasoning_text TEXT, -- Full GPT-4 generated reasoning
    why_matters TEXT, -- Why this matters now
    business_impact_text TEXT, -- Business impact analysis
    user_segments_affected TEXT, -- Which user segments are affected
    implementation_strategy TEXT, -- Recommended implementation approach
    risks_dependencies TEXT, -- Risks and dependencies
    trade_offs TEXT, -- Trade-offs to consider
    recommendation_text TEXT, -- Final recommendation

    -- Manual Overrides
    manual_priority_adjustment INT CHECK (manual_priority_adjustment >= -50 AND manual_priority_adjustment <= 50),
    pinned BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'in_progress', 'completed', 'deferred')),
    internal_notes TEXT, -- Team notes

    -- Metadata
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    regenerated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one suggestion per theme per project
    UNIQUE(project_id, theme_id)
);

-- =====================================================
-- 2. ROADMAP EXPORTS TABLE
-- =====================================================
-- Tracks generated exports (Markdown, PDF) for sharing
CREATE TABLE roadmap_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Export Configuration
    export_type TEXT NOT NULL CHECK (export_type IN ('markdown', 'pdf')),
    file_path TEXT NOT NULL, -- S3/R2 path
    included_priorities TEXT[] NOT NULL, -- ['critical', 'high']
    filter_config JSONB, -- Additional filters applied

    -- Metadata
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    download_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. ROADMAP GENERATION LOGS TABLE
-- =====================================================
-- Logs each roadmap generation run for analytics and debugging
CREATE TABLE roadmap_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Generation Metrics
    themes_analyzed INT NOT NULL,
    suggestions_generated INT NOT NULL,
    generation_time_ms INT NOT NULL,

    -- GPT-4 API Usage
    gpt4_api_calls INT DEFAULT 0,
    gpt4_tokens_used INT DEFAULT 0,

    -- Success/Error Tracking
    success BOOLEAN NOT NULL,
    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

-- Roadmap Suggestions Indexes
CREATE INDEX idx_roadmap_suggestions_project_id ON roadmap_suggestions(project_id);
CREATE INDEX idx_roadmap_suggestions_theme_id ON roadmap_suggestions(theme_id);
CREATE INDEX idx_roadmap_suggestions_priority_score ON roadmap_suggestions(priority_score DESC);
CREATE INDEX idx_roadmap_suggestions_priority_level ON roadmap_suggestions(priority_level);
CREATE INDEX idx_roadmap_suggestions_status ON roadmap_suggestions(status);
CREATE INDEX idx_roadmap_suggestions_pinned ON roadmap_suggestions(pinned) WHERE pinned = true;
CREATE INDEX idx_roadmap_suggestions_project_priority ON roadmap_suggestions(project_id, priority_score DESC);

-- Composite index for common queries (project + status + priority)
CREATE INDEX idx_roadmap_suggestions_project_status_priority
ON roadmap_suggestions(project_id, status, priority_score DESC);

-- Roadmap Exports Indexes
CREATE INDEX idx_roadmap_exports_project_id ON roadmap_exports(project_id);
CREATE INDEX idx_roadmap_exports_user_id ON roadmap_exports(user_id);
CREATE INDEX idx_roadmap_exports_created_at ON roadmap_exports(created_at DESC);

-- Roadmap Generation Logs Indexes
CREATE INDEX idx_roadmap_generation_logs_project_id ON roadmap_generation_logs(project_id);
CREATE INDEX idx_roadmap_generation_logs_created_at ON roadmap_generation_logs(created_at DESC);
CREATE INDEX idx_roadmap_generation_logs_success ON roadmap_generation_logs(success);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_roadmap_suggestions_updated_at()
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

CREATE TRIGGER trigger_update_roadmap_suggestions_updated_at
BEFORE UPDATE ON roadmap_suggestions
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_suggestions_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE roadmap_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_generation_logs ENABLE ROW LEVEL SECURITY;

-- Roadmap Suggestions Policies
CREATE POLICY "Users can view roadmap suggestions for their projects"
ON roadmap_suggestions FOR SELECT
USING (
    project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert roadmap suggestions for their projects"
ON roadmap_suggestions FOR INSERT
WITH CHECK (
    project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update roadmap suggestions for their projects"
ON roadmap_suggestions FOR UPDATE
USING (
    project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete roadmap suggestions for their projects"
ON roadmap_suggestions FOR DELETE
USING (
    project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
    )
);

-- Roadmap Exports Policies
CREATE POLICY "Users can view their own roadmap exports"
ON roadmap_exports FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create roadmap exports for their projects"
ON roadmap_exports FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own roadmap exports"
ON roadmap_exports FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own roadmap exports"
ON roadmap_exports FOR DELETE
USING (user_id = auth.uid());

-- Roadmap Generation Logs Policies
CREATE POLICY "Users can view generation logs for their projects"
ON roadmap_generation_logs FOR SELECT
USING (
    project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert generation logs for their projects"
ON roadmap_generation_logs FOR INSERT
WITH CHECK (
    project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for roadmap suggestions with theme details
CREATE OR REPLACE VIEW roadmap_suggestions_detailed AS
SELECT
    rs.*,
    t.name as theme_name,
    t.mention_count,
    t.avg_sentiment,
    t.first_detected_at as theme_first_detected,
    t.estimated_effort,
    p.name as project_name,
    p.user_id
FROM roadmap_suggestions rs
JOIN themes t ON rs.theme_id = t.id
JOIN projects p ON rs.project_id = p.id;

-- View for priority distribution by project
CREATE OR REPLACE VIEW roadmap_priority_distribution AS
SELECT
    project_id,
    priority_level,
    COUNT(*) as count,
    AVG(priority_score) as avg_score
FROM roadmap_suggestions
GROUP BY project_id, priority_level;

-- =====================================================
-- COMMENTS for Documentation
-- =====================================================

COMMENT ON TABLE roadmap_suggestions IS 'AI-generated roadmap suggestions with multi-factor scoring and strategic reasoning';
COMMENT ON TABLE roadmap_exports IS 'Exported roadmap documents (Markdown/PDF) for stakeholder sharing';
COMMENT ON TABLE roadmap_generation_logs IS 'Logs of roadmap generation runs for analytics and debugging';

COMMENT ON COLUMN roadmap_suggestions.priority_score IS 'Overall priority score (0-100) calculated from weighted factors';
COMMENT ON COLUMN roadmap_suggestions.priority_level IS 'Priority bucket: critical (P0), high (P1), medium (P2), low (P3)';
COMMENT ON COLUMN roadmap_suggestions.frequency_score IS 'Normalized frequency score based on mention count (0-1)';
COMMENT ON COLUMN roadmap_suggestions.sentiment_score IS 'Normalized sentiment score - negative sentiment = higher priority (0-1)';
COMMENT ON COLUMN roadmap_suggestions.business_impact_score IS 'Business impact score from urgency, keywords, velocity (0-1)';
COMMENT ON COLUMN roadmap_suggestions.effort_score IS 'Effort score - lower effort = higher score for quick wins (0-1)';
COMMENT ON COLUMN roadmap_suggestions.competitive_score IS 'Competitive pressure score based on competitor feature parity (0-1)';
COMMENT ON COLUMN roadmap_suggestions.manual_priority_adjustment IS 'Manual adjustment to priority score (-50 to +50 points)';
COMMENT ON COLUMN roadmap_suggestions.pinned IS 'Pin suggestion to top of list regardless of score';
COMMENT ON COLUMN roadmap_suggestions.status IS 'Roadmap item status: suggested, in_progress, completed, deferred';
