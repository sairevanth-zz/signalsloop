-- Check if users table exists and has the right structure
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check if users table exists
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check if there are any users in the table
SELECT COUNT(*) as user_count FROM users;

-- Check if the current user exists in users table
-- Replace 'your-user-id' with the actual user ID from the debug info
SELECT id, email, plan, created_at 
FROM users 
WHERE id = '32e10755-ecd6-4cfd-94b1-ee9d32483ac0';

-- Check projects table for this user
SELECT id, name, slug, plan, owner_id 
FROM projects 
WHERE owner_id = '32e10755-ecd6-4cfd-94b1-ee9d32483ac0';

-- If users table doesn't exist or user doesn't exist, create/fix it
-- First, let's see what auth.users looks like
SELECT id, email, created_at 
FROM auth.users 
WHERE id = '32e10755-ecd6-4cfd-94b1-ee9d32483ac0';
