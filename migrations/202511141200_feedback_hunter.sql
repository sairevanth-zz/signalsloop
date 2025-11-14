-- AI Feedback Hunter Database Schema
-- Autonomous feedback discovery and analysis across multiple platforms

-- 1. Create enum types
DO $$ BEGIN
  CREATE TYPE platform_type AS ENUM ('reddit', 'twitter', 'hackernews', 'g2', 'producthunt', 'appstore', 'playstore');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM ('active', 'paused', 'error', 'setup');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_classification AS ENUM ('bug', 'feature_request', 'praise', 'complaint', 'churn_risk', 'question', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE action_priority AS ENUM ('urgent', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE action_status AS ENUM ('pending', 'in_progress', 'completed', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create hunter_configs table
CREATE TABLE IF NOT EXISTS hunter_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  name_variations TEXT[] DEFAULT ARRAY[]::TEXT[],
  competitors TEXT[] DEFAULT ARRAY[]::TEXT[],
  industry TEXT,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  excluded_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  auto_classify BOOLEAN DEFAULT true,
  auto_sentiment_analysis BOOLEAN DEFAULT true,
  auto_theme_detection BOOLEAN DEFAULT true,
  theme_detection_threshold INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id)
);

-- 3. Create platform_integrations table
CREATE TABLE IF NOT EXISTS platform_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform_type platform_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status integration_status DEFAULT 'setup',
  last_scan_at TIMESTAMP WITH TIME ZONE,
  next_scan_at TIMESTAMP WITH TIME ZONE,
  scan_frequency_minutes INTEGER DEFAULT 15,
  total_scans INTEGER DEFAULT 0,
  successful_scans INTEGER DEFAULT 0,
  failed_scans INTEGER DEFAULT 0,
  total_items_found INTEGER DEFAULT 0,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, platform_type)
);

-- 4. Create discovered_feedback table
CREATE TABLE IF NOT EXISTS discovered_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  platform_id TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  author_username TEXT,
  author_profile_url TEXT,
  author_metadata JSONB DEFAULT '{}'::jsonb,

  -- Content
  title TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  content_preview TEXT GENERATED ALWAYS AS (
    LEFT(content, 200)
  ) STORED,

  -- Classification
  classification feedback_classification,
  classification_confidence DECIMAL(3,2) CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
  classification_reason TEXT,
  urgency_score INTEGER CHECK (urgency_score >= 1 AND urgency_score <= 5),
  urgency_reason TEXT,

  -- Sentiment (links to existing sentiment_analysis)
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_category TEXT,
  sentiment_analysis_id UUID REFERENCES sentiment_analysis(id) ON DELETE SET NULL,

  -- Metadata
  engagement_score INTEGER DEFAULT 0,
  engagement_metrics JSONB DEFAULT '{}'::jsonb, -- likes, shares, comments, votes
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  auto_tagged BOOLEAN DEFAULT true,

  -- Processing status
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  theme_analyzed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_content TEXT,
  response_url TEXT,

  -- Tracking
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES discovered_feedback(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(project_id, platform, platform_id)
);

