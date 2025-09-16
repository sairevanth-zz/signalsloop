# Vercel Environment Variables Setup

## 🚨 CRITICAL: Your production app is missing environment variables!

This is why posts aren't saving and API keys aren't working.

## 📋 Environment Variables to Add

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Add these **exactly** as shown:

### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL
https://tucshvkwjkwhxyulpieo.supabase.co/
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1Y3Nodmt3amt3aHh5dWxwaWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzUzNzgsImV4cCI6MjA3MzQ1MTM3OH0.p9Q3B2uA3ClLO43CI852eNlPYbh1CYTmn1hxqcbWBS4
```

```
SUPABASE_SERVICE_ROLE
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1Y3Nodmt3amt3aHh5dWxwaWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg3NTM3OCwiZXhwIjoyMDczNDUxMzc4fQ.jVemd3UTb479kTxVs2FTIBo1OXvUdM3jefU_rBVqkOM
```

```
RESEND_API_KEY
re_8TLczLgx_3YtVUHMc33oqZowfFt8Sbzff
```

```
NEXT_PUBLIC_SITE_URL
signalsloop.vercel.app
```

## ⚙️ Settings:
- **Environment**: Select ALL (Production, Preview, Development)
- **Save** after each variable

## 🔄 After Adding All Variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete

## ✅ Test After Deployment:
1. Go to: https://signalsloop.vercel.app/your-project/board
2. Try submitting feedback
3. Check if it saves to database
4. Try creating API keys in settings

## 🆘 If Still Not Working:
The issue might be RLS policies. Run this in your Supabase SQL Editor:

```sql
-- Temporarily disable RLS for testing
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
```

Then test again. If it works, we know it's an RLS policy issue.
