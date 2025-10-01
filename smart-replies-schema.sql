-- Smart Replies Feature Schema
-- This table stores AI-generated smart replies for posts

CREATE TABLE IF NOT EXISTS smart_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  reply_type VARCHAR(50) NOT NULL DEFAULT 'follow_up', -- 'follow_up', 'clarification', 'details'
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_smart_replies_post_id ON smart_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_smart_replies_type ON smart_replies(reply_type);
CREATE INDEX IF NOT EXISTS idx_smart_replies_used ON smart_replies(is_used);

-- Add RLS policies
ALTER TABLE smart_replies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view smart replies for posts in their projects
CREATE POLICY "Users can view smart replies for their project posts" ON smart_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = smart_replies.post_id
      AND pr.owner_id = auth.uid()
    )
  );

-- Policy: Service role can insert smart replies
CREATE POLICY "Service role can insert smart replies" ON smart_replies
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update smart replies (mark as used)
CREATE POLICY "Users can update smart replies" ON smart_replies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = smart_replies.post_id
      AND pr.owner_id = auth.uid()
    )
  );

-- Add smart replies settings to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS smart_replies_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS smart_replies_config JSONB DEFAULT '{"max_replies": 3, "reply_types": ["follow_up", "clarification", "details"]}';

-- Function to generate smart replies for a post
CREATE OR REPLACE FUNCTION generate_smart_replies(post_id UUID)
RETURNS TABLE(reply_text TEXT, reply_type VARCHAR(50))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_data RECORD;
BEGIN
  -- Get post details
  SELECT title, description, category, author_name, author_email
  INTO post_data
  FROM posts
  WHERE id = post_id;
  
  -- This function will be called by the API to generate replies
  -- The actual AI logic will be in the API endpoint
  RETURN;
END;
$$;
