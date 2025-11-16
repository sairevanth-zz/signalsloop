-- Competitive Intelligence Dashboard Migration
-- Transforms feedback into strategic competitive insights
-- Extends AI Feedback Hunter with competitor analysis capabilities

-- ============================================================================
-- 1. Create enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE competitor_status AS ENUM ('active', 'monitoring', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE mention_type AS ENUM ('comparison', 'switch_to', 'switch_from', 'feature_comparison', 'general');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE feature_gap_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE feature_gap_status AS ENUM ('identified', 'planned', 'building', 'shipped', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE competitive_event_type AS ENUM ('feature_launch', 'pricing_change', 'funding', 'negative_press', 'acquisition', 'layoffs', 'executive_change', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE impact_level AS ENUM ('high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE recommendation_type AS ENUM ('attack', 'defend', 'react', 'ignore');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE recommendation_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. Create competitors table
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Competitor identification
  name TEXT NOT NULL,
  category TEXT, -- e.g., "Direct Competitor", "Adjacent Product", "Alternative Solution"
  website TEXT,
  description TEXT,

  -- Detection metadata
  auto_detected BOOLEAN DEFAULT false, -- AI discovered vs manually added
  status competitor_status DEFAULT 'monitoring',

  -- Metrics
  total_mentions INTEGER DEFAULT 0,
  first_mentioned_at TIMESTAMP WITH TIME ZONE,
  last_mentioned_at TIMESTAMP WITH TIME ZONE,

  -- Sentiment tracking
  avg_sentiment_vs_you DECIMAL(3,2) DEFAULT 0 CHECK (avg_sentiment_vs_you >= -1 AND avg_sentiment_vs_you <= 1),
  avg_sentiment_about_them DECIMAL(3,2) DEFAULT 0 CHECK (avg_sentiment_about_them >= -1 AND avg_sentiment_about_them <= 1),

  -- Win/Loss tracking
  switches_to_you INTEGER DEFAULT 0, -- Users who switched from competitor to you
  switches_from_you INTEGER DEFAULT 0, -- Users who switched from you to competitor

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Store additional data like logo, social links, etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(project_id, name)
);

-- ============================================================================
-- 3. Create competitive_mentions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitive_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES discovered_feedback(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  -- Mention details
  mention_type mention_type NOT NULL,
  context_snippet TEXT, -- The sentence where competitor was mentioned

  -- Sentiment analysis
  sentiment_vs_you DECIMAL(3,2) CHECK (sentiment_vs_you >= -1 AND sentiment_vs_you <= 1),
  sentiment_about_competitor DECIMAL(3,2) CHECK (sentiment_about_competitor >= -1 AND sentiment_about_competitor <= 1),

  -- AI extraction metadata
  key_points TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of insights extracted
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(feedback_id, competitor_id)
);

-- ============================================================================
-- 4. Create feature_gaps table
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_gaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Feature identification
  feature_name TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Metrics
  mention_count INTEGER DEFAULT 0,
  competitor_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Which competitors have this feature
  avg_sentiment DECIMAL(3,2) DEFAULT 0,
  urgency_score DECIMAL(5,2) DEFAULT 0, -- AI-calculated urgency

  -- Business impact
  estimated_revenue_impact TEXT, -- Text description of revenue impact
  priority feature_gap_priority DEFAULT 'medium',
  status feature_gap_status DEFAULT 'identified',

  -- Evidence
  user_quotes TEXT[] DEFAULT ARRAY[]::TEXT[], -- Sample quotes from users
  feedback_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Related feedback items

  -- Tracking
  first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Action tracking
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  roadmap_item_id UUID, -- Link to roadmap if integrated
  shipped_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(project_id, feature_name)
);

-- ============================================================================
-- 5. Create competitive_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitive_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  -- Event details
  event_type competitive_event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,

  -- Impact assessment
  mention_count INTEGER DEFAULT 0, -- How many feedback mentions reference this
  avg_sentiment DECIMAL(3,2),
  impact_level impact_level DEFAULT 'medium',

  -- Related data
  feedback_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Feedback that triggered this event detection
  metadata JSONB DEFAULT '{}'::jsonb, -- Links, screenshots, etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. Create strategic_recommendations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategic_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Recommendation details
  recommendation_type recommendation_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT NOT NULL, -- Why this recommendation matters (data-driven)

  -- Impact estimates
  estimated_impact TEXT, -- Business impact (revenue, churn, etc)
  estimated_cost TEXT, -- Rough cost (time/resources)
  roi_estimate TEXT, -- Expected return vs cost

  -- Priority & status
  priority feature_gap_priority DEFAULT 'medium',
  status recommendation_status DEFAULT 'pending',

  -- Related entities
  related_competitor_ids UUID[] DEFAULT ARRAY[]::UUID[],
  related_feature_gap_ids UUID[] DEFAULT ARRAY[]::UUID[],
  related_feedback_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Tracking
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissal_reason TEXT,

  -- Outcome
  outcome_notes TEXT,
  actual_impact TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. Create indexes for performance
-- ============================================================================

-- Competitors indexes
CREATE INDEX IF NOT EXISTS idx_competitors_project_id ON competitors(project_id);
CREATE INDEX IF NOT EXISTS idx_competitors_status ON competitors(status);
CREATE INDEX IF NOT EXISTS idx_competitors_auto_detected ON competitors(auto_detected);
CREATE INDEX IF NOT EXISTS idx_competitors_total_mentions ON competitors(total_mentions DESC);
CREATE INDEX IF NOT EXISTS idx_competitors_last_mentioned ON competitors(last_mentioned_at DESC);

-- Competitive mentions indexes
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_feedback_id ON competitive_mentions(feedback_id);
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_competitor_id ON competitive_mentions(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_type ON competitive_mentions(mention_type);
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_extracted_at ON competitive_mentions(extracted_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_sentiment_vs_you ON competitive_mentions(sentiment_vs_you);

-- Feature gaps indexes
CREATE INDEX IF NOT EXISTS idx_feature_gaps_project_id ON feature_gaps(project_id);
CREATE INDEX IF NOT EXISTS idx_feature_gaps_priority ON feature_gaps(priority);
CREATE INDEX IF NOT EXISTS idx_feature_gaps_status ON feature_gaps(status);
CREATE INDEX IF NOT EXISTS idx_feature_gaps_mention_count ON feature_gaps(mention_count DESC);
CREATE INDEX IF NOT EXISTS idx_feature_gaps_urgency_score ON feature_gaps(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_feature_gaps_first_detected ON feature_gaps(first_detected_at DESC);

-- Competitive events indexes
CREATE INDEX IF NOT EXISTS idx_competitive_events_competitor_id ON competitive_events(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitive_events_type ON competitive_events(event_type);
CREATE INDEX IF NOT EXISTS idx_competitive_events_date ON competitive_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_competitive_events_impact ON competitive_events(impact_level);

-- Strategic recommendations indexes
CREATE INDEX IF NOT EXISTS idx_strategic_recommendations_project_id ON strategic_recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_strategic_recommendations_type ON strategic_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_strategic_recommendations_priority ON strategic_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_strategic_recommendations_status ON strategic_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_strategic_recommendations_created_at ON strategic_recommendations(created_at DESC);

-- ============================================================================
-- 8. Enable Row Level Security
-- ============================================================================

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_recommendations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. RLS Policies for competitors
-- ============================================================================

DROP POLICY IF EXISTS "Users can view competitors for their projects" ON competitors;
CREATE POLICY "Users can view competitors for their projects" ON competitors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = competitors.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert competitors for their projects" ON competitors;
CREATE POLICY "Users can insert competitors for their projects" ON competitors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = competitors.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update competitors for their projects" ON competitors;
CREATE POLICY "Users can update competitors for their projects" ON competitors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = competitors.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete competitors for their projects" ON competitors;
CREATE POLICY "Users can delete competitors for their projects" ON competitors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = competitors.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert competitors" ON competitors;
CREATE POLICY "System can insert competitors" ON competitors
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update competitors" ON competitors;
CREATE POLICY "System can update competitors" ON competitors
  FOR UPDATE USING (true);

-- ============================================================================
-- 10. RLS Policies for competitive_mentions
-- ============================================================================

DROP POLICY IF EXISTS "Users can view competitive mentions for their projects" ON competitive_mentions;
CREATE POLICY "Users can view competitive mentions for their projects" ON competitive_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discovered_feedback df
      JOIN projects p ON p.id = df.project_id
      WHERE df.id = competitive_mentions.feedback_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert competitive mentions" ON competitive_mentions;
CREATE POLICY "System can insert competitive mentions" ON competitive_mentions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update competitive mentions" ON competitive_mentions;
CREATE POLICY "System can update competitive mentions" ON competitive_mentions
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete competitive mentions for their projects" ON competitive_mentions;
CREATE POLICY "Users can delete competitive mentions for their projects" ON competitive_mentions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM discovered_feedback df
      JOIN projects p ON p.id = df.project_id
      WHERE df.id = competitive_mentions.feedback_id AND p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. RLS Policies for feature_gaps
-- ============================================================================

DROP POLICY IF EXISTS "Users can view feature gaps for their projects" ON feature_gaps;
CREATE POLICY "Users can view feature gaps for their projects" ON feature_gaps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = feature_gaps.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert feature gaps" ON feature_gaps;
CREATE POLICY "System can insert feature gaps" ON feature_gaps
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update feature gaps for their projects" ON feature_gaps;
CREATE POLICY "Users can update feature gaps for their projects" ON feature_gaps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = feature_gaps.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete feature gaps for their projects" ON feature_gaps;
CREATE POLICY "Users can delete feature gaps for their projects" ON feature_gaps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = feature_gaps.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 12. RLS Policies for competitive_events
-- ============================================================================

DROP POLICY IF EXISTS "Users can view competitive events for their projects" ON competitive_events;
CREATE POLICY "Users can view competitive events for their projects" ON competitive_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM competitors c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = competitive_events.competitor_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert competitive events" ON competitive_events;
CREATE POLICY "System can insert competitive events" ON competitive_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update competitive events for their projects" ON competitive_events;
CREATE POLICY "Users can update competitive events for their projects" ON competitive_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM competitors c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = competitive_events.competitor_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete competitive events for their projects" ON competitive_events;
CREATE POLICY "Users can delete competitive events for their projects" ON competitive_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM competitors c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = competitive_events.competitor_id AND p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 13. RLS Policies for strategic_recommendations
-- ============================================================================

DROP POLICY IF EXISTS "Users can view strategic recommendations for their projects" ON strategic_recommendations;
CREATE POLICY "Users can view strategic recommendations for their projects" ON strategic_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = strategic_recommendations.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert strategic recommendations" ON strategic_recommendations;
CREATE POLICY "System can insert strategic recommendations" ON strategic_recommendations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update strategic recommendations for their projects" ON strategic_recommendations;
CREATE POLICY "Users can update strategic recommendations for their projects" ON strategic_recommendations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = strategic_recommendations.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete strategic recommendations for their projects" ON strategic_recommendations;
CREATE POLICY "Users can delete strategic recommendations for their projects" ON strategic_recommendations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = strategic_recommendations.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 14. Create triggers for updated_at timestamps
-- ============================================================================

DROP TRIGGER IF EXISTS update_competitors_timestamp ON competitors;
CREATE TRIGGER update_competitors_timestamp
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

DROP TRIGGER IF EXISTS update_feature_gaps_timestamp ON feature_gaps;
CREATE TRIGGER update_feature_gaps_timestamp
  BEFORE UPDATE ON feature_gaps
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

DROP TRIGGER IF EXISTS update_competitive_events_timestamp ON competitive_events;
CREATE TRIGGER update_competitive_events_timestamp
  BEFORE UPDATE ON competitive_events
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

DROP TRIGGER IF EXISTS update_strategic_recommendations_timestamp ON strategic_recommendations;
CREATE TRIGGER update_strategic_recommendations_timestamp
  BEFORE UPDATE ON strategic_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

-- ============================================================================
-- 15. Create helper functions
-- ============================================================================

-- Function to increment competitor mention count
CREATE OR REPLACE FUNCTION increment_competitor_mentions(p_competitor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE competitors
  SET
    total_mentions = total_mentions + 1,
    last_mentioned_at = NOW(),
    first_mentioned_at = COALESCE(first_mentioned_at, NOW()),
    updated_at = NOW()
  WHERE id = p_competitor_id;
END;
$$;

-- Function to update competitor sentiment averages
CREATE OR REPLACE FUNCTION update_competitor_sentiment(p_competitor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_vs_you DECIMAL(3,2);
  v_avg_about_them DECIMAL(3,2);
BEGIN
  SELECT
    COALESCE(ROUND(AVG(sentiment_vs_you)::NUMERIC, 2), 0),
    COALESCE(ROUND(AVG(sentiment_about_competitor)::NUMERIC, 2), 0)
  INTO v_avg_vs_you, v_avg_about_them
  FROM competitive_mentions
  WHERE competitor_id = p_competitor_id;

  UPDATE competitors
  SET
    avg_sentiment_vs_you = v_avg_vs_you,
    avg_sentiment_about_them = v_avg_about_them,
    updated_at = NOW()
  WHERE id = p_competitor_id;
END;
$$;

-- Function to update switch counts
CREATE OR REPLACE FUNCTION update_competitor_switches(p_competitor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE competitors
  SET
    switches_to_you = (
      SELECT COUNT(*)::INTEGER
      FROM competitive_mentions
      WHERE competitor_id = p_competitor_id AND mention_type = 'switch_from'
    ),
    switches_from_you = (
      SELECT COUNT(*)::INTEGER
      FROM competitive_mentions
      WHERE competitor_id = p_competitor_id AND mention_type = 'switch_to'
    ),
    updated_at = NOW()
  WHERE id = p_competitor_id;
END;
$$;

-- Trigger to update competitor stats when mentions change
CREATE OR REPLACE FUNCTION trigger_update_competitor_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_competitor_sentiment(NEW.competitor_id);
    PERFORM update_competitor_switches(NEW.competitor_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM update_competitor_sentiment(OLD.competitor_id);
    PERFORM update_competitor_switches(OLD.competitor_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_competitor_stats_trigger ON competitive_mentions;
CREATE TRIGGER update_competitor_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON competitive_mentions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_competitor_stats();

-- Function to get competitive overview stats
CREATE OR REPLACE FUNCTION get_competitive_overview(p_project_id UUID)
RETURNS TABLE (
  total_competitors BIGINT,
  active_competitors BIGINT,
  total_mentions BIGINT,
  mentions_last_7d BIGINT,
  mentions_last_30d BIGINT,
  avg_sentiment_vs_competitors DECIMAL,
  total_switches_to_you INTEGER,
  total_switches_from_you INTEGER,
  net_switches INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT c.id) as total_competitors,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_competitors,
    SUM(c.total_mentions)::BIGINT as total_mentions,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.created_at >= NOW() - INTERVAL '7 days')::BIGINT as mentions_last_7d,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.created_at >= NOW() - INTERVAL '30 days')::BIGINT as mentions_last_30d,
    ROUND(AVG(cm.sentiment_vs_you)::NUMERIC, 2) as avg_sentiment_vs_competitors,
    SUM(c.switches_to_you)::INTEGER as total_switches_to_you,
    SUM(c.switches_from_you)::INTEGER as total_switches_from_you,
    (SUM(c.switches_to_you) - SUM(c.switches_from_you))::INTEGER as net_switches
  FROM competitors c
  LEFT JOIN competitive_mentions cm ON c.id = cm.competitor_id
  WHERE c.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get competitor profile
CREATE OR REPLACE FUNCTION get_competitor_profile(p_competitor_id UUID)
RETURNS TABLE (
  competitor_data JSONB,
  mention_breakdown JSONB,
  sentiment_trend JSONB,
  top_mentions JSONB
) AS $$
DECLARE
  v_competitor JSONB;
  v_mention_breakdown JSONB;
  v_sentiment_trend JSONB;
  v_top_mentions JSONB;
BEGIN
  -- Get competitor data
  SELECT row_to_json(c)::JSONB INTO v_competitor
  FROM competitors c
  WHERE c.id = p_competitor_id;

  -- Get mention type breakdown
  SELECT jsonb_agg(jsonb_build_object(
    'mention_type', mention_type,
    'count', count
  )) INTO v_mention_breakdown
  FROM (
    SELECT mention_type, COUNT(*) as count
    FROM competitive_mentions
    WHERE competitor_id = p_competitor_id
    GROUP BY mention_type
    ORDER BY count DESC
  ) breakdown;

  -- Get sentiment trend (last 30 days)
  SELECT jsonb_agg(jsonb_build_object(
    'date', date,
    'avg_sentiment_vs_you', avg_sentiment,
    'mention_count', mention_count
  ) ORDER BY date) INTO v_sentiment_trend
  FROM (
    SELECT
      DATE(cm.created_at) as date,
      ROUND(AVG(cm.sentiment_vs_you)::NUMERIC, 2) as avg_sentiment,
      COUNT(*) as mention_count
    FROM competitive_mentions cm
    WHERE cm.competitor_id = p_competitor_id
      AND cm.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(cm.created_at)
    ORDER BY date DESC
  ) trend;

  -- Get top mentions with context
  SELECT jsonb_agg(jsonb_build_object(
    'id', cm.id,
    'feedback_id', cm.feedback_id,
    'mention_type', cm.mention_type,
    'context_snippet', cm.context_snippet,
    'sentiment_vs_you', cm.sentiment_vs_you,
    'key_points', cm.key_points,
    'created_at', cm.created_at
  ) ORDER BY cm.created_at DESC) INTO v_top_mentions
  FROM competitive_mentions cm
  WHERE cm.competitor_id = p_competitor_id
  ORDER BY cm.created_at DESC
  LIMIT 20;

  RETURN QUERY SELECT v_competitor, v_mention_breakdown, v_sentiment_trend, v_top_mentions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect competitive events (high mention spike)
CREATE OR REPLACE FUNCTION detect_competitive_event_spike(
  p_competitor_id UUID,
  p_days_back INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_recent_count INTEGER;
  v_avg_daily_count DECIMAL;
  v_threshold DECIMAL;
BEGIN
  -- Count mentions in last N days
  SELECT COUNT(*) INTO v_recent_count
  FROM competitive_mentions
  WHERE competitor_id = p_competitor_id
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;

  -- Get average daily count over previous 30 days
  SELECT COALESCE(AVG(daily_count), 0) INTO v_avg_daily_count
  FROM (
    SELECT DATE(created_at), COUNT(*) as daily_count
    FROM competitive_mentions
    WHERE competitor_id = p_competitor_id
      AND created_at >= NOW() - INTERVAL '30 days'
      AND created_at < NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY DATE(created_at)
  ) daily_counts;

  -- Spike if recent count is 3x average
  v_threshold := v_avg_daily_count * 3 * p_days_back;

  RETURN v_recent_count > v_threshold AND v_recent_count > 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 16. Create views
-- ============================================================================

-- View for competitive dashboard overview
CREATE OR REPLACE VIEW competitive_dashboard_overview AS
SELECT
  c.project_id,
  c.id as competitor_id,
  c.name as competitor_name,
  c.category,
  c.status,
  c.total_mentions,
  c.avg_sentiment_vs_you,
  c.avg_sentiment_about_them,
  c.switches_to_you,
  c.switches_from_you,
  (c.switches_to_you - c.switches_from_you) as net_switches,
  c.last_mentioned_at,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.created_at >= NOW() - INTERVAL '7 days') as mentions_last_7d,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.created_at >= NOW() - INTERVAL '30 days') as mentions_last_30d,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.mention_type = 'comparison') as comparison_count,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.mention_type = 'feature_comparison') as feature_comparison_count
FROM competitors c
LEFT JOIN competitive_mentions cm ON c.id = cm.competitor_id
WHERE c.status IN ('active', 'monitoring')
GROUP BY c.id;

-- View for feature gaps with competitor details
CREATE OR REPLACE VIEW feature_gaps_with_competitors AS
SELECT
  fg.*,
  ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.id = ANY(fg.competitor_ids)) as competitor_names,
  (SELECT COUNT(DISTINCT x) FROM unnest(fg.feedback_ids) AS x) as actual_feedback_count
FROM feature_gaps fg
LEFT JOIN competitors c ON c.id = ANY(fg.competitor_ids)
WHERE fg.status != 'dismissed'
GROUP BY fg.id;

-- View for recent competitive activity
CREATE OR REPLACE VIEW recent_competitive_activity AS
SELECT
  'mention' as activity_type,
  cm.id,
  c.project_id,
  c.name as competitor_name,
  cm.mention_type::TEXT as activity_subtype,
  cm.context_snippet as description,
  cm.sentiment_vs_you as sentiment,
  cm.created_at
FROM competitive_mentions cm
JOIN competitors c ON c.id = cm.competitor_id
WHERE cm.created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  'event' as activity_type,
  ce.id,
  c.project_id,
  c.name as competitor_name,
  ce.event_type::TEXT as activity_subtype,
  ce.title as description,
  ce.avg_sentiment as sentiment,
  ce.created_at
FROM competitive_events ce
JOIN competitors c ON c.id = ce.competitor_id
WHERE ce.created_at >= NOW() - INTERVAL '30 days'

ORDER BY created_at DESC;

-- Grant access to views
GRANT SELECT ON competitive_dashboard_overview TO authenticated;
GRANT SELECT ON competitive_dashboard_overview TO service_role;
GRANT SELECT ON feature_gaps_with_competitors TO authenticated;
GRANT SELECT ON feature_gaps_with_competitors TO service_role;
GRANT SELECT ON recent_competitive_activity TO authenticated;
GRANT SELECT ON recent_competitive_activity TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_competitor_mentions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_competitor_mentions(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_competitor_sentiment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_competitor_sentiment(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_competitor_switches(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_competitor_switches(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_competitive_overview(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_competitive_overview(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_competitor_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_competitor_profile(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION detect_competitive_event_spike(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_competitive_event_spike(UUID, INTEGER) TO service_role;

-- ============================================================================
-- 17. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE competitors IS 'Tracks competitors mentioned in discovered feedback';
COMMENT ON TABLE competitive_mentions IS 'Individual competitor mentions extracted from feedback with sentiment';
COMMENT ON TABLE feature_gaps IS 'Features that competitors have which users are requesting';
COMMENT ON TABLE competitive_events IS 'Significant competitive events detected from feedback patterns';
COMMENT ON TABLE strategic_recommendations IS 'AI-generated strategic recommendations based on competitive intelligence';

COMMENT ON COLUMN competitors.auto_detected IS 'True if AI discovered this competitor, false if manually added';
COMMENT ON COLUMN competitors.avg_sentiment_vs_you IS 'Average sentiment when comparing you to this competitor (-1 to 1)';
COMMENT ON COLUMN competitors.switches_to_you IS 'Count of users who switched FROM this competitor TO you';
COMMENT ON COLUMN competitors.switches_from_you IS 'Count of users who switched FROM you TO this competitor';

COMMENT ON COLUMN competitive_mentions.mention_type IS 'Type of competitive mention: comparison, switch_to, switch_from, feature_comparison, general';
COMMENT ON COLUMN competitive_mentions.sentiment_vs_you IS 'How user compares you to competitor (-1 favors them, +1 favors you)';
COMMENT ON COLUMN competitive_mentions.sentiment_about_competitor IS 'Users general sentiment about the competitor';

COMMENT ON COLUMN feature_gaps.urgency_score IS 'AI-calculated urgency based on mention frequency, sentiment, and business impact';
COMMENT ON COLUMN feature_gaps.estimated_revenue_impact IS 'Estimated revenue at risk or opportunity if feature built/not built';

COMMENT ON COLUMN strategic_recommendations.recommendation_type IS 'ATTACK: exploit weakness, DEFEND: protect against strength, REACT: respond to shift, IGNORE: not worth it';
COMMENT ON COLUMN strategic_recommendations.roi_estimate IS 'Expected return on investment for implementing this recommendation';
