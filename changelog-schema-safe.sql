-- SAFE Changelog System Schema
-- This version handles existing tables and avoids conflicts

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS changelog_webhooks CASCADE;
DROP TABLE IF EXISTS changelog_feedback_links CASCADE;
DROP TABLE IF EXISTS changelog_subscriptions CASCADE;
DROP TABLE IF EXISTS changelog_media CASCADE;
DROP TABLE IF EXISTS changelog_entries CASCADE;
DROP TABLE IF EXISTS changelog_releases CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 1. Create changelog releases table
CREATE TABLE changelog_releases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  release_type VARCHAR(20) DEFAULT 'minor' CHECK (release_type IN ('major', 'minor', 'patch', 'hotfix')),
  release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  version VARCHAR(50),
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, slug)
);

-- 2. Create changelog entries table
CREATE TABLE changelog_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES changelog_releases(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  entry_type VARCHAR(20) DEFAULT 'feature' CHECK (entry_type IN ('feature', 'improvement', 'fix', 'security', 'breaking')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#3B82F6',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create changelog media table
CREATE TABLE changelog_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES changelog_releases(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER,
  alt_text VARCHAR(255),
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  is_video BOOLEAN DEFAULT false,
  video_thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create changelog subscriptions table
CREATE TABLE changelog_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  subscription_token VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_notified_at TIMESTAMP WITH TIME ZONE,
  notification_preferences JSONB DEFAULT '{"email": true, "major": true, "minor": true, "patch": false}',
  UNIQUE(project_id, email)
);

-- 5. Create changelog feedback links table
CREATE TABLE changelog_feedback_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES changelog_releases(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(release_id, post_id)
);

-- 6. Create changelog webhooks table
CREATE TABLE changelog_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret VARCHAR(255),
  events TEXT[] DEFAULT ARRAY['release.published'],
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create indexes for performance
CREATE INDEX idx_changelog_releases_project ON changelog_releases(project_id);
CREATE INDEX idx_changelog_releases_published ON changelog_releases(published_at DESC);
CREATE INDEX idx_changelog_releases_slug ON changelog_releases(slug);
CREATE INDEX idx_changelog_releases_featured ON changelog_releases(is_featured, published_at DESC);
CREATE INDEX idx_changelog_entries_release ON changelog_entries(release_id);
CREATE INDEX idx_changelog_entries_type ON changelog_entries(entry_type);
CREATE INDEX idx_changelog_entries_order ON changelog_entries(release_id, order_index);
CREATE INDEX idx_changelog_media_release ON changelog_media(release_id);
CREATE INDEX idx_changelog_subscriptions_project ON changelog_subscriptions(project_id);
CREATE INDEX idx_changelog_subscriptions_email ON changelog_subscriptions(email);
CREATE INDEX idx_changelog_feedback_links_release ON changelog_feedback_links(release_id);
CREATE INDEX idx_changelog_feedback_links_post ON changelog_feedback_links(post_id);
CREATE INDEX idx_changelog_webhooks_project ON changelog_webhooks(project_id);

-- 8. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for updated_at
CREATE TRIGGER update_changelog_releases_updated_at BEFORE UPDATE ON changelog_releases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_changelog_entries_updated_at BEFORE UPDATE ON changelog_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_changelog_webhooks_updated_at BEFORE UPDATE ON changelog_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
