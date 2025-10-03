-- Fix mention extraction regex to not include spaces in names

DROP FUNCTION IF EXISTS extract_mentions_from_text(TEXT);

CREATE OR REPLACE FUNCTION extract_mentions_from_text(
  comment_text TEXT
) RETURNS TEXT[] AS $$
DECLARE
  mentions TEXT[];
BEGIN
  -- Extract all @mentions using regex
  -- Matches @name (letters, numbers, dots, hyphens but NO SPACES) or @email@domain
  SELECT ARRAY_AGG(DISTINCT TRIM(mention))
  INTO mentions
  FROM (
    SELECT regexp_matches(comment_text, '@([a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._\-]+)', 'g') as m
  ) matches
  CROSS JOIN LATERAL (SELECT m[1] as mention) extracted;

  RETURN COALESCE(mentions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION extract_mentions_from_text TO authenticated;
GRANT EXECUTE ON FUNCTION extract_mentions_from_text TO anon;
