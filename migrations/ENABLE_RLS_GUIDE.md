# Enable RLS - Step-by-Step Migration Guide

This guide walks you through safely fixing all Supabase security issues identified in your dashboard.

## Overview of Issues

- ❌ **21 tables** have RLS disabled
- ⚠️ **35+ functions** have mutable search_path (security vulnerability)
- ⚠️ **2 views** use SECURITY DEFINER (intentional, but flagged)
- ❌ **Leaked password protection** is disabled

## Pre-Migration Checklist

- [ ] Backup your database (Supabase Dashboard → Database → Backups)
- [ ] Test in development/staging first (DO NOT test in production)
- [ ] Ensure you have `SUPABASE_SERVICE_ROLE` key in `.env.local`
- [ ] Notify team members of planned maintenance window

---

## Phase 1: Fix Function Security (ZERO RISK) ✅

**Time estimate:** 5 minutes
**Risk level:** None (pure security improvement)
**Rollback:** Not needed (backward compatible)

### Step 1.1: Run Function Search Path Migration

```bash
# This fixes all SECURITY DEFINER functions to prevent search_path attacks
```

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `migrations/fix-function-search-path.sql`
3. Paste and run
4. Verify: Look for success message at bottom

**Expected output:**
```
✅ Function search_path security fix completed!
```

### Step 1.2: Verify Fix

1. Go to Supabase Dashboard → Advisors → Security Advisor
2. Click "Refresh"
3. "Function Search Path Mutable" warnings should decrease significantly

**Note:** Some functions may not exist in your database (optional features). Errors about missing functions are safe to ignore.

---

## Phase 2: Test RLS Compatibility (ZERO RISK) ✅

**Time estimate:** 5 minutes
**Risk level:** None (read-only test)

### Step 2.1: Run Test Script

```bash
# Install dependencies if needed
npm install

# Run the test script
npx tsx scripts/test-rls-compatibility.ts
```

### Step 2.2: Review Test Results

The script will output a report like:

```
✅ SAFE TO ENABLE RLS
   Your application uses service role for critical operations.
```

or

```
⚠️  REVIEW REQUIRED BEFORE ENABLING RLS
   Some operations currently work with anon key but will fail with RLS.
```

**If you get "SAFE TO ENABLE RLS":** Proceed to Phase 3
**If you get "REVIEW REQUIRED":** See "Troubleshooting" section below

---

## Phase 3: Enable RLS (REQUIRES TESTING) ⚠️

**Time estimate:** 15-30 minutes
**Risk level:** Medium (test thoroughly)
**Rollback:** Disable RLS if issues occur

### Strategy: Enable One Table at a Time

This approach lets you catch issues early without breaking everything at once.

### Step 3.1: Enable RLS on Non-Critical Tables First

Start with tables that have minimal user interaction:

```sql
-- Run these ONE AT A TIME in Supabase SQL Editor

-- 1. Rate limiting (rarely accessed)
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- 2. Billing events (only accessed by webhooks)
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- 3. API keys (only accessed by project owners)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 4. Stripe settings (only accessed by project owners)
ALTER TABLE stripe_settings ENABLE ROW LEVEL SECURITY;
```

**After EACH table:**
1. Test your application
2. Check error logs
3. Verify functionality
4. If issues occur, disable RLS on that table: `ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;`

### Step 3.2: Enable RLS on Core Tables

Once non-critical tables work, enable RLS on core tables:

```sql
-- Run these ONE AT A TIME

-- 1. Boards
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Test: Can users view boards?

-- 2. Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Test: Can users view project pages?

-- 3. Posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Test: Can users view and create posts?

-- 4. Comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Test: Can users view and create comments?

-- 5. Votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Test: Can users vote on posts?

-- 6. Members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Test: Can users see team members?

-- 7. Changelog entries
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;

-- Test: Can users view changelogs?
```

### Step 3.3: Check for Missing RLS Policies

If you enabled RLS and something broke, check if the table has policies:

```sql
-- List all RLS policies for a table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'your_table_name';
```

**If no policies exist:** The table is locked down completely. You need to add policies:

```sql
-- Example: Allow everyone to read posts
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

-- Example: Allow authenticated users to create posts
CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

### Step 3.4: Verify All Tables

```sql
-- Check RLS status on all tables
SELECT schemaname, tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Phase 4: Enable Leaked Password Protection (ZERO RISK) ✅

**Time estimate:** 2 minutes
**Risk level:** None
**Rollback:** Can disable anytime

### Step 4.1: Enable in Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to: **Authentication → Settings**
3. Scroll to: **Password Settings**
4. Toggle ON: **Check for leaked passwords**
5. Click **Save**

This prevents users from setting passwords that have been compromised in data breaches.

---

## Verification & Monitoring

### Verify Security Advisor