-- 5. Create hunter_logs table
CREATE TABLE IF NOT EXISTS hunter_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  integration_id UUID REFERENCES platform_integrations(id) ON DELETE CASCADE,
  scan_type TEXT DEFAULT 'scheduled', -- scheduled, manual, test

  -- Results
  items_found INTEGER DEFAULT 0,
  items_stored INTEGER DEFAULT 0,
  items_duplicates INTEGER DEFAULT 0,
  duration_ms INTEGER,

  -- Status
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_stack TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create action_recommendations table
CREATE TABLE IF NOT EXISTS action_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feedback_ids UUID[] NOT NULL,

  -- Recommendation details
  issue_summary TEXT NOT NULL,
  issue_category TEXT,
  mention_count INTEGER DEFAULT 0,
  avg_sentiment DECIMAL(3,2),
  sentiment_trend TEXT, -- improving, declining, stable

  -- Impact
  revenue_at_risk_estimate DECIMAL(12,2),
  affected_users_estimate INTEGER,
  business_impact TEXT,

  -- Priority
  priority action_priority DEFAULT 'medium',
  priority_score DECIMAL(5,2),
  priority_reason TEXT,

  -- Actions
  suggested_actions JSONB DEFAULT '[]'::jsonb,
  draft_response TEXT,
  draft_response_tone TEXT DEFAULT 'professional',

  -- Status
  status action_status DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Tracking
  viewed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissal_reason TEXT,

  -- Results
  actual_actions_taken JSONB DEFAULT '[]'::jsonb,
  outcome_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hunter_configs_project_id ON hunter_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_hunter_configs_is_active ON hunter_configs(is_active);

CREATE INDEX IF NOT EXISTS idx_platform_integrations_project_id ON platform_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_status ON platform_integrations(status);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_next_scan ON platform_integrations(next_scan_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_discovered_feedback_project_id ON discovered_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_platform ON discovered_feedback(platform);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_classification ON discovered_feedback(classification);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_urgency ON discovered_feedback(urgency_score);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_discovered_at ON discovered_feedback(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_processed ON discovered_feedback(processed_at);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_theme_analyzed ON discovered_feedback(theme_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_is_duplicate ON discovered_feedback(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_sentiment ON discovered_feedback(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_project_platform ON discovered_feedback(project_id, platform);

CREATE INDEX IF NOT EXISTS idx_hunter_logs_project_id ON hunter_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_hunter_logs_platform ON hunter_logs(platform);
CREATE INDEX IF NOT EXISTS idx_hunter_logs_created_at ON hunter_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hunter_logs_success ON hunter_logs(success);

CREATE INDEX IF NOT EXISTS idx_action_recommendations_project_id ON action_recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_action_recommendations_status ON action_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_action_recommendations_priority ON action_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_action_recommendations_created_at ON action_recommendations(created_at DESC);

-- 8. Enable Row Level Security
ALTER TABLE hunter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_recommendations ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for hunter_configs
DROP POLICY IF EXISTS "Users can view hunter configs for their projects" ON hunter_configs;
CREATE POLICY "Users can view hunter configs for their projects" ON hunter_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = hunter_configs.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert hunter configs for their projects" ON hunter_configs;
CREATE POLICY "Users can insert hunter configs for their projects" ON hunter_configs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = hunter_configs.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update hunter configs for their projects" ON hunter_configs;
CREATE POLICY "Users can update hunter configs for their projects" ON hunter_configs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = hunter_configs.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete hunter configs for their projects" ON hunter_configs;
CREATE POLICY "Users can delete hunter configs for their projects" ON hunter_configs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = hunter_configs.project_id AND projects.owner_id = auth.uid()
    )
  );

-- 10. RLS Policies for platform_integrations
DROP POLICY IF EXISTS "Users can view platform integrations for their projects" ON platform_integrations;
CREATE POLICY "Users can view platform integrations for their projects" ON platform_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = platform_integrations.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert platform integrations for their projects" ON platform_integrations;
CREATE POLICY "Users can insert platform integrations for their projects" ON platform_integrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = platform_integrations.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update platform integrations for their projects" ON platform_integrations;
CREATE POLICY "Users can update platform integrations for their projects" ON platform_integrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = platform_integrations.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete platform integrations for their projects" ON platform_integrations;
CREATE POLICY "Users can delete platform integrations for their projects" ON platform_integrations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = platform_integrations.project_id AND projects.owner_id = auth.uid()
    )
  );

-- 11. RLS Policies for discovered_feedback
DROP POLICY IF EXISTS "Users can view discovered feedback for their projects" ON discovered_feedback;
CREATE POLICY "Users can view discovered feedback for their projects" ON discovered_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = discovered_feedback.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert discovered feedback" ON discovered_feedback;
CREATE POLICY "System can insert discovered feedback" ON discovered_feedback
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update discovered feedback for their projects" ON discovered_feedback;
CREATE POLICY "Users can update discovered feedback for their projects" ON discovered_feedback
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = discovered_feedback.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete discovered feedback for their projects" ON discovered_feedback;
CREATE POLICY "Users can delete discovered feedback for their projects" ON discovered_feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = discovered_feedback.project_id AND projects.owner_id = auth.uid()
    )
  );

