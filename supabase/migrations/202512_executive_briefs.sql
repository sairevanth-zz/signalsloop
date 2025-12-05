-- Executive Briefs Migration
-- Tables for storing and scheduling executive briefings

-- ============================================================================
-- BRIEF TEMPLATES TABLE - Customizable brief templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS brief_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template configuration
  include_sections JSONB DEFAULT '{}',
  -- Example: {"sentiment": true, "themes": true, "competitors": true, "revenue_at_risk": true}
  
  -- Formatting
  format VARCHAR(20) DEFAULT 'markdown', -- 'markdown', 'pdf', 'notion'
  tone VARCHAR(20) DEFAULT 'executive', -- 'executive', 'detailed', 'casual'
  
  -- Default recipients
  default_recipients JSONB DEFAULT '[]',
  -- Example: [{"email": "ceo@company.com", "name": "John CEO"}]
  
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_brief_templates_project ON brief_templates(project_id);

-- ============================================================================
-- EXECUTIVE BRIEFS TABLE - Generated briefs
-- ============================================================================
CREATE TABLE IF NOT EXISTS executive_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES brief_templates(id) ON DELETE SET NULL,
  
  -- Brief metadata
  title VARCHAR(500) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  brief_type VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly', 'custom'
  
  -- Generated content
  content_markdown TEXT,
  content_html TEXT,
  summary TEXT, -- One paragraph executive summary
  
  -- Structured data for rendering
  data JSONB DEFAULT '{}',
  -- Contains all the metrics, themes, alerts, etc.
  
  -- Key metrics snapshot
  metrics JSONB DEFAULT '{}',
  -- Example: {"sentiment_score": 72, "feedback_count": 156, "themes_count": 8}
  
  -- Highlights
  top_insights JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  revenue_at_risk DECIMAL(12,2),
  accounts_at_risk INTEGER DEFAULT 0,
  
  -- Competitive intelligence
  competitor_moves JSONB DEFAULT '[]',
  
  -- Files
  pdf_url TEXT,
  notion_page_id TEXT,
  
  -- Generation status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'generating', 'ready', 'sent', 'failed'
  generation_started_at TIMESTAMP WITH TIME ZONE,
  generation_completed_at TIMESTAMP WITH TIME ZONE,
  generation_error TEXT,
  
  -- Distribution
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to JSONB DEFAULT '[]',
  sent_via VARCHAR(50), -- 'email', 'slack', 'both'
  
  -- Engagement tracking
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_executive_briefs_project ON executive_briefs(project_id);
CREATE INDEX IF NOT EXISTS idx_executive_briefs_period ON executive_briefs(project_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_executive_briefs_status ON executive_briefs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_executive_briefs_type ON executive_briefs(project_id, brief_type);

-- ============================================================================
-- BRIEF SCHEDULES TABLE - Automated brief generation schedules
-- ============================================================================
CREATE TABLE IF NOT EXISTS brief_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES brief_templates(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  
  -- Schedule configuration
  frequency VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  day_of_week INTEGER, -- 0-6 for weekly (0 = Sunday)
  day_of_month INTEGER, -- 1-31 for monthly
  time_of_day TIME DEFAULT '09:00:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Recipients
  recipients JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"email": "team@company.com", "slack_channel": "#product-updates"}]
  
  -- Delivery method
  delivery_method VARCHAR(50) DEFAULT 'email', -- 'email', 'slack', 'both'
  slack_channel VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_brief_id UUID REFERENCES executive_briefs(id),
  next_run_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_brief_schedules_project ON brief_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_brief_schedules_next_run ON brief_schedules(is_active, next_run_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE brief_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_schedules ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY brief_templates_select ON brief_templates
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY brief_templates_all ON brief_templates
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Briefs policies
CREATE POLICY executive_briefs_select ON executive_briefs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY executive_briefs_all ON executive_briefs
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Schedules policies
CREATE POLICY brief_schedules_select ON brief_schedules
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY brief_schedules_all ON brief_schedules
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Grant service role access
GRANT ALL ON brief_templates TO service_role;
GRANT ALL ON executive_briefs TO service_role;
GRANT ALL ON brief_schedules TO service_role;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_brief_run(
  p_frequency VARCHAR,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_time_of_day TIME,
  p_timezone VARCHAR
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE;
  v_next TIMESTAMP WITH TIME ZONE;
BEGIN
  v_now := NOW() AT TIME ZONE p_timezone;
  
  CASE p_frequency
    WHEN 'daily' THEN
      -- Next occurrence is today at specified time, or tomorrow if past
      v_next := DATE_TRUNC('day', v_now) + p_time_of_day;
      IF v_next <= v_now THEN
        v_next := v_next + INTERVAL '1 day';
      END IF;
      
    WHEN 'weekly' THEN
      -- Next occurrence is this week's day_of_week, or next week if past
      v_next := DATE_TRUNC('week', v_now) + (p_day_of_week || ' days')::INTERVAL + p_time_of_day;
      IF v_next <= v_now THEN
        v_next := v_next + INTERVAL '1 week';
      END IF;
      
    WHEN 'monthly' THEN
      -- Next occurrence is this month's day, or next month if past
      v_next := DATE_TRUNC('month', v_now) + ((p_day_of_month - 1) || ' days')::INTERVAL + p_time_of_day;
      IF v_next <= v_now THEN
        v_next := v_next + INTERVAL '1 month';
      END IF;
  END CASE;
  
  RETURN v_next AT TIME ZONE p_timezone;
END;
$$ LANGUAGE plpgsql;
