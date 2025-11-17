-- Jira OAuth Integration Database Schema
-- Enables secure Jira Cloud integration with OAuth 2.0, issue creation, and bi-directional sync

-- ============================================================================
-- 1. Create enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE jira_connection_status AS ENUM ('active', 'expired', 'disconnected', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE jira_webhook_status AS ENUM ('active', 'failed', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE jira_sync_action AS ENUM (
    'issue_created',
    'issue_updated',
    'status_synced',
    'webhook_received',
    'token_refreshed',
    'connection_created',
    'connection_disconnected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. Create jira_connections table
-- Stores OAuth tokens and connection metadata for each Jira workspace
-- ============================================================================

CREATE TABLE IF NOT EXISTS jira_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Jira workspace identification
  cloud_id TEXT NOT NULL, -- Atlassian cloud ID (e.g., '1324a887-45db-1bf4-1e99-ef0ff456d421')
  site_url TEXT NOT NULL, -- e.g., 'yourcompany.atlassian.net'
  site_name TEXT, -- Human-readable name

  -- Encrypted OAuth tokens (NEVER store in plain text)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Default settings for issue creation
  default_project_key TEXT, -- e.g., 'SLDEV'
  default_issue_type TEXT DEFAULT 'Bug', -- e.g., 'Bug', 'Story', 'Task'
  default_priority TEXT, -- e.g., 'High', 'Medium', 'Low'
  default_assignee_id TEXT, -- Jira user account ID

  -- Connection status
  status jira_connection_status DEFAULT 'active',
  last_error TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one active connection per user per project
  UNIQUE(user_id, project_id)
);

-- ============================================================================
-- 3. Create jira_issue_links table
-- Maps SignalsLoop feedback items to Jira issues
-- ============================================================================

CREATE TABLE IF NOT EXISTS jira_issue_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES discovered_feedback(id) ON DELETE CASCADE,
  jira_connection_id UUID NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,

  -- Jira issue identification
  issue_key TEXT NOT NULL, -- e.g., 'SLDEV-1234'
  issue_id TEXT NOT NULL, -- Jira's internal numeric ID
  issue_url TEXT NOT NULL, -- Full URL to issue

  -- Issue metadata
  project_key TEXT NOT NULL,
  issue_type TEXT NOT NULL, -- Bug, Story, Task, Epic, etc.
  status TEXT NOT NULL, -- To Do, In Progress, Done, etc.
  priority TEXT, -- Highest, High, Medium, Low, Lowest
  summary TEXT NOT NULL, -- Issue title

  -- Assignee information
  assignee JSONB, -- {id, name, email, avatar}

  -- Sprint/epic information
  sprint_id TEXT,
  sprint_name TEXT,
  epic_key TEXT,

  -- Sync settings
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_in_jira_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one Jira issue per feedback item
  UNIQUE(feedback_id),

  -- Index for quick lookups by issue key
  UNIQUE(jira_connection_id, issue_key)
);

-- ============================================================================
-- 4. Create jira_webhooks table
-- Tracks registered webhooks for bi-directional sync
-- ============================================================================

CREATE TABLE IF NOT EXISTS jira_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_connection_id UUID NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,

  -- Webhook identification
  webhook_id TEXT NOT NULL, -- Jira's webhook ID
  webhook_url TEXT NOT NULL, -- Our endpoint URL

  -- Webhook configuration
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- e.g., ['jira:issue_updated', 'jira:issue_deleted']
  secret TEXT NOT NULL, -- For HMAC signature verification

  -- Status
  status jira_webhook_status DEFAULT 'active',
  last_error TEXT,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  total_events_received INTEGER DEFAULT 0,
  failed_events INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One webhook per connection
  UNIQUE(jira_connection_id)
);

-- ============================================================================
-- 5. Create jira_label_mappings table
-- Maps SignalsLoop themes to Jira labels for automatic tagging
-- ============================================================================

CREATE TABLE IF NOT EXISTS jira_label_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,

  -- Jira labels to apply (array allows multiple labels per theme)
  jira_labels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Auto-apply to new issues
  auto_apply BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One mapping per theme per project
  UNIQUE(project_id, theme_id)
);