-- 12. RLS Policies for hunter_logs
DROP POLICY IF EXISTS "Users can view hunter logs for their projects" ON hunter_logs;
CREATE POLICY "Users can view hunter logs for their projects" ON hunter_logs
  FOR SELECT USING (
    project_id IS NULL OR EXISTS (
      SELECT 1 FROM projects WHERE projects.id = hunter_logs.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert hunter logs" ON hunter_logs;
CREATE POLICY "System can insert hunter logs" ON hunter_logs
  FOR INSERT WITH CHECK (true);

-- 13. RLS Policies for action_recommendations
DROP POLICY IF EXISTS "Users can view action recommendations for their projects" ON action_recommendations;
CREATE POLICY "Users can view action recommendations for their projects" ON action_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = action_recommendations.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert action recommendations" ON action_recommendations;
CREATE POLICY "System can insert action recommendations" ON action_recommendations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update action recommendations for their projects" ON action_recommendations;
CREATE POLICY "Users can update action recommendations for their projects" ON action_recommendations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = action_recommendations.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete action recommendations for their projects" ON action_recommendations;
CREATE POLICY "Users can delete action recommendations for their projects" ON action_recommendations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = action_recommendations.project_id AND projects.owner_id = auth.uid()
    )
  );

-- 14. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_hunter_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_hunter_configs_timestamp ON hunter_configs;
CREATE TRIGGER update_hunter_configs_timestamp
  BEFORE UPDATE ON hunter_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

DROP TRIGGER IF EXISTS update_platform_integrations_timestamp ON platform_integrations;
CREATE TRIGGER update_platform_integrations_timestamp
  BEFORE UPDATE ON platform_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

DROP TRIGGER IF EXISTS update_discovered_feedback_timestamp ON discovered_feedback;
CREATE TRIGGER update_discovered_feedback_timestamp
  BEFORE UPDATE ON discovered_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

DROP TRIGGER IF EXISTS update_action_recommendations_timestamp ON action_recommendations;
CREATE TRIGGER update_action_recommendations_timestamp
  BEFORE UPDATE ON action_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

-- 15. Create view for hunter dashboard stats
CREATE OR REPLACE VIEW hunter_dashboard_stats AS
SELECT
  df.project_id,
  COUNT(DISTINCT df.id) as total_feedback,
  COUNT(DISTINCT df.id) FILTER (WHERE df.discovered_at > NOW() - INTERVAL '24 hours') as feedback_last_24h,
  COUNT(DISTINCT df.id) FILTER (WHERE df.discovered_at > NOW() - INTERVAL '7 days') as feedback_last_7d,
  COUNT(DISTINCT df.platform) as active_platforms,
  AVG(df.sentiment_score) as avg_sentiment,
  COUNT(DISTINCT df.id) FILTER (WHERE df.urgency_score >= 4) as urgent_items,
  COUNT(DISTINCT df.id) FILTER (WHERE df.classification = 'churn_risk') as churn_risks,
  COUNT(DISTINCT df.id) FILTER (WHERE df.classification = 'bug') as bugs,
  COUNT(DISTINCT df.id) FILTER (WHERE df.classification = 'feature_request') as feature_requests,
  COUNT(DISTINCT df.id) FILTER (WHERE df.responded_at IS NOT NULL) as responded_count,
  MAX(df.discovered_at) as last_discovery
