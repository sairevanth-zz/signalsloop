-- Add parent_id column to comments table to support replies
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- Comments with parent_id are replies, comments with NULL parent_id are top-level comments

