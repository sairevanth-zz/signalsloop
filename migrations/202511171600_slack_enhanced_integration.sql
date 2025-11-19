-- Enhanced Slack Integration
-- OAuth 2.0 connections, Block Kit messages, alert rules, interactive actions

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE slack_connection_status AS ENUM ('active', 'expired', 'disconnected');

CREATE TYPE slack_alert_type AS ENUM (
  'critical_feedback',
  'sentiment_drop',
  'new_theme',
  'competitive_threat',
  'weekly_digest',
  'resolution_update',
  'jira_created',
  'theme_trending'
);

CREATE TYPE slack_rule_type AS ENUM (
  'critical_feedback',
  'sentiment_drop',
  'new_theme',
  'competitive_threat'
);

-- =====================================================
-- TABLE: slack_connections
-- Stores OAuth tokens and workspace info
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Slack workspace info
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,

  -- OAuth tokens (encrypted)
  bot_token_encrypted TEXT NOT NULL,
  bot_user_id TEXT NOT NULL,
  scope TEXT NOT NULL,

  -- Connection status
  status slack_connection_status DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, team_id)
);

-- =====================================================
-- TABLE: slack_channel_mappings
-- Routes alert types to specific channels
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_channel_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_connection_id UUID NOT NULL REFERENCES slack_connections(id) ON DELETE CASCADE,

  -- Alert routing
  alert_type slack_alert_type NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,

  -- Mentions (@user in Slack)
  mention_users TEXT[] DEFAULT '{}',

  -- Thread management
  use_threads BOOLEAN DEFAULT false,
  parent_message_ts TEXT, -- For keeping related alerts in one thread

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(slack_connection_id, alert_type)
);

-- =====================================================
-- TABLE: slack_alert_rules
-- Configurable rules for when to trigger alerts
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Rule configuration
  rule_type slack_rule_type NOT NULL,
  enabled BOOLEAN DEFAULT true,

  -- Rule-specific config (JSONB for flexibility)
  config JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, rule_type)
);

-- =====================================================
-- TABLE: slack_message_logs
-- Audit trail of all messages sent
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_connection_id UUID NOT NULL REFERENCES slack_connections(id) ON DELETE CASCADE,

  -- Message details
  alert_type slack_alert_type NOT NULL,
  channel_id TEXT NOT NULL,
  message_ts TEXT, -- Slack message timestamp (for threading)

  -- Content
  blocks JSONB NOT NULL,
  text_fallback TEXT,

  -- Status
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Related entity
  entity_id UUID, -- feedback_id, theme_id, etc.
  entity_type TEXT, -- 'feedback', 'theme', etc.

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: slack_interaction_logs
-- Logs when users click buttons/interact with messages
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_connection_id UUID NOT NULL REFERENCES slack_connections(id) ON DELETE CASCADE,

  -- Interaction details
  slack_user_id TEXT NOT NULL,
  action_id TEXT NOT NULL,

  -- Payload and response
  payload JSONB NOT NULL,
  response JSONB,

  -- Related message
  message_ts TEXT,
  channel_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_slack_connections_project_id ON slack_connections(project_id);
CREATE INDEX idx_slack_connections_status ON slack_connections(status);

CREATE INDEX idx_slack_channel_mappings_connection_id ON slack_channel_mappings(slack_connection_id);
CREATE INDEX idx_slack_channel_mappings_alert_type ON slack_channel_mappings(alert_type);

CREATE INDEX idx_slack_alert_rules_project_id ON slack_alert_rules(project_id);
CREATE INDEX idx_slack_alert_rules_enabled ON slack_alert_rules(enabled);

CREATE INDEX idx_slack_message_logs_connection_id ON slack_message_logs(slack_connection_id);
CREATE INDEX idx_slack_message_logs_created_at ON slack_message_logs(created_at DESC);
CREATE INDEX idx_slack_message_logs_entity ON slack_message_logs(entity_id, entity_type);

