-- ============================================
-- Ask SignalsLoop V2 - Database Migration
-- December 3, 2025
-- ============================================
-- This migration adds support for voice input and action execution
-- to the existing Ask SignalsLoop feature.

-- ============================================
-- Add voice support to messages table
-- ============================================

-- Add voice-related columns to ask_messages
ALTER TABLE ask_messages
ADD COLUMN IF NOT EXISTS is_voice_input BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
ADD COLUMN IF NOT EXISTS voice_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS action_executed TEXT,
ADD COLUMN IF NOT EXISTS action_result JSONB,
ADD COLUMN IF NOT EXISTS action_status TEXT CHECK (action_status IN ('pending', 'executing', 'completed', 'failed'));

-- Add index for action status queries
CREATE INDEX IF NOT EXISTS idx_ask_messages_action_status
ON ask_messages(action_status) WHERE action_status IS NOT NULL;

-- ============================================
-- Create scheduled queries table
-- ============================================

CREATE TABLE IF NOT EXISTS ask_scheduled_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Query details
  query_text TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_utc TIME NOT NULL DEFAULT '09:00:00', -- Default 9 AM UTC

  -- Delivery settings
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'slack', 'both')),
  slack_channel_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for scheduled queries
CREATE INDEX IF NOT EXISTS idx_scheduled_queries_project
ON ask_scheduled_queries(project_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_queries_next_run
ON ask_scheduled_queries(next_run_at) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_scheduled_queries_user
ON ask_scheduled_queries(user_id);

-- ============================================
-- Create action executions log table
-- ============================================

CREATE TABLE IF NOT EXISTS ask_action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES ask_messages(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_prd',
    'create_spec',
    'escalate_issue',
    'generate_report',
    'create_roadmap_item',
    'send_notification',
    'schedule_query'
  )),
  action_parameters JSONB NOT NULL,

  -- Execution status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'executing',
    'completed',
    'failed',
    'cancelled'
  )),

  -- Results
  result_data JSONB,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for action executions
CREATE INDEX IF NOT EXISTS idx_action_executions_message
ON ask_action_executions(message_id);

CREATE INDEX IF NOT EXISTS idx_action_executions_status
ON ask_action_executions(status);

CREATE INDEX IF NOT EXISTS idx_action_executions_user
ON ask_action_executions(user_id);

CREATE INDEX IF NOT EXISTS idx_action_executions_created
ON ask_action_executions(created_at DESC);

-- ============================================
-- Create proactive suggestions table
-- ============================================

CREATE TABLE IF NOT EXISTS ask_proactive_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Suggestion details
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'sentiment_drop',
    'theme_spike',
    'churn_risk',
    'opportunity',
    'competitor_move'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  query_suggestion TEXT NOT NULL, -- Suggested query to learn more

  -- Priority and status
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'acted_upon')),

  -- Context
  context_data JSONB,

  -- User interaction
  viewed_by_users UUID[] DEFAULT '{}',
  dismissed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  dismissed_at TIMESTAMPTZ,
  acted_upon_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Add indexes for proactive suggestions
CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_project
ON ask_proactive_suggestions(project_id);

CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_status
ON ask_proactive_suggestions(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_priority
ON ask_proactive_suggestions(priority, created_at DESC);

-- ============================================
-- Row-Level Security Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE ask_scheduled_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_proactive_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies for ask_scheduled_queries
CREATE POLICY "Users can view scheduled queries for their projects"
ON ask_scheduled_queries FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create scheduled queries for their projects"
ON ask_scheduled_queries FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT project_id FROM members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own scheduled queries"
ON ask_scheduled_queries FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own scheduled queries"
ON ask_scheduled_queries FOR DELETE
USING (user_id = auth.uid());

-- Policies for ask_action_executions
CREATE POLICY "Users can view action executions for their projects"
ON ask_action_executions FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "System can insert action executions"
ON ask_action_executions FOR INSERT
WITH CHECK (true); -- Service role only

-- Policies for ask_proactive_suggestions
CREATE POLICY "Users can view proactive suggestions for their projects"
ON ask_proactive_suggestions FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "System can insert proactive suggestions"
ON ask_proactive_suggestions FOR INSERT
WITH CHECK (true); -- Service role only

CREATE POLICY "Users can update proactive suggestions for their projects"
ON ask_proactive_suggestions FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);