FROM discovered_feedback df
WHERE df.is_duplicate = false AND df.is_archived = false
GROUP BY df.project_id;

-- 16. Create view for platform health
CREATE OR REPLACE VIEW platform_health_stats AS
SELECT
  pi.project_id,
  pi.platform_type,
  pi.status,
  pi.last_scan_at,
  pi.next_scan_at,
  pi.total_scans,
  pi.successful_scans,
  pi.failed_scans,
  pi.total_items_found,
  CASE
    WHEN pi.total_scans > 0 THEN ROUND((pi.successful_scans::DECIMAL / pi.total_scans) * 100, 2)
    ELSE 0
  END as success_rate,
  pi.error_count,
  pi.last_error
FROM platform_integrations pi;

-- 17. Create function to get pending theme detection items
CREATE OR REPLACE FUNCTION get_pending_theme_detection_count(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM discovered_feedback
    WHERE project_id = p_project_id
      AND theme_analyzed_at IS NULL
      AND is_duplicate = false
      AND is_archived = false
  );
END;
$$;

-- 18. Create function to trigger theme detection
CREATE OR REPLACE FUNCTION check_theme_detection_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_pending_count INTEGER;
BEGIN
  -- Get theme detection threshold
  SELECT theme_detection_threshold INTO v_threshold
  FROM hunter_configs
  WHERE project_id = NEW.project_id AND is_active = true;

  IF v_threshold IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count pending items
  v_pending_count := get_pending_theme_detection_count(NEW.project_id);

  -- If threshold met, you would trigger theme detection here
  -- This is a placeholder - actual trigger would call your theme detection API
  IF v_pending_count >= v_threshold THEN
    -- Log that threshold was met
    RAISE NOTICE 'Theme detection threshold met for project %: % items pending', NEW.project_id, v_pending_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_theme_detection_on_insert ON discovered_feedback;
CREATE TRIGGER check_theme_detection_on_insert
  AFTER INSERT ON discovered_feedback
  FOR EACH ROW
  EXECUTE FUNCTION check_theme_detection_trigger();

-- 19. Create function to update platform integration stats
CREATE OR REPLACE FUNCTION update_platform_stats(
  p_integration_id UUID,
  p_success BOOLEAN,
  p_items_found INTEGER,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE platform_integrations
  SET
    last_scan_at = NOW(),
    total_scans = total_scans + 1,
    successful_scans = CASE WHEN p_success THEN successful_scans + 1 ELSE successful_scans END,
    failed_scans = CASE WHEN NOT p_success THEN failed_scans + 1 ELSE failed_scans END,
    total_items_found = total_items_found + p_items_found,
    last_error = p_error_message,
    error_count = CASE WHEN NOT p_success THEN error_count + 1 ELSE 0 END,
    status = CASE
      WHEN NOT p_success AND error_count >= 3 THEN 'error'::integration_status
      WHEN p_success THEN 'active'::integration_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_integration_id;
END;
$$;

-- 20. Add comments for documentation
COMMENT ON TABLE hunter_configs IS 'Configuration for AI Feedback Hunter per project';
COMMENT ON TABLE platform_integrations IS 'Platform-specific integration settings and credentials';
COMMENT ON TABLE discovered_feedback IS 'Feedback items discovered from external platforms';
COMMENT ON TABLE hunter_logs IS 'Audit log of all hunter scans and results';
COMMENT ON TABLE action_recommendations IS 'AI-generated action items based on feedback patterns';

COMMENT ON COLUMN discovered_feedback.engagement_score IS 'Calculated score based on likes, shares, comments, etc.';
COMMENT ON COLUMN discovered_feedback.urgency_score IS '1-5 scale where 5 = critical, needs response <2 hours';
COMMENT ON COLUMN action_recommendations.revenue_at_risk_estimate IS 'Estimated revenue at risk in USD if issue not addressed';
