-- Scheduled Reports
-- Allows users to schedule recurring stakeholder intelligence reports

-- ============================================================================
-- Scheduled Reports Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Report configuration
  query_text TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('ceo', 'sales', 'engineering', 'marketing', 'customer_success', 'product')),
  report_name TEXT NOT NULL,

  -- Schedule configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time_of_day TIME DEFAULT '09:00:00',
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday (for weekly reports)
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31), -- For monthly reports
  timezone TEXT DEFAULT 'UTC',

  -- Delivery configuration
  recipients TEXT[] NOT NULL, -- Array of email addresses
  delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'slack')),
  slack_webhook_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_project
  ON scheduled_reports(project_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user
  ON scheduled_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run
  ON scheduled_reports(next_run_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active
  ON scheduled_reports(is_active, next_run_at);

-- RLS Policies
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own scheduled reports" ON scheduled_reports;
CREATE POLICY "Users can view their own scheduled reports"
  ON scheduled_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = scheduled_reports.project_id
        AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create scheduled reports for their projects" ON scheduled_reports;
CREATE POLICY "Users can create scheduled reports for their projects"
  ON scheduled_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = scheduled_reports.project_id
        AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own scheduled reports" ON scheduled_reports;
CREATE POLICY "Users can update their own scheduled reports"
  ON scheduled_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = scheduled_reports.project_id
        AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own scheduled reports" ON scheduled_reports;
CREATE POLICY "Users can delete their own scheduled reports"
  ON scheduled_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = scheduled_reports.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Report Execution History
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE NOT NULL,

  -- Execution details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- Results
  component_count INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  delivery_status TEXT,
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_executions_scheduled_report
  ON report_executions(scheduled_report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_executions_status
  ON report_executions(status, created_at DESC);

-- RLS Policies
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view execution history for their reports" ON report_executions;
CREATE POLICY "Users can view execution history for their reports"
  ON report_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_reports sr
      JOIN projects p ON p.id = sr.project_id
      WHERE sr.id = report_executions.scheduled_report_id
        AND p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to calculate next run time
DROP FUNCTION IF EXISTS calculate_next_run_time(TEXT, TIME, INTEGER, INTEGER, TEXT, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_frequency TEXT,
  p_time_of_day TIME,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_timezone TEXT,
  p_from_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_run TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ;
BEGIN
  v_current_time := p_from_time AT TIME ZONE p_timezone;

  CASE p_frequency
    WHEN 'daily' THEN
      -- Next occurrence of time_of_day
      v_next_run := (DATE(v_current_time) + p_time_of_day)::TIMESTAMPTZ AT TIME ZONE p_timezone;
      IF v_next_run <= v_current_time THEN
        v_next_run := v_next_run + INTERVAL '1 day';
      END IF;

    WHEN 'weekly' THEN
      -- Next occurrence of day_of_week at time_of_day
      v_next_run := (DATE(v_current_time) + ((p_day_of_week - EXTRACT(DOW FROM v_current_time)::INTEGER + 7) % 7) * INTERVAL '1 day' + p_time_of_day)::TIMESTAMPTZ AT TIME ZONE p_timezone;
      IF v_next_run <= v_current_time THEN
        v_next_run := v_next_run + INTERVAL '7 days';
      END IF;

    WHEN 'monthly' THEN
      -- Next occurrence of day_of_month at time_of_day
      v_next_run := (DATE_TRUNC('month', v_current_time) + (p_day_of_month - 1) * INTERVAL '1 day' + p_time_of_day)::TIMESTAMPTZ AT TIME ZONE p_timezone;
      IF v_next_run <= v_current_time THEN
        v_next_run := (DATE_TRUNC('month', v_current_time) + INTERVAL '1 month' + (p_day_of_month - 1) * INTERVAL '1 day' + p_time_of_day)::TIMESTAMPTZ AT TIME ZONE p_timezone;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
  END CASE;

  RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- Function to update next run time (for trigger)
DROP FUNCTION IF EXISTS update_next_run_time() CASCADE;
CREATE OR REPLACE FUNCTION update_next_run_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_run_at := calculate_next_run_time(
    NEW.frequency,
    NEW.time_of_day,
    NEW.day_of_week,
    NEW.day_of_month,
    NEW.timezone,
    COALESCE(NEW.last_run_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update next_run_at when schedule changes
DROP TRIGGER IF EXISTS update_scheduled_reports_next_run ON scheduled_reports;
CREATE TRIGGER update_scheduled_reports_next_run
  BEFORE INSERT OR UPDATE ON scheduled_reports
  FOR EACH ROW
  WHEN (NEW.is_active = true AND (TG_OP = 'INSERT' OR OLD.frequency IS DISTINCT FROM NEW.frequency OR OLD.time_of_day IS DISTINCT FROM NEW.time_of_day OR OLD.day_of_week IS DISTINCT FROM NEW.day_of_week OR OLD.day_of_month IS DISTINCT FROM NEW.day_of_month))
  EXECUTE FUNCTION update_next_run_time();

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_scheduled_reports_updated_at ON scheduled_reports;
CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE scheduled_reports IS 'Stores scheduled stakeholder intelligence reports';
COMMENT ON TABLE report_executions IS 'Tracks execution history of scheduled reports';
COMMENT ON FUNCTION calculate_next_run_time IS 'Calculates the next run time for a scheduled report';
