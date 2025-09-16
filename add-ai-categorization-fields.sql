-- Add AI categorization fields to posts table
-- Run this in your Supabase SQL Editor

-- Add AI categorization columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS ai_categorized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Add index for category for faster filtering
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_ai_categorized ON posts(ai_categorized);

-- Add comments to document the new fields
COMMENT ON COLUMN posts.category IS 'AI-generated category for the post (Bug, Feature Request, Improvement, etc.)';
COMMENT ON COLUMN posts.ai_categorized IS 'Boolean flag indicating if this post has been processed by AI';
COMMENT ON COLUMN posts.ai_confidence IS 'AI confidence score for the categorization (0.0 to 1.0)';
COMMENT ON COLUMN posts.ai_reasoning IS 'AI explanation for why this category was chosen';
