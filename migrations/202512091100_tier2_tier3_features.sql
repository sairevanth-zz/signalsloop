-- ================================================
-- Migration: 202512091100_tier2_tier3_features.sql
-- Description: Tables for Tier 2/3 AI features:
--   - Pre-Mortem Analyses
--   - Agent Workflows  
--   - Lovable Prototype Generations
-- ================================================

-- ================================================
-- PRE-MORTEM ANALYSES
-- Stores AI failure scenario analysis for features
-- ================================================
CREATE TABLE IF NOT EXISTS pre_mortem_analyses (
    id TEXT PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    feature_description TEXT,
    
    -- Analysis results (JSON)
    risks JSONB NOT NULL DEFAULT '[]',
    overall_risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (overall_risk_level IN ('low', 'medium', 'high', 'critical')),
    confidence_score DECIMAL(3,2) DEFAULT 0.7,
    
    -- AI insights
    executive_summary TEXT,
    top_concerns JSONB DEFAULT '[]',
    recommended_proceed BOOLEAN DEFAULT true,
    proceed_conditions JSONB DEFAULT '[]',
    
    -- Metadata
    spec_id UUID REFERENCES specs(id) ON DELETE SET NULL,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_mortem_project ON pre_mortem_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_pre_mortem_feature ON pre_mortem_analyses(feature_id);
CREATE INDEX IF NOT EXISTS idx_pre_mortem_risk_level ON pre_mortem_analyses(overall_risk_level);

-- ================================================
-- AGENT WORKFLOWS
-- Stores multi-agent workflow executions
-- ================================================
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Trigger info
    trigger TEXT NOT NULL,
    trigger_data JSONB DEFAULT '{}',
    
    -- Execution
    steps JSONB NOT NULL DEFAULT '[]',
    current_step_index INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Results
    final_output JSONB,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON workflows(trigger);
CREATE INDEX IF NOT EXISTS idx_workflows_created ON workflows(created_at DESC);

-- ================================================
-- LOVABLE PROTOTYPE GENERATIONS
-- Tracks prototypes generated via Lovable API
-- ================================================
CREATE TABLE IF NOT EXISTS lovable_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    spec_id UUID REFERENCES specs(id) ON DELETE SET NULL,
    
    -- Lovable project info
    lovable_project_id TEXT NOT NULL,
    lovable_url TEXT NOT NULL,
    title TEXT NOT NULL,
    
    -- Settings used
    design_preferences JSONB DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'ready' CHECK (status IN ('creating', 'ready', 'error')),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lovable_project ON lovable_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_lovable_spec ON lovable_generations(spec_id);
CREATE INDEX IF NOT EXISTS idx_lovable_created ON lovable_generations(created_at DESC);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Pre-Mortem Analyses RLS
ALTER TABLE pre_mortem_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project pre-mortems" ON pre_mortem_analyses
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can create pre-mortems for own projects" ON pre_mortem_analyses
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can update own project pre-mortems" ON pre_mortem_analyses
    FOR UPDATE USING (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can delete own project pre-mortems" ON pre_mortem_analyses
    FOR DELETE USING (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

-- Workflows RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project workflows" ON workflows
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can create workflows for own projects" ON workflows
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can update own project workflows" ON workflows
    FOR UPDATE USING (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

-- Lovable Generations RLS
ALTER TABLE lovable_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project lovable generations" ON lovable_generations
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can create lovable generations for own projects" ON lovable_generations
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    );

-- ================================================
-- SERVICE ROLE BYPASS
-- ================================================
CREATE POLICY "Service role full access to pre_mortem_analyses" ON pre_mortem_analyses
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to workflows" ON workflows
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to lovable_generations" ON lovable_generations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- UPDATED_AT TRIGGERS
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pre_mortem_analyses_updated_at ON pre_mortem_analyses;
CREATE TRIGGER update_pre_mortem_analyses_updated_at
    BEFORE UPDATE ON pre_mortem_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
