-- Set up automatic user creation for all new signups
-- This ensures every new user gets a proper users table record

-- Create function to automatically create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user record when auth.users gets a new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to backfill missing user records for existing users
CREATE OR REPLACE FUNCTION public.backfill_user_records()
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, plan)
  SELECT 
    au.id, 
    au.email, 
    'free' as plan
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the backfill function to create missing user records
SELECT public.backfill_user_records();

-- Verify all users now have records
SELECT 
  'Total auth users:' as metric, 
  COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
  'Total user records:' as metric, 
  COUNT(*) as count 
FROM users;
