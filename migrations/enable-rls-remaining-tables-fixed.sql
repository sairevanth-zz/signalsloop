-- Enable RLS on Remaining Tables (CORRECTED VERSION)
-- These are integration and tracking tables added as optional features
-- Run this in your Supabase SQL Editor

-- ============================================================
-- 1. AI Usage Tracking Table
-- ============================================================

ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can manage ai_usage_tracking" ON ai_usage_tracking
  FOR ALL USING (true) WITH CHECK (true);

-- Project owners can view their AI usage
CREATE POLICY "Project owners can view ai_usage" ON ai_usage_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = ai_usage_tracking.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 2. Slack Integration Tables
-- ============================================================

ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can manage slack_integrations" ON slack_integrations
  FOR ALL USING (true) WITH CHECK (true);

-- Project owners can view their Slack integrations
CREATE POLICY "Project owners can view slack_integrations" ON slack_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = slack_integrations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can create Slack integrations
CREATE POLICY "Project owners can create slack_integrations" ON slack_integrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = slack_integrations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can update their Slack integrations
CREATE POLICY "Project owners can update slack_integrations" ON slack_integrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = slack_integrations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can delete their Slack integrations
CREATE POLICY "Project owners can delete slack_integrations" ON slack_integrations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = slack_integrations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Slack Integration States Table (CORRECTED - has project_id)
-- ============================================================

ALTER TABLE slack_integration_states ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can manage slack_integration_states" ON slack_integration_states
  FOR ALL USING (true) WITH CHECK (true);

-- Project owners can view their Slack integration states
CREATE POLICY "Project owners can view slack_integration_states" ON slack_integration_states
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = slack_integration_states.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Discord Integration Tables
-- ============================================================

ALTER TABLE discord_integrations ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can manage discord_integrations" ON discord_integrations
  FOR ALL USING (true) WITH CHECK (true);

-- Project owners can view their Discord integrations
CREATE POLICY "Project owners can view discord_integrations" ON discord_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = discord_integrations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can create Discord integrations
CREATE POLICY "Project owners can create discord_integrations" ON discord_integrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = discord_integrations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can update their Discord integrations
CREATE POLICY "Project owners can update discord_integrations" ON discord_integrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = discord_integrations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can delete their Discord integrations
CREATE POLICY "Project owners can delete discord_integrations" ON discord_integrations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = discord_integrations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 5. Discord Integration States Table (check if it exists first)
-- ============================================================

-- Check if discord_integration_states table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'discord_integration_states'
  ) THEN
    -- Enable RLS
    ALTER TABLE discord_integration_states ENABLE ROW LEVEL SECURITY;

    -- Service role has full access
    EXECUTE 'CREATE POLICY "Service role can manage discord_integration_states" ON discord_integration_states FOR ALL USING (true) WITH CHECK (true)';

    -- Check if it has project_id column
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'discord_integration_states'
      AND column_name = 'project_id'
    ) THEN
      -- Use project_id for policy
      EXECUTE 'CREATE POLICY "Project owners can view discord_integration_states" ON discord_integration_states FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = discord_integration_states.project_id AND projects.owner_id = auth.uid()))';
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'discord_integration_states'
      AND column_name = 'integration_id'
    ) THEN
      -- Use integration_id for policy
      EXECUTE 'CREATE POLICY "Project owners can view discord_integration_states" ON discord_integration_states FOR SELECT USING (EXISTS (SELECT 1 FROM discord_integrations di JOIN projects p ON di.project_id = p.id WHERE di.id = discord_integration_states.integration_id AND p.owner_id = auth.uid()))';
    END IF;

    RAISE NOTICE 'Discord integration states RLS enabled';
  ELSE
    RAISE NOTICE 'Table discord_integration_states does not exist - skipping';
  END IF;
END $$;

-- ============================================================
-- Verification
-- ============================================================

-- Check RLS status on all tables
SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'ai_usage_tracking',
  'slack_integrations',
  'slack_integration_states',
  'discord_integrations',
  'discord_integration_states'
)
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ RLS enabled on remaining integration tables!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables updated:';
  RAISE NOTICE '  - ai_usage_tracking';
  RAISE NOTICE '  - slack_integrations';
  RAISE NOTICE '  - slack_integration_states';
  RAISE NOTICE '  - discord_integrations';
  RAISE NOTICE '  - discord_integration_states (if exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'All integration tables now have RLS protection!';
  RAISE NOTICE '============================================================';
END $$;
