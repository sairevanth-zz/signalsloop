-- Update Comment Mentions - Fix for existing votes table schema
-- Run this to update just the get_post_participants function

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS get_post_participants(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_post_participants(
  p_post_id UUID,
  p_search_term TEXT DEFAULT NULL
) RETURNS TABLE (
  email TEXT,
  name TEXT,
  participation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH all_participants AS (
    -- Get post author
    SELECT
      p.author_email as email,
      p.author_name as name,
      1::BIGINT as count
    FROM posts p
    WHERE p.id = p_post_id
      AND p.author_email IS NOT NULL

    UNION ALL

    -- Get commenters
    SELECT
      c.author_email as email,
      c.author_name as name,
      COUNT(*)::BIGINT as count
    FROM comments c
    WHERE c.post_id = p_post_id
      AND c.author_email IS NOT NULL
    GROUP BY c.author_email, c.author_name
  )
  SELECT
    ap.email,
    MAX(ap.name) as name,
    SUM(ap.count) as participation_count
  FROM all_participants ap
  WHERE ap.email IS NOT NULL
    AND (
      p_search_term IS NULL
      OR ap.email ILIKE '%' || p_search_term || '%'
      OR ap.name ILIKE '%' || p_search_term || '%'
    )
  GROUP BY ap.email
  ORDER BY participation_count DESC, name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_post_participants TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_participants TO anon;
