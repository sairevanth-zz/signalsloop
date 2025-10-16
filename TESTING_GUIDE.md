# Testing Guide: Account Name Feature

## 🧪 How to Test the Welcome Page with Name Collection

Since you're likely an **existing user**, you won't see the welcome page automatically. Here are several ways to test the feature:

---

## **Method 1: Test with a Brand New Google Account (Recommended)**

This is the most realistic test:

1. **Sign out** from SignalsLoop
2. **Use a different Google account** you've never used with SignalsLoop before
3. Click "Continue with Google"
4. After OAuth completes, you should be redirected to `/welcome`
5. You should see the name customization card with your Google name pre-filled

---

## **Method 2: Manually Visit the Welcome Page**

Even as an existing user, you can visit the welcome page directly:

1. Navigate to: `https://signalsloop.com/welcome`
2. The page will load
3. If you already have a name set in the database, you won't see the name editor
4. If you don't have a name, you'll see the name customization card

---

## **Method 3: Clear Your Name from Database**

To test as if you're a new user:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query to clear your name:

```sql
-- Replace with your email
UPDATE public.users
SET name = NULL
WHERE email = 'your-email@example.com';
```

3. Visit `/welcome` - you should now see the name editor
4. Your Google name should be pre-filled (if you signed up with Google)

---

## **Method 4: Create a Test User Account**

Use an email you've never used before:

### Option A: Magic Link
1. Sign out
2. Use a temporary email service (like [temp-mail.org](https://temp-mail.org))
3. Enter the temp email on login page
4. Click "Send Magic Link"
5. Check the temp email inbox
6. Click the magic link
7. Should redirect to `/welcome` with name editor

### Option B: Different Google Account
1. Use Google Chrome Incognito/Private Window
2. Sign in with a different Google account
3. Go to SignalsLoop login
4. Click "Continue with Google"
5. Should see welcome page with name pre-filled

---

## **Method 5: Check Server Logs**

To see what's happening during OAuth:

1. **Open your browser's Developer Console** (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Sign in with Google
4. Look for these console logs:

```
User creation check: {
  created_at: "...",
  time_since_creation_ms: ...,
  is_recently_created: true/false
}

User record check: { name: "...", ... }

New user detected, redirecting to welcome page
// OR
Redirecting to: /app
```

This will tell you why you're not seeing the welcome page.

---

## **Method 6: Force Welcome Page via URL Parameter**

We can add a query parameter to force the welcome page. Let me add that:

After the next deployment, you can visit:
```
https://signalsloop.com/welcome?force=true
```

This will show the welcome page regardless of your user status.

---

## **Expected Behavior for Different Scenarios:**

### **Scenario 1: Brand New Google OAuth User**
- ✅ User signs up with Google
- ✅ OAuth completes → Redirected to `/welcome`
- ✅ Name field shows with Google name pre-filled (e.g., "John Doe")
- ✅ User can edit or click "Save"
- ✅ Or click "Skip for now"

### **Scenario 2: Brand New Magic Link User**
- ✅ User enters email → Receives magic link
- ✅ Clicks link → Redirected to `/welcome`
- ✅ Name field shows empty or with email-based default (e.g., "john" from john@example.com)
- ✅ User enters name and clicks "Save"
- ✅ Or clicks "Skip for now"

### **Scenario 3: Existing User (Your Case)**
- ❌ User signs in with Google/magic link
- ❌ Account created > 5 minutes ago
- ❌ Redirected to `/app` (dashboard)
- ❌ **No welcome page shown** (expected behavior)

### **Scenario 4: Existing User Without Name Set**
- ✅ User signs in
- ✅ Account created > 5 minutes ago BUT no name in database
- ✅ Redirected to `/welcome`
- ✅ Name editor shows

---

## **Database Checks**

To verify data is being saved correctly:

```sql
-- Check your user record
SELECT id, email, name, created_at, welcome_email_sent_at
FROM public.users
WHERE email = 'your-email@example.com';

-- Check all recent users
SELECT id, email, name, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Check OAuth metadata
SELECT
  email,
  created_at,
  raw_user_meta_data->>'full_name' as oauth_name,
  raw_user_meta_data->>'name' as oauth_name_alt
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

---

## **Troubleshooting**

### **"I don't see the welcome page"**

**Reason:** You're an existing user (account created more than 5 minutes ago)

**Solutions:**
1. Use a new Google account you've never used
2. Manually visit `/welcome`
3. Clear your name from database (see Method 3)
4. Use a temp email with magic link

### **"Name field is empty even though I used Google"**

**Check:**
1. Does your Google account have a name set?
2. Check browser console for `User record check` logs
3. Verify database trigger is working:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```

### **"Save button doesn't work"**

**Check:**
1. Browser console for errors
2. Network tab for API call to `/api/users/update-profile`
3. Response from API (should be 200 OK)
4. Database RLS policies:

```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

---

## **Quick Test Script**

Run this in your browser console on the welcome page to test the API:

```javascript
// Test the update profile API
fetch('/api/users/update-profile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
  },
  body: JSON.stringify({ name: 'Test Name' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## **Summary**

For the most realistic test of a **new user experience**:
1. Use a Google account you've never used with SignalsLoop
2. OR use a temporary email with magic link
3. You should see the welcome page with name customization

For testing as an **existing user**:
1. Visit `/welcome` directly
2. Or clear your name from the database
3. Name editor will show if no name is set

---

**The feature is working correctly if:**
- ✅ New users (< 5 min old) see the welcome page
- ✅ Users without names see the name editor
- ✅ Names save to database when "Save" is clicked
- ✅ Users can skip and proceed to dashboard
- ✅ Existing users don't see welcome page (correct behavior)
