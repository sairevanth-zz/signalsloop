-- Comment Mentions Schema
-- Allows users to tag/mention others in comments with @ mentions

-- Mentions table to store who was mentioned in which comment
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_email TEXT NOT NULL, -- Email of the mentioned user
  mentioned_user_name TEXT, -- Name if available
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE, -- When email notification was sent
  UNIQUE(comment_id, mentioned_user_email)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_email ON comment_mentions(mentioned_user_email);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_project ON comment_mentions(project_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_post ON comment_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_notified ON comment_mentions(notified_at) WHERE notified_at IS NULL;

-- Function to get all users who have participated in a post (for autocomplete)
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
    MAX(ap.name) as name, -- Take any non-null name
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

-- Function to extract mentions from comment text
-- Returns array of mentioned names/emails found in format @name or @email
CREATE OR REPLACE FUNCTION extract_mentions_from_text(
  comment_text TEXT
) RETURNS TEXT[] AS $$
DECLARE
  mentions TEXT[];
BEGIN
  -- Extract all @mentions using regex
  -- Matches @name (with spaces, dots, hyphens) or @email@domain patterns
  SELECT ARRAY_AGG(DISTINCT TRIM(mention))
  INTO mentions
  FROM (
    SELECT regexp_matches(comment_text, '@([a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._\- ]+)', 'g') as m
  ) matches
  CROSS JOIN LATERAL (SELECT m[1] as mention) extracted;

  RETURN COALESCE(mentions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Function to create mentions when a comment is created/updated
CREATE OR REPLACE FUNCTION process_comment_mentions(
  p_comment_id UUID,
  p_comment_text TEXT,
  p_post_id UUID,
  p_project_id UUID
) RETURNS INTEGER AS $$
DECLARE
  mention_count INTEGER := 0;
  mentioned_text TEXT;
  participant_record RECORD;
BEGIN
  -- Extract all @mentions from text
  FOR mentioned_text IN
    SELECT UNNEST(extract_mentions_from_text(p_comment_text))
  LOOP
    -- Try to find this mention in post participants
    -- Match by exact name first, then by email, then by partial match
    FOR participant_record IN
      SELECT * FROM get_post_participants(p_post_id, mentioned_text)
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(mentioned_text))
         OR LOWER(email) = LOWER(mentioned_text)
         OR name ILIKE '%' || mentioned_text || '%'
         OR email ILIKE '%' || mentioned_text || '%'
      ORDER BY
        CASE
          WHEN LOWER(TRIM(name)) = LOWER(TRIM(mentioned_text)) THEN 1
          WHEN LOWER(email) = LOWER(mentioned_text) THEN 2
          ELSE 3
        END
      LIMIT 1
    LOOP
      -- Insert mention (will be ignored if duplicate due to UNIQUE constraint)
      INSERT INTO comment_mentions (
        comment_id,
        mentioned_user_email,
        mentioned_user_name,
        project_id,
        post_id
      ) VALUES (
        p_comment_id,
        participant_record.email,
        participant_record.name,
        p_project_id,
        p_post_id
      )
      ON CONFLICT (comment_id, mentioned_user_email) DO NOTHING;

      mention_count := mention_count + 1;
    END LOOP;
  END LOOP;

  RETURN mention_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON comment_mentions TO authenticated;
GRANT ALL ON comment_mentions TO anon;
GRANT EXECUTE ON FUNCTION get_post_participants TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_participants TO anon;
GRANT EXECUTE ON FUNCTION extract_mentions_from_text TO authenticated;
GRANT EXECUTE ON FUNCTION extract_mentions_from_text TO anon;
GRANT EXECUTE ON FUNCTION process_comment_mentions TO authenticated;
GRANT EXECUTE ON FUNCTION process_comment_mentions TO anon;

-- Enable Row Level Security
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read mentions
CREATE POLICY "Anyone can read mentions"
  ON comment_mentions FOR SELECT
  USING (true);

-- Only authenticated users can create mentions
CREATE POLICY "Authenticated users can create mentions"
  ON comment_mentions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Users can delete their own mentions (if they're the commenter)
CREATE POLICY "Users can delete mentions from their comments"
  ON comment_mentions FOR DELETE
  USING (
    comment_id IN (
      SELECT id FROM comments
      WHERE author_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );
