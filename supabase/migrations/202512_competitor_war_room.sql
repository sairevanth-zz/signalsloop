-- Competitor War Room Migration
-- Real-time competitor monitoring with alerts and job posting analysis

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- COMPETITOR ALERTS TABLE - Real-time competitor activity alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS competitor_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_name VARCHAR(255) NOT NULL,
  competitor_id UUID, -- Optional reference, no FK constraint as competitors table may not exist
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL, -- 'feature_launch', 'pricing_change', 'acquisition', 'job_posting', 'review_trend', 'social_mention', 'press_release'
  severity VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source_url TEXT,
  source_type VARCHAR(50), -- 'website', 'linkedin', 'twitter', 'g2', 'news', 'job_board'
  
  -- Impact assessment
  customer_impact_count INTEGER DEFAULT 0, -- How many of your customers are affected
  revenue_at_risk DECIMAL(12,2) DEFAULT 0,
  urgency_score INTEGER DEFAULT 50 CHECK (urgency_score >= 0 AND urgency_score <= 100),
  
  -- AI analysis
  ai_summary TEXT,
  ai_recommended_action TEXT,
  feature_comparison JSONB DEFAULT '{}', -- Your feature vs theirs
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'acknowledged', 'in_progress', 'addressed', 'dismissed'
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  addressed_by UUID REFERENCES auth.users(id),
  addressed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Metadata
  raw_data JSONB DEFAULT '{}',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMPETITOR JOB POSTINGS TABLE - Track competitor hiring trends
-- ============================================================================
CREATE TABLE IF NOT EXISTS competitor_job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_name VARCHAR(255) NOT NULL,
  competitor_id UUID, -- Optional reference, no FK constraint as competitors table may not exist
  
  -- Job details
  job_title VARCHAR(500) NOT NULL,
  department VARCHAR(100), -- 'engineering', 'product', 'sales', 'marketing', 'ai_ml', 'security'
  location VARCHAR(255),
  job_type VARCHAR(50), -- 'full_time', 'contract', 'intern'
  seniority_level VARCHAR(50), -- 'entry', 'mid', 'senior', 'lead', 'director', 'vp', 'c_level'
  
  -- Source
  source_url TEXT,
  source_platform VARCHAR(50), -- 'linkedin', 'indeed', 'greenhouse', 'lever', 'company_website'
  
  -- AI analysis
  strategic_signals TEXT[], -- e.g., ['expanding_ai', 'enterprise_focus', 'mobile_team']
  skills_mentioned TEXT[],
  tech_stack_hints TEXT[],
  ai_interpretation TEXT, -- What this hiring pattern suggests
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to avoid duplicates
  CONSTRAINT unique_job_posting UNIQUE(project_id, competitor_name, job_title, source_url)
);

-- ============================================================================
-- COMPETITOR MONITORING CONFIG TABLE - Monitoring preferences per competitor
-- ============================================================================
CREATE TABLE IF NOT EXISTS competitor_monitoring_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_name VARCHAR(255) NOT NULL,
  competitor_id UUID, -- Optional reference, no FK constraint as competitors table may not exist
  
  -- Monitoring settings
  is_active BOOLEAN DEFAULT true,
  website_url TEXT,
  linkedin_url TEXT,
  twitter_handle VARCHAR(100),
  careers_page_url TEXT,
  changelog_url TEXT,
  
  -- Alert preferences
  alert_on_feature_launch BOOLEAN DEFAULT true,
  alert_on_pricing_change BOOLEAN DEFAULT true,
  alert_on_job_postings BOOLEAN DEFAULT true,
  alert_on_social_mentions BOOLEAN DEFAULT false,
  alert_on_review_trends BOOLEAN DEFAULT true,
  
  -- Notification settings
  slack_channel_id VARCHAR(50),
  email_recipients TEXT[],
  
  -- Metadata
  last_checked_at TIMESTAMP WITH TIME ZONE,
  next_check_at TIMESTAMP WITH TIME ZONE,
  check_frequency_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_competitor_config UNIQUE(project_id, competitor_name)
);

