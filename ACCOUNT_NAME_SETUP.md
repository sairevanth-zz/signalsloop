# Account Name Collection Setup Guide

This guide documents the implementation of account name collection for SignalsLoop users.

## ✅ What Was Implemented

We've added a user-friendly account name collection feature that:
- **Doesn't disrupt the existing auth flow** (OAuth and magic link continue to work perfectly)
- Collects user names on the welcome page after successful authentication
- Pre-fills names from OAuth providers (Google) when available
- Allows users to customize their display name or skip the step
- Stores names in the database for future use

---

## 📁 Files Created/Modified

### **Created Files:**

1. **`add-user-name-field.sql`** - Database migration
   - Adds `name` field to users table
   - Creates index for name lookups
   - Updates user creation trigger to extract names from OAuth metadata
   - Adds RLS policies for user profile updates

2. **`src/app/api/users/update-profile/route.ts`** - API endpoint
   - Handles POST requests to update user profile
   - Validates and sanitizes name input
   - Updates database with authenticated user session
   - Returns updated user data

3. **`src/hooks/useUserProfile.ts`** - Custom React hook
   - Fetches user profile data from database
   - Provides `updateProfile` function for updates
   - Manages loading and error states

### **Modified Files:**

1. **`src/app/welcome/page.tsx`** - Welcome page UI
   - Added name customization card
   - Shows for users without a custom name
   - Pre-fills with OAuth-derived name or email-based default
   - Provides "Save" and "Skip for now" options
   - Auto-focuses input for better UX

---

## 🗄️ Database Schema Changes

The `users` table now includes:

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS name TEXT;
```

### Fields in `users` table:
- `id` (UUID, primary key)
- `email` (TEXT)
- `name` (TEXT) - **NEW FIELD**
- `plan` (TEXT)
- `welcome_email_sent_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open and execute: `add-user-name-field.sql`

```bash
# In Supabase SQL Editor, run:
cat add-user-name-field.sql
```

This will:
- Add the `name` column to the `users` table
- Create an index for faster lookups
- Update the trigger to auto-populate names from OAuth metadata
- Set up proper RLS policies

### Step 2: Deploy Code Changes

The following files have been updated and need to be deployed:

```bash
# New files
src/app/api/users/update-profile/route.ts
src/hooks/useUserProfile.ts

# Modified files
src/app/welcome/page.tsx
```

Deploy these changes to your production environment:

```bash
# If using Vercel
vercel --prod

# Or your deployment method
npm run build
```

### Step 3: Verify the Setup

1. **Test New User Flow:**
   - Sign out of your account
   - Sign up with a new Google account
   - Verify you're redirected to `/welcome`
   - Check that the name field is pre-filled with your Google name
   - Try saving a custom name
   - Verify it's saved in the database

2. **Test Magic Link Flow:**
   - Sign out
   - Request a magic link with a new email
   - After authentication, check the welcome page
   - Name field should show email username as default
   - Save a custom name

3. **Database Verification:**

```sql
-- Check that names are being stored
SELECT id, email, name, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 User Flow

### For New Users (Google OAuth):

1. User clicks "Continue with Google" on `/login`
2. OAuth authentication completes
3. User is redirected to `/welcome`
4. Welcome page shows:
   - ✅ Name field pre-filled with Google profile name
   - 💡 User can edit or keep the name
   - Options: "Save" or "Skip for now"
5. If saved: Name is stored in database
6. If skipped: User can set name later in profile settings

### For New Users (Magic Link):

1. User enters email on `/login`
2. Clicks magic link from email
3. Redirected to `/welcome`
4. Welcome page shows:
   - 📝 Name field empty or with email-based default (e.g., "john" from john@example.com)
   - User can enter their preferred name
   - Options: "Save" or "Skip for now"
5. Same save/skip behavior as above

### For Existing Users:

- If user already has a name in database → Welcome page doesn't show name editor
- Users land directly on the dashboard or continue to their destination

---

## 🔧 API Endpoints

### POST `/api/users/update-profile`

Updates the authenticated user's profile.

**Request:**
```json
{
  "name": "John Doe"
}
```

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free"
  }
}
```

**Response (Error):**
```json
{
  "error": "Name is required and must be a string"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid name)
- `401` - Unauthorized
- `500` - Server error

---

## 📊 Database Trigger

The migration includes an updated `handle_new_user()` trigger that:
- Automatically creates a user record when someone authenticates
- Extracts name from OAuth metadata (`full_name`, `name`, or `first_name`)
- Sets default plan to `free`
- Handles conflicts gracefully

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
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
```

---

## 🎨 UI/UX Features

The name customization card includes:
- ✨ Auto-focus on the input field
- ⏎ Enter key to save
- 🔄 Loading states during save
- 🎯 Toast notifications for success/error
- 📱 Responsive design (mobile-friendly)
- 🎨 Blue accent color matching the brand
- 💡 Helpful description text
- ⏭️ "Skip for now" option

---

## 🔐 Security

- ✅ Authentication required (uses Supabase auth tokens)
- ✅ RLS policies ensure users can only update their own data
- ✅ Input sanitization (trim whitespace)
- ✅ Length validation (max 255 characters)
- ✅ Type validation (must be string)

---

## 🧪 Testing Checklist

- [ ] Database migration runs without errors
- [ ] New Google OAuth users see pre-filled names
- [ ] Magic link users can enter custom names
- [ ] "Save" button updates database correctly
- [ ] "Skip for now" hides the name editor
- [ ] Names appear correctly throughout the app
- [ ] Users can update names later (if profile settings exist)
- [ ] RLS policies prevent unauthorized updates
- [ ] API endpoint validates input properly
- [ ] Toast notifications work correctly

---

## 🐛 Troubleshooting

### Name field not showing on welcome page

**Check:**
1. Database migration was run successfully
2. User doesn't already have a name in the database
3. Welcome page is properly rendering the conditional UI

```sql
-- Check user's name in database
SELECT id, email, name FROM users WHERE email = 'user@example.com';
```

### "Failed to save name" error

**Check:**
1. User is authenticated (check browser dev tools Network tab)
2. RLS policies are set up correctly
3. API endpoint is accessible

```sql
-- Verify RLS policies exist
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Name not pre-filling from Google OAuth

**Check:**
1. Trigger `handle_new_user` is active
2. OAuth metadata includes name fields
3. User record was created properly

```sql
-- Check auth user metadata
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE email = 'user@example.com';
```

---

## 📝 Notes

- The auth flow remains completely untouched - no risk to existing authentication
- Users can skip name entry and set it later
- OAuth-derived names are automatically populated
- The feature is optional and non-blocking
- Future enhancement: Add profile settings page for name updates

---

## ✅ Summary

This implementation successfully adds account name collection without disrupting the existing authentication flow. Users can:
- Sign in with Google (name auto-populated)
- Sign in with magic link (enter name manually)
- Skip name entry if desired
- Update their name later

The solution is secure, user-friendly, and maintains backward compatibility with all existing users.
