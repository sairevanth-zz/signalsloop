# SignalsLoop Database Setup Guide

## 🚨 Current Issue
The SignalsLoop app is not functional because it requires a Supabase database with specific tables and configurations. This guide will help you set up the complete database schema.

## 📋 Prerequisites
1. A Supabase account (free at [supabase.com](https://supabase.com))
2. A new Supabase project

## 🗄️ Database Schema

### 1. Projects Table
```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_owner ON projects(owner_id);
```

### 2. Boards Table
```sql
CREATE TABLE boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_boards_project ON boards(project_id);
```

### 3. Posts Table
```sql
CREATE TABLE posts (
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

CREATE INDEX idx_posts_project ON posts(project_id);
CREATE INDEX idx_posts_board ON posts(board_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
```

### 4. Votes Table
```sql
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id),
  UNIQUE(post_id, ip_address)
);

CREATE INDEX idx_votes_post ON votes(post_id);
CREATE INDEX idx_votes_user ON votes(user_id);
```

### 5. Comments Table
```sql
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_email VARCHAR(255),
  author_name VARCHAR(255),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
```

### 6. Members Table
```sql
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_members_project ON members(project_id);
CREATE INDEX idx_members_user ON members(user_id);
```

### 7. API Keys Table
```sql
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_project ON api_keys(project_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

### 8. Stripe Settings Table
```sql
CREATE TABLE stripe_settings (
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

CREATE INDEX idx_stripe_settings_project ON stripe_settings(project_id);
```

### 9. Changelog Entries Table
```sql
CREATE TABLE changelog_entries (
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

CREATE INDEX idx_changelog_project ON changelog_entries(project_id);
CREATE INDEX idx_changelog_published ON changelog_entries(published, created_at DESC);
```

### 10. Rate Limiting Table
```sql
CREATE TABLE rate_limit_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'post_submission', 'vote', 'comment'
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_ip ON rate_limit_violations(ip_address, created_at);
CREATE INDEX idx_rate_limit_project ON rate_limit_violations(project_id);
```

## 🔐 Row Level Security (RLS) Policies

### Enable RLS on all tables
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
```

### Projects Policies
```sql
-- Users can view all public projects
CREATE POLICY "Public projects are viewable by everyone" ON projects
  FOR SELECT USING (true);

-- Users can create projects
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = owner_id);
```

### Posts Policies
```sql
-- Anyone can view posts
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

-- Anyone can create posts (anonymous allowed)
CREATE POLICY "Anyone can create posts" ON posts
  FOR INSERT WITH CHECK (true);

-- Only project owners can update posts
CREATE POLICY "Project owners can update posts" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = posts.project_id 
      AND projects.owner_id = auth.uid()
    )
  );
```

### Votes Policies
```sql
-- Anyone can view votes
CREATE POLICY "Votes are viewable by everyone" ON votes
  FOR SELECT USING (true);

-- Anyone can create votes (with rate limiting handled in application)
CREATE POLICY "Anyone can create votes" ON votes
  FOR INSERT WITH CHECK (true);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (auth.uid() = user_id);
```

### Comments Policies
```sql
-- Anyone can view comments
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

-- Anyone can create comments
CREATE POLICY "Anyone can create comments" ON comments
  FOR INSERT WITH CHECK (true);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = author_id);
```

### API Keys Policies
```sql
-- Only project owners can view their API keys
CREATE POLICY "Project owners can view API keys" ON api_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = api_keys.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Only project owners can create API keys
CREATE POLICY "Project owners can create API keys" ON api_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = api_keys.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Only project owners can delete API keys
CREATE POLICY "Project owners can delete API keys" ON api_keys
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = api_keys.project_id 
      AND projects.owner_id = auth.uid()
    )
  );
```

## 🔄 Functions and Triggers

### Update vote count trigger
```sql
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

CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_post_vote_count();
```

### Update comment count trigger
```sql
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

CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();
```

## 🌐 Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key

# Stripe Configuration (Optional - for payments)
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email Configuration (Optional - for notifications)
RESEND_API_KEY=your_resend_api_key
```

## 🚀 Setup Steps

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to be ready

2. **Run Database Schema**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste all the SQL commands above
   - Execute them in order

3. **Configure Environment Variables**
   - Copy your Supabase URL and keys from Settings > API
   - Add them to `.env.local`

4. **Test the Setup**
   - Try creating a project at `/app/create`
   - Test voting and commenting functionality
   - Verify authentication works

### 🔄 Keep Dev/Prod Parity (priority voting & helpers)

If you spin up a fresh Supabase project (for dev or staging), run `sync-dev-database.sql` **after** the core schema above.  
This script mirrors the production-only fixes: priority vote columns, vote metadata table, updated helper functions, and the participant view tweaks.

```
-- Supabase SQL Editor
-- Paste the contents of sync-dev-database.sql and run it once.
```

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] All tables created successfully
- [ ] RLS policies applied
- [ ] Triggers working
- [ ] Environment variables set
- [ ] Project creation works
- [ ] Voting works
- [ ] Comments work
- [ ] Authentication works

## 🔧 Troubleshooting

### Common Issues:
1. **"relation does not exist"** - Run the table creation SQL
2. **"permission denied"** - Check RLS policies
3. **"authentication failed"** - Verify environment variables
4. **"rate limit exceeded"** - Check rate limiting implementation

### Testing Commands:
```sql
-- Test project creation
INSERT INTO projects (name, slug, owner_id) VALUES ('Test Project', 'test-project', auth.uid());

-- Test post creation
INSERT INTO posts (project_id, title, description, author_email) 
VALUES ((SELECT id FROM projects WHERE slug = 'test-project'), 'Test Post', 'Test Description', 'test@example.com');

-- Test vote
INSERT INTO votes (post_id, ip_address) 
VALUES ((SELECT id FROM posts WHERE title = 'Test Post'), '127.0.0.1');
```

Once you complete this setup, SignalsLoop will be fully functional with working database operations!
