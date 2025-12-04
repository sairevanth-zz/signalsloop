-- Performance Indexes for Stakeholder Intelligence
-- Optimizes queries for large datasets

-- ============================================================================
-- Posts Table Indexes (for feedback data)
-- ============================================================================

-- Composite index for project + created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_posts_project_created
  ON posts(project_id, created_at DESC);

-- Composite index for project + category (for theme-based queries)
CREATE INDEX IF NOT EXISTS idx_posts_project_category
  ON posts(project_id, category) WHERE category IS NOT NULL;

-- Index for content text search (if using full-text search)
CREATE INDEX IF NOT EXISTS idx_posts_content_gin
  ON posts USING gin(to_tsvector('english', content));

-- ============================================================================
-- Sentiment Analysis Table Indexes
-- ============================================================================

-- Index for efficient sentiment lookups by post
CREATE INDEX IF NOT EXISTS idx_sentiment_post_score
  ON sentiment_analysis(post_id, sentiment_score);

-- Index for finding posts by sentiment range
CREATE INDEX IF NOT EXISTS idx_sentiment_score_range
  ON sentiment_analysis(sentiment_score) WHERE sentiment_score IS NOT NULL;

-- ============================================================================
-- Themes Table Indexes
-- ============================================================================

-- Composite index for project + frequency (most accessed pattern)
CREATE INDEX IF NOT EXISTS idx_themes_project_frequency
  ON themes(project_id, frequency DESC);

-- Index for theme name lookups
CREATE INDEX IF NOT EXISTS idx_themes_project_name
  ON themes(project_id, theme_name);

-- ============================================================================
-- Stakeholder Queries Table Indexes
-- ============================================================================

-- Composite index for project + created_at (query history)
CREATE INDEX IF NOT EXISTS idx_stakeholder_queries_project_created
  ON stakeholder_queries(project_id, created_at DESC);

-- Index for user's query history
CREATE INDEX IF NOT EXISTS idx_stakeholder_queries_user_created
  ON stakeholder_queries(user_id, created_at DESC);

-- Partial index for highly-rated queries (for analytics)
CREATE INDEX IF NOT EXISTS idx_stakeholder_queries_rated
  ON stakeholder_queries(project_id, rating DESC)
  WHERE rating >= 4;

-- ============================================================================
-- Performance Analysis Functions
-- ============================================================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_stakeholder_query_performance()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  table_size TEXT,
  index_scans BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    indexname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size,
    idx_scan AS index_scans
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('posts', 'sentiment_analysis', 'themes', 'stakeholder_queries', 'timeline_events')
  ORDER BY pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow query stats for stakeholder features
CREATE OR REPLACE FUNCTION get_slow_stakeholder_queries()
RETURNS TABLE (
  query_text TEXT,
  avg_generation_time_ms NUMERIC,
  total_executions BIGINT,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.query_text,
    AVG(sq.generation_time_ms)::NUMERIC AS avg_generation_time_ms,
    COUNT(*)::BIGINT AS total_executions,
    sq.user_role
  FROM stakeholder_queries sq
  WHERE sq.generation_time_ms > 5000 -- Slower than 5 seconds
  GROUP BY sq.query_text, sq.user_role
  ORDER BY AVG(sq.generation_time_ms) DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Materialized View for Expensive Aggregations
-- ============================================================================

-- Materialized view for theme sentiment (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS theme_sentiment_cache AS
SELECT
  t.project_id,
  t.theme_name,
  t.frequency,
  COUNT(DISTINCT p.id) AS post_count,
  AVG(sa.sentiment_score) AS avg_sentiment,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sa.sentiment_score) AS median_sentiment,
  MIN(p.created_at) AS first_seen,
  MAX(p.created_at) AS last_seen
FROM themes t
LEFT JOIN posts p ON p.project_id = t.project_id AND p.category = t.theme_name
LEFT JOIN sentiment_analysis sa ON sa.post_id = p.id
GROUP BY t.project_id, t.theme_name, t.frequency;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_theme_sentiment_cache_project_theme
  ON theme_sentiment_cache(project_id, theme_name);

CREATE INDEX IF NOT EXISTS idx_theme_sentiment_cache_frequency
  ON theme_sentiment_cache(project_id, frequency DESC);

-- Function to refresh theme sentiment cache
CREATE OR REPLACE FUNCTION refresh_theme_sentiment_cache(p_project_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_project_id IS NULL THEN
    -- Refresh entire cache
    REFRESH MATERIALIZED VIEW CONCURRENTLY theme_sentiment_cache;
  ELSE
    -- For project-specific refresh, use regular view query
    -- (Postgres doesn't support partial materialized view refresh)
    -- Application should use cache with TTL for project-specific data
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Query Statistics Collection
-- ============================================================================

-- Enable pg_stat_statements if not already enabled
-- Note: This requires superuser privileges and postgresql.conf modification
-- Uncomment in production after configuring:
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- Maintenance Functions
-- ============================================================================

-- Function to update statistics for better query planning
CREATE OR REPLACE FUNCTION update_stakeholder_table_stats()
RETURNS void AS $$
BEGIN
  ANALYZE posts;
  ANALYZE sentiment_analysis;
  ANALYZE themes;
  ANALYZE stakeholder_queries;
  ANALYZE timeline_events;

  -- Log completion
  RAISE NOTICE 'Table statistics updated for stakeholder intelligence tables';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON INDEX idx_posts_project_created IS 'Optimizes queries for recent posts by project';
COMMENT ON INDEX idx_posts_project_category IS 'Optimizes theme-based queries';
COMMENT ON INDEX idx_sentiment_post_score IS 'Fast sentiment lookup for posts';
COMMENT ON INDEX idx_themes_project_frequency IS 'Optimizes theme ranking queries';
COMMENT ON MATERIALIZED VIEW theme_sentiment_cache IS 'Cached theme sentiment calculations for better performance. Refresh periodically.';
COMMENT ON FUNCTION analyze_stakeholder_query_performance IS 'Analyzes index usage and table sizes for stakeholder tables';
COMMENT ON FUNCTION get_slow_stakeholder_queries IS 'Identifies slow stakeholder queries for optimization';
COMMENT ON FUNCTION refresh_theme_sentiment_cache IS 'Refreshes the theme sentiment materialized view';

-- ============================================================================
-- Scheduled Maintenance (configure with pg_cron or external scheduler)
-- ============================================================================

-- Example: Refresh materialized view daily
-- Uncomment and adjust schedule as needed:
--
-- SELECT cron.schedule('refresh-theme-sentiment', '0 2 * * *',
--   'SELECT refresh_theme_sentiment_cache()');
