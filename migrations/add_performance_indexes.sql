-- Performance optimization indexes for load testing
-- Run this migration in Supabase SQL Editor

-- Index for posts by project_id and status (used in main posts query)
CREATE INDEX IF NOT EXISTS idx_posts_project_status
ON posts(project_id, status)
WHERE status = 'open';

-- Index for posts by project_id, category, and status
CREATE INDEX IF NOT EXISTS idx_posts_project_category_status
ON posts(project_id, category, status)
WHERE status = 'open';

-- Index for posts sorting by vote_count
CREATE INDEX IF NOT EXISTS idx_posts_vote_count
ON posts(vote_count DESC)
WHERE status = 'open';

-- Index for posts sorting by created_at
CREATE INDEX IF NOT EXISTS idx_posts_created_at
ON posts(created_at DESC)
WHERE status = 'open';

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_posts_project_status_created
ON posts(project_id, status, created_at DESC);

-- Index for votes by post_id and ip_address (used in vote checking)
CREATE INDEX IF NOT EXISTS idx_votes_post_ip
ON votes(post_id, ip_address);

-- Index for votes by ip_address (for bulk vote checking)
CREATE INDEX IF NOT EXISTS idx_votes_ip_post
ON votes(ip_address, post_id);

-- Index for api_keys by key_hash (used in rate limiting)
CREATE INDEX IF NOT EXISTS idx_api_keys_hash
ON api_keys(key_hash);

-- Analyze tables to update query planner statistics
ANALYZE posts;
ANALYZE votes;
ANALYZE api_keys;
ANALYZE projects;
