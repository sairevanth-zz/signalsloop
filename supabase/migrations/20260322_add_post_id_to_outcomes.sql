-- Add post_id column to feature_outcomes table
ALTER TABLE feature_outcomes ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id);

-- Make suggestion_id nullable since we might create outcomes from posts directly
ALTER TABLE feature_outcomes ALTER COLUMN suggestion_id DROP NOT NULL;

-- Update the RLS policy to allow access based on project_id (already exists but good to verify)
-- convert suggestion_id constraint to allow nulls if needed, though policies usually filter by project_id

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feature_outcomes_post_id ON feature_outcomes(post_id);

-- Drop and recreate the view to include post data
DROP VIEW IF EXISTS feature_outcomes_detailed;

CREATE VIEW feature_outcomes_detailed AS
SELECT 
  fo.*,
  -- Get title from either suggestion's theme or post
  COALESCE(t.theme_name, p.title) as theme_name,
  
  -- Get priority details (default if missing)
  COALESCE(rs.priority_score, 0) as priority_score,
  COALESCE(rs.priority_level, 'medium') as priority_level,
  
  -- CHANGED: Get counts from themes table OR count votes for posts
  COALESCE(t.frequency, (SELECT count(*) FROM votes v WHERE v.post_id = p.id), 0) as mention_count,
  
  -- CHANGED: Get sentiment from themes table
  COALESCE(t.avg_sentiment, 0) as theme_avg_sentiment,
  
  prj.name as project_name,
  prj.owner_id,
  fo.status as monitor_status,
  EXTRACT(DAY FROM (fo.monitor_end - NOW())) as days_remaining
FROM feature_outcomes fo
LEFT JOIN roadmap_suggestions rs ON fo.suggestion_id = rs.id
LEFT JOIN themes t ON rs.theme_id = t.id -- Join themes to get frequency/sentiment
LEFT JOIN posts p ON fo.post_id = p.id
JOIN projects prj ON fo.project_id = prj.id;
