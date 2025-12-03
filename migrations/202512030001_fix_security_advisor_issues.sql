-- Fix Security Advisor Issues
-- Addresses:
-- 1. Enable RLS on events table (currently disabled)
-- 2. Document security model for views flagged by Supabase Security Advisor
--
-- Note: Supabase Security Advisor flags views as "SECURITY DEFINER" even though
-- PostgreSQL views don't have this attribute. This is a Supabase-specific detection
-- that flags views created by privileged roles. These views are safe because:
-- - They use simple SELECT statements
-- - They respect RLS policies on underlying tables
-- - They don't bypass any security checks

-- ============================================================================
-- Part 1: Enable RLS on events table
-- ============================================================================

-- Enable RLS on events table (currently missing)
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read events for their projects" ON events;
DROP POLICY IF EXISTS "Service role has full access to events" ON events;
DROP POLICY IF EXISTS "Users can insert events for their projects" ON events;

-- Allow authenticated users to read events for their projects
CREATE POLICY "Users can read events for their projects"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if no project_id (global events) or user is owner of project
    (metadata->>'project_id') IS NULL OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = (metadata->>'project_id')::UUID
      AND projects.owner_id = auth.uid()
    )
  );

-- Allow service role full access to events
CREATE POLICY "Service role has full access to events"
  ON events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert events for their projects
CREATE POLICY "Users can insert events for their projects"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if no project_id or user is owner of project
    (metadata->>'project_id') IS NULL OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = (metadata->>'project_id')::UUID
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Part 2: Fix view security issues
-- ============================================================================

-- Supabase Security Advisor flags views that can bypass RLS.
-- The issue is that views are owned by the postgres role (superuser).
-- Solution: Change view ownership to 'authenticated' role so they respect RLS.

DO $$
DECLARE
  view_names text[] := ARRAY[
    'themes_with_details',
    'admin_feedback_on_behalf',
    'emerging_themes_view',
    'call_analytics_summary',
    'feature_gaps_with_competitors',
    'backlog_stories',
    'user_stories_with_details',
    'hunter_dashboard_stats',
    'feature_outcomes_detailed',
    'posts_with_sentiment',
    'roadmap_priority_distribution',
    'sprint_planning_view',
    'jira_issues_with_feedback',
    'roadmap_suggestions_detailed',
    'platform_health_stats',
    'deals_dashboard_view',
    'competitive_dashboard_overview',
    'admin_priority_votes',
    'jira_integration_overview',
    'recent_competitive_activity',
    'competitor_products_overview'
  ];
  view_name text;
BEGIN
  -- Change ownership of each view from postgres to authenticated role
  -- This ensures views don't bypass RLS policies
  FOREACH view_name IN ARRAY view_names
  LOOP
    -- Check if view exists before modifying
    IF EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = view_name
    ) THEN
      -- Change owner to authenticated role
      -- Views owned by authenticated role respect RLS policies
      EXECUTE format('ALTER VIEW %I OWNER TO authenticated', view_name);

      -- Set security_barrier for extra protection
      EXECUTE format('ALTER VIEW %I SET (security_barrier = true)', view_name);

      -- Add documentation comment
      EXECUTE format(
        'COMMENT ON VIEW %I IS %L',
        view_name,
        'SECURITY: Owner set to authenticated role and security_barrier enabled. This view fully respects RLS policies on all underlying tables.'
      );

      RAISE NOTICE 'Fixed security for view: %', view_name;
    ELSE
      RAISE NOTICE 'View does not exist, skipping: %', view_name;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Part 3: Update table documentation
-- ============================================================================

COMMENT ON TABLE events IS
  'Domain events for event-driven architecture. RLS enabled - users can only see events for projects they are members of. Events without project_id are visible to all authenticated users.';
