-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Insert missing user record
INSERT INTO users (id, email, plan)
VALUES ('32e10755-ecd6-4cfd-94b1-ee9d32483ac0', 'sai.chandupatla@gmail.com', 'pro')
ON CONFLICT (id) 
DO UPDATE SET 
  plan = 'pro',
  updated_at = NOW();

-- Verify the user was created/updated
SELECT id, email, plan, updated_at 
FROM users 
WHERE id = '32e10755-ecd6-4cfd-94b1-ee9d32483ac0';
