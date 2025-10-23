# Admin Quick Start - Security Events Access

## 🚀 Quick Setup (2 minutes)

### Step 1: Run the SQL Migration

Copy and paste this in your Supabase SQL Editor:

```sql
-- Create security_events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  path TEXT,
  method TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT security_events_type_check CHECK (type IN (
    'rate_limit_exceeded',
    'invalid_api_key',
    'csrf_validation_failed',
    'xss_attempt_blocked',
    'sql_injection_attempt',
    'unauthorized_access',
    'suspicious_request',
    'authentication_failed',
    'validation_error',
    'malicious_file_upload'
  ))
);

-- Create indexes
CREATE INDEX idx_security_events_type ON security_events(type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_project_id ON security_events(project_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(ip);
CREATE INDEX idx_security_events_severity_created_at ON security_events(severity, created_at DESC);

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/read security events
CREATE POLICY "Service role can insert security events"
  ON security_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can read security events"
  ON security_events
  FOR SELECT
  TO service_role
  USING (true);

COMMENT ON TABLE security_events IS 'Stores security events for audit logging and monitoring';
```

### Step 2: Get Your User ID

1. Go to Supabase Dashboard → Authentication → Users
2. Find your account and copy the **User UID**

### Step 3: Add to Environment Variables

Add to your `.env.local`:

```bash
ADMIN_USER_IDS=your-user-id-here
```

Multiple admins? Separate with commas:
```bash
ADMIN_USER_IDS=uuid-1,uuid-2,uuid-3
```

### Step 4: Test It

```bash
# Get your session token from browser dev tools or:
curl http://localhost:3000/api/admin/security-events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## ✅ That's it!

You now have:
- ✅ Admin-only security event access
- ✅ Secure audit logging
- ✅ API endpoint to view events

## 📖 What Next?

- Read `ADMIN_SETUP.md` for full documentation
- Build an admin dashboard to visualize events
- Set up alerts for critical events
- Review `SECURITY.md` for all security features

## 🔍 View Events

**Via Supabase:**
```sql
SELECT * FROM security_events
ORDER BY created_at DESC
LIMIT 50;
```

**Via API:**
```bash
GET /api/admin/security-events?limit=50&severity=critical
```

## 📊 Common Queries

**Recent critical events:**
```sql
SELECT * FROM security_events
WHERE severity = 'critical'
AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Events by type:**
```sql
SELECT type, COUNT(*) as count
FROM security_events
GROUP BY type
ORDER BY count DESC;
```

**Rate limit violations:**
```sql
SELECT ip, COUNT(*) as violations
FROM security_events
WHERE type = 'rate_limit_exceeded'
AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ip
ORDER BY violations DESC;
```
