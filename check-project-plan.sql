-- Check and update project plan to Pro
-- Run this in your Supabase SQL Editor

-- 1. Check current project plans
SELECT id, name, slug, plan, owner_id, created_at 
FROM projects 
ORDER BY created_at DESC;

-- 2. Update your project to Pro plan (replace 'your-project-slug' with your actual slug)
UPDATE projects 
SET plan = 'pro' 
WHERE slug = 'wdsds';  -- Replace 'wdsds' with your actual project slug

-- 3. Verify the update
SELECT id, name, slug, plan, owner_id 
FROM projects 
WHERE slug = 'wdsds';  -- Replace 'wdsds' with your actual project slug
