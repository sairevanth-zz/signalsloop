-- =====================================================
-- Dead Letter Queue for Failed Events
-- =====================================================
-- This migration creates a dead letter queue table to store events
-- that failed processing, allowing for debugging and retry mechanisms.

CREATE TABLE IF NOT EXISTS event_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Original event data
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,

  -- Failure information
  error_message TEXT NOT NULL,
  error_stack TEXT,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'resolved', 'abandoned')),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT, -- User/system that resolved the issue
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_event_dlq_event_type ON event_dead_letter_queue(event_type);
CREATE INDEX idx_event_dlq_status ON event_dead_letter_queue(status);
CREATE INDEX idx_event_dlq_failed_at ON event_dead_letter_queue(failed_at DESC);
CREATE INDEX idx_event_dlq_aggregate ON event_dead_letter_queue(aggregate_type, aggregate_id);

-- Enable RLS
ALTER TABLE event_dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY event_dlq_service_role_all
  ON event_dead_letter_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view DLQ entries for their projects
CREATE POLICY event_dlq_authenticated_read
  ON event_dead_letter_queue
  FOR SELECT
  TO authenticated
  USING (
    metadata->>'project_id' IN (
      SELECT project_id::text
      FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_event_dlq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_dlq_updated_at_trigger
  BEFORE UPDATE ON event_dead_letter_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_event_dlq_updated_at();

-- =====================================================
-- Helper Function: Retry Failed Events
-- =====================================================
-- This function can be called to retry pending/abandoned events

CREATE OR REPLACE FUNCTION retry_failed_event(p_dlq_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_result JSONB;
BEGIN
  -- Get the DLQ entry
  SELECT * INTO v_event
  FROM event_dead_letter_queue
  WHERE id = p_dlq_id
    AND status IN ('pending', 'abandoned');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found or already resolved'
    );
  END IF;

  -- Update retry count and status
  UPDATE event_dead_letter_queue
  SET
    retry_count = retry_count + 1,
    last_retry_at = NOW(),
    status = 'retrying',
    updated_at = NOW()
  WHERE id = p_dlq_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event.event_id,
    'retry_count', v_event.retry_count + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Analytics View: DLQ Summary
-- =====================================================

CREATE OR REPLACE VIEW event_dlq_summary AS
SELECT
  event_type,
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retry_count,
  MAX(failed_at) as last_failure
FROM event_dead_letter_queue
GROUP BY event_type, status
ORDER BY count DESC;

-- Grant access
GRANT SELECT ON event_dlq_summary TO authenticated;
GRANT SELECT ON event_dlq_summary TO service_role;
