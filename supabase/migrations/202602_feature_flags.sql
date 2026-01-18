-- =====================================================
-- Feature Flags Schema Extension
-- Adds feature flag support to the experimentation platform
-- =====================================================

-- =====================================================
-- FEATURE FLAGS TABLE
-- Stores feature flag definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL, -- Unique identifier for SDK
  description TEXT,
  flag_type TEXT NOT NULL DEFAULT 'boolean' 
    CHECK (flag_type IN ('boolean', 'string', 'number', 'json')),
  default_value JSONB NOT NULL DEFAULT 'false',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Rollout settings
  rollout_percentage INTEGER DEFAULT 100 
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  
  -- Targeting rules (JSON array of conditions)
  targeting_rules JSONB DEFAULT '[]',
  
  -- Scheduling
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id, key)
);

-- =====================================================
-- FEATURE FLAG ENVIRONMENTS
-- Different flag values per environment
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_flag_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'production',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  value JSONB,
  rollout_percentage INTEGER DEFAULT 100,
  targeting_rules JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(flag_id, environment)
);

-- =====================================================
-- FEATURE FLAG HISTORY
-- Audit log of flag changes
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_flag_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'enabled', 'disabled', 'deleted'
  previous_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- FEATURE FLAG EVALUATIONS
-- Track flag evaluations for analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  evaluated_value JSONB NOT NULL,
  targeting_matched BOOLEAN DEFAULT false,
  evaluation_reason TEXT, -- 'default', 'rollout', 'targeting', 'disabled'
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_project_id ON feature_flags(project_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_flag_id ON feature_flag_evaluations(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_created_at ON feature_flag_evaluations(created_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_evaluations ENABLE ROW LEVEL SECURITY;

-- Users can manage flags for their projects
CREATE POLICY "Users can manage feature flags for their projects" ON feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = feature_flags.project_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage flag environments for their projects" ON feature_flag_environments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM feature_flags ff
      JOIN projects p ON ff.project_id = p.id
      WHERE ff.id = feature_flag_environments.flag_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view flag history for their projects" ON feature_flag_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feature_flags ff
      JOIN projects p ON ff.project_id = p.id
      WHERE ff.id = feature_flag_history.flag_id
      AND p.owner_id = auth.uid()
    )
  );

-- Public can insert evaluations (for SDK tracking)
CREATE POLICY "Public can insert flag evaluations" ON feature_flag_evaluations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view flag evaluations for their projects" ON feature_flag_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feature_flags ff
      JOIN projects p ON ff.project_id = p.id
      WHERE ff.id = feature_flag_evaluations.flag_id
      AND p.owner_id = auth.uid()
    )
  );
