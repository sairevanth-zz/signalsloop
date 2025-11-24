-- Experiment Live Tracking Integration Migration
-- Adds support for real-time syncing with LaunchDarkly and Optimizely
-- Stores credentials and tracks sync status

-- ============================================================================
-- 1. Create integration_credentials table (encrypted storage for API keys)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Integration type
  provider TEXT NOT NULL CHECK (provider IN ('launchdarkly', 'optimizely', 'custom')),

  -- Credentials (encrypted)
  api_key TEXT NOT NULL, -- Will be encrypted in application layer
  additional_config JSONB DEFAULT '{}'::jsonb, -- Additional provider-specific config

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  validation_status TEXT CHECK (validation_status IN ('valid', 'invalid', 'pending', 'error')),
  validation_error TEXT,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active credential per provider per project
  UNIQUE(project_id, provider)
);

-- ============================================================================
-- 2. Create experiment_sync_log table (track sync history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS experiment_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'webhook', 'scheduled', 'auto')),
  provider TEXT NOT NULL,

  -- Results
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  results_synced INTEGER DEFAULT 0,
  error_message TEXT,

  -- Response data
  raw_response JSONB, -- Store raw API response for debugging

  -- Metadata
  synced_by UUID, -- User who triggered manual sync
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Add columns to experiments table for sync tracking
-- ============================================================================
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_frequency_minutes INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS external_experiment_id TEXT; -- Provider's experiment ID

-- ============================================================================
-- 4. Add indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_integration_credentials_project_id ON integration_credentials(project_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_provider ON integration_credentials(provider);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_active ON integration_credentials(is_active);

CREATE INDEX IF NOT EXISTS idx_experiment_sync_log_experiment_id ON experiment_sync_log(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_sync_log_synced_at ON experiment_sync_log(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiment_sync_log_status ON experiment_sync_log(status);

CREATE INDEX IF NOT EXISTS idx_experiments_sync_enabled ON experiments(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_experiments_last_synced ON experiments(last_synced_at DESC NULLS LAST);

-- ============================================================================
-- 5. Enable Row Level Security
-- ============================================================================
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_sync_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS Policies for integration_credentials
-- ============================================================================
DROP POLICY IF EXISTS "Project owners can manage integration credentials" ON integration_credentials;
CREATE POLICY "Project owners can manage integration credentials" ON integration_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = integration_credentials.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to integration credentials" ON integration_credentials;
CREATE POLICY "Service role full access to integration credentials" ON integration_credentials
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. RLS Policies for experiment_sync_log
-- ============================================================================
DROP POLICY IF EXISTS "Users can view sync logs for their experiments" ON experiment_sync_log;
CREATE POLICY "Users can view sync logs for their experiments" ON experiment_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON p.id = e.project_id
      WHERE e.id = experiment_sync_log.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can insert sync logs" ON experiment_sync_log;
CREATE POLICY "Service role can insert sync logs" ON experiment_sync_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 8. Helper functions
-- ============================================================================

-- Get active integration credential for a project
CREATE OR REPLACE FUNCTION get_integration_credential(
  p_project_id UUID,
  p_provider TEXT
)
RETURNS JSON AS $$
  SELECT row_to_json(ic.*)
  FROM integration_credentials ic
  WHERE ic.project_id = p_project_id
    AND ic.provider = p_provider
    AND ic.is_active = true
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get experiments that need syncing (last sync > sync_frequency_minutes ago or never synced)
CREATE OR REPLACE FUNCTION get_experiments_needing_sync()
RETURNS TABLE (
  id UUID,
  project_id UUID,
  name TEXT,
  feature_flag_key TEXT,
  feature_flag_provider TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_frequency_minutes INTEGER
) AS $$
  SELECT
    e.id,
    e.project_id,
    e.name,
    e.feature_flag_key,
    e.feature_flag_provider,
    e.last_synced_at,
    e.sync_frequency_minutes
  FROM experiments e
  WHERE e.sync_enabled = true
    AND e.status = 'running'
    AND e.feature_flag_key IS NOT NULL
    AND e.feature_flag_provider IS NOT NULL
    AND (
      e.last_synced_at IS NULL
      OR e.last_synced_at < NOW() - (e.sync_frequency_minutes || ' minutes')::INTERVAL
    )
  ORDER BY e.last_synced_at ASC NULLS FIRST;
$$ LANGUAGE SQL STABLE;

-- Record successful sync
CREATE OR REPLACE FUNCTION record_experiment_sync(
  p_experiment_id UUID,
  p_sync_type TEXT,
  p_provider TEXT,
  p_status TEXT,
  p_results_synced INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL,
  p_raw_response JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insert sync log
  INSERT INTO experiment_sync_log (
    experiment_id,
    sync_type,
    provider,
    status,
    results_synced,
    error_message,
    raw_response
  ) VALUES (
    p_experiment_id,
    p_sync_type,
    p_provider,
    p_status,
    p_results_synced,
    p_error_message,
    p_raw_response
  )
  RETURNING id INTO v_log_id;

  -- Update experiment's last_synced_at if successful
  IF p_status = 'success' OR p_status = 'partial' THEN
    UPDATE experiments
    SET last_synced_at = NOW()
    WHERE id = p_experiment_id;
  END IF;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_integration_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_integration_credentials_updated_at ON integration_credentials;
CREATE TRIGGER trigger_update_integration_credentials_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_credentials_updated_at();

-- ============================================================================
-- 10. Comments
-- ============================================================================

COMMENT ON TABLE integration_credentials IS 'Stores encrypted API keys for LaunchDarkly, Optimizely, and other experiment platform integrations';
COMMENT ON TABLE experiment_sync_log IS 'Audit log of experiment data synchronization from external platforms';
COMMENT ON COLUMN experiments.sync_enabled IS 'Whether to automatically sync results from feature flag provider';
COMMENT ON COLUMN experiments.sync_frequency_minutes IS 'How often to sync results (in minutes)';
COMMENT ON COLUMN experiments.external_experiment_id IS 'ID of experiment in external provider (LaunchDarkly, Optimizely)';

-- ============================================================================
-- Migration complete
-- ============================================================================