CREATE INDEX idx_slack_interaction_logs_connection_id ON slack_interaction_logs(slack_connection_id);
CREATE INDEX idx_slack_interaction_logs_created_at ON slack_interaction_logs(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channel_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_interaction_logs ENABLE ROW LEVEL SECURITY;

-- Slack connections policies
CREATE POLICY "Users can view their own Slack connections"
  ON slack_connections FOR SELECT
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own Slack connections"
  ON slack_connections FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    project_id IN (
      SELECT project_id FROM members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own Slack connections"
  ON slack_connections FOR UPDATE
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete their own Slack connections"
  ON slack_connections FOR DELETE
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Channel mappings policies
CREATE POLICY "Users can view channel mappings for their projects"
  ON slack_channel_mappings FOR SELECT
  USING (
    slack_connection_id IN (
      SELECT id FROM slack_connections
      WHERE user_id = auth.uid() OR project_id IN (
        SELECT project_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage channel mappings for their projects"
  ON slack_channel_mappings FOR ALL
  USING (
    slack_connection_id IN (
      SELECT id FROM slack_connections
      WHERE project_id IN (
        SELECT project_id FROM members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Alert rules policies
CREATE POLICY "Users can view alert rules for their projects"
  ON slack_alert_rules FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage alert rules for their projects"
  ON slack_alert_rules FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Message logs policies (read-only for users)
CREATE POLICY "Users can view message logs for their projects"
  ON slack_message_logs FOR SELECT
  USING (
    slack_connection_id IN (
      SELECT id FROM slack_connections
      WHERE project_id IN (
        SELECT project_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

-- Interaction logs policies (read-only for users)
CREATE POLICY "Users can view interaction logs for their projects"
  ON slack_interaction_logs FOR SELECT
  USING (
    slack_connection_id IN (
      SELECT id FROM slack_connections
      WHERE project_id IN (
        SELECT project_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_slack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER slack_connections_updated_at
  BEFORE UPDATE ON slack_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_updated_at();

CREATE TRIGGER slack_channel_mappings_updated_at
  BEFORE UPDATE ON slack_channel_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_updated_at();

CREATE TRIGGER slack_alert_rules_updated_at
  BEFORE UPDATE ON slack_alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_updated_at();

-- =====================================================
-- DEFAULT ALERT RULES
-- Insert default rules when a project is created
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_slack_alert_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Critical feedback rule
  INSERT INTO slack_alert_rules (project_id, rule_type, enabled, config)
  VALUES (
    NEW.id,
    'critical_feedback',
    true,
    '{
      "sentiment_threshold": -0.7,
      "keywords": ["churn", "cancel", "refund", "frustrated", "switching"],
      "urgency_min": 4,
      "revenue_risk_min": 1000
    }'::jsonb
  );

  -- Sentiment drop rule
  INSERT INTO slack_alert_rules (project_id, rule_type, enabled, config)
  VALUES (
    NEW.id,
    'sentiment_drop',
    true,
    '{
      "drop_percentage": 20,
      "time_period_days": 7,
      "min_sample_size": 50
    }'::jsonb
  );

  -- New theme rule
  INSERT INTO slack_alert_rules (project_id, rule_type, enabled, config)
  VALUES (
    NEW.id,
    'new_theme',
    true,
    '{
      "min_mentions": 10,
      "time_window_hours": 24,
      "sentiment_filter": "negative",
      "min_urgency": 3
    }'::jsonb
  );

  -- Competitive threat rule
  INSERT INTO slack_alert_rules (project_id, rule_type, enabled, config)
  VALUES (
    NEW.id,
    'competitive_threat',
    true,
    '{
      "min_mentions": 20,
      "time_window_hours": 48,
      "sentiment_spike": 0.3,
      "competitor_comparison": true
    }'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default rules for new projects
CREATE TRIGGER create_default_slack_rules_trigger
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_default_slack_alert_rules();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get active Slack connection for a project
CREATE OR REPLACE FUNCTION get_active_slack_connection(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  team_id TEXT,
  team_name TEXT,
  bot_token_encrypted TEXT,
  bot_user_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.team_id,
    sc.team_name,
    sc.bot_token_encrypted,
    sc.bot_user_id
  FROM slack_connections sc
  WHERE sc.project_id = p_project_id
    AND sc.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get channel mapping for alert type
CREATE OR REPLACE FUNCTION get_slack_channel_for_alert(
  p_connection_id UUID,
  p_alert_type slack_alert_type
)
RETURNS TABLE (
  channel_id TEXT,
  channel_name TEXT,
  mention_users TEXT[],
  use_threads BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    scm.channel_id,
    scm.channel_name,
    scm.mention_users,
    scm.use_threads
  FROM slack_channel_mappings scm
  WHERE scm.slack_connection_id = p_connection_id
    AND scm.alert_type = p_alert_type
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE slack_connections IS 'OAuth 2.0 connections to Slack workspaces';
COMMENT ON TABLE slack_channel_mappings IS 'Routes different alert types to specific Slack channels';
COMMENT ON TABLE slack_alert_rules IS 'Configurable rules for triggering alerts';
COMMENT ON TABLE slack_message_logs IS 'Audit trail of all Slack messages sent';
COMMENT ON TABLE slack_interaction_logs IS 'Logs of user interactions with Slack messages';
