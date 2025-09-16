-- SignalSloop Database Setup Script
-- Run this in your Supabase SQL Editor

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
  subscription_id VARCHAR(255),
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  downgraded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- 2. Boards Table
CREATE TABLE IF NOT EXISTS boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);

-- 3. Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'planned', 'in_progress', 'done', 'declined')),
  author_email VARCHAR(255),
  author_name VARCHAR(255),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  duplicate_of UUID REFERENCES posts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_project ON posts(project_id);
CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- 4. Votes Table
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id),
  UNIQUE(post_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);

-- 5. Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_email VARCHAR(255),
  author_name VARCHAR(255),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- 6. Members Table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_project ON members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);

-- 7. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- 8. Stripe Settings Table
CREATE TABLE IF NOT EXISTS stripe_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stripe_publishable_key VARCHAR(255),
  stripe_secret_key VARCHAR(255),
  stripe_webhook_secret VARCHAR(255),
  stripe_price_id VARCHAR(255),
  payment_method VARCHAR(50) DEFAULT 'checkout_link',
  test_mode BOOLEAN DEFAULT true,
  configured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_settings_project ON stripe_settings(project_id);

-- 9. Billing Events Table
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  amount INTEGER, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'usd',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_customer ON billing_events(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at DESC);

-- 10. Changelog Entries Table
CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'feature' CHECK (type IN ('feature', 'bugfix', 'improvement', 'announcement')),
  version VARCHAR(50),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_project ON changelog_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_changelog_published ON changelog_entries(published, created_at DESC);

-- 10. Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  type VARCHAR(50) NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON rate_limit_violations(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_project ON rate_limit_violations(project_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Anyone can create posts" ON posts;
DROP POLICY IF EXISTS "Project owners can update posts" ON posts;

DROP POLICY IF EXISTS "Votes are viewable by everyone" ON votes;
DROP POLICY IF EXISTS "Anyone can create votes" ON votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON votes;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;

DROP POLICY IF EXISTS "Project owners can view API keys" ON api_keys;
DROP POLICY IF EXISTS "Project owners can create API keys" ON api_keys;
DROP POLICY IF EXISTS "Project owners can delete API keys" ON api_keys;

-- Projects Policies
CREATE POLICY "Public projects are viewable by everyone" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Posts Policies
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create posts" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Project owners can update posts" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = posts.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Votes Policies
CREATE POLICY "Votes are viewable by everyone" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create votes" ON votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (auth.uid() = user_id);

-- Comments Policies
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create comments" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = author_id);

-- API Keys Policies
CREATE POLICY "Project owners can view API keys" ON api_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = api_keys.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can create API keys" ON api_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = api_keys.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can delete API keys" ON api_keys
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = api_keys.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Billing Events Policies
CREATE POLICY "Project owners can view their billing events" ON billing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.stripe_customer_id = billing_events.stripe_customer_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Functions and Triggers
CREATE OR REPLACE FUNCTION update_post_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET vote_count = vote_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET vote_count = vote_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vote_count ON votes;
CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_post_vote_count();

CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_count ON comments;
CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Success message
SELECT 'SignalSloop database setup completed successfully!' as message;
