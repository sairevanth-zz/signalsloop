-- Temporarily disable RLS to get the app working
-- Run this in your Supabase SQL Editor

-- Disable RLS on all tables temporarily
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations DISABLE ROW LEVEL SECURITY;

SELECT 'RLS temporarily disabled - app should work now!' as message;
