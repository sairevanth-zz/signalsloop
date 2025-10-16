# The Actual Bug and Fix

## What Was Wrong

### The Real Problem:
**Magic links were processed entirely on the login page client-side, completely bypassing the auth callback route where new user detection logic exists.**

## The Complete Flow (What Actually Happens)

### Magic Link Flow:
1. User enters email on `/login`
2. Supabase sends magic link email
3. User clicks link: `https://signalsloop.com/auth/confirm?token_hash=...&type=magiclink&redirect_to=/auth/callback?next=/app`
4. Supabase's `/auth/confirm` processes the token and redirects with tokens in URL hash:
   ```
   https://signalsloop.com/login#access_token=XXX&refresh_token=YYY
   ```
5. **Login page detects tokens in hash** (lines 70-150 in `login/page.tsx`)
6. Login page calls `supabase.auth.setSession()` with the tokens
7. **Login page redirects directly to `/app`** ❌ (This was the bug!)
8. Auth callback route never runs, so new user detection never happens

### OAuth Flow:
1. User clicks "Continue with Google"
2. OAuth completes
3. Supabase redirects to: `/auth/callback?code=XXX`
4. **Auth callback route runs** ✅
5. Auth callback checks if user is new (created < 5 min)
6. If new → redirects to `/welcome` ✅
7. If existing → redirects to `/app`

## Why My Previous Fixes Didn't Work

### Fix Attempt #1: Changed `emailRedirectTo` in magic link
```typescript
// Changed from:
const redirectUrl = window.location.origin + '/app';

// To:
const redirectUrl = window.location.origin + '/auth/callback?next=/app';
```

**Why it failed:** The login page's token handler (lines 70-150) catches the tokens before they ever reach the callback route.

### Fix Attempt #2: Simplified auth callback logic
```typescript
if (isRecentlyCreated) {
  return NextResponse.redirect(`${origin}/welcome`);
}
```

**Why it failed:** This code never runs for magic links because magic links are handled entirely in the login page.

## The Actual Fix

Added new user detection logic **directly to the login page's token handler**:

```typescript
// In login/page.tsx, lines 113-133:
// After setting session with tokens...

// Check if this is a new user (created within last 5 minutes)
if (data.user) {
  const userCreatedAt = new Date(data.user.created_at);
  const timeSinceCreation = Date.now() - userCreatedAt.getTime();
  const isNewUser = timeSinceCreation < 300000; // 5 minutes

  console.log('User creation check:', {
    created_at: data.user.created_at,
    time_since_creation_ms: timeSinceCreation,
    is_new_user: isNewUser
  });

  // Redirect to welcome page for new users
  if (isNewUser) {
    console.log('New user detected, redirecting to welcome page');
    window.location.href = '/welcome';
    return;
  }
}

// Existing users go to /app
window.location.href = '/app';
```

## What This Fix Does

### For Magic Link Users:
1. User clicks magic link
2. Supabase redirects to login page with tokens in hash
3. Login page detects tokens and sets session
4. **Login page checks if user is new** ✅
5. If new (< 5 min) → `/welcome` ✅
6. If existing → `/app`

### For OAuth Users:
1. User completes OAuth
2. Redirects to `/auth/callback?code=XXX`
3. Auth callback checks if user is new
4. If new (< 5 min) → `/welcome` ✅
5. If existing → `/app`

## Files Changed

1. **`src/app/login/page.tsx`** (lines 113-145)
   - Added new user detection to token handler
   - Checks `created_at` timestamp
   - Redirects to `/welcome` for users < 5 minutes old

2. **`src/app/auth/callback/route.ts`** (already had the logic, now also used by OAuth)

## Why I Missed This

1. **I assumed magic links went through the auth callback** - They don't
2. **I didn't trace the complete magic link flow** - Supabase returns tokens in URL hash
3. **I focused on the callback route** - Magic links never reach it
4. **I didn't check the login page's token handling code** - That's where magic links are processed

## Testing

After this fix, both flows should work:

### Test Magic Link:
1. Use temp email at https://temp-mail.org
2. Enter on `/login` and click "Send Magic Link"
3. Click link in email
4. Should redirect to `/welcome` with name editor ✅
5. Welcome email should send ✅

### Test OAuth:
1. Use new Google account
2. Click "Continue with Google"
3. Should redirect to `/welcome` ✅
4. Name pre-filled from Google ✅
5. Welcome email should send ✅

## Summary

The bug was that **magic links are processed client-side on the login page**, not server-side in the auth callback route. The fix was to add the same new user detection logic to both places so both flows work correctly.
