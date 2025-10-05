-- Feedback Webhooks Schema
-- Webhook system for feedback posts, comments, and votes

-- 1. Create feedback_webhooks table
CREATE TABLE IF NOT EXISTS feedback_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret VARCHAR(255) NOT NULL,
  events TEXT[] DEFAULT ARRAY['post.created', 'post.status_changed', 'post.deleted', 'comment.created', 'vote.created'],
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create webhook_deliveries table for tracking delivery attempts
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES feedback_webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivery_duration_ms INTEGER,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT false
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_webhooks_project ON feedback_webhooks(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_webhooks_active ON feedback_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);

-- 4. Create trigger for updated_at
CREATE TRIGGER update_feedback_webhooks_updated_at
BEFORE UPDATE ON feedback_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS (Row Level Security)
ALTER TABLE feedback_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for feedback_webhooks
CREATE POLICY "Users can view webhooks for their projects"
  ON feedback_webhooks FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create webhooks for their projects"
  ON feedback_webhooks FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update webhooks for their projects"
  ON feedback_webhooks FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete webhooks for their projects"
  ON feedback_webhooks FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- 7. Create RLS policies for webhook_deliveries
CREATE POLICY "Users can view delivery logs for their webhooks"
  ON webhook_deliveries FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM feedback_webhooks WHERE project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
      )
    )
  );

-- Service role has full access for webhook delivery
CREATE POLICY "Service role has full access to webhook_deliveries"
  ON webhook_deliveries FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
