-- Safe fix for Google OAuth database error
-- Run this in Supabase SQL Editor

-- 1. Create users table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  google_id VARCHAR(255) UNIQUE,
  provider VARCHAR(50) DEFAULT 'email',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS (safe to run multiple times)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies and recreate them (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "System can insert users" ON users;

-- 4. Create RLS policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "System can insert users" ON users
  FOR INSERT WITH CHECK (true);

-- 5. Create function to handle new user creation (replace if exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, provider, google_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN NEW.app_metadata->>'provider' = 'google' THEN 'google'
      ELSE 'email'
    END,
    CASE 
      WHEN NEW.app_metadata->>'provider' = 'google' THEN NEW.raw_user_meta_data->>'provider_id'
      ELSE NULL
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error creating user record: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop and recreate trigger (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Create indexes (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- 8. Insert existing auth users (if any) - use ON CONFLICT to avoid duplicates
INSERT INTO public.users (id, email, full_name, provider)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'email'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 9. Verify the setup
SELECT 
  'users' as table_name,
  COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
  'auth.users' as table_name,
  COUNT(*) as record_count
FROM auth.users;
