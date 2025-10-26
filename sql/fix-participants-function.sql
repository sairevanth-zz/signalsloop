-- Fixes autocomplete participants RPC so it matches current schema
-- Run this in Supabase SQL editor (prod)

DROP FUNCTION IF EXISTS public.get_post_participants(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_post_participants(
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
    SELECT
      p.author_email::TEXT AS email,
      p.author_name::TEXT AS name,
      1::BIGINT AS count
    FROM public.posts p
    WHERE p.id = p_post_id
      AND p.author_email IS NOT NULL

    UNION ALL

    SELECT
      c.author_email::TEXT AS email,
      c.author_name::TEXT AS name,
      COUNT(*)::BIGINT AS count
    FROM public.comments c
    WHERE c.post_id = p_post_id
      AND c.author_email IS NOT NULL
    GROUP BY c.author_email, c.author_name
  )
  SELECT
    ap.email,
    MAX(ap.name) AS name,
    SUM(ap.count)::BIGINT AS participation_count
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_post_participants(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_participants(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_post_participants(UUID, TEXT) TO service_role;
