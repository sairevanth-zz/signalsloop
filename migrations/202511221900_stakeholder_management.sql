-- Stakeholder Management Migration
-- Creates tables for automated stakeholder reporting and self-service portal
-- Part of Phase 3: Stakeholder Management & Experimentation Intelligence

-- ============================================================================
-- 1. Create stakeholders table
-- ============================================================================
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Contact information
  name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Role-based reporting
  role TEXT NOT NULL CHECK (role IN ('ceo', 'sales', 'engineering', 'marketing', 'customer_success')),

  -- Interests (array of topics they care about)
  interests JSONB DEFAULT '[]'::jsonb,

  -- Notification preferences
  notification_preferences JSONB DEFAULT '{
    "frequency": "weekly",
    "email_enabled": true,
    "slack_enabled": false,
    "include_sections": ["okrs", "roadmap", "competitive", "metrics", "feedback_themes"]
  }'::jsonb,

  -- Portal access token (for self-service portal)
  access_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Create stakeholder_reports table
-- ============================================================================
CREATE TABLE IF NOT EXISTS stakeholder_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,

  -- Report metadata
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'ad_hoc', 'on_demand')),
  role TEXT NOT NULL,

  -- Report content (structured data)
  content JSONB NOT NULL,

  -- HTML email content
  html_content TEXT,

  -- Engagement tracking
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Create stakeholder_interests table
-- ============================================================================
CREATE TABLE IF NOT EXISTS stakeholder_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,

  -- Interest details
  interest_type TEXT NOT NULL CHECK (interest_type IN ('feature', 'competitor', 'customer', 'metric', 'theme')),
  interest_id UUID, -- Foreign key to the specific item (feature_id, competitor_id, etc.)
  interest_name TEXT NOT NULL,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate interests
  UNIQUE(stakeholder_id, interest_type, interest_id)
);

-- ============================================================================
-- 4. Create indexes for performance
-- ============================================================================

-- Stakeholders indexes
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_email ON stakeholders(email);
CREATE INDEX IF NOT EXISTS idx_stakeholders_role ON stakeholders(role);
CREATE INDEX IF NOT EXISTS idx_stakeholders_access_token ON stakeholders(access_token);

-- Unique constraint: one email per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_project_email_unique
  ON stakeholders(project_id, email);

-- Stakeholder reports indexes
CREATE INDEX IF NOT EXISTS idx_stakeholder_reports_stakeholder_id ON stakeholder_reports(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_reports_generated_at ON stakeholder_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stakeholder_reports_role ON stakeholder_reports(role);
CREATE INDEX IF NOT EXISTS idx_stakeholder_reports_type ON stakeholder_reports(report_type);

-- Stakeholder interests indexes
CREATE INDEX IF NOT EXISTS idx_stakeholder_interests_stakeholder_id ON stakeholder_interests(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_interests_type ON stakeholder_interests(interest_type);
CREATE INDEX IF NOT EXISTS idx_stakeholder_interests_id ON stakeholder_interests(interest_id);

-- ============================================================================
-- 5. Enable Row Level Security
-- ============================================================================
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_interests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS Policies for stakeholders
-- ============================================================================

-- Project owners can manage stakeholders for their projects
DROP POLICY IF EXISTS "Project owners can view stakeholders" ON stakeholders;
CREATE POLICY "Project owners can view stakeholders" ON stakeholders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = stakeholders.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project owners can insert stakeholders" ON stakeholders;
CREATE POLICY "Project owners can insert stakeholders" ON stakeholders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = stakeholders.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project owners can update stakeholders" ON stakeholders;
CREATE POLICY "Project owners can update stakeholders" ON stakeholders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = stakeholders.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project owners can delete stakeholders" ON stakeholders;
CREATE POLICY "Project owners can delete stakeholders" ON stakeholders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = stakeholders.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Stakeholders can view their own data via access token (for portal)
DROP POLICY IF EXISTS "Stakeholders can view their own data" ON stakeholders;
CREATE POLICY "Stakeholders can view their own data" ON stakeholders
  FOR SELECT USING (
    access_token IS NOT NULL
    AND token_expires_at > NOW()
  );

-- ============================================================================
-- 7. RLS Policies for stakeholder_reports
-- ============================================================================

DROP POLICY IF EXISTS "Project owners can view stakeholder reports" ON stakeholder_reports;
CREATE POLICY "Project owners can view stakeholder reports" ON stakeholder_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = stakeholder_reports.stakeholder_id
      AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert stakeholder reports" ON stakeholder_reports;
CREATE POLICY "System can insert stakeholder reports" ON stakeholder_reports
  FOR INSERT WITH CHECK (true); -- Service role only

DROP POLICY IF EXISTS "Project owners can update stakeholder reports" ON stakeholder_reports;
CREATE POLICY "Project owners can update stakeholder reports" ON stakeholder_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = stakeholder_reports.stakeholder_id
      AND p.owner_id = auth.uid()
    )
  );