-- ============================================================================
-- 6. Create jira_sync_logs table
-- Audit trail for all Jira integration activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS jira_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_connection_id UUID REFERENCES jira_connections(id) ON DELETE CASCADE,

  -- Action details
  action jira_sync_action NOT NULL,
  jira_issue_key TEXT, -- Nullable for non-issue actions

  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_stack TEXT,

  -- Additional context (flexible JSON storage)
  details JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  duration_ms INTEGER, -- How long the operation took
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. Create OAuth state tokens table
-- Temporary storage for CSRF protection during OAuth flow
-- ============================================================================

CREATE TABLE IF NOT EXISTS jira_oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Auto-expire after 15 minutes
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),

  -- Consumed flag to prevent replay attacks
  consumed BOOLEAN DEFAULT false,
  consumed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. Create indexes for performance
-- ============================================================================

-- jira_connections indexes
CREATE INDEX IF NOT EXISTS idx_jira_connections_user_id ON jira_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_connections_project_id ON jira_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_jira_connections_status ON jira_connections(status);
CREATE INDEX IF NOT EXISTS idx_jira_connections_cloud_id ON jira_connections(cloud_id);

-- jira_issue_links indexes
CREATE INDEX IF NOT EXISTS idx_jira_issue_links_feedback_id ON jira_issue_links(feedback_id);
CREATE INDEX IF NOT EXISTS idx_jira_issue_links_connection_id ON jira_issue_links(jira_connection_id);
CREATE INDEX IF NOT EXISTS idx_jira_issue_links_issue_key ON jira_issue_links(issue_key);
CREATE INDEX IF NOT EXISTS idx_jira_issue_links_status ON jira_issue_links(status);
CREATE INDEX IF NOT EXISTS idx_jira_issue_links_project_key ON jira_issue_links(project_key);
CREATE INDEX IF NOT EXISTS idx_jira_issue_links_sync_enabled ON jira_issue_links(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_jira_issue_links_created_at ON jira_issue_links(created_at DESC);

-- jira_webhooks indexes
CREATE INDEX IF NOT EXISTS idx_jira_webhooks_connection_id ON jira_webhooks(jira_connection_id);
CREATE INDEX IF NOT EXISTS idx_jira_webhooks_status ON jira_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_jira_webhooks_webhook_id ON jira_webhooks(webhook_id);

-- jira_label_mappings indexes
CREATE INDEX IF NOT EXISTS idx_jira_label_mappings_project_id ON jira_label_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_jira_label_mappings_theme_id ON jira_label_mappings(theme_id);
CREATE INDEX IF NOT EXISTS idx_jira_label_mappings_auto_apply ON jira_label_mappings(auto_apply) WHERE auto_apply = true;

-- jira_sync_logs indexes
CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_connection_id ON jira_sync_logs(jira_connection_id);
CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_action ON jira_sync_logs(action);
CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_issue_key ON jira_sync_logs(jira_issue_key);
CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_success ON jira_sync_logs(success);
CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_created_at ON jira_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_user_id ON jira_sync_logs(user_id);

-- jira_oauth_states indexes
CREATE INDEX IF NOT EXISTS idx_jira_oauth_states_state_token ON jira_oauth_states(state_token);
CREATE INDEX IF NOT EXISTS idx_jira_oauth_states_user_id ON jira_oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_oauth_states_expires_at ON jira_oauth_states(expires_at);

-- ============================================================================
-- 9. Enable Row Level Security
-- ============================================================================

ALTER TABLE jira_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_issue_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_label_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_oauth_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. RLS Policies for jira_connections
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own Jira connections" ON jira_connections;
CREATE POLICY "Users can view their own Jira connections" ON jira_connections
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own Jira connections" ON jira_connections;
CREATE POLICY "Users can insert their own Jira connections" ON jira_connections
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own Jira connections" ON jira_connections;
CREATE POLICY "Users can update their own Jira connections" ON jira_connections
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own Jira connections" ON jira_connections;
CREATE POLICY "Users can delete their own Jira connections" ON jira_connections
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access to jira_connections" ON jira_connections;
CREATE POLICY "Service role full access to jira_connections" ON jira_connections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 11. RLS Policies for jira_issue_links
-- ============================================================================

DROP POLICY IF EXISTS "Users can view Jira issue links for their projects" ON jira_issue_links;
CREATE POLICY "Users can view Jira issue links for their projects" ON jira_issue_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jira_connections jc
      WHERE jc.id = jira_issue_links.jira_connection_id
        AND jc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert Jira issue links for their connections" ON jira_issue_links;
CREATE POLICY "Users can insert Jira issue links for their connections" ON jira_issue_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jira_connections jc
      WHERE jc.id = jira_issue_links.jira_connection_id
        AND jc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update Jira issue links for their connections" ON jira_issue_links;
CREATE POLICY "Users can update Jira issue links for their connections" ON jira_issue_links
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM jira_connections jc
      WHERE jc.id = jira_issue_links.jira_connection_id
        AND jc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete Jira issue links for their connections" ON jira_issue_links;
CREATE POLICY "Users can delete Jira issue links for their connections" ON jira_issue_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM jira_connections jc
      WHERE jc.id = jira_issue_links.jira_connection_id
        AND jc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to jira_issue_links" ON jira_issue_links;
CREATE POLICY "Service role full access to jira_issue_links" ON jira_issue_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 12. RLS Policies for jira_webhooks
-- ============================================================================

DROP POLICY IF EXISTS "Users can view Jira webhooks for their connections" ON jira_webhooks;
CREATE POLICY "Users can view Jira webhooks for their connections" ON jira_webhooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jira_connections jc
      WHERE jc.id = jira_webhooks.jira_connection_id
        AND jc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to jira_webhooks" ON jira_webhooks;
CREATE POLICY "Service role full access to jira_webhooks" ON jira_webhooks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 13. RLS Policies for jira_label_mappings
-- ============================================================================

DROP POLICY IF EXISTS "Users can view Jira label mappings for their projects" ON jira_label_mappings;
CREATE POLICY "Users can view Jira label mappings for their projects" ON jira_label_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = jira_label_mappings.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert Jira label mappings for their projects" ON jira_label_mappings;
CREATE POLICY "Users can insert Jira label mappings for their projects" ON jira_label_mappings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = jira_label_mappings.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update Jira label mappings for their projects" ON jira_label_mappings;
CREATE POLICY "Users can update Jira label mappings for their projects" ON jira_label_mappings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = jira_label_mappings.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete Jira label mappings for their projects" ON jira_label_mappings;
CREATE POLICY "Users can delete Jira label mappings for their projects" ON jira_label_mappings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = jira_label_mappings.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to jira_label_mappings" ON jira_label_mappings;
CREATE POLICY "Service role full access to jira_label_mappings" ON jira_label_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 14. RLS Policies for jira_sync_logs
-- ============================================================================

DROP POLICY IF EXISTS "Users can view Jira sync logs for their connections" ON jira_sync_logs;
CREATE POLICY "Users can view Jira sync logs for their connections" ON jira_sync_logs
  FOR SELECT USING (
    jira_connection_id IS NULL OR EXISTS (
      SELECT 1 FROM jira_connections jc
      WHERE jc.id = jira_sync_logs.jira_connection_id
        AND jc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to jira_sync_logs" ON jira_sync_logs;
CREATE POLICY "Service role full access to jira_sync_logs" ON jira_sync_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 15. RLS Policies for jira_oauth_states
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own OAuth states" ON jira_oauth_states;
CREATE POLICY "Users can view their own OAuth states" ON jira_oauth_states
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own OAuth states" ON jira_oauth_states;
CREATE POLICY "Users can insert their own OAuth states" ON jira_oauth_states
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own OAuth states" ON jira_oauth_states;
CREATE POLICY "Users can update their own OAuth states" ON jira_oauth_states
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access to jira_oauth_states" ON jira_oauth_states;
CREATE POLICY "Service role full access to jira_oauth_states" ON jira_oauth_states
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 16. Create triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_jira_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_jira_connections_timestamp ON jira_connections;
CREATE TRIGGER update_jira_connections_timestamp
  BEFORE UPDATE ON jira_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_jira_timestamp();

DROP TRIGGER IF EXISTS update_jira_issue_links_timestamp ON jira_issue_links;
CREATE TRIGGER update_jira_issue_links_timestamp
  BEFORE UPDATE ON jira_issue_links
  FOR EACH ROW
  EXECUTE FUNCTION update_jira_timestamp();

DROP TRIGGER IF EXISTS update_jira_webhooks_timestamp ON jira_webhooks;
CREATE TRIGGER update_jira_webhooks_timestamp
  BEFORE UPDATE ON jira_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_jira_timestamp();

DROP TRIGGER IF EXISTS update_jira_label_mappings_timestamp ON jira_label_mappings;
CREATE TRIGGER update_jira_label_mappings_timestamp
  BEFORE UPDATE ON jira_label_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_jira_timestamp();

-- ============================================================================
-- 17. Create cleanup function for expired OAuth states
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM jira_oauth_states
  WHERE expires_at < NOW();
END;
$$;

-- ============================================================================
-- 18. Create helper functions
-- ============================================================================

-- Function to get active Jira connection for a project
CREATE OR REPLACE FUNCTION get_active_jira_connection(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  cloud_id TEXT,
  site_url TEXT,
  default_project_key TEXT,
  default_issue_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jc.id,
    jc.cloud_id,
    jc.site_url,
    jc.default_project_key,
    jc.default_issue_type
  FROM jira_connections jc
  WHERE jc.project_id = p_project_id
    AND jc.user_id = auth.uid()
    AND jc.status = 'active'
  LIMIT 1;
END;
$$;

-- Function to get Jira sync statistics
CREATE OR REPLACE FUNCTION get_jira_sync_stats(p_project_id UUID)
RETURNS TABLE (
  total_issues_created BIGINT,
  issues_created_today BIGINT,
  issues_created_this_week BIGINT,
  total_sync_events BIGINT,
  successful_syncs BIGINT,
  failed_syncs BIGINT,
  last_sync_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT jil.id) as total_issues_created,
    COUNT(DISTINCT jil.id) FILTER (WHERE jil.created_at >= CURRENT_DATE) as issues_created_today,
    COUNT(DISTINCT jil.id) FILTER (WHERE jil.created_at >= CURRENT_DATE - INTERVAL '7 days') as issues_created_this_week,
    COUNT(jsl.id) as total_sync_events,
    COUNT(jsl.id) FILTER (WHERE jsl.success = true) as successful_syncs,
    COUNT(jsl.id) FILTER (WHERE jsl.success = false) as failed_syncs,
    MAX(jc.last_sync_at) as last_sync_at
  FROM jira_connections jc
  LEFT JOIN jira_issue_links jil ON jc.id = jil.jira_connection_id
  LEFT JOIN jira_sync_logs jsl ON jc.id = jsl.jira_connection_id
  WHERE jc.project_id = p_project_id
    AND jc.user_id = auth.uid();
END;
$$;

-- Function to mark feedback as resolved when Jira issue is done
CREATE OR REPLACE FUNCTION sync_jira_issue_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If issue status changed to Done, mark feedback as resolved
  IF NEW.status IN ('Done', 'Closed', 'Resolved') AND
     (OLD.status IS NULL OR OLD.status NOT IN ('Done', 'Closed', 'Resolved')) THEN

    UPDATE discovered_feedback
    SET
      responded_at = NOW(),
      response_content = 'Resolved via Jira issue ' || NEW.issue_key,
      response_url = NEW.issue_url
    WHERE id = NEW.feedback_id;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_feedback_on_jira_status_change ON jira_issue_links;
CREATE TRIGGER sync_feedback_on_jira_status_change
  AFTER UPDATE OF status ON jira_issue_links
  FOR EACH ROW
  EXECUTE FUNCTION sync_jira_issue_status();

-- ============================================================================
-- 19. Create views for analytics
-- ============================================================================

-- View for Jira integration dashboard
CREATE OR REPLACE VIEW jira_integration_overview AS
SELECT
  jc.project_id,
  jc.id as connection_id,
  jc.site_url,
  jc.site_name,
  jc.status as connection_status,
  jc.default_project_key,
  jc.last_sync_at,
  COUNT(DISTINCT jil.id) as total_issues_created,
  COUNT(DISTINCT jil.id) FILTER (WHERE jil.created_at >= NOW() - INTERVAL '7 days') as issues_created_this_week,
  COUNT(DISTINCT jil.id) FILTER (WHERE jil.status IN ('Done', 'Closed', 'Resolved')) as issues_resolved,
  COUNT(DISTINCT jil.id) FILTER (WHERE jil.status = 'In Progress') as issues_in_progress,
  COUNT(DISTINCT jw.id) as active_webhooks,
  COUNT(DISTINCT jlm.id) as label_mappings
FROM jira_connections jc
LEFT JOIN jira_issue_links jil ON jc.id = jil.jira_connection_id
LEFT JOIN jira_webhooks jw ON jc.id = jw.jira_connection_id AND jw.status = 'active'
LEFT JOIN jira_label_mappings jlm ON jc.project_id = jlm.project_id
GROUP BY jc.id;

-- View for issue link details with feedback context
CREATE OR REPLACE VIEW jira_issues_with_feedback AS
SELECT
  jil.id,
  jil.issue_key,
  jil.issue_url,
  jil.status as jira_status,
  jil.priority,
  jil.summary,
  jil.assignee,
  jil.created_in_jira_at,
  jil.last_synced_at,
  df.id as feedback_id,
  df.platform,
  df.content as feedback_content,
  df.sentiment_score,
  df.classification,
  df.urgency_score,
  df.engagement_score,
  df.author_username,
  df.discovered_at,
  jc.site_url,
  jc.project_id
FROM jira_issue_links jil
INNER JOIN discovered_feedback df ON jil.feedback_id = df.id
INNER JOIN jira_connections jc ON jil.jira_connection_id = jc.id;

-- Grant access to views
GRANT SELECT ON jira_integration_overview TO authenticated;
GRANT SELECT ON jira_integration_overview TO service_role;
GRANT SELECT ON jira_issues_with_feedback TO authenticated;
GRANT SELECT ON jira_issues_with_feedback TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_active_jira_connection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_jira_connection(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_jira_sync_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_jira_sync_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_oauth_states() TO service_role;

-- ============================================================================
-- 20. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE jira_connections IS 'OAuth connections to Jira Cloud workspaces with encrypted tokens';
COMMENT ON TABLE jira_issue_links IS 'Links between SignalsLoop feedback items and Jira issues';
COMMENT ON TABLE jira_webhooks IS 'Registered webhooks for bi-directional Jira sync';
COMMENT ON TABLE jira_label_mappings IS 'Maps SignalsLoop themes to Jira labels for auto-tagging';
COMMENT ON TABLE jira_sync_logs IS 'Audit trail for all Jira integration activities';
COMMENT ON TABLE jira_oauth_states IS 'Temporary CSRF tokens for OAuth flow security';

COMMENT ON COLUMN jira_connections.access_token_encrypted IS 'AES-256-GCM encrypted OAuth access token';
COMMENT ON COLUMN jira_connections.refresh_token_encrypted IS 'AES-256-GCM encrypted OAuth refresh token';
COMMENT ON COLUMN jira_connections.cloud_id IS 'Atlassian cloud ID from accessible-resources endpoint';
COMMENT ON COLUMN jira_issue_links.sync_enabled IS 'If false, status changes in Jira will not update SignalsLoop';
COMMENT ON COLUMN jira_webhooks.secret IS 'Secret for HMAC signature verification of webhook payloads';
COMMENT ON COLUMN jira_label_mappings.auto_apply IS 'Automatically apply labels when creating issues from this theme';
