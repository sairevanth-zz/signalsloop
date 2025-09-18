-- Set your user to Pro plan
-- Run this in your Supabase SQL Editor

-- 1. First, make sure the users table exists (run fix-user-plan-schema.sql first)

-- 2. Set your user to Pro plan (replace with your actual email)
UPDATE users 
SET plan = 'pro' 
WHERE email = 'sai.chandupatla@gmail.com';

-- 3. Verify the update
SELECT id, email, plan, created_at 
FROM users 
WHERE email = 'sai.chandupatla@gmail.com';
