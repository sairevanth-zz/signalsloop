-- Set specific user to Pro plan for testing
-- Replace the user ID with the one from your debug info

-- First ensure the user record exists
INSERT INTO users (id, email, plan)
SELECT 
  '32e10755-ecd6-4cfd-94b1-ee9d32483ac0' as id,
  'sai.chandupatla@gmail.com' as email,
  'pro' as plan
ON CONFLICT (id) 
DO UPDATE SET 
  plan = 'pro',
  updated_at = NOW();

-- Verify the update
SELECT id, email, plan, updated_at 
FROM users 
WHERE id = '32e10755-ecd6-4cfd-94b1-ee9d32483ac0';
