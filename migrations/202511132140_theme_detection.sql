-- Theme Detection Migration
-- Creates tables and policies for theme and pattern detection feature

-- ============================================================================
-- Theme Clusters Table
-- Stores high-level theme clusters/groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS theme_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cluster_name TEXT NOT NULL,
  description TEXT,
  theme_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique cluster names per project
  UNIQUE(project_id, cluster_name)
);

-- ============================================================================
-- Themes Table
-- Stores individual themes detected from feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES theme_clusters(id) ON DELETE SET NULL,

  -- Theme identification
  theme_name TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Metrics
  frequency INTEGER NOT NULL DEFAULT 0,
  avg_sentiment DECIMAL(3, 2) DEFAULT 0,

  -- Temporal data
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status flags
  is_emerging BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique theme names per project
  UNIQUE(project_id, theme_name)
);

-- ============================================================================
-- Feedback Themes Join Table
-- Maps feedback posts to detected themes with confidence scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_themes (
  feedback_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (feedback_id, theme_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Theme Clusters indexes
CREATE INDEX IF NOT EXISTS idx_theme_clusters_project_id ON theme_clusters(project_id);
CREATE INDEX IF NOT EXISTS idx_theme_clusters_created_at ON theme_clusters(created_at DESC);

-- Themes indexes
CREATE INDEX IF NOT EXISTS idx_themes_project_id ON themes(project_id);
CREATE INDEX IF NOT EXISTS idx_themes_cluster_id ON themes(cluster_id);
CREATE INDEX IF NOT EXISTS idx_themes_theme_name ON themes(theme_name);
CREATE INDEX IF NOT EXISTS idx_themes_frequency ON themes(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_themes_is_emerging ON themes(is_emerging) WHERE is_emerging = true;
CREATE INDEX IF NOT EXISTS idx_themes_first_seen ON themes(first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_themes_last_seen ON themes(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_themes_avg_sentiment ON themes(avg_sentiment);

-- Feedback Themes indexes
CREATE INDEX IF NOT EXISTS idx_feedback_themes_feedback_id ON feedback_themes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_themes_theme_id ON feedback_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_feedback_themes_confidence ON feedback_themes(confidence DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE theme_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_themes ENABLE ROW LEVEL SECURITY;

-- Theme Clusters RLS Policies
CREATE POLICY "Allow authenticated users to read theme clusters"
  ON theme_clusters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert theme clusters"
  ON theme_clusters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update theme clusters"
  ON theme_clusters
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete theme clusters"
  ON theme_clusters
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to theme clusters"
  ON theme_clusters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Themes RLS Policies
CREATE POLICY "Allow authenticated users to read themes"
  ON themes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert themes"
  ON themes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update themes"
  ON themes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete themes"
  ON themes
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to themes"
  ON themes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Feedback Themes RLS Policies
CREATE POLICY "Allow authenticated users to read feedback themes"
  ON feedback_themes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert feedback themes"
  ON feedback_themes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update feedback themes"
  ON feedback_themes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete feedback themes"
  ON feedback_themes
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to feedback themes"
  ON feedback_themes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get theme statistics for a project
CREATE OR REPLACE FUNCTION get_theme_statistics(
  p_project_id UUID,
  p_days_ago INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_themes BIGINT,
  emerging_themes BIGINT,
  total_feedback_items BIGINT,
  avg_theme_frequency DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT t.id) as total_themes,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_emerging = true) as emerging_themes,
    COUNT(DISTINCT ft.feedback_id) as total_feedback_items,
    ROUND(AVG(t.frequency)::NUMERIC, 2) as avg_theme_frequency
  FROM themes t
  LEFT JOIN feedback_themes ft ON t.id = ft.theme_id
  WHERE t.project_id = p_project_id
    AND t.created_at >= NOW() - (p_days_ago || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get theme trend over time
CREATE OR REPLACE FUNCTION get_theme_trend(
  p_theme_id UUID,
  p_days_ago INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  feedback_count BIGINT,
  avg_sentiment DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(p.created_at) as date,
    COUNT(*) as feedback_count,
    ROUND(AVG(sa.sentiment_score)::NUMERIC, 2) as avg_sentiment
  FROM feedback_themes ft
  INNER JOIN posts p ON ft.feedback_id = p.id
  LEFT JOIN sentiment_analysis sa ON p.id = sa.post_id
  WHERE ft.theme_id = p_theme_id
    AND p.created_at >= NOW() - (p_days_ago || ' days')::INTERVAL
  GROUP BY DATE(p.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update theme metrics (frequency, sentiment, dates)
CREATE OR REPLACE FUNCTION update_theme_metrics(p_theme_id UUID)
RETURNS void AS $$
DECLARE
  v_frequency INTEGER;
  v_avg_sentiment DECIMAL(3, 2);
  v_first_seen TIMESTAMPTZ;
  v_last_seen TIMESTAMPTZ;
BEGIN
  -- Calculate metrics from associated feedback
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(ROUND(AVG(sa.sentiment_score)::NUMERIC, 2), 0),
    MIN(p.created_at),
    MAX(p.created_at)
  INTO v_frequency, v_avg_sentiment, v_first_seen, v_last_seen
  FROM feedback_themes ft
  INNER JOIN posts p ON ft.feedback_id = p.id
  LEFT JOIN sentiment_analysis sa ON p.id = sa.post_id
  WHERE ft.theme_id = p_theme_id;

  -- Update theme metrics
  UPDATE themes
  SET
    frequency = v_frequency,
    avg_sentiment = v_avg_sentiment,
    first_seen = COALESCE(v_first_seen, first_seen),
    last_seen = COALESCE(v_last_seen, last_seen),
    updated_at = NOW()
  WHERE id = p_theme_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update cluster theme count
CREATE OR REPLACE FUNCTION update_cluster_theme_count(p_cluster_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE theme_clusters
  SET
    theme_count = (
      SELECT COUNT(*)::INTEGER
      FROM themes
      WHERE cluster_id = p_cluster_id
    ),
    updated_at = NOW()
  WHERE id = p_cluster_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update theme metrics when feedback_themes changes
CREATE OR REPLACE FUNCTION trigger_update_theme_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_theme_metrics(NEW.theme_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM update_theme_metrics(OLD.theme_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_theme_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON feedback_themes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_theme_metrics();

-- Trigger to update cluster theme count when themes change
CREATE OR REPLACE FUNCTION trigger_update_cluster_theme_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.cluster_id IS NOT NULL THEN
      PERFORM update_cluster_theme_count(NEW.cluster_id);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.cluster_id IS NOT NULL THEN
      PERFORM update_cluster_theme_count(OLD.cluster_id);
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.cluster_id IS DISTINCT FROM NEW.cluster_id THEN
    IF OLD.cluster_id IS NOT NULL THEN
      PERFORM update_cluster_theme_count(OLD.cluster_id);
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cluster_theme_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_cluster_theme_count();

-- ============================================================================
-- Views
-- ============================================================================

-- View for themes with detailed metrics
CREATE OR REPLACE VIEW themes_with_details AS
SELECT
  t.*,
  tc.cluster_name,
  COUNT(DISTINCT ft.feedback_id) as actual_feedback_count,
  ARRAY_AGG(DISTINCT p.category) FILTER (WHERE p.category IS NOT NULL) as related_categories
FROM themes t
LEFT JOIN theme_clusters tc ON t.cluster_id = tc.id
LEFT JOIN feedback_themes ft ON t.id = ft.theme_id
LEFT JOIN posts p ON ft.feedback_id = p.id
GROUP BY t.id, tc.cluster_name;

-- View for emerging themes (growth detection)
CREATE OR REPLACE VIEW emerging_themes_view AS
SELECT
  t.*,
  COUNT(ft.feedback_id) FILTER (
    WHERE ft.created_at >= NOW() - INTERVAL '7 days'
  ) as recent_mentions,
  COUNT(ft.feedback_id) FILTER (
    WHERE ft.created_at >= NOW() - INTERVAL '14 days'
    AND ft.created_at < NOW() - INTERVAL '7 days'
  ) as previous_mentions
FROM themes t
LEFT JOIN feedback_themes ft ON t.id = ft.theme_id
GROUP BY t.id
HAVING COUNT(ft.feedback_id) FILTER (
  WHERE ft.created_at >= NOW() - INTERVAL '7 days'
) > 0;

-- Grant access to views
GRANT SELECT ON themes_with_details TO authenticated;
GRANT SELECT ON themes_with_details TO service_role;
GRANT SELECT ON emerging_themes_view TO authenticated;
GRANT SELECT ON emerging_themes_view TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_theme_statistics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_theme_statistics(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_theme_trend(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_theme_trend(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION update_theme_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_theme_metrics(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_cluster_theme_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_cluster_theme_count(UUID) TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE theme_clusters IS 'Stores high-level theme clusters/groups for organizing related themes';
COMMENT ON TABLE themes IS 'Stores individual themes detected from feedback using AI analysis';
COMMENT ON TABLE feedback_themes IS 'Many-to-many relationship between feedback posts and themes';

COMMENT ON COLUMN themes.theme_name IS 'Concise label for the theme';
COMMENT ON COLUMN themes.description IS 'One-sentence description of what the theme represents';
COMMENT ON COLUMN themes.frequency IS 'Number of feedback items associated with this theme';
COMMENT ON COLUMN themes.avg_sentiment IS 'Average sentiment score of feedback items in this theme';
COMMENT ON COLUMN themes.is_emerging IS 'Flag indicating if this is a new or rapidly growing theme';
COMMENT ON COLUMN feedback_themes.confidence IS 'AI confidence score (0-1) for theme assignment';
