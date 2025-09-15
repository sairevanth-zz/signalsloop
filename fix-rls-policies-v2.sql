-- Fix RLS policies to allow anonymous users - Version 2
-- This script properly handles existing policies
-- Run this in your Supabase SQL Editor

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Anyone can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete projects" ON projects;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Anyone can create posts" ON posts;
DROP POLICY IF EXISTS "Project owners can update posts" ON posts;
DROP POLICY IF EXISTS "Project owners can delete posts" ON posts;

DROP POLICY IF EXISTS "Votes are viewable by everyone" ON votes;
DROP POLICY IF EXISTS "Anyone can create votes" ON votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON votes;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- Now create the correct policies

-- PROJECTS POLICIES
CREATE POLICY "Public projects are viewable by everyone" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create projects" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Project owners can update projects" ON projects
  FOR UPDATE USING (
    auth.uid() = owner_id OR owner_id IS NULL
  );

CREATE POLICY "Project owners can delete projects" ON projects
  FOR DELETE USING (
    auth.uid() = owner_id OR owner_id IS NULL
  );

-- POSTS POLICIES
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create posts" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Project owners can update posts" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = posts.project_id 
      AND (projects.owner_id = auth.uid() OR projects.owner_id IS NULL)
    )
  );

CREATE POLICY "Project owners can delete posts" ON posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = posts.project_id 
      AND (projects.owner_id = auth.uid() OR projects.owner_id IS NULL)
    )
  );

-- VOTES POLICIES
CREATE POLICY "Votes are viewable by everyone" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create votes" ON votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- COMMENTS POLICIES
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create comments" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (
    auth.uid() = author_id OR author_id IS NULL
  );

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (
    auth.uid() = author_id OR author_id IS NULL
  );

SELECT 'RLS policies updated successfully!' as message;
