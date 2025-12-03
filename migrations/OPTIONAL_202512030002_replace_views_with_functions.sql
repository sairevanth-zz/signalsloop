-- OPTIONAL: Replace Views with SECURITY INVOKER Functions
--
-- This migration shows how to replace views with functions to eliminate
-- Supabase Security Advisor warnings. Only apply this if you want to
-- completely eliminate the warnings.
--
-- TRADE-OFFS:
-- Pros: Eliminates Security Advisor warnings completely
-- Cons: More verbose queries, potential performance impact, significant refactoring needed
--
-- This example replaces 2 views. You can extend this pattern to all 21 views if desired.

-- ============================================================================
-- Example 1: Replace themes_with_details view with a function
-- ============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS themes_with_details CASCADE;

-- Create a security invoker function instead
CREATE OR REPLACE FUNCTION get_themes_with_details(p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  cluster_id UUID,
  theme_name TEXT,
  description TEXT,
  frequency INTEGER,
  avg_sentiment DECIMAL,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  is_emerging BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  cluster_name TEXT,
  actual_feedback_count BIGINT,
  related_categories TEXT[]
)
LANGUAGE SQL
SECURITY INVOKER  -- This is the key: uses caller's permissions, not function owner's
STABLE
AS $$
  SELECT
    t.id,
    t.project_id,
    t.cluster_id,
    t.theme_name,
    t.description,
    t.frequency,
    t.avg_sentiment,
    t.first_seen,
    t.last_seen,
    t.is_emerging,
    t.created_at,
    t.updated_at,
    tc.cluster_name,
    COUNT(DISTINCT ft.feedback_id) as actual_feedback_count,
    ARRAY_AGG(DISTINCT p.category) FILTER (WHERE p.category IS NOT NULL) as related_categories
  FROM themes t
  LEFT JOIN theme_clusters tc ON t.cluster_id = tc.id
  LEFT JOIN feedback_themes ft ON t.id = ft.theme_id
  LEFT JOIN posts p ON ft.feedback_id = p.id
  WHERE (p_project_id IS NULL OR t.project_id = p_project_id)
  GROUP BY t.id, tc.cluster_name;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_themes_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_themes_with_details(UUID) TO service_role;

COMMENT ON FUNCTION get_themes_with_details IS
  'SECURITY INVOKER function that replaces themes_with_details view. Respects RLS on all tables.';

-- ============================================================================
-- Example 2: Replace emerging_themes_view with a function
-- ============================================================================

DROP VIEW IF EXISTS emerging_themes_view CASCADE;

CREATE OR REPLACE FUNCTION get_emerging_themes(p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  cluster_id UUID,
  theme_name TEXT,
  description TEXT,
  frequency INTEGER,
  avg_sentiment DECIMAL,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  is_emerging BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  recent_mentions BIGINT,
  previous_mentions BIGINT
)
LANGUAGE SQL
SECURITY INVOKER
STABLE
AS $$
  SELECT
    t.id,
    t.project_id,
    t.cluster_id,
    t.theme_name,
    t.description,
    t.frequency,
    t.avg_sentiment,
    t.first_seen,
    t.last_seen,
    t.is_emerging,
    t.created_at,
    t.updated_at,
    COUNT(ft.feedback_id) FILTER (
      WHERE ft.created_at >= NOW() - INTERVAL '7 days'
    ) as recent_mentions,
    COUNT(ft.feedback_id) FILTER (
      WHERE ft.created_at >= NOW() - INTERVAL '14 days'
      AND ft.created_at < NOW() - INTERVAL '7 days'
    ) as previous_mentions
  FROM themes t
  LEFT JOIN feedback_themes ft ON t.id = ft.theme_id
  WHERE (p_project_id IS NULL OR t.project_id = p_project_id)
  GROUP BY t.id
  HAVING COUNT(ft.feedback_id) FILTER (
    WHERE ft.created_at >= NOW() - INTERVAL '7 days'
  ) > 0;
$$;

GRANT EXECUTE ON FUNCTION get_emerging_themes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_emerging_themes(UUID) TO service_role;

COMMENT ON FUNCTION get_emerging_themes IS
  'SECURITY INVOKER function that replaces emerging_themes_view. Respects RLS on all tables.';

-- ============================================================================
-- Usage Instructions
-- ============================================================================

-- Old way (view):
-- SELECT * FROM themes_with_details WHERE project_id = '...';

-- New way (function):
-- SELECT * FROM get_themes_with_details('project-uuid-here');
-- SELECT * FROM get_emerging_themes('project-uuid-here');
-- SELECT * FROM get_emerging_themes(NULL); -- All projects (subject to RLS)

-- ============================================================================
-- Next Steps
-- ============================================================================

-- If this approach works for you, extend the pattern to replace all 21 views:
-- 1. For each view, create a get_[view_name] function with SECURITY INVOKER
-- 2. Drop the old view
-- 3. Update application code to call functions instead of querying views
-- 4. Test thoroughly - functions have slightly different performance characteristics
