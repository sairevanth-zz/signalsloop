-- Hunter Scalability Migration
-- Adds priority column for Phase 4: Priority Queue

-- Add priority column to hunter_jobs
ALTER TABLE hunter_jobs 
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;

-- Add index for faster priority-based ordering
CREATE INDEX IF NOT EXISTS idx_hunter_jobs_priority 
ON hunter_jobs (status, priority DESC, created_at ASC);

-- Update the claim_hunter_job RPC to order by priority DESC
-- This ensures premium users get processed first
CREATE OR REPLACE FUNCTION claim_hunter_job(
    p_job_type TEXT,
    p_worker_id TEXT
)
RETURNS SETOF hunter_jobs
LANGUAGE plpgsql
AS $$
DECLARE
    claimed_job hunter_jobs;
BEGIN
    -- Atomically claim the highest priority pending job
    -- Order by: priority DESC (high priority first), created_at ASC (oldest first within same priority)
    UPDATE hunter_jobs
    SET 
        status = 'processing',
        locked_by = p_worker_id,
        locked_at = NOW(),
        started_at = COALESCE(started_at, NOW())
    WHERE id = (
        SELECT id 
        FROM hunter_jobs 
        WHERE job_type = p_job_type 
          AND status = 'pending'
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING * INTO claimed_job;
    
    IF claimed_job.id IS NOT NULL THEN
        RETURN NEXT claimed_job;
    END IF;
    
    RETURN;
END;
$$;

-- Comment for documentation
COMMENT ON COLUMN hunter_jobs.priority IS 'Job priority: 0=free, 10=pro, 20=premium, 30=enterprise. Higher values processed first.';
