-- Mission Control Dashboard Migration
-- Creates tables for AI-powered daily briefings and dashboard analytics

-- ============================================================================
-- 1. Create daily_briefings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Briefing content (stored as JSONB for flexibility)
  content JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one briefing per project per day
  CONSTRAINT daily_briefings_project_date_unique UNIQUE (project_id, date(created_at))
);

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_daily_briefings_project_id ON daily_briefings(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_created_at ON daily_briefings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_project_date ON daily_briefings(project_id, date(created_at));

-- ============================================================================
-- 3. Enable Row Level Security
-- ============================================================================
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies for daily_briefings
-- ============================================================================
DROP POLICY IF EXISTS "Users can view daily briefings for their projects" ON daily_briefings;
CREATE POLICY "Users can view daily briefings for their projects" ON daily_briefings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = daily_briefings.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert daily briefings for their projects" ON daily_briefings;
CREATE POLICY "Users can insert daily briefings for their projects" ON daily_briefings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = daily_briefings.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update daily briefings for their projects" ON daily_briefings;
CREATE POLICY "Users can update daily briefings for their projects" ON daily_briefings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = daily_briefings.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to daily briefings" ON daily_briefings;
CREATE POLICY "Service role full access to daily briefings" ON daily_briefings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. Create trigger for updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_daily_briefings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_briefings_timestamp_trigger ON daily_briefings;
CREATE TRIGGER update_daily_briefings_timestamp_trigger
  BEFORE UPDATE ON daily_briefings
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_briefings_timestamp();

-- ============================================================================
-- 6. Create helper function to get or create today's briefing
-- ============================================================================
CREATE OR REPLACE FUNCTION get_today_briefing(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  content JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    db.id,
    db.project_id,
    db.content,
    db.created_at,
    db.updated_at
  FROM daily_briefings db
  WHERE db.project_id = p_project_id
    AND date(db.created_at) = CURRENT_DATE
  ORDER BY db.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Create function to get dashboard metrics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_sentiment_data JSONB;
  v_feedback_data JSONB;
  v_roadmap_data JSONB;
  v_competitor_data JSONB;
BEGIN
  -- Sentiment metrics (last 7 days)
  SELECT jsonb_build_object(
    'current_nps', COALESCE(ROUND(AVG(sentiment_score) * 100), 0),
    'total_feedback', COUNT(*),
    'trend', CASE
      WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') >
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')
      THEN 'up'
      ELSE 'down'
    END,
    'change_percent', COALESCE(
      ROUND(
        ((AVG(sentiment_score) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')) -
         (AVG(sentiment_score) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'))) * 100
      , 2), 0
    )
  ) INTO v_sentiment_data
  FROM posts
  WHERE project_id = p_project_id
    AND created_at >= NOW() - INTERVAL '14 days'
    AND sentiment_score IS NOT NULL;

  -- Feedback velocity (issues per week)
  SELECT jsonb_build_object(
    'issues_per_week', COALESCE(COUNT(*) / 1.0, 0),
    'total_this_week', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
    'trend', CASE
      WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') >
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')
      THEN 'up'
      ELSE 'down'
    END
  ) INTO v_feedback_data
  FROM posts
  WHERE project_id = p_project_id
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Roadmap status
  SELECT jsonb_build_object(
    'in_progress', COUNT(*) FILTER (WHERE status = 'in-progress'),
    'planned', COUNT(*) FILTER (WHERE status = 'planned'),
    'completed_this_week', COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= NOW() - INTERVAL '7 days')
  ) INTO v_roadmap_data
  FROM roadmap_items
  WHERE project_id = p_project_id;

  -- Competitor insights (if table exists)
  BEGIN
    SELECT jsonb_build_object(
      'new_insights_count', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
      'high_priority_count', COUNT(*) FILTER (WHERE priority = 'high' AND created_at >= NOW() - INTERVAL '7 days')
    ) INTO v_competitor_data
    FROM competitive_insights
    WHERE project_id = p_project_id
      AND created_at >= NOW() - INTERVAL '7 days';
  EXCEPTION
    WHEN undefined_table THEN
      v_competitor_data := jsonb_build_object('new_insights_count', 0, 'high_priority_count', 0);
  END;

  -- Combine all metrics
  v_result := jsonb_build_object(
    'sentiment', COALESCE(v_sentiment_data, '{}'::jsonb),
    'feedback', COALESCE(v_feedback_data, '{}'::jsonb),
    'roadmap', COALESCE(v_roadmap_data, '{}'::jsonb),
    'competitors', COALESCE(v_competitor_data, '{}'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_today_briefing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_briefing(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO service_role;

-- ============================================================================
-- 9. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE daily_briefings IS 'AI-generated daily briefings for Mission Control dashboard';
COMMENT ON COLUMN daily_briefings.content IS 'JSONB containing briefing_text, sentiment_score, sentiment_trend, critical_alerts, and recommended_actions';
COMMENT ON FUNCTION get_today_briefing(UUID) IS 'Retrieves today''s briefing for a project (if it exists)';
COMMENT ON FUNCTION get_dashboard_metrics(UUID) IS 'Aggregates dashboard metrics for sentiment, feedback velocity, roadmap, and competitors';
