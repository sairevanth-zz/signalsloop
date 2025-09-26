-- Fix Analytics Events Table - Safe to run multiple times
-- This script handles existing objects gracefully

-- Create table if not exists
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

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_analytics_events_api_key ON analytics_events(api_key);
CREATE INDEX IF NOT EXISTS idx_analytics_events_project ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_ip_address ON analytics_events(ip_address);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can view their project analytics" ON analytics_events;
DROP POLICY IF EXISTS "Service role can manage analytics events" ON analytics_events;

-- Create new policies
CREATE POLICY "Service role can insert analytics events" ON analytics_events
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can manage analytics events" ON analytics_events
  FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view their project analytics" ON analytics_events
  FOR SELECT TO authenticated USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN members m ON p.id = m.project_id
      WHERE m.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT ON analytics_events TO authenticated;
GRANT INSERT ON analytics_events TO service_role;
GRANT ALL ON analytics_events TO service_role;
