-- Enhanced Roadmap Schema - Safe Migration
-- This version checks for column existence before creating policies

-- 1. Add roadmap enhancement fields to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS effort_estimate VARCHAR(5) DEFAULT 'M' CHECK (effort_estimate IN ('XS', 'S', 'M', 'L', 'XL')),
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS estimated_timeline VARCHAR(100),
ADD COLUMN IF NOT EXISTS completion_date DATE,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Add roadmap customization fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS roadmap_title VARCHAR(200),
ADD COLUMN IF NOT EXISTS roadmap_description TEXT,
ADD COLUMN IF NOT EXISTS roadmap_logo_url TEXT,
ADD COLUMN IF NOT EXISTS roadmap_brand_color VARCHAR(7) DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS roadmap_custom_css TEXT,
ADD COLUMN IF NOT EXISTS roadmap_show_progress BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS roadmap_show_effort BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS roadmap_show_timeline BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS roadmap_allow_anonymous_votes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS roadmap_subscribe_emails BOOLEAN DEFAULT false;

-- 3. Create roadmap subscriptions table for email notifications
CREATE TABLE IF NOT EXISTS roadmap_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  subscription_token VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_notified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, email)
);

-- 4. Create roadmap feedback table for anonymous comments
CREATE TABLE IF NOT EXISTS roadmap_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_email VARCHAR(255),
  author_name VARCHAR(100),
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_priority ON posts(priority);
CREATE INDEX IF NOT EXISTS idx_posts_effort_estimate ON posts(effort_estimate);
CREATE INDEX IF NOT EXISTS idx_posts_progress_percentage ON posts(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_posts_completion_date ON posts(completion_date);
CREATE INDEX IF NOT EXISTS idx_posts_last_updated ON posts(last_updated);
CREATE INDEX IF NOT EXISTS idx_roadmap_subscriptions_project ON roadmap_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_subscriptions_email ON roadmap_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_roadmap_feedback_post ON roadmap_feedback(post_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_feedback_created ON roadmap_feedback(created_at DESC);

-- 6. Enable RLS on new tables
ALTER TABLE roadmap_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_feedback ENABLE ROW LEVEL SECURITY;

-- 7. Add comments to document the new fields
COMMENT ON COLUMN posts.priority IS 'Priority level: low, medium, high, critical';
COMMENT ON COLUMN posts.effort_estimate IS 'Effort estimate using T-shirt sizing: XS, S, M, L, XL';
COMMENT ON COLUMN posts.progress_percentage IS 'Completion percentage (0-100) for in-progress items';
COMMENT ON COLUMN posts.estimated_timeline IS 'Human-readable timeline estimate (e.g., "Q2 2024", "Next month")';
COMMENT ON COLUMN posts.completion_date IS 'Actual or estimated completion date';
COMMENT ON COLUMN posts.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN posts.last_updated IS 'Last time this post was updated';

COMMENT ON COLUMN projects.roadmap_title IS 'Custom title for the roadmap page';
COMMENT ON COLUMN projects.roadmap_description IS 'Mission statement or description for the roadmap';
COMMENT ON COLUMN projects.roadmap_logo_url IS 'URL to company logo for roadmap branding';
COMMENT ON COLUMN projects.roadmap_brand_color IS 'Brand color for roadmap theming (hex code)';
COMMENT ON COLUMN projects.roadmap_custom_css IS 'Custom CSS for advanced theming';
COMMENT ON COLUMN projects.roadmap_show_progress IS 'Whether to show progress bars on roadmap items';
COMMENT ON COLUMN projects.roadmap_show_effort IS 'Whether to show effort estimates';
COMMENT ON COLUMN projects.roadmap_show_timeline IS 'Whether to show timeline estimates';
COMMENT ON COLUMN projects.roadmap_allow_anonymous_votes IS 'Whether anonymous users can vote';
COMMENT ON COLUMN projects.roadmap_subscribe_emails IS 'Whether to allow email subscriptions for updates';
