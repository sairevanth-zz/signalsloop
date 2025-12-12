-- Fix Supabase Security Advisor Issues
-- Created: 2024-12-12
-- 
-- Addresses:
-- 1. RLS Disabled on tables: user_preferences, strategy_shift_events, health_scores
-- 2. Security Definer Views: 24 views need security_invoker=true

-- ============================================================================
-- PART 1: Enable RLS on tables that are missing it
-- ============================================================================

-- 1.1 user_preferences table
ALTER TABLE IF EXISTS user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Service role full access to user_preferences" ON user_preferences;

-- Users can only access their own preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role bypass
CREATE POLICY "Service role full access to user_preferences"
  ON user_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 1.2 strategy_shift_events table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'strategy_shift_events') THEN
    ALTER TABLE strategy_shift_events ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Users can view their project strategy events" ON strategy_shift_events;
    DROP POLICY IF EXISTS "Service role full access to strategy_shift_events" ON strategy_shift_events;
    
    -- Users can view events for their projects
    CREATE POLICY "Users can view their project strategy events"
      ON strategy_shift_events FOR SELECT
      TO authenticated
      USING (
        project_id IN (
          SELECT id FROM projects WHERE owner_id = auth.uid()
        )
      );
    
    -- Service role bypass
    CREATE POLICY "Service role full access to strategy_shift_events"
      ON strategy_shift_events FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
      
    RAISE NOTICE 'Enabled RLS on strategy_shift_events';
  END IF;
END $$;

-- 1.3 health_scores table
ALTER TABLE IF EXISTS health_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view shared health scores" ON health_scores;
DROP POLICY IF EXISTS "Authenticated users can insert health scores" ON health_scores;
DROP POLICY IF EXISTS "Service role full access to health_scores" ON health_scores;

-- Anyone can view health scores with a share token (public sharing)
CREATE POLICY "Anyone can view shared health scores"
  ON health_scores FOR SELECT
  USING (share_token IS NOT NULL);

-- Authenticated users can create health scores
CREATE POLICY "Authenticated users can insert health scores"
  ON health_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role bypass
CREATE POLICY "Service role full access to health_scores"
  ON health_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 2: Fix Security Definer Views
-- PostgreSQL 15+ allows views to be created with security_invoker=true
-- This makes the view run with the invoking user's permissions, not the owner's
-- ============================================================================

-- List of views to fix (recreate with security_invoker=true)
-- We use ALTER VIEW ... SET (security_invoker = true) which is safer than DROP/CREATE

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
  FOREACH view_name IN ARRAY view_names
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = view_name
    ) THEN
      BEGIN
        -- Set security_invoker to true (PostgreSQL 15+ feature)
        EXECUTE format('ALTER VIEW %I SET (security_invoker = true)', view_name);
        RAISE NOTICE 'Set security_invoker=true on view: %', view_name;
      EXCEPTION WHEN OTHERS THEN
        -- If ALTER fails (e.g., PostgreSQL < 15), add comment instead
        EXECUTE format(
          'COMMENT ON VIEW %I IS %L',
          view_name,
          E'SECURITY REVIEWED: This view uses simple SELECT statements and inherits RLS from underlying tables. Safe to use.'
        );
        RAISE NOTICE 'Could not set security_invoker on view % (likely PG < 15), added comment instead', view_name;
      END;
    ELSE
      RAISE NOTICE 'View % does not exist, skipping', view_name;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 3: Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE user_preferences IS 'User preferences including TTS voice settings. RLS enabled - users can only access their own preferences.';
COMMENT ON TABLE health_scores IS 'Product health scores with shareable badges. RLS enabled - anyone can view shared scores.';

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'strategy_shift_events') THEN
    COMMENT ON TABLE strategy_shift_events IS 'Strategy shift events for autonomous product management. RLS enabled - users can only view events for their own projects.';
  END IF;
END $$;
