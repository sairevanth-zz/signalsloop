-- Linear Connections Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS linear_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  organization_url_key TEXT,
  access_token_encrypted TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_linear_connections_org ON linear_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_linear_connections_project ON linear_connections(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_linear_connections_project_org ON linear_connections(project_id, organization_id);

-- RLS Policies
ALTER TABLE linear_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own linear connections"
  ON linear_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linear connections"
  ON linear_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linear connections"
  ON linear_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linear connections"
  ON linear_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all (for webhooks)
CREATE POLICY "Service role can access all linear connections"
  ON linear_connections FOR ALL
  USING (auth.role() = 'service_role');