1. Go to: Supabase Dashboard → Advisors → Security Advisor
2. Click "Refresh"
3. Expected results:
   - ✅ **"Function Search Path Mutable"** warnings should be gone
   - ✅ **"RLS Disabled in Public"** errors should be resolved
   - ✅ **"Policy Exists RLS Disabled"** errors should be resolved
   - ⚠️ **"Security Definer View"** warnings will remain (intentional)

### Monitor Application

For the first 24-48 hours after enabling RLS:

1. **Check error logs** for RLS-related errors:
   ```bash
   # If using Vercel
   vercel logs

   # Check Supabase logs
   # Dashboard → Logs → Postgres Logs
   ```

2. **Test critical user flows:**
   - Creating posts
   - Voting
   - Commenting
   - Project settings
   - Admin dashboard

3. **Monitor user reports** for access issues

---

## Rollback Plan

### If Something Breaks

**Quick fix (disables security):**
```sql
-- Disable RLS on the problematic table
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
```

**Better fix (maintains security):**
1. Identify what operation is failing
2. Update RLS policy to allow that operation
3. Re-enable RLS

### Full Rollback (Nuclear Option)

If you need to completely revert:

```sql
-- Disable RLS on all tables (run in Supabase SQL Editor)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events DISABLE ROW LEVEL SECURITY;
```

---

## Troubleshooting

### Issue: "REVIEW REQUIRED" from test script

**Cause:** Your application has client-side operations that will be blocked by RLS.

**Solution:**
1. Review the critical failures in the test output
2. For each failure, either:
   - Move the operation to an API route (recommended)
   - Update RLS policies to allow the operation

**Example:** If test shows `posts - INSERT (anon): Create post anonymously` fails:
- Option A: Move post creation to `/api/posts` route (uses service role)
- Option B: Update RLS policy: `CREATE POLICY "Anyone can create posts" ON posts FOR INSERT WITH CHECK (true);`

### Issue: Users can't access their own data after enabling RLS

**Cause:** Missing or incorrect RLS policies.

**Solution:**
```sql
-- Add policy for users to access their own data
CREATE POLICY "Users can access own data" ON [table_name]
  FOR SELECT USING (auth.uid() = user_id);

-- Or for project owners
CREATE POLICY "Project owners can access data" ON [table_name]
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = [table_name].project_id
      AND projects.owner_id = auth.uid()
    )
  );
```

### Issue: Service role operations are failing

**Cause:** Unexpected - service role should bypass RLS.

**Solution:**
1. Verify you're using `SUPABASE_SERVICE_ROLE` key, not `SUPABASE_ANON_KEY`
2. Check that `getServiceRoleClient()` is being used in API routes
3. Verify the key is correct in `.env.local`

### Issue: Function search_path migration has errors

**Cause:** Some functions don't exist in your database (optional features).

**Solution:** This is normal and safe to ignore. The migration updates all functions, but only the ones you've created will be updated.

---

## Security Best Practices Going Forward

### 1. Always Use Service Role for Admin Operations

```typescript
// ❌ BAD: Using anon key for sensitive operations
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
await supabase.from('api_keys').select('*'); // Will be blocked by RLS

// ✅ GOOD: Using service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
await supabase.from('api_keys').select('*'); // Bypasses RLS
```

### 2. Set search_path on All New Functions

When creating SECURITY DEFINER functions:

```sql
CREATE OR REPLACE FUNCTION my_function()
RETURNS void AS $$
BEGIN
  -- function logic
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp; -- ← Always add this!
```

### 3. Test RLS Policies Before Production

```sql
-- Test a policy as a specific user
SET ROLE postgres; -- admin role
SET request.jwt.claims.sub = 'user-uuid-here';

-- Run queries to test if policies work correctly
SELECT * FROM posts; -- Should only show posts this user can see

-- Reset
RESET ROLE;
```

### 4. Monitor Security Advisor Weekly

Set a reminder to check Supabase → Advisors → Security Advisor at least once per week.

---

## Success Criteria

After completing this migration, you should have:

- ✅ All tables with RLS enabled
- ✅ All SECURITY DEFINER functions with fixed search_path
- ✅ Leaked password protection enabled
- ✅ Zero critical errors in Security Advisor
- ✅ Application working normally
- ✅ No increase in error rates

---

## Need Help?

If you encounter issues:

1. Check the "Troubleshooting" section above
2. Review Supabase logs: Dashboard → Logs → Postgres Logs
3. Check application logs for RLS-related errors
4. Reach out to Supabase support or community

## Migration Completion Checklist

- [ ] Phase 1: Fixed function search_path ✅
- [ ] Phase 2: Ran RLS compatibility test ✅
- [ ] Phase 3: Enabled RLS on all tables ⚠️
- [ ] Phase 4: Enabled leaked password protection ✅
- [ ] Verified Security Advisor shows improvements
- [ ] Tested application thoroughly
- [ ] Monitored for 24-48 hours
- [ ] Documented any custom RLS policies added
