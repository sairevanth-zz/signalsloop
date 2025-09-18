-- Fix Project Slug Uniqueness - Make slugs unique per user instead of globally
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing unique constraint on slug
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_slug_key;

-- 2. Create a new unique constraint on (owner_id, slug) combination
-- This allows multiple users to have projects with the same slug
-- but prevents the same user from having duplicate slugs
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_slug_unique 
ON projects (owner_id, slug);

-- 3. For anonymous users (owner_id is NULL), we need a different approach
-- We'll allow multiple anonymous projects with the same slug since they can't conflict
-- The constraint above handles this case (NULL values don't conflict with each other in unique indexes)

-- 4. Update the existing index to be more specific
DROP INDEX IF EXISTS idx_projects_slug;
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- 5. Add a comment explaining the new constraint
COMMENT ON INDEX projects_owner_slug_unique IS 'Ensures project slugs are unique per user, allowing multiple users to have projects with the same slug';
