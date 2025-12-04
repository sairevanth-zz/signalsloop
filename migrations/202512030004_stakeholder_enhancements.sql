-- Stakeholder Intelligence Enhancements
-- Adds favorites, historical sentiment tracking, and analytics

-- ============================================================================
-- Query Favorites
-- ============================================================================

-- Add is_favorite column to stakeholder_queries
ALTER TABLE stakeholder_queries
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Index for favorite queries
CREATE INDEX IF NOT EXISTS idx_stakeholder_queries_favorite
  ON stakeholder_queries(project_id, is_favorite) WHERE is_favorite = true;

-- ============================================================================
-- Historical Sentiment Data
-- ============================================================================

-- Table to store daily sentiment snapshots
CREATE TABLE IF NOT EXISTS sentiment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  avg_sentiment NUMERIC(5,3),
  total_posts INTEGER DEFAULT 0,
  positive_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, date)
);

-- Indexes for sentiment history
CREATE INDEX IF NOT EXISTS idx_sentiment_history_project_date
  ON sentiment_history(project_id, date DESC);

-- RLS for sentiment history
ALTER TABLE sentiment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sentiment history for their projects" ON sentiment_history;
CREATE POLICY "Users can view sentiment history for their projects"
  ON sentiment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = sentiment_history.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Query Analytics
-- ============================================================================

-- Materialized view for query analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS stakeholder_query_analytics AS
SELECT
  sq.project_id,
  sq.user_role,
  COUNT(*) as total_queries,
  AVG(sq.generation_time_ms) as avg_generation_time,
  AVG(sq.rating) as avg_rating,
  COUNT(*) FILTER (WHERE sq.rating >= 4) as high_rated_queries,
  COUNT(*) FILTER (WHERE sq.is_favorite) as favorite_queries,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sq.generation_time_ms) as median_generation_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY sq.generation_time_ms) as p95_generation_time,
  MIN(sq.created_at) as first_query_at,
  MAX(sq.created_at) as last_query_at
FROM stakeholder_queries sq
GROUP BY sq.project_id, sq.user_role;

-- Index on analytics view
CREATE UNIQUE INDEX IF NOT EXISTS idx_query_analytics_project_role
  ON stakeholder_query_analytics(project_id, user_role);

-- ============================================================================
-- Functions for Historical Data
-- ============================================================================

-- Function to calculate and store daily sentiment snapshot
CREATE OR REPLACE FUNCTION calculate_daily_sentiment(p_project_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  v_avg_sentiment NUMERIC;
  v_total_posts INTEGER;
  v_positive_count INTEGER;
  v_neutral_count INTEGER;
  v_negative_count INTEGER;
BEGIN
  -- Calculate sentiment for the specified date
  SELECT
    AVG(sa.sentiment_score),
    COUNT(*),
    COUNT(*) FILTER (WHERE sa.sentiment_score > 0.3),
    COUNT(*) FILTER (WHERE sa.sentiment_score BETWEEN -0.3 AND 0.3),
    COUNT(*) FILTER (WHERE sa.sentiment_score < -0.3)
  INTO
    v_avg_sentiment,
    v_total_posts,
    v_positive_count,
    v_neutral_count,
    v_negative_count
  FROM posts p
  LEFT JOIN sentiment_analysis sa ON sa.post_id = p.id
  WHERE p.project_id = p_project_id
    AND DATE(p.created_at) = p_date;

  -- Insert or update sentiment history
  INSERT INTO sentiment_history (
    project_id,
    date,
    avg_sentiment,
    total_posts,
    positive_count,
    neutral_count,
    negative_count
  ) VALUES (
    p_project_id,
    p_date,
    v_avg_sentiment,
    v_total_posts,
    v_positive_count,
    v_neutral_count,
    v_negative_count
  )
  ON CONFLICT (project_id, date)
  DO UPDATE SET
    avg_sentiment = EXCLUDED.avg_sentiment,
    total_posts = EXCLUDED.total_posts,
    positive_count = EXCLUDED.positive_count,
    neutral_count = EXCLUDED.neutral_count,
    negative_count = EXCLUDED.negative_count;
END;
$$ LANGUAGE plpgsql;

-- Function to backfill historical sentiment data
CREATE OR REPLACE FUNCTION backfill_sentiment_history(
  p_project_id UUID,
  p_days_back INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_date DATE;
  v_days_processed INTEGER := 0;
BEGIN
  -- Calculate sentiment for each day in the past N days
  FOR v_date IN
    SELECT generate_series(
      CURRENT_DATE - p_days_back,
      CURRENT_DATE,
      '1 day'::interval
    )::DATE
  LOOP
    PERFORM calculate_daily_sentiment(p_project_id, v_date);
    v_days_processed := v_days_processed + 1;
  END LOOP;

  RETURN v_days_processed;
END;
$$ LANGUAGE plpgsql;

-- Function to get sentiment trend for charts
CREATE OR REPLACE FUNCTION get_sentiment_trend(
  p_project_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  avg_sentiment NUMERIC,
  total_posts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sh.date,
    sh.avg_sentiment,
    sh.total_posts
  FROM sentiment_history sh
  WHERE sh.project_id = p_project_id
    AND sh.date >= CURRENT_DATE - p_days
  ORDER BY sh.date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Query Pattern Analysis
-- ============================================================================

-- Function to get most common queries by role
CREATE OR REPLACE FUNCTION get_popular_queries(
  p_project_id UUID,
  p_role TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  query_text TEXT,
  query_count BIGINT,
  avg_rating NUMERIC,
  avg_generation_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.query_text,
    COUNT(*)::BIGINT as query_count,
    AVG(sq.rating)::NUMERIC as avg_rating,
    AVG(sq.generation_time_ms)::NUMERIC as avg_generation_time
  FROM stakeholder_queries sq
  WHERE sq.project_id = p_project_id
    AND (p_role IS NULL OR sq.user_role = p_role)
  GROUP BY sq.query_text
  ORDER BY query_count DESC, avg_rating DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Scheduled Jobs (configure with pg_cron or external scheduler)
-- ============================================================================

-- Example: Calculate daily sentiment at midnight
-- SELECT cron.schedule('daily-sentiment-snapshot', '0 0 * * *',
--   $$
--   SELECT calculate_daily_sentiment(id, CURRENT_DATE)
--   FROM projects
--   WHERE created_at < NOW() - INTERVAL '1 day'
--   $$
-- );

-- Example: Refresh analytics view every hour
-- SELECT cron.schedule('refresh-query-analytics', '0 * * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY stakeholder_query_analytics'
-- );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN stakeholder_queries.is_favorite IS 'Marks query as favorite for quick access';
COMMENT ON TABLE sentiment_history IS 'Daily sentiment snapshots for historical trend analysis';
COMMENT ON FUNCTION calculate_daily_sentiment IS 'Calculates and stores daily sentiment snapshot for a project';
COMMENT ON FUNCTION backfill_sentiment_history IS 'Backfills historical sentiment data for past N days';
COMMENT ON FUNCTION get_sentiment_trend IS 'Returns sentiment trend data for charts';
COMMENT ON FUNCTION get_popular_queries IS 'Returns most frequently asked queries with analytics';
COMMENT ON MATERIALIZED VIEW stakeholder_query_analytics IS 'Aggregated analytics for stakeholder queries by role';
