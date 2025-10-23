# Admin Setup Guide

This guide explains how to set up admin access for viewing security events.

## Security Events Access Control

Security events are **admin-only** by default. Only users with admin privileges can view security events through the API.

## Setup Admin Access

You have two options for configuring admin users:

### Option 1: Environment Variable (Recommended for small teams)

1. Add your admin user IDs to `.env`:

```bash
# Comma-separated list of admin user IDs
ADMIN_USER_IDS=12345678-1234-1234-1234-123456789abc,98765432-4321-4321-4321-987654321cba
```

2. Restart your application

### Option 2: Admin Users Table (Recommended for larger teams)

1. Create an `admin_users` table in Supabase:

```sql
-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only service role can manage admins
CREATE POLICY "Service role can manage admins"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view their own record
CREATE POLICY "Admins can view themselves"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE admin_users IS 'Stores admin user access privileges';
```

2. Add admin users:

```sql
-- Add an admin user
INSERT INTO admin_users (user_id, created_by)
VALUES ('your-user-id-here', 'your-user-id-here');
```

## Getting Your User ID

### Method 1: From Supabase Dashboard
1. Go to Authentication → Users
2. Find your user
3. Copy the User UID

### Method 2: From API
```typescript
// In your app
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id);
```

## Using the Admin API

### Endpoint: GET /api/admin/security-events

**Authentication Required**: Bearer token (Supabase JWT)

**Query Parameters**:
- `limit` (default: 100, max: 1000) - Number of events to return
- `offset` (default: 0) - Pagination offset
- `severity` - Filter by severity: `low`, `medium`, `high`, `critical`
- `type` - Filter by event type
- `project_id` - Filter by project UUID
- `user_id` - Filter by user UUID
- `start_date` - Filter events after this date (ISO 8601)
- `end_date` - Filter events before this date (ISO 8601)

### Example Requests

**Get recent security events:**
```bash
curl -X GET "https://your-domain.com/api/admin/security-events?limit=50" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN"
```

**Get critical events from last 7 days:**
```bash
curl -X GET "https://your-domain.com/api/admin/security-events?severity=critical&start_date=2025-10-15" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN"
```

**Get events for a specific project:**
```bash
curl -X GET "https://your-domain.com/api/admin/security-events?project_id=your-project-uuid" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN"
```

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "event-uuid",
      "type": "rate_limit_exceeded",
      "severity": "medium",
      "message": "Rate limit of 5000 requests exceeded",
      "ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "path": "/api/posts",
      "method": "POST",
      "user_id": "user-uuid",
      "project_id": "project-uuid",
      "metadata": {
        "identifier": "ip:192.168.1.1"
      },
      "created_at": "2025-10-22T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1245
  }
}
```

## Frontend Integration Example

```typescript
// utils/adminApi.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getSecurityEvents(params?: {
  limit?: number;
  offset?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}) {
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  // Build query string
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());
  if (params?.severity) queryParams.set('severity', params.severity);
  if (params?.type) queryParams.set('type', params.type);
  if (params?.projectId) queryParams.set('project_id', params.projectId);
  if (params?.startDate) queryParams.set('start_date', params.startDate);
  if (params?.endDate) queryParams.set('end_date', params.endDate);

  // Make request
  const response = await fetch(
    `/api/admin/security-events?${queryParams.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch security events');
  }

  return response.json();
}

// Usage in a component
export default function SecurityEventsPage() {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadEvents() {
      try {
        const data = await getSecurityEvents({
          limit: 50,
          severity: 'high',
        });
        setEvents(data.data);
      } catch (error) {
        console.error('Error loading events:', error);
        // Handle error (show message, redirect, etc.)
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  // Render your events table/list
}
```

## Security Event Types

The following event types are tracked:

- `rate_limit_exceeded` - API rate limits exceeded
- `invalid_api_key` - Invalid API key used
- `csrf_validation_failed` - CSRF token validation failed
- `xss_attempt_blocked` - XSS attack attempt blocked
- `sql_injection_attempt` - SQL injection attempt detected
- `unauthorized_access` - Unauthorized access attempt
- `suspicious_request` - Suspicious request pattern detected
- `authentication_failed` - Authentication failure
- `validation_error` - Input validation error
- `malicious_file_upload` - Malicious file upload attempt

## Severity Levels

- `low` - Informational, normal validation errors
- `medium` - Rate limiting, minor security issues
- `high` - Authentication failures, CSRF failures, XSS attempts
- `critical` - SQL injection attempts, malicious file uploads

## Database Migrations

### Required Migration
```bash
# Run this first
psql -U postgres -d your_db -f migrations/create_security_events_table.sql
```

### Optional: Statistics Function
```bash
# Run this for admin dashboard stats
psql -U postgres -d your_db -f migrations/add_security_event_stats_function.sql
```

## Monitoring & Alerts

Consider setting up alerts for critical security events:

1. **Real-time monitoring**: Query events with `severity='critical'` regularly
2. **Daily reports**: Aggregate events by type/severity
3. **Email alerts**: Send notifications for critical events
4. **Dashboard**: Build an admin dashboard to visualize trends

## Troubleshooting

### "Forbidden" error when accessing security events

1. Check if your user ID is in `ADMIN_USER_IDS` environment variable
2. OR check if your user exists in `admin_users` table:
   ```sql
   SELECT * FROM admin_users WHERE user_id = 'your-user-id';
   ```

### "Unauthorized" error

1. Ensure you're passing a valid Supabase JWT token
2. Check token hasn't expired
3. Verify you're authenticated:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log(user); // Should not be null
   ```

### No events showing up

1. Check if the table exists and has data:
   ```sql
   SELECT COUNT(*) FROM security_events;
   ```
2. Verify RLS policies are correct
3. Check you're using service role in the API endpoint

## Best Practices

1. **Limit admin access** - Only grant to trusted users
2. **Audit admin actions** - Log who views security events
3. **Rotate credentials** - Regularly update admin access
4. **Monitor critical events** - Set up alerts for high/critical severity
5. **Regular cleanup** - Archive old security events (> 90 days)
6. **Secure the admin endpoint** - Use IP allowlisting if possible

## Next Steps

1. Set up your admin user(s)
2. Test the API endpoint
3. Build an admin dashboard (optional)
4. Set up monitoring/alerts
5. Document your admin procedures
