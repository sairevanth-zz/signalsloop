-- Add name field to users table for account name customization
-- Run this in your Supabase SQL Editor

-- Add name column if it doesn't exist
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Add index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);

-- Update RLS policies to allow users to update their own name
-- (This should already be covered by existing "Users can update own data" policy)
-- Just ensuring it exists
DO $$
BEGIN
  -- Check if policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can update own data'
  ) THEN
    CREATE POLICY "Users can update own data" ON public.users
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Update the handle_new_user function to include name from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Try to extract name from user metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'first_name',
    NULL
  );

  INSERT INTO public.users (id, email, name, plan)
  VALUES (NEW.id, NEW.email, user_name, 'free')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment for documentation
COMMENT ON COLUMN public.users.name IS 'User display name - can be customized by the user';
