-- Sentiment Analysis Migration
-- Creates tables and policies for sentiment analysis feature

-- Create sentiment_analysis table
CREATE TABLE IF NOT EXISTS sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sentiment_category TEXT NOT NULL CHECK (sentiment_category IN ('positive', 'negative', 'neutral', 'mixed')),
  sentiment_score DECIMAL(3, 2) NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  emotional_tone TEXT,
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one sentiment analysis per post (can be updated)
  UNIQUE(post_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_post_id ON sentiment_analysis(post_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_category ON sentiment_analysis(sentiment_category);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_analyzed_at ON sentiment_analysis(analyzed_at DESC);

-- Enable Row Level Security
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read sentiment analysis
CREATE POLICY "Allow authenticated users to read sentiment analysis"
  ON sentiment_analysis
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert sentiment analysis
CREATE POLICY "Allow authenticated users to insert sentiment analysis"
  ON sentiment_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update sentiment analysis
CREATE POLICY "Allow authenticated users to update sentiment analysis"
  ON sentiment_analysis
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow service role full access
CREATE POLICY "Allow service role full access to sentiment analysis"
  ON sentiment_analysis
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a view for posts with sentiment data
CREATE OR REPLACE VIEW posts_with_sentiment AS
SELECT
  p.*,
  sa.sentiment_category,
  sa.sentiment_score,
  sa.emotional_tone,
  sa.confidence_score,
  sa.analyzed_at AS sentiment_analyzed_at
FROM posts p
LEFT JOIN sentiment_analysis sa ON p.id = sa.post_id;

-- Grant access to the view
GRANT SELECT ON posts_with_sentiment TO authenticated;
GRANT SELECT ON posts_with_sentiment TO service_role;

-- Create a function to get sentiment distribution
CREATE OR REPLACE FUNCTION get_sentiment_distribution(
  p_project_id UUID,
  p_days_ago INTEGER DEFAULT 30
)
RETURNS TABLE (
  sentiment_category TEXT,
  count BIGINT,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.sentiment_category,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0)), 2) as percentage
  FROM posts p
  INNER JOIN sentiment_analysis sa ON p.id = sa.post_id
  WHERE p.project_id = p_project_id
    AND sa.analyzed_at >= NOW() - (p_days_ago || ' days')::INTERVAL
  GROUP BY sa.sentiment_category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get sentiment trend over time
CREATE OR REPLACE FUNCTION get_sentiment_trend(
  p_project_id UUID,
  p_days_ago INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  avg_sentiment_score DECIMAL,
  positive_count BIGINT,
  negative_count BIGINT,
  neutral_count BIGINT,
  mixed_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(sa.analyzed_at) as date,
    ROUND(AVG(sa.sentiment_score)::NUMERIC, 2) as avg_sentiment_score,
    COUNT(*) FILTER (WHERE sa.sentiment_category = 'positive') as positive_count,
    COUNT(*) FILTER (WHERE sa.sentiment_category = 'negative') as negative_count,
    COUNT(*) FILTER (WHERE sa.sentiment_category = 'neutral') as neutral_count,
    COUNT(*) FILTER (WHERE sa.sentiment_category = 'mixed') as mixed_count
  FROM posts p
  INNER JOIN sentiment_analysis sa ON p.id = sa.post_id
  WHERE p.project_id = p_project_id
    AND sa.analyzed_at >= NOW() - (p_days_ago || ' days')::INTERVAL
  GROUP BY DATE(sa.analyzed_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_sentiment_distribution(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sentiment_distribution(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_sentiment_trend(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sentiment_trend(UUID, INTEGER) TO service_role;

-- Add comment to table
COMMENT ON TABLE sentiment_analysis IS 'Stores AI-generated sentiment analysis results for feedback posts';
COMMENT ON COLUMN sentiment_analysis.sentiment_category IS 'Overall sentiment: positive, negative, neutral, or mixed';
COMMENT ON COLUMN sentiment_analysis.sentiment_score IS 'Numerical score from -1 (very negative) to 1 (very positive)';
COMMENT ON COLUMN sentiment_analysis.emotional_tone IS 'Detected emotional tone (e.g., frustrated, excited, concerned)';
COMMENT ON COLUMN sentiment_analysis.confidence_score IS 'AI confidence in the analysis from 0 to 1';
