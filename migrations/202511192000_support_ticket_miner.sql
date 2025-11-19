-- Support Ticket Miner Migration
-- This migration creates tables for ingesting and analyzing support tickets from Zendesk/Intercom
-- and clustering them into themes with sentiment analysis and ARR impact tracking

-- Table: support_ingests
-- Tracks batch ingestion jobs for support tickets
CREATE TABLE IF NOT EXISTS support_ingests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'zendesk', 'intercom', 'csv', 'api'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store file_url, api_params, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: support_tickets
-- Stores individual support tickets with analysis results
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ingest_id UUID REFERENCES support_ingests(id) ON DELETE SET NULL,
  external_id TEXT, -- Original ticket ID from source system
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  customer TEXT, -- Customer name or email
  plan TEXT, -- Subscription plan (for ARR calculation)
  arr_value DECIMAL(12, 2), -- Annual Recurring Revenue value
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- Link to created roadmap post
  sentiment_score DECIMAL(3, 2), -- -1 to 1 scale
  sentiment_category TEXT, -- 'positive', 'negative', 'neutral', 'mixed'
  priority_score INTEGER, -- 1-10 scale for urgency
  metadata JSONB DEFAULT '{}'::jsonb, -- Store additional ticket data
  UNIQUE(project_id, external_id, subject) -- Prevent duplicates
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_ingests_project_id ON support_ingests(project_id);
CREATE INDEX IF NOT EXISTS idx_support_ingests_status ON support_ingests(status);
CREATE INDEX IF NOT EXISTS idx_support_ingests_created_at ON support_ingests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_project_id ON support_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ingest_id ON support_tickets(ingest_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_external_id ON support_tickets(external_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_theme_id ON support_tickets(theme_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_post_id ON support_tickets(post_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_analyzed_at ON support_tickets(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sentiment_score ON support_tickets(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority_score ON support_tickets(priority_score DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ingests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_ingests_updated_at
  BEFORE UPDATE ON support_ingests
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ingests_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE support_ingests ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view ingests for their projects
CREATE POLICY support_ingests_select_policy ON support_ingests
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN team_members tm ON tm.project_id = p.id
      WHERE p.owner_id = auth.uid() OR tm.user_id = auth.uid()
    )
  );

-- Policy: Users can insert ingests for their projects
CREATE POLICY support_ingests_insert_policy ON support_ingests
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN team_members tm ON tm.project_id = p.id
      WHERE p.owner_id = auth.uid() OR tm.user_id = auth.uid()
    )
  );

-- Policy: Users can update ingests for their projects
CREATE POLICY support_ingests_update_policy ON support_ingests
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN team_members tm ON tm.project_id = p.id
      WHERE p.owner_id = auth.uid() OR tm.user_id = auth.uid()
    )
  );

-- Policy: Users can view tickets for their projects
CREATE POLICY support_tickets_select_policy ON support_tickets
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN team_members tm ON tm.project_id = p.id
      WHERE p.owner_id = auth.uid() OR tm.user_id = auth.uid()
    )
  );

-- Policy: Users can insert tickets for their projects
CREATE POLICY support_tickets_insert_policy ON support_tickets
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN team_members tm ON tm.project_id = p.id
      WHERE p.owner_id = auth.uid() OR tm.user_id = auth.uid()
    )
  );

-- Policy: Users can update tickets for their projects
CREATE POLICY support_tickets_update_policy ON support_tickets
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN team_members tm ON tm.project_id = p.id
      WHERE p.owner_id = auth.uid() OR tm.user_id = auth.uid()
    )
  );

-- Policy: Service role can do everything (for cron jobs)
CREATE POLICY support_ingests_service_policy ON support_ingests
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY support_tickets_service_policy ON support_tickets
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- View: Support ticket summary with theme and post details
CREATE OR REPLACE VIEW support_ticket_summary AS
SELECT
  st.id,
  st.project_id,
  st.external_id,
  st.subject,
  st.body,
  st.customer,
  st.plan,
  st.arr_value,
  st.created_at,
  st.analyzed_at,
  st.sentiment_score,
  st.sentiment_category,
  st.priority_score,
  t.theme_name,
  t.description as theme_description,
  p.title as post_title,
  p.id as post_id,
  p.status as post_status,
  si.source as ingest_source
FROM support_tickets st
LEFT JOIN themes t ON st.theme_id = t.id
LEFT JOIN posts p ON st.post_id = p.id
LEFT JOIN support_ingests si ON st.ingest_id = si.id;

-- Grant access to the view
GRANT SELECT ON support_ticket_summary TO authenticated;
GRANT SELECT ON support_ticket_summary TO service_role;

COMMENT ON TABLE support_ingests IS 'Tracks batch ingestion jobs for support tickets from Zendesk, Intercom, CSV, or API';
COMMENT ON TABLE support_tickets IS 'Individual support tickets with AI analysis results including themes, sentiment, and priority';
COMMENT ON VIEW support_ticket_summary IS 'Denormalized view of support tickets with theme and post details for dashboard display';
