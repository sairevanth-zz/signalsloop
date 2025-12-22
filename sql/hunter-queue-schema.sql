-- Hunter Queue Architecture Schema
-- Run this in Supabase SQL Editor

-- ==========================================
-- TABLE: hunter_scans (Parent scan record)
-- ==========================================
CREATE TABLE IF NOT EXISTS hunter_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'complete', 'partial', 'failed', 'cancelled')),
  -- Platform status: {"reddit": "complete", "hn": "pending", "g2": "failed"}
  platforms JSONB NOT NULL DEFAULT '{}',
  -- Stats
  total_discovered INT DEFAULT 0,
  total_relevant INT DEFAULT 0,
  total_classified INT DEFAULT 0,
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  -- User who triggered the scan
  triggered_by UUID REFERENCES auth.users(id)
);

-- ==========================================
-- TABLE: hunter_jobs (Job queue with locking)
-- ==========================================
CREATE TABLE IF NOT EXISTS hunter_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES hunter_scans(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('discovery', 'relevance', 'classify')),
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  -- Locking for race condition prevention
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  -- Retry logic
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error TEXT,
  next_retry_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ==========================================
-- TABLE: hunter_raw_items (Staging table)
-- ==========================================
CREATE TABLE IF NOT EXISTS hunter_raw_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES hunter_scans(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  platform TEXT NOT NULL,
  -- External data
  external_id TEXT,
  external_url TEXT,
  title TEXT,
  content TEXT NOT NULL,
  author TEXT,
  posted_at TIMESTAMPTZ,
  raw_metadata JSONB DEFAULT '{}',
  -- Relevance stage (Stage 2)
  relevance_score INT,
  relevance_decision TEXT CHECK (relevance_decision IN ('include', 'exclude', 'human_review')),
  relevance_reason TEXT,
  -- Classification stage (Stage 3)
  classification JSONB,
  -- Stage tracking
  stage TEXT DEFAULT 'discovered' CHECK (stage IN ('discovered', 'filtered', 'classified', 'stored', 'excluded')),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Jobs: Find pending jobs efficiently
CREATE INDEX IF NOT EXISTS idx_hunter_jobs_pending 
  ON hunter_jobs(job_type, created_at) 
  WHERE status = 'pending';

-- Jobs: Find jobs by scan
CREATE INDEX IF NOT EXISTS idx_hunter_jobs_scan 
  ON hunter_jobs(scan_id);

-- Raw items: Find items by scan and stage
CREATE INDEX IF NOT EXISTS idx_hunter_raw_items_scan_stage 
  ON hunter_raw_items(scan_id, stage);

-- Raw items: Deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_hunter_raw_items_dedup 
  ON hunter_raw_items(scan_id, platform, external_id)
  WHERE external_id IS NOT NULL;

-- Scans: Find by project
CREATE INDEX IF NOT EXISTS idx_hunter_scans_project 
  ON hunter_scans(project_id, status);

-- ==========================================
-- RPC: Atomic job claiming (prevents race conditions)
-- ==========================================
CREATE OR REPLACE FUNCTION claim_hunter_job(
  p_job_type TEXT,
  p_worker_id TEXT
) RETURNS SETOF hunter_jobs AS $$
  UPDATE hunter_jobs 
  SET status = 'processing',
      locked_by = p_worker_id,
      locked_at = now(),
      started_at = now(),
      attempts = attempts + 1
  WHERE id = (
    SELECT id FROM hunter_jobs 
    WHERE status = 'pending' 
      AND job_type = p_job_type
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY created_at 
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *
$$ LANGUAGE sql;

-- ==========================================
-- RPC: Complete a job
-- ==========================================
CREATE OR REPLACE FUNCTION complete_hunter_job(
  p_job_id UUID
) RETURNS void AS $$
  UPDATE hunter_jobs 
  SET status = 'complete',
      completed_at = now(),
      locked_by = NULL,
      locked_at = NULL
  WHERE id = p_job_id
$$ LANGUAGE sql;

-- ==========================================
-- RPC: Fail a job (with optional retry scheduling)
-- ==========================================
CREATE OR REPLACE FUNCTION fail_hunter_job(
  p_job_id UUID,
  p_error TEXT,
  p_should_retry BOOLEAN DEFAULT true
) RETURNS void AS $$
DECLARE
  v_attempts INT;
  v_max_attempts INT;
  v_backoff_ms INT[];
BEGIN
  -- Get current attempt count
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM hunter_jobs WHERE id = p_job_id;
  
  v_backoff_ms := ARRAY[0, 30000, 60000]; -- 0s, 30s, 60s
  
  IF p_should_retry AND v_attempts < v_max_attempts THEN
    -- Schedule retry with backoff
    UPDATE hunter_jobs 
    SET status = 'pending',
        error = p_error,
        locked_by = NULL,
        locked_at = NULL,
        next_retry_at = now() + (v_backoff_ms[LEAST(v_attempts, 3)] || ' milliseconds')::interval
    WHERE id = p_job_id;
  ELSE
    -- Mark as permanently failed
    UPDATE hunter_jobs 
    SET status = 'failed',
        error = p_error,
        completed_at = now(),
        locked_by = NULL,
        locked_at = NULL
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- RPC: Recover stale jobs (workers that crashed)
-- ==========================================
CREATE OR REPLACE FUNCTION recover_stale_hunter_jobs() RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  WITH recovered AS (
    UPDATE hunter_jobs 
    SET status = 'pending', 
        locked_by = NULL, 
        locked_at = NULL,
        next_retry_at = now() -- Retry immediately
    WHERE status = 'processing' 
      AND locked_at < now() - interval '5 minutes'
    RETURNING id
  )
  SELECT count(*)::int INTO v_count FROM recovered;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- RPC: Update scan stats
-- ==========================================
CREATE OR REPLACE FUNCTION update_hunter_scan_stats(
  p_scan_id UUID,
  p_discovered INT DEFAULT 0,
  p_relevant INT DEFAULT 0,
  p_classified INT DEFAULT 0
) RETURNS void AS $$
  UPDATE hunter_scans 
  SET total_discovered = total_discovered + p_discovered,
      total_relevant = total_relevant + p_relevant,
      total_classified = total_classified + p_classified
  WHERE id = p_scan_id
$$ LANGUAGE sql;

-- ==========================================
-- RPC: Check if scan is complete
-- ==========================================
CREATE OR REPLACE FUNCTION check_hunter_scan_complete(p_scan_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_pending INT;
  v_failed INT;
  v_total INT;
BEGIN
  SELECT 
    count(*) FILTER (WHERE status IN ('pending', 'processing')),
    count(*) FILTER (WHERE status = 'failed'),
    count(*)
  INTO v_pending, v_failed, v_total
  FROM hunter_jobs
  WHERE scan_id = p_scan_id;
  
  IF v_pending = 0 THEN
    -- All jobs done
    IF v_failed > 0 AND v_failed < v_total THEN
      -- Some failed, some succeeded
      UPDATE hunter_scans SET status = 'partial', completed_at = now() WHERE id = p_scan_id;
    ELSIF v_failed = v_total THEN
      -- All failed
      UPDATE hunter_scans SET status = 'failed', completed_at = now() WHERE id = p_scan_id;
    ELSE
      -- All succeeded
      UPDATE hunter_scans SET status = 'complete', completed_at = now() WHERE id = p_scan_id;
    END IF;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Enable Realtime for scan updates
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE hunter_scans;

-- ==========================================
-- DONE! Run the verification query below
-- ==========================================
SELECT 'Schema created successfully!' as status;

-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('hunter_scans', 'hunter_jobs', 'hunter_raw_items');
