# 🚨 ACTUAL DEPLOYMENT STEPS - DO THIS NOW

I apologize for the confusion earlier. Here's what you **actually need to do** to make this work:

---

## ❌ What Went Wrong

1. **Database migration was NOT run** - The code expects a `name` column that doesn't exist yet
2. **Welcome page redirect logic needs the database** - Without the migration, new user detection fails
3. **I gave you instructions but you likely didn't run the SQL** - My fault for not being clearer

---

## ✅ ACTUAL STEPS TO FIX (Do These IN ORDER)

### **STEP 1: Run Database Migration** ⚠️ CRITICAL

1. Go to https://supabase.com/dashboard
2. Select your SignalsLoop project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste this ENTIRE SQL script:

\`\`\`sql
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
\`\`\`

6. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
7. Wait for "Success. No rows returned" message

---

### **STEP 2: Verify Database Migration Worked**

Run this query to verify:

\`\`\`sql
-- Check if name column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND table_schema = 'public'
AND column_name = 'name';
\`\`\`

You should see:
| column_name | data_type |
|-------------|-----------|
| name        | text      |

---

### **STEP 3: Code is Already Deployed**

The code changes are already in your Vercel deployment (the build succeeded).

---

### **STEP 4: Test With New User**

Now test with a **brand new Gmail account**:

1. Sign out from SignalsLoop
2. Go to https://signalsloop.com/login
3. Click "Continue with Google"
4. Use a Gmail you've **NEVER used** with SignalsLoop before
5. Complete OAuth
6. You should now be redirected to `/welcome`
7. You should see your Google name pre-filled

---

## 🧪 Alternative: Test with Existing Account

If you want to test with your current account:

1. Visit: https://signalsloop.com/welcome?force=true
2. This bypasses the "new user" check
3. You should see the name editor

---

## 📧 About Welcome Email

The welcome email **should** send, but check:

1. **Resend API Key** is configured (it is: `re_8TLczLgx_...`)
2. **From Address** is verified in Resend dashboard
3. Check Resend logs: https://resend.com/emails

If emails aren't sending, the feature will still work - the name collection happens on the welcome page regardless.

---

## 🐛 If Welcome Page Still Doesn't Show

After running the SQL migration, if you still don't see the welcome page with a new user:

1. **Check Vercel Function Logs:**
   - Go to https://vercel.com
   - Click your project
   - Click latest deployment
   - Click "Functions" tab
   - Look for `/auth/callback` logs
   - You should see: "User creation check", "User record check", "redirecting to welcome page"

2. **Check Database:**
   \`\`\`sql
   -- See if user was created with name
   SELECT id, email, name, created_at
   FROM public.users
   ORDER BY created_at DESC
   LIMIT 5;
   \`\`\`

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for any errors during OAuth

---

## 🎯 What You Should See After SQL Migration

### For New Google OAuth User:
1. Sign in with Google (new account)
2. → Redirected to `/welcome`
3. → See name field pre-filled with Google name
4. → Can save or skip
5. → Name stored in database

### For Existing Users:
1. Sign in
2. → Redirected directly to `/app` (dashboard)
3. → No welcome page (correct behavior)

---

## ✅ Final Checklist

- [ ] Ran SQL migration in Supabase
- [ ] Verified `name` column exists
- [ ] Tested with new Google account
- [ ] Saw welcome page with name editor
- [ ] Name saved to database successfully

---

## 🆘 Still Not Working?

If after running the SQL migration it still doesn't work:

1. Send me screenshot of Supabase SQL Editor showing the migration ran
2. Send me screenshot of this query result:
   \`\`\`sql
   SELECT * FROM public.users ORDER BY created_at DESC LIMIT 1;
   \`\`\`
3. Send me screenshot of Vercel function logs for `/auth/callback`

---

**The #1 reason this isn't working is the SQL migration hasn't been run yet.**

**Please run the SQL in STEP 1 now, then test again.**
