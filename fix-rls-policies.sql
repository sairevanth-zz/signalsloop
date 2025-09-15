-- Fix RLS policies to allow anonymous users to create projects and posts
-- Run this in your Supabase SQL Editor

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Anyone can create posts" ON posts;
DROP POLICY IF EXISTS "Anyone can create votes" ON votes;
DROP POLICY IF EXISTS "Anyone can create comments" ON comments;

-- Create more permissive policies for anonymous users

-- Allow anyone to create projects (for anonymous users)
CREATE POLICY "Anyone can create projects" ON projects
  FOR INSERT WITH CHECK (true);

-- Allow anyone to create posts
CREATE POLICY "Anyone can create posts" ON posts
  FOR INSERT WITH CHECK (true);

-- Allow anyone to create votes
CREATE POLICY "Anyone can create votes" ON votes
  FOR INSERT WITH CHECK (true);

-- Allow anyone to create comments
CREATE POLICY "Anyone can create comments" ON comments
  FOR INSERT WITH CHECK (true);

-- Allow project owners to update their projects
CREATE POLICY "Project owners can update projects" ON projects
  FOR UPDATE USING (
    auth.uid() = owner_id OR owner_id IS NULL
  );

-- Allow project owners to delete their projects
CREATE POLICY "Project owners can delete projects" ON projects
  FOR DELETE USING (
    auth.uid() = owner_id OR owner_id IS NULL
  );

-- Allow project owners to update posts
CREATE POLICY "Project owners can update posts" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = posts.project_id 
      AND (projects.owner_id = auth.uid() OR projects.owner_id IS NULL)
    )
  );

-- Allow project owners to delete posts
CREATE POLICY "Project owners can delete posts" ON posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = posts.project_id 
      AND (projects.owner_id = auth.uid() OR projects.owner_id IS NULL)
    )
  );

-- Allow users to delete their own votes
CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (
    auth.uid() = author_id OR author_id IS NULL
  );

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (
    auth.uid() = author_id OR author_id IS NULL
  );

SELECT 'RLS policies updated successfully!' as message;
