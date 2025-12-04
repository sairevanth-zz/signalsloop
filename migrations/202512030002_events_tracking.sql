-- Events Tracking System for Stakeholder Intelligence
-- Tracks important events like feature launches, feedback spikes, competitor moves, etc.

CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('feature_launch', 'feedback_spike', 'competitor_move', 'milestone', 'issue')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  metadata JSONB DEFAULT '{}'::jsonb,
  source_id UUID, -- Reference to related entity (post_id, theme_id, etc.)
  source_type TEXT, -- Type of source (post, theme, competitor, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_timeline_events_project_date ON timeline_events(project_id, event_date DESC);
CREATE INDEX idx_timeline_events_type ON timeline_events(project_id, event_type);
CREATE INDEX idx_timeline_events_severity ON timeline_events(project_id, severity) WHERE severity IS NOT NULL;

-- RLS Policies
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for projects they have access to
CREATE POLICY "Users can view timeline events for their projects"
  ON timeline_events
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Users can create events for their projects
CREATE POLICY "Users can create timeline events for their projects"
  ON timeline_events
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Updated timestamp trigger
CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to detect feedback spikes (runs periodically)
CREATE OR REPLACE FUNCTION detect_feedback_spikes(p_project_id UUID, lookback_days INTEGER DEFAULT 7)
RETURNS TABLE (
  event_type TEXT,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  severity TEXT,
  metadata JSONB
) AS $$
DECLARE
  baseline_count INTEGER;
  recent_count INTEGER;
  spike_threshold NUMERIC := 2.0; -- 2x baseline
BEGIN
  -- Calculate baseline (average daily feedback over lookback period)
  SELECT COUNT(*) / lookback_days INTO baseline_count
  FROM posts
  WHERE project_id = p_project_id
    AND created_at >= NOW() - (lookback_days || ' days')::INTERVAL
    AND created_at < NOW() - INTERVAL '1 day';

  -- Calculate recent count (last 24 hours)
  SELECT COUNT(*) INTO recent_count
  FROM posts
  WHERE project_id = p_project_id
    AND created_at >= NOW() - INTERVAL '1 day';

  -- Check for spike
  IF recent_count > baseline_count * spike_threshold AND baseline_count > 0 THEN
    RETURN QUERY
    SELECT
      'feedback_spike'::TEXT,
      'Feedback Volume Spike Detected'::TEXT,
      format('Received %s feedback items in the last 24 hours (%.1fx normal volume)',
        recent_count,
        recent_count::NUMERIC / NULLIF(baseline_count, 0)
      )::TEXT,
      NOW(),
      CASE
        WHEN recent_count > baseline_count * 3 THEN 'critical'
        WHEN recent_count > baseline_count * 2 THEN 'high'
        ELSE 'medium'
      END::TEXT,
      jsonb_build_object(
        'recent_count', recent_count,
        'baseline_count', baseline_count,
        'spike_ratio', recent_count::NUMERIC / NULLIF(baseline_count, 0)
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate events from recent activity
CREATE OR REPLACE FUNCTION generate_timeline_events(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  events_created INTEGER := 0;
  event_record RECORD;
BEGIN
  -- Detect feedback spikes
  FOR event_record IN
    SELECT * FROM detect_feedback_spikes(p_project_id, 7)
  LOOP
    -- Only create if doesn't exist in last 24 hours
    IF NOT EXISTS (
      SELECT 1 FROM timeline_events
      WHERE project_id = p_project_id
        AND event_type = 'feedback_spike'
        AND event_date >= NOW() - INTERVAL '24 hours'
    ) THEN
      INSERT INTO timeline_events (
        project_id, event_type, title, description, event_date, severity, metadata
      ) VALUES (
        p_project_id,
        event_record.event_type,
        event_record.title,
        event_record.description,
        event_record.event_date,
        event_record.severity,
        event_record.metadata
      );
      events_created := events_created + 1;
    END IF;
  END LOOP;

  -- Detect critical issues (high volume of negative feedback)
  FOR event_record IN
    SELECT
      'issue'::TEXT as event_type,
      format('Critical Issue: %s', category) as title,
      format('%s negative feedback items about %s', COUNT(*), category) as description,
      MAX(created_at) as event_date,
      'high'::TEXT as severity,
      jsonb_build_object('category', category, 'count', COUNT(*)) as metadata
    FROM posts p
    LEFT JOIN sentiment_analysis sa ON sa.post_id = p.id
    WHERE p.project_id = p_project_id
      AND p.created_at >= NOW() - INTERVAL '7 days'
      AND sa.sentiment_score < -0.5
      AND p.category IS NOT NULL
    GROUP BY category
    HAVING COUNT(*) >= 5
  LOOP
    -- Only create if doesn't exist for this category in last 7 days
    IF NOT EXISTS (
      SELECT 1 FROM timeline_events
      WHERE project_id = p_project_id
        AND event_type = 'issue'
        AND metadata->>'category' = event_record.metadata->>'category'
        AND event_date >= NOW() - INTERVAL '7 days'
    ) THEN
      INSERT INTO timeline_events (
        project_id, event_type, title, description, event_date, severity, metadata
      ) VALUES (
        p_project_id,
        event_record.event_type,
        event_record.title,
        event_record.description,
        event_record.event_date,
        event_record.severity,
        event_record.metadata
      );
      events_created := events_created + 1;
    END IF;
  END LOOP;

  RETURN events_created;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE timeline_events IS 'Tracks important events for stakeholder intelligence timeline visualization';
COMMENT ON FUNCTION generate_timeline_events IS 'Auto-generates timeline events from project activity (feedback spikes, critical issues, etc.)';
COMMENT ON FUNCTION detect_feedback_spikes IS 'Detects unusual spikes in feedback volume';
