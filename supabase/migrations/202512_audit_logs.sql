-- Audit Logs Migration
-- Comprehensive audit trail for SOC 2 compliance
-- Records all security-relevant events and user actions

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event identification
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL DEFAULT 'general',
  -- Categories: auth, data, admin, security, api, integration
  
  -- Actor information
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  actor_type VARCHAR(50) DEFAULT 'user', -- user, system, api, cron
  
  -- Resource information
  resource_type VARCHAR(100), -- project, user, post, webhook, etc.
  resource_id UUID,
  resource_name VARCHAR(255),
  
  -- Action details
  action VARCHAR(100) NOT NULL, -- create, read, update, delete, login, etc.
  action_status VARCHAR(50) DEFAULT 'success', -- success, failure, denied
  
  -- Change tracking (for update/delete operations)
  previous_value JSONB,
  new_value JSONB,
  changes JSONB, -- Diff of what changed
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  
  -- Additional context
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  correlation_id VARCHAR(255), -- For tracking related events
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT audit_logs_event_type_check CHECK (event_type IS NOT NULL AND event_type != '')
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_status ON audit_logs(action_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created 
  ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_created 
  ON audit_logs(project_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    auth.uid() IN (
      SELECT unnest(string_to_array(current_setting('app.admin_user_ids', true), ','))::uuid
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users u 
      WHERE u.id = auth.uid() 
      AND u.email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
    )
  );

-- System can insert audit logs (service role only)
-- No direct inserts from users - only through service role

-- ============================================================================
-- AUDIT LOG EVENT TYPES (Reference)
-- ============================================================================
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for SOC 2 compliance.

Event Categories:
- auth: Authentication events (login, logout, password_change, mfa_enabled)
- data: Data operations (create, update, delete, export, import)
- admin: Administrative actions (user_create, role_change, settings_update)
- security: Security events (api_key_create, permission_change, access_denied)
- api: API access (api_call, rate_limited, invalid_key)
- integration: Integration events (connected, disconnected, sync)

Common Event Types:
- user.login, user.logout, user.password_change
- user.mfa_enabled, user.mfa_disabled
- data.create, data.update, data.delete, data.export
- project.create, project.update, project.delete
- project.member_added, project.member_removed
- api_key.create, api_key.revoke, api_key.used
- webhook.create, webhook.update, webhook.delete
- settings.update, settings.reset
- integration.connect, integration.disconnect, integration.sync
- security.access_denied, security.rate_limited
- admin.user_create, admin.user_delete, admin.role_change
';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to insert audit log (for use in triggers and application code)
CREATE OR REPLACE FUNCTION insert_audit_log(
  p_event_type VARCHAR(100),
  p_event_category VARCHAR(50),
  p_actor_id UUID,
  p_actor_email VARCHAR(255),
  p_resource_type VARCHAR(100),
  p_resource_id UUID,
  p_action VARCHAR(100),
  p_action_status VARCHAR(50),
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    event_type,
    event_category,
    actor_id,
    actor_email,
    resource_type,
    resource_id,
    action,
    action_status,
    changes,
    ip_address,
    user_agent,
    project_id,
    metadata
  ) VALUES (
    p_event_type,
    p_event_category,
    p_actor_id,
    p_actor_email,
    p_resource_type,
    p_resource_id,
    p_action,
    p_action_status,
    p_changes,
    p_ip_address,
    p_user_agent,
    p_project_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit logs for a resource
CREATE OR REPLACE FUNCTION get_resource_audit_logs(
  p_resource_type VARCHAR(100),
  p_resource_id UUID,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  event_type VARCHAR(100),
  actor_email VARCHAR(255),
  action VARCHAR(100),
  action_status VARCHAR(50),
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.event_type,
    al.actor_email,
    al.action,
    al.action_status,
    al.changes,
    al.created_at
  FROM audit_logs al
  WHERE al.resource_type = p_resource_type
    AND al.resource_id = p_resource_id
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit summary for compliance reports
CREATE OR REPLACE FUNCTION get_audit_summary(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  event_category VARCHAR(50),
  event_type VARCHAR(100),
  total_count BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  unique_actors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.event_category,
    al.event_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE al.action_status = 'success') as success_count,
    COUNT(*) FILTER (WHERE al.action_status = 'failure') as failure_count,
    COUNT(DISTINCT al.actor_id) as unique_actors
  FROM audit_logs al
  WHERE al.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY al.event_category, al.event_type
  ORDER BY al.event_category, total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DATA RETENTION POLICY
-- ============================================================================

-- Function to clean up old audit logs (call via cron job)
-- Default retention: 2 years for compliance
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_retention_days INT DEFAULT 730 -- 2 years
)
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH deleted AS (
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions to authenticated users for specific functions
GRANT EXECUTE ON FUNCTION get_resource_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_summary TO authenticated;