-- ============================================================================
-- AI WEIGHT PREFERENCES TABLE - Customizable AI weights for reasoning
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_weight_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Weight category
  feature_type VARCHAR(50) NOT NULL, -- 'prioritization', 'churn_prediction', 'feature_scoring'
  preset_name VARCHAR(100), -- 'roi_focused', 'customer_first', 'balanced', 'custom'
  
  -- Weight values (0-100)
  weights JSONB NOT NULL DEFAULT '{
    "customer_requests": 30,
    "revenue_impact": 25,
    "strategic_alignment": 20,
    "competitive_pressure": 15,
    "technical_effort": 10
  }',
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One default per project per feature type
  CONSTRAINT unique_default_weights UNIQUE(project_id, feature_type, is_default) 
    DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_project ON competitor_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_status ON competitor_alerts(status);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_severity ON competitor_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_detected ON competitor_alerts(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_type ON competitor_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_job_postings_project ON competitor_job_postings(project_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_competitor ON competitor_job_postings(competitor_name);
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON competitor_job_postings(department);
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON competitor_job_postings(is_active);

CREATE INDEX IF NOT EXISTS idx_monitoring_config_project ON competitor_monitoring_config(project_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_config_active ON competitor_monitoring_config(is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_config_next_check ON competitor_monitoring_config(next_check_at);

CREATE INDEX IF NOT EXISTS idx_weight_preferences_project ON ai_weight_preferences(project_id);
CREATE INDEX IF NOT EXISTS idx_weight_preferences_user ON ai_weight_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_preferences_type ON ai_weight_preferences(feature_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE competitor_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_monitoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_weight_preferences ENABLE ROW LEVEL SECURITY;

-- Competitor alerts policies
CREATE POLICY "Users can view alerts for their projects" ON competitor_alerts
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update alerts for their projects" ON competitor_alerts
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to alerts" ON competitor_alerts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Job postings policies
CREATE POLICY "Users can view job postings for their projects" ON competitor_job_postings
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to job postings" ON competitor_job_postings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Monitoring config policies
CREATE POLICY "Users can manage monitoring config for their projects" ON competitor_monitoring_config
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Weight preferences policies
CREATE POLICY "Users can manage their own weight preferences" ON ai_weight_preferences
  FOR ALL USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to weight preferences" ON ai_weight_preferences
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get war room summary for a project
CREATE OR REPLACE FUNCTION get_war_room_summary(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_alerts', (SELECT COUNT(*) FROM competitor_alerts WHERE project_id = p_project_id),
    'new_alerts', (SELECT COUNT(*) FROM competitor_alerts WHERE project_id = p_project_id AND status = 'new'),
    'critical_alerts', (SELECT COUNT(*) FROM competitor_alerts WHERE project_id = p_project_id AND severity = 'critical' AND status NOT IN ('addressed', 'dismissed')),
    'high_alerts', (SELECT COUNT(*) FROM competitor_alerts WHERE project_id = p_project_id AND severity = 'high' AND status NOT IN ('addressed', 'dismissed')),
    'total_job_postings', (SELECT COUNT(*) FROM competitor_job_postings WHERE project_id = p_project_id AND is_active = true),
    'ai_ml_postings', (SELECT COUNT(*) FROM competitor_job_postings WHERE project_id = p_project_id AND is_active = true AND department = 'ai_ml'),
    'engineering_postings', (SELECT COUNT(*) FROM competitor_job_postings WHERE project_id = p_project_id AND is_active = true AND department = 'engineering'),
    'monitored_competitors', (SELECT COUNT(*) FROM competitor_monitoring_config WHERE project_id = p_project_id AND is_active = true),
    'revenue_at_risk', (SELECT COALESCE(SUM(revenue_at_risk), 0) FROM competitor_alerts WHERE project_id = p_project_id AND status NOT IN ('addressed', 'dismissed')),
    'last_alert_at', (SELECT MAX(detected_at) FROM competitor_alerts WHERE project_id = p_project_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get hiring trends for competitors
CREATE OR REPLACE FUNCTION get_competitor_hiring_trends(p_project_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH department_counts AS (
    SELECT 
      competitor_name,
      department,
      COUNT(*) as count
    FROM competitor_job_postings
    WHERE project_id = p_project_id 
      AND is_active = true
      AND first_seen_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY competitor_name, department
  ),
  competitor_totals AS (
    SELECT 
      competitor_name,
      COUNT(*) as total_jobs,
      jsonb_object_agg(COALESCE(department, 'other'), count) as by_department
    FROM department_counts
    GROUP BY competitor_name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'competitor', competitor_name,
      'total_jobs', total_jobs,
      'departments', by_department
    )
  ) INTO result
  FROM competitor_totals
  ORDER BY total_jobs DESC;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_war_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitor_alerts_timestamp
  BEFORE UPDATE ON competitor_alerts
  FOR EACH ROW EXECUTE FUNCTION update_war_room_timestamp();

CREATE TRIGGER update_job_postings_timestamp
  BEFORE UPDATE ON competitor_job_postings
  FOR EACH ROW EXECUTE FUNCTION update_war_room_timestamp();

CREATE TRIGGER update_monitoring_config_timestamp
  BEFORE UPDATE ON competitor_monitoring_config
  FOR EACH ROW EXECUTE FUNCTION update_war_room_timestamp();

CREATE TRIGGER update_weight_preferences_timestamp
  BEFORE UPDATE ON ai_weight_preferences
  FOR EACH ROW EXECUTE FUNCTION update_war_room_timestamp();
