-- Push Subscriptions Table
-- Stores web push notification subscriptions

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  preferences JSONB DEFAULT '{
    "critical": true,
    "anomalies": true,
    "competitive": true,
    "weekly": false,
    "mentions": true,
    "specs": false,
    "roadmap": false
  }',
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  UNIQUE(user_id, endpoint)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_project_id ON push_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid());

-- Policy: Project owners can view all subscriptions for their projects
CREATE POLICY "Project owners can view project subscriptions" ON push_subscriptions
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Notification Log Table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  target_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_project_id ON notification_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- RLS for notification logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view notification logs" ON notification_logs
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Function to clean up old notification logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_logs WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
