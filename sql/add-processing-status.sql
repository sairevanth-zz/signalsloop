-- Add processing_status column to discovered_feedback table
-- For background processing pipeline (Option C1)

-- Add the column with default 'complete' so existing records are marked as processed
ALTER TABLE discovered_feedback 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'complete'
CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed'));

-- Create index for efficient querying of pending items
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_processing_status 
ON discovered_feedback(processing_status) 
WHERE processing_status = 'pending';

-- Add composite index for cron job query (oldest pending items first)
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_pending_created
ON discovered_feedback(created_at)
WHERE processing_status = 'pending';
