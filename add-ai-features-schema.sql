-- AI Features Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Add priority_score column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS priority_score DECIMAL(3,1) DEFAULT 0.0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS priority_reason TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_duplicate_checked_at TIMESTAMP WITH TIME ZONE;

-- 2. Create post_similarities table for duplicate detection
CREATE TABLE IF NOT EXISTS post_similarities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  similar_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  similarity_score DECIMAL(3,2) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  similarity_reason TEXT,
  status VARCHAR(20) DEFAULT 'detected' CHECK (status IN ('detected', 'confirmed', 'dismissed', 'merged')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_similarities_post_id ON post_similarities(post_id);
CREATE INDEX IF NOT EXISTS idx_post_similarities_similar_post_id ON post_similarities(similar_post_id);
CREATE INDEX IF NOT EXISTS idx_post_similarities_status ON post_similarities(status);
CREATE INDEX IF NOT EXISTS idx_posts_priority_score ON posts(priority_score);
CREATE INDEX IF NOT EXISTS idx_posts_ai_analyzed_at ON posts(ai_analyzed_at);

-- 4. Add RLS policies for post_similarities
ALTER TABLE post_similarities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view similarities for their project posts" ON post_similarities;
DROP POLICY IF EXISTS "Users can update similarities for their project posts" ON post_similarities;
DROP POLICY IF EXISTS "System can insert similarities" ON post_similarities;

-- Allow project owners to view similarities for their posts
CREATE POLICY "Users can view similarities for their project posts" ON post_similarities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN boards b ON p.board_id = b.id
      JOIN projects pr ON b.project_id = pr.id
      WHERE (p.id = post_similarities.post_id OR p.id = post_similarities.similar_post_id)
      AND pr.owner_id = auth.uid()
    )
  );

-- Allow project owners to update similarity status
CREATE POLICY "Users can update similarities for their project posts" ON post_similarities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN boards b ON p.board_id = b.id
      JOIN projects pr ON b.project_id = pr.id
      WHERE p.id = post_similarities.post_id
      AND pr.owner_id = auth.uid()
    )
  );

-- Allow system to insert similarities (for AI processing)
CREATE POLICY "System can insert similarities" ON post_similarities
  FOR INSERT WITH CHECK (true);

-- 5. Function to update similarity timestamps
CREATE OR REPLACE FUNCTION update_similarity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger for similarity timestamp updates
DROP TRIGGER IF EXISTS update_similarity_timestamp_trigger ON post_similarities;
CREATE TRIGGER update_similarity_timestamp_trigger
  BEFORE UPDATE ON post_similarities
  FOR EACH ROW
  EXECUTE FUNCTION update_similarity_timestamp();
