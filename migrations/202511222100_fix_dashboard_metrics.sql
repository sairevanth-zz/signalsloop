-- Fix get_dashboard_metrics to use sentiment_analysis table correctly
-- The function was trying to query posts.sentiment_score which doesn't exist
-- sentiment_score is in the sentiment_analysis table

DROP FUNCTION IF EXISTS get_dashboard_metrics(UUID);

CREATE FUNCTION get_dashboard_metrics(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_sentiment_data JSONB;
  v_feedback_data JSONB;
  v_roadmap_data JSONB;
  v_competitor_data JSONB;
BEGIN
  -- Sentiment metrics (last 7 days)
  -- JOIN with sentiment_analysis table to get sentiment scores
  SELECT jsonb_build_object(
    'current_nps', COALESCE(ROUND(AVG(sa.sentiment_score) * 100), 0),
    'total_feedback', COUNT(DISTINCT p.id),
    'trend', CASE
      WHEN COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days') >
           COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= NOW() - INTERVAL '14 days' AND p.created_at < NOW() - INTERVAL '7 days')
      THEN 'up'
      ELSE 'down'
    END,
    'change_percent', COALESCE(
      ROUND(
        ((AVG(sa.sentiment_score) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days')) -
         (AVG(sa.sentiment_score) FILTER (WHERE p.created_at >= NOW() - INTERVAL '14 days' AND p.created_at < NOW() - INTERVAL '7 days'))) * 100
      , 2), 0
    )
  ) INTO v_sentiment_data
  FROM posts p
  LEFT JOIN sentiment_analysis sa ON sa.post_id = p.id
  WHERE p.project_id = p_project_id
    AND p.created_at >= NOW() - INTERVAL '14 days';

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

  -- Roadmap status (check if roadmap_items table exists)
  BEGIN
    SELECT jsonb_build_object(
      'in_progress', COUNT(*) FILTER (WHERE status = 'in-progress'),
      'planned', COUNT(*) FILTER (WHERE status = 'planned'),
      'completed_this_week', COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= NOW() - INTERVAL '7 days')
    ) INTO v_roadmap_data
    FROM roadmap_items
    WHERE project_id = p_project_id;
  EXCEPTION
    WHEN undefined_table THEN
      v_roadmap_data := jsonb_build_object('in_progress', 0, 'planned', 0, 'completed_this_week', 0);
  END;

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
    'sentiment', COALESCE(v_sentiment_data, jsonb_build_object('current_nps', 0, 'total_feedback', 0, 'trend', 'stable', 'change_percent', 0)),
    'feedback', COALESCE(v_feedback_data, jsonb_build_object('issues_per_week', 0, 'total_this_week', 0, 'trend', 'stable')),
    'roadmap', COALESCE(v_roadmap_data, jsonb_build_object('in_progress', 0, 'planned', 0, 'completed_this_week', 0)),
    'competitors', COALESCE(v_competitor_data, jsonb_build_object('new_insights_count', 0, 'high_priority_count', 0))
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO service_role;

COMMENT ON FUNCTION get_dashboard_metrics(UUID) IS 'Aggregates dashboard metrics for sentiment, feedback velocity, roadmap, and competitors. Fixed to use sentiment_analysis table instead of non-existent posts.sentiment_score column.';
