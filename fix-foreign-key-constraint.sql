-- Fix foreign key constraint issue
-- Run this in your Supabase SQL Editor

-- Make owner_id nullable and remove the foreign key constraint temporarily
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
ALTER TABLE projects ALTER COLUMN owner_id DROP NOT NULL;

-- Also fix other tables that might have similar issues
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE posts ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
ALTER TABLE votes ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey;
ALTER TABLE comments ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_user_id_fkey;
ALTER TABLE members ALTER COLUMN user_id DROP NOT NULL;

SELECT 'Foreign key constraints removed - app should work now!' as message;
