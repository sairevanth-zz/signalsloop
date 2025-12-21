-- Reprocess all existing feedback items
-- Run this to re-run Stage 2 + Stage 3 with the fixed relevance filter

-- Option 1: Reset ALL items to pending (re-filter everything)
UPDATE discovered_feedback 
SET processing_status = 'pending'
WHERE processing_status IN ('complete', 'failed');

-- Option 2: Reset only archived items (re-evaluate false positive decisions)  
-- UPDATE discovered_feedback 
-- SET processing_status = 'pending', is_archived = false
-- WHERE is_archived = true;

-- Option 3: Reset only items without relevance scores (never filtered)
-- UPDATE discovered_feedback 
-- SET processing_status = 'pending'
-- WHERE relevance_score IS NULL AND processing_status = 'complete';
