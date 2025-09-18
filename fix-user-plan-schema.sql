-- Fix User Plan Schema - Move from Project-level to User-level
-- Run this in your Supabase SQL Editor

-- 1. Create users table with plan information
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id VARCHAR(255),
  subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for users
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- 3. Enable RLS for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for users table
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 5. Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Migrate existing project plans to user plans (if any projects have pro plans)
-- This will set the user who owns the project to pro plan
UPDATE users 
SET plan = 'pro'
WHERE id IN (
  SELECT owner_id 
  FROM projects 
  WHERE plan = 'pro'
);

-- 8. Update existing projects to remove plan column (optional - we can keep it for backward compatibility)
-- ALTER TABLE projects DROP COLUMN IF EXISTS plan;
-- ALTER TABLE projects DROP COLUMN IF EXISTS stripe_customer_id;
-- ALTER TABLE projects DROP COLUMN IF EXISTS subscription_id;
-- ALTER TABLE projects DROP COLUMN IF EXISTS subscription_status;
-- ALTER TABLE projects DROP COLUMN IF EXISTS current_period_end;
-- ALTER TABLE projects DROP COLUMN IF EXISTS cancel_at_period_end;

-- 9. Add updated_at trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
