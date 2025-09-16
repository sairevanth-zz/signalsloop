-- Add AI categorization fields to posts table
-- Run this in your Supabase SQL Editor

-- Add AI categorization columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS ai_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Add index for AI category for faster filtering
CREATE INDEX IF NOT EXISTS idx_posts_ai_category ON posts(ai_category);

-- Add comment to document the new fields
COMMENT ON COLUMN posts.ai_category IS 'AI-generated category for the post (Bug, Feature Request, Improvement, etc.)';
COMMENT ON COLUMN posts.ai_confidence IS 'AI confidence score for the categorization (0.0 to 1.0)';
COMMENT ON COLUMN posts.ai_reasoning IS 'AI explanation for why this category was chosen';