-- ============================================
-- Functions
-- ============================================

-- Function to calculate next run time for scheduled queries
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  frequency TEXT,
  day_of_week INTEGER,
  day_of_month INTEGER,
  time_utc TIME,
  from_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  next_run TIMESTAMPTZ;
  base_date DATE;
  base_time TIME;
BEGIN
  base_date := (from_time AT TIME ZONE 'UTC')::DATE;
  base_time := (from_time AT TIME ZONE 'UTC')::TIME;

  CASE frequency
    WHEN 'daily' THEN
      -- If time has passed today, schedule for tomorrow
      IF base_time >= time_utc THEN
        next_run := (base_date + INTERVAL '1 day')::TIMESTAMP + time_utc;
      ELSE
        next_run := base_date::TIMESTAMP + time_utc;
      END IF;

    WHEN 'weekly' THEN
      -- Find next occurrence of day_of_week
      next_run := base_date::TIMESTAMP + time_utc;
      WHILE EXTRACT(DOW FROM next_run) != day_of_week OR next_run <= from_time LOOP
        next_run := next_run + INTERVAL '1 day';
      END LOOP;

    WHEN 'monthly' THEN
      -- Find next occurrence of day_of_month
      next_run := make_timestamp(
        EXTRACT(YEAR FROM base_date)::INT,
        EXTRACT(MONTH FROM base_date)::INT,
        LEAST(day_of_month, EXTRACT(DAY FROM (DATE_TRUNC('month', base_date) + INTERVAL '1 month - 1 day'))::INT),
        EXTRACT(HOUR FROM time_utc)::INT,
        EXTRACT(MINUTE FROM time_utc)::INT,
        0
      );

      -- If this month's date has passed, move to next month
      IF next_run <= from_time THEN
        next_run := make_timestamp(
          EXTRACT(YEAR FROM (base_date + INTERVAL '1 month'))::INT,
          EXTRACT(MONTH FROM (base_date + INTERVAL '1 month'))::INT,
          LEAST(day_of_month, EXTRACT(DAY FROM (DATE_TRUNC('month', base_date + INTERVAL '2 months') - INTERVAL '1 day'))::INT),
          EXTRACT(HOUR FROM time_utc)::INT,
          EXTRACT(MINUTE FROM time_utc)::INT,
          0
        );
      END IF;
  END CASE;

  RETURN next_run;
END;
$$;

-- Trigger to automatically calculate next_run_at on insert/update
CREATE OR REPLACE FUNCTION update_scheduled_query_next_run()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.next_run_at := calculate_next_run_time(
    NEW.frequency,
    NEW.day_of_week,
    NEW.day_of_month,
    NEW.time_utc,
    COALESCE(NEW.last_run_at, NOW())
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_scheduled_query_next_run
BEFORE INSERT OR UPDATE ON ask_scheduled_queries
FOR EACH ROW
EXECUTE FUNCTION update_scheduled_query_next_run();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE ask_scheduled_queries IS 'Recurring queries that run automatically and deliver results via email/Slack';
COMMENT ON TABLE ask_action_executions IS 'Log of all action executions triggered by Ask SignalsLoop';
COMMENT ON TABLE ask_proactive_suggestions IS 'AI-generated proactive suggestions based on detected patterns';

COMMENT ON COLUMN ask_messages.is_voice_input IS 'Whether this message was created from voice input';
COMMENT ON COLUMN ask_messages.voice_transcript IS 'The transcribed text from voice input';
COMMENT ON COLUMN ask_messages.voice_duration_seconds IS 'Duration of the voice recording in seconds';
COMMENT ON COLUMN ask_messages.action_executed IS 'The action type that was executed (if any)';
COMMENT ON COLUMN ask_messages.action_result IS 'Result data from the executed action';
COMMENT ON COLUMN ask_messages.action_status IS 'Status of the action execution';
