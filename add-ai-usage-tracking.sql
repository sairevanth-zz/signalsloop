-- AI Usage Tracking Table
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL, -- 'sentiment_analysis', 'auto_response', 'duplicate_detection', 'priority_scoring', 'categorization', 'writing_assistant'
  usage_count INTEGER DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, feature_type)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_project ON ai_usage_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_tracking(feature_type);

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_project_id UUID,
  p_feature_type TEXT
) RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  last_reset TIMESTAMP WITH TIME ZONE;
  should_reset BOOLEAN;
BEGIN
  -- Check if we need to reset (monthly)
  SELECT 
    usage_count,
    last_reset_at,
    (EXTRACT(EPOCH FROM (NOW() - last_reset_at)) > 2592000) -- 30 days in seconds
  INTO current_count, last_reset, should_reset
  FROM ai_usage_tracking
  WHERE project_id = p_project_id AND feature_type = p_feature_type;

  -- If record doesn't exist, create it
  IF current_count IS NULL THEN
    INSERT INTO ai_usage_tracking (project_id, feature_type, usage_count)
    VALUES (p_project_id, p_feature_type, 1)
    RETURNING usage_count INTO current_count;
    
    RETURN jsonb_build_object('usage_count', current_count, 'reset', false);
  END IF;

  -- If should reset, reset the counter
  IF should_reset THEN
    UPDATE ai_usage_tracking
    SET usage_count = 1, last_reset_at = NOW(), updated_at = NOW()
    WHERE project_id = p_project_id AND feature_type = p_feature_type
    RETURNING usage_count INTO current_count;
    
    RETURN jsonb_build_object('usage_count', current_count, 'reset', true);
  END IF;

  -- Otherwise, increment
  UPDATE ai_usage_tracking
  SET usage_count = usage_count + 1, updated_at = NOW()
  WHERE project_id = p_project_id AND feature_type = p_feature_type
  RETURNING usage_count INTO current_count;

  RETURN jsonb_build_object('usage_count', current_count, 'reset', false);
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limit
CREATE OR REPLACE FUNCTION check_ai_usage_limit(
  p_project_id UUID,
  p_feature_type TEXT,
  p_limit INTEGER
) RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  last_reset TIMESTAMP WITH TIME ZONE;
  should_reset BOOLEAN;
BEGIN
  -- Get current usage
  SELECT 
    usage_count,
    last_reset_at,
    (EXTRACT(EPOCH FROM (NOW() - last_reset_at)) > 2592000) -- 30 days
  INTO current_count, last_reset, should_reset
  FROM ai_usage_tracking
  WHERE project_id = p_project_id AND feature_type = p_feature_type;

  -- If no record or should reset, allow usage
  IF current_count IS NULL OR should_reset THEN
    RETURN jsonb_build_object(
      'allowed', true, 
      'current', COALESCE(current_count, 0),
      'limit', p_limit,
      'remaining', p_limit
    );
  END IF;

  -- Check if under limit
  IF current_count < p_limit THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current', current_count,
      'limit', p_limit,
      'remaining', p_limit - current_count
    );
  END IF;

  -- Over limit
  RETURN jsonb_build_object(
    'allowed', false,
    'current', current_count,
    'limit', p_limit,
    'remaining', 0
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON ai_usage_tracking TO authenticated;
GRANT ALL ON ai_usage_tracking TO anon;