-- Stakeholders can view their own reports
DROP POLICY IF EXISTS "Stakeholders can view their own reports" ON stakeholder_reports;
CREATE POLICY "Stakeholders can view their own reports" ON stakeholder_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stakeholders s
      WHERE s.id = stakeholder_reports.stakeholder_id
      AND s.access_token IS NOT NULL
      AND s.token_expires_at > NOW()
    )
  );

-- ============================================================================
-- 8. RLS Policies for stakeholder_interests
-- ============================================================================

DROP POLICY IF EXISTS "Project owners can manage stakeholder interests" ON stakeholder_interests;
CREATE POLICY "Project owners can manage stakeholder interests" ON stakeholder_interests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = stakeholder_interests.stakeholder_id
      AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert stakeholder interests" ON stakeholder_interests;
CREATE POLICY "System can insert stakeholder interests" ON stakeholder_interests
  FOR INSERT WITH CHECK (true); -- Service role only

-- ============================================================================
-- 9. Helper functions
-- ============================================================================

-- Function to generate secure access token for stakeholder portal
CREATE OR REPLACE FUNCTION generate_stakeholder_access_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to get stakeholder with recent reports
CREATE OR REPLACE FUNCTION get_stakeholder_with_reports(p_stakeholder_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'stakeholder', row_to_json(s.*),
    'recent_reports', (
      SELECT COALESCE(json_agg(row_to_json(r.*)), '[]'::json)
      FROM (
        SELECT *
        FROM stakeholder_reports r
        WHERE r.stakeholder_id = p_stakeholder_id
        ORDER BY r.generated_at DESC
        LIMIT 10
      ) r
    ),
    'interests', (
      SELECT COALESCE(json_agg(row_to_json(i.*)), '[]'::json)
      FROM stakeholder_interests i
      WHERE i.stakeholder_id = p_stakeholder_id
    )
  )
  FROM stakeholders s
  WHERE s.id = p_stakeholder_id;
$$ LANGUAGE SQL;

-- Function to get all stakeholders for a project with report stats
CREATE OR REPLACE FUNCTION get_project_stakeholders(p_project_id UUID)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'stakeholder', row_to_json(s.*),
      'report_count', (
        SELECT COUNT(*)
        FROM stakeholder_reports r
        WHERE r.stakeholder_id = s.id
      ),
      'last_report_sent', (
        SELECT MAX(sent_at)
        FROM stakeholder_reports r
        WHERE r.stakeholder_id = s.id
      ),
      'total_opens', (
        SELECT COUNT(*)
        FROM stakeholder_reports r
        WHERE r.stakeholder_id = s.id AND r.opened_at IS NOT NULL
      ),
      'total_clicks', (
        SELECT COALESCE(SUM(click_count), 0)
        FROM stakeholder_reports r
        WHERE r.stakeholder_id = s.id
      )
    )
  ), '[]'::json)
  FROM stakeholders s
  WHERE s.project_id = p_project_id
  ORDER BY s.created_at DESC;
$$ LANGUAGE SQL;

-- Function to track report engagement (opens)
CREATE OR REPLACE FUNCTION track_report_open(p_report_id UUID)
RETURNS VOID AS $$
  UPDATE stakeholder_reports
  SET opened_at = COALESCE(opened_at, NOW())
  WHERE id = p_report_id AND opened_at IS NULL;
$$ LANGUAGE SQL;

-- Function to track report engagement (clicks)
CREATE OR REPLACE FUNCTION track_report_click(p_report_id UUID)
RETURNS VOID AS $$
  UPDATE stakeholder_reports
  SET click_count = click_count + 1
  WHERE id = p_report_id;
$$ LANGUAGE SQL;

-- ============================================================================
-- 10. Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stakeholders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stakeholders_updated_at ON stakeholders;
CREATE TRIGGER trigger_update_stakeholders_updated_at
  BEFORE UPDATE ON stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION update_stakeholders_updated_at();

-- ============================================================================
-- 11. Comments for documentation
-- ============================================================================

COMMENT ON TABLE stakeholders IS 'Stakeholders who receive automated product intelligence reports';
COMMENT ON TABLE stakeholder_reports IS 'History of generated and sent stakeholder reports';
COMMENT ON TABLE stakeholder_interests IS 'Tracks what features/competitors/metrics each stakeholder cares about';

COMMENT ON COLUMN stakeholders.role IS 'Role determines report content: ceo, sales, engineering, marketing, customer_success';
COMMENT ON COLUMN stakeholders.access_token IS 'Secure token for stakeholder portal access (no login required)';
COMMENT ON COLUMN stakeholder_reports.content IS 'Structured report data (JSONB)';
COMMENT ON COLUMN stakeholder_reports.html_content IS 'HTML email content for the report';
COMMENT ON COLUMN stakeholder_interests.interest_type IS 'Type of interest: feature, competitor, customer, metric, theme';

-- ============================================================================
-- Migration complete
-- ============================================================================
