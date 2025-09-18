# Supabase Redirect Fix Guide

## The Problem
Google OAuth is redirecting to `/login` instead of `/app` even though we're setting `redirectTo: '/app'` in the code.

## Root Cause
Supabase has a **Site URL** setting in the dashboard that overrides the `redirectTo` parameter for security reasons.

## Solution Steps

### 1. Check Supabase Dashboard Settings

Go to your Supabase project dashboard:
1. **Authentication** → **URL Configuration**
2. Check the **Site URL** field
3. Check the **Redirect URLs** field

### 2. Update Site URL
The **Site URL** should be set to:
```
https://signalsloop.vercel.app
```

### 3. Update Redirect URLs
The **Redirect URLs** should include:
```
https://signalsloop.vercel.app/app
https://signalsloop.vercel.app/auth/callback
https://signalsloop.vercel.app/login
```

### 4. Verify Google Cloud Console
Make sure Google Cloud Console has these redirect URIs:
```
https://signalsloop.vercel.app/auth/callback
https://signalsloop.vercel.app/app
```

## Why This Happens
- Supabase uses the **Site URL** as the base for redirects
- If **Site URL** is set to `/login` or something else, it overrides our `redirectTo` parameter
- This is a security feature to prevent open redirects

## Test After Fix
1. Go to `/debug-oauth`
2. Click "Test Google OAuth"
3. Complete the Google authentication
4. You should be redirected to `/app` instead of `/login`

## Current OAuth URL
The OAuth URL is correctly generated:
```
https://tucshvkwjkwhxyulpieo.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fsignalsloop.vercel.app%2Fapp
```

This shows our `redirectTo` parameter is working, but Supabase is ignoring it due to dashboard configuration.
