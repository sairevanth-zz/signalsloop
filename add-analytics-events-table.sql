-- Analytics Events Table for Widget Tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  referer TEXT,
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_api_key ON analytics_events(api_key);
CREATE INDEX IF NOT EXISTS idx_analytics_events_project ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert analytics events
CREATE POLICY "Service role can insert analytics events" ON analytics_events
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow authenticated users to read their own project's analytics
CREATE POLICY "Users can view their project analytics" ON analytics_events
  FOR SELECT TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN members m ON p.id = m.project_id
      WHERE m.user_id = auth.uid()
    )
  );
