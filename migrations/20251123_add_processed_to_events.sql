-- Add 'processed' column to events table for polling-based event processing
-- This allows the event processor to track which events have been handled

-- Add processed column (defaults to false for new events)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

-- Add processed_at timestamp to track when event was processed
ALTER TABLE events
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Add processing_error column to track failed events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Add retry_count column to track how many times we've tried to process this event
ALTER TABLE events
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Create index for efficient querying of unprocessed events
CREATE INDEX IF NOT EXISTS idx_events_unprocessed
ON events(processed, created_at)
WHERE processed = false;

-- Create index for querying events by project and processed status
CREATE INDEX IF NOT EXISTS idx_events_project_unprocessed
ON events((metadata->>'project_id'), processed, created_at)
WHERE processed = false;

-- Add comments
COMMENT ON COLUMN events.processed IS 'Whether this event has been processed by an agent';
COMMENT ON COLUMN events.processed_at IS 'Timestamp when this event was successfully processed';
COMMENT ON COLUMN events.processing_error IS 'Error message if processing failed';
COMMENT ON COLUMN events.retry_count IS 'Number of times we have attempted to process this event';

-- Create function to increment retry count
CREATE OR REPLACE FUNCTION increment_event_retry_count(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET retry_count = COALESCE(retry_count, 0) + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_event_retry_count IS 'Increments the retry count for a failed event';

-- Backfill: Mark all existing events as processed (assume they were handled before this migration)
-- You can set this to false if you want to reprocess old events
UPDATE events SET processed = true, processed_at = created_at WHERE processed IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added event processing tracking columns';
END $$;
