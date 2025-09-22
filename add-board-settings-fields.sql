-- Add board settings fields to boards table
-- Run this in your Supabase SQL Editor

ALTER TABLE boards ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS allow_anonymous_posts BOOLEAN DEFAULT true;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT false;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS auto_close_days INTEGER;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS custom_css TEXT;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS sort_default VARCHAR(20) DEFAULT 'votes' CHECK (sort_default IN ('votes', 'newest', 'oldest'));
ALTER TABLE boards ADD COLUMN IF NOT EXISTS posts_per_page INTEGER DEFAULT 20;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS show_author_emails BOOLEAN DEFAULT true;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS enable_comments BOOLEAN DEFAULT true;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS enable_voting BOOLEAN DEFAULT true;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS custom_statuses JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN boards.is_private IS 'Whether the board is private (requires authentication)';
COMMENT ON COLUMN boards.allow_anonymous_posts IS 'Whether anonymous users can submit posts';
COMMENT ON COLUMN boards.require_approval IS 'Whether posts require approval before being visible';
COMMENT ON COLUMN boards.auto_close_days IS 'Number of days after which posts are automatically closed (null = never)';
COMMENT ON COLUMN boards.custom_css IS 'Custom CSS styles for the board';
COMMENT ON COLUMN boards.welcome_message IS 'Welcome message shown to users';
COMMENT ON COLUMN boards.sort_default IS 'Default sort order for posts';
COMMENT ON COLUMN boards.posts_per_page IS 'Number of posts to show per page';
COMMENT ON COLUMN boards.show_author_emails IS 'Whether to show author email addresses';
COMMENT ON COLUMN boards.enable_comments IS 'Whether comments are enabled on posts';
COMMENT ON COLUMN boards.enable_voting IS 'Whether voting is enabled on posts';
COMMENT ON COLUMN boards.custom_statuses IS 'Custom status options for posts (JSON array)';

-- Update existing boards with default values
UPDATE boards SET 
  is_private = false,
  allow_anonymous_posts = true,
  require_approval = false,
  sort_default = 'votes',
  posts_per_page = 20,
  show_author_emails = true,
  enable_comments = true,
  enable_voting = true,
  custom_statuses = '[]'::jsonb
WHERE is_private IS NULL 
   OR allow_anonymous_posts IS NULL 
   OR require_approval IS NULL 
   OR sort_default IS NULL 
   OR posts_per_page IS NULL 
   OR show_author_emails IS NULL 
   OR enable_comments IS NULL 
   OR enable_voting IS NULL 
   OR custom_statuses IS NULL;
