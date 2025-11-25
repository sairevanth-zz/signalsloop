-- =====================================================
-- Cross-Tool Intelligence Foundations
-- - Jira velocity ingestion
-- - Usage analytics event ingestion (Mixpanel/Amplitude)
-- =====================================================

-- ============================================================================
-- TEAM VELOCITY TABLE
-- Stores sprint-level velocity metrics fetched from Jira Agile API
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_velocity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_connection_id UUID REFERENCES jira_connections(id) ON DELETE SET NULL,
  board_id TEXT,
  board_name TEXT,
  sprint_id TEXT,
  sprint_name TEXT,
  sprint_start_date DATE,
  sprint_end_date DATE,

  committed_points DECIMAL(6,2),
  completed_points DECIMAL(6,2),
  committed_issues INT,
  completed_issues INT,
  velocity_points DECIMAL(6,2),

  source TEXT NOT NULL DEFAULT 'jira',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(project_id, sprint_id, board_id)
);

CREATE INDEX IF NOT EXISTS idx_team_velocity_project ON team_velocity(project_id, sprint_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_team_velocity_board ON team_velocity(board_id, sprint_end_date DESC);

ALTER TABLE team_velocity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team velocity for their projects" ON team_velocity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = team_velocity.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert team velocity for their projects" ON team_velocity
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = team_velocity.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update team velocity for their projects" ON team_velocity
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = team_velocity.project_id
        AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = team_velocity.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to team_velocity" ON team_velocity
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE team_velocity IS 'Sprint-level execution velocity ingested from Jira Agile';
COMMENT ON COLUMN team_velocity.velocity_points IS 'Points completed (Jira velocity)';

-- ============================================================================
-- USAGE ANALYTICS EVENTS TABLE
-- Stores product usage signals from analytics providers (Mixpanel/Amplitude)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('mixpanel', 'amplitude', 'segment', 'custom')),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  distinct_id TEXT, -- provider-specific user identifier
  properties JSONB DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_usage_events_project_time ON usage_analytics_events(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_source ON usage_analytics_events(source);
CREATE INDEX IF NOT EXISTS idx_usage_events_name ON usage_analytics_events(event_name);

ALTER TABLE usage_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view usage analytics for their projects" ON usage_analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = usage_analytics_events.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert usage analytics for their projects" ON usage_analytics_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = usage_analytics_events.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to usage_analytics_events" ON usage_analytics_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE usage_analytics_events IS 'Normalized product usage events ingested from analytics providers';
COMMENT ON COLUMN usage_analytics_events.properties IS 'Provider-specific event properties (flattened)';
