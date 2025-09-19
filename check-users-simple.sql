-- Simple check for users table
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check user count
SELECT COUNT(*) as user_count FROM users;

-- Check specific user (replace with your user ID)
SELECT id, email, plan, created_at 
FROM users 
WHERE id = '32e10755-ecd6-4cfd-94b1-ee9d32483ac0';

-- Check projects for this user
SELECT id, name, slug, plan, owner_id 
FROM projects 
WHERE owner_id = '32e10755-ecd6-4cfd-94b1-ee9d32483ac0';
