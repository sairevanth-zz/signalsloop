# Jira OAuth Integration for SignalsLoop

Complete Jira Cloud integration that enables secure authentication and one-click issue creation from customer feedback.

## Features

- **Secure OAuth 2.0 Authentication** - No API keys stored, enterprise-grade security
- **One-Click Issue Creation** - Transform feedback into Jira issues instantly
- **AI-Powered Issue Generation** - GPT-4 automatically generates titles, descriptions, and acceptance criteria
- **Theme → Label Mapping** - Automatically apply Jira labels based on detected themes
- **Bi-Directional Status Sync** - Issue status changes in Jira sync back to SignalsLoop
- **Automatic Token Refresh** - Seamless authentication without user intervention
- **Bulk Issue Creation** - Create multiple issues from theme clusters
- **Multi-Project Support** - Connect multiple Jira projects

## Architecture Overview

```
┌─────────────┐         OAuth 2.0         ┌──────────────┐
│ SignalsLoop │◄─────────────────────────►│   Atlassian  │
│   Frontend  │                           │     Auth     │
└──────┬──────┘                           └──────────────┘
       │
       │ API Calls
       │
┌──────▼──────┐                           ┌──────────────┐
│ SignalsLoop │      Jira REST API       │     Jira     │
│   Backend   │◄─────────────────────────►│    Cloud     │
└──────┬──────┘                           └──────┬───────┘
       │                                          │
       │                                          │ Webhooks
       │                                          │
┌──────▼──────┐                           ┌──────▼───────┐
│  Supabase   │                           │   Webhook    │
│   Database  │◄──────────────────────────┤   Endpoint   │
└─────────────┘                           └──────────────┘
```

## Prerequisites

1. **Atlassian Account** with Jira Cloud access
2. **Atlassian Developer Account** for creating OAuth apps
3. **OpenAI API Key** for AI-powered issue generation
4. **Supabase Database** (already configured in SignalsLoop)

## Setup Instructions

### Step 1: Create Atlassian OAuth App

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Click **Create** → **OAuth 2.0 integration**
3. Fill in app details:
   - **App name**: `SignalsLoop` (or your preferred name)
   - **Description**: `SignalsLoop Jira Integration`
   - **App logo**: (Optional) Upload your logo

4. Click **Create**

### Step 2: Configure OAuth Settings

1. In your new app, go to **Settings** tab
2. Add **Callback URL**:
   ```
   https://yourdomain.com/api/integrations/jira/callback
   ```
   Replace `yourdomain.com` with your actual domain

3. Go to **Permissions** tab
4. Add the following scopes:
   - `read:jira-work` - Read Jira project and issue data
   - `write:jira-work` - Create and update Jira issues
   - `read:jira-user` - Read user information
   - `manage:jira-webhook` - Create webhooks for bi-directional sync
   - `offline_access` - Get refresh tokens for long-term access

5. Go to **Authorization** tab
6. Copy your **Client ID** and **Client Secret**

### Step 3: Generate Encryption Key

The encryption key is used to securely store OAuth tokens in the database.

```bash
# Generate a 32-character encryption key
openssl rand -hex 16
```

Save this key - you'll need it for environment variables.

### Step 4: Configure Environment Variables

Add the following to your `.env.local`:

```bash
# Jira OAuth Configuration
JIRA_CLIENT_ID=your_client_id_from_step_2
JIRA_CLIENT_SECRET=your_client_secret_from_step_2
JIRA_REDIRECT_URI=https://yourdomain.com/api/integrations/jira/callback
ENCRYPTION_KEY=your_32_character_key_from_step_3

# OpenAI (for AI-powered issue generation)
OPENAI_API_KEY=sk-your_openai_api_key
```

### Step 5: Run Database Migration

Apply the Jira integration database schema:

```bash
# Using Supabase CLI
supabase db push migrations/202511171400_jira_integration.sql

# Or apply directly in Supabase Dashboard
# Go to SQL Editor → New Query → Paste migration content → Run
```

The migration creates these tables:
- `jira_connections` - OAuth connections and tokens
- `jira_issue_links` - Links between feedback and Jira issues
- `jira_webhooks` - Webhook registrations
- `jira_label_mappings` - Theme → Label mappings
- `jira_sync_logs` - Audit trail
- `jira_oauth_states` - CSRF protection tokens

### Step 6: Verify Installation

1. Restart your development server
2. Navigate to **Settings** → **Integrations**
3. You should see a **Connect Jira** button
4. Click it to test the OAuth flow

## Usage

### Connecting Jira

1. Go to **Settings** → **Integrations**
2. Click **Connect to Jira**
3. Authorize SignalsLoop in Atlassian
4. Select your Jira site (if you have multiple)
5. You're connected!

### Creating Issues from Feedback

#### One-Click Creation (AI-Powered)

```typescript
// API call example
const response = await fetch('/api/integrations/jira/create-issue', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    feedback_id: 'uuid-of-feedback-item',
    connection_id: 'uuid-of-jira-connection',
    use_ai: true // GPT-4 generates issue details
  })
});

const data = await response.json();
console.log(`Created issue: ${data.issue.key}`);
console.log(`URL: ${data.issue.url}`);
```

#### Manual Creation

```typescript
const response = await fetch('/api/integrations/jira/create-issue', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    feedback_id: 'uuid',
    connection_id: 'uuid',
    use_ai: false,
    manual_summary: 'Fix login bug on mobile',
    manual_description: 'Users report they cannot log in on iOS devices',
    manual_priority: 'High',
    manual_labels: ['mobile', 'authentication']
  })
});
```

### Bulk Issue Creation

Create multiple issues from a theme cluster:

```typescript
const response = await fetch('/api/integrations/jira/bulk-create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    feedback_ids: ['uuid1', 'uuid2', 'uuid3'],
    connection_id: 'uuid',
    project_key: 'SLDEV',
    issue_type: 'Story',
    create_epic: true, // Creates an epic to group all issues
    theme_name: 'Mobile Performance'
  })
});

const data = await response.json();
console.log(`Created ${data.created_count} issues`);
console.log(`Epic: ${data.epic.key}`);
```

### Bi-Directional Sync

When an issue is marked as "Done" in Jira:
1. Webhook fires to SignalsLoop
2. Issue status is updated in `jira_issue_links`
3. Feedback item is marked as `responded_at`
4. Shows "Resolved" in SignalsLoop UI

## AI-Powered Issue Generation

The integration uses GPT-4 to generate high-quality Jira issues automatically.

### What Gets Generated

**Issue Title** (Summary)
- Action-oriented and specific
- Under 100 characters
- Examples:
  - "Fix mobile login authentication timeout"
  - "Add dark mode support to settings page"
  - "Improve search performance for large datasets"

**Description** (Markdown → ADF)
- **Problem**: What the issue is
- **User Quote**: Actual customer feedback
- **Impact**: Business impact, sentiment, user count
- **Acceptance Criteria**: Checklist of done conditions
- **Context**: Platform, theme, links

**Priority** (Smart Detection)
- Based on sentiment score, revenue risk, mention count
- `Highest` - Critical bugs, sentiment < -0.7, revenue risk > $10k
- `High` - Important features, sentiment -0.4 to -0.7
- `Medium` - Standard improvements
- `Low` - Nice-to-haves
- `Lowest` - Cosmetic changes

**Labels** (Auto-Generated)
- Platform-based: `mobile-app`, `web`, `api`
- Theme-based: `performance`, `ux`, `authentication`
- Classification: `bug`, `feature`, `improvement`

**Issue Type** (Smart Detection)
- `Bug` - Something broken
- `Story` - New feature request
- `Task` - Technical work
- `Epic` - Large theme cluster

## Security Considerations

### Token Encryption

All OAuth tokens are encrypted before storage using **AES-256-GCM**:

```typescript
// Encryption process
const iv = crypto.randomBytes(16); // Random IV
const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
const encrypted = cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
const authTag = cipher.getAuthTag();

// Stored format: iv:authTag:encrypted
const stored = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
```

### CSRF Protection

OAuth state tokens prevent replay attacks:

```typescript
// Before redirect
const stateToken = crypto.randomUUID();
await createOAuthState(userId, projectId, stateToken);

// On callback
const { userId, projectId } = await verifyOAuthState(stateToken);
// State token is marked as consumed and cannot be reused
```

### Row Level Security (RLS)

All Jira tables have RLS policies:

```sql
-- Users can only see their own connections
CREATE POLICY "Users can view their own Jira connections"
ON jira_connections FOR SELECT
USING (user_id = auth.uid());
```

### Webhook Verification

*(To implement)* Verify webhook signatures:

```typescript
// Recommended: Add HMAC signature verification
const signature = req.headers['x-atlassian-webhook-signature'];
const secret = webhook.secret;
const computed = crypto.createHmac('sha256', secret)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== computed) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

## API Reference

### `POST /api/integrations/jira/connect`

Initiates OAuth flow.

**Query Parameters:**
- `project_id` (required) - SignalsLoop project ID

**Response:** Redirects to Atlassian authorization page

---

### `GET /api/integrations/jira/callback`

OAuth callback handler.

**Query Parameters:**
- `code` - Authorization code from Atlassian
- `state` - CSRF protection token

**Response:** Redirects to settings page with success/error

---

### `POST /api/integrations/jira/create-issue`

Creates a Jira issue from feedback.

**Request Body:**
```typescript
{
  feedback_id: string;
  connection_id: string;
  project_key?: string;
  issue_type?: string;
  use_ai?: boolean; // Default: true
  manual_summary?: string;
  manual_description?: string;
  manual_priority?: string;
  manual_labels?: string[];
}
```

**Response:**
```typescript
{
  success: true,
  issue: {
    id: string,
    key: string, // e.g., "SLDEV-123"
    url: string,
    summary: string,
    status: string,
    priority?: string
  },
  link_id: string
}
```

---

### `POST /api/integrations/jira/bulk-create`

Creates multiple issues from theme cluster.

**Request Body:**
```typescript
{
  feedback_ids: string[];
  connection_id: string;
  project_key?: string;
  issue_type?: string;
  create_epic?: boolean;
  theme_name?: string;
}
```

**Response:**
```typescript
{
  success: true,
  created_count: number,
  error_count: number,
  epic?: { key: string, url: string },
  issues: Array<{
    feedback_id: string,
    key: string,
    url: string,
    summary: string
  }>,
  errors?: Array<{
    feedback_id?: string,
    error: string
  }>
}
```

---

### `POST /api/integrations/jira/disconnect`

Disconnects Jira integration.

**Request Body:**
```typescript
{
  connection_id: string;
}
```

**Response:**
```typescript
{
  success: true,
  message: "Jira connection disconnected successfully"
}
```

---

### `POST /api/integrations/jira/webhook`

Webhook endpoint for Jira events.

**Webhook URL:** `https://yourdomain.com/api/integrations/jira/webhook`

**Events:**
- `jira:issue_updated` - Issue status changed
- `jira:issue_deleted` - Issue deleted

**Payload:** Standard Jira webhook payload

## Database Schema

### `jira_connections`

```sql
- id (uuid, primary key)
- user_id (uuid, FK → auth.users)
- project_id (uuid, FK → projects)
- cloud_id (text) - Atlassian cloud ID
- site_url (text) - e.g., "yourcompany.atlassian.net"
- access_token_encrypted (text) - AES-256-GCM encrypted
- refresh_token_encrypted (text) - AES-256-GCM encrypted
- token_expires_at (timestamptz)
- scopes (text[])
- default_project_key (text) - e.g., "SLDEV"
- default_issue_type (text) - e.g., "Bug"
- status (enum: active, expired, disconnected, error)
- created_at, updated_at
```

### `jira_issue_links`

```sql
- id (uuid, primary key)
- feedback_id (uuid, FK → discovered_feedback)
- jira_connection_id (uuid, FK → jira_connections)
- issue_key (text) - e.g., "SLDEV-1234"
- issue_id (text) - Jira's internal ID
- issue_url (text)
- status (text) - "To Do", "In Progress", "Done", etc.
- priority (text)
- assignee (jsonb)
- sync_enabled (boolean)
- last_synced_at (timestamptz)
- created_in_jira_at (timestamptz)
- created_at, updated_at
```

## Troubleshooting

### Connection Failed

**Error:** "Failed to connect to Jira"

**Solutions:**
1. Verify `JIRA_CLIENT_ID` and `JIRA_CLIENT_SECRET` are correct
2. Check callback URL matches exactly (including https://)
3. Ensure all required OAuth scopes are enabled
4. Check Supabase logs for detailed errors

### Token Expired

**Error:** "Your Jira connection has expired"

**Solution:**
- Connection will be marked as "expired"
- User needs to reconnect via Settings → Integrations
- Automatic refresh failed (likely refresh token expired)

### Encryption Error

**Error:** "Failed to decrypt token"

**Solutions:**
1. Verify `ENCRYPTION_KEY` is exactly 32 characters
2. Check the key hasn't changed since connection was created
3. Re-connect Jira integration to generate new encrypted tokens

### Issue Creation Failed

**Error:** "Failed to create Jira issue"

**Solutions:**
1. Verify user has permission to create issues in target project
2. Check project key exists: `GET /rest/api/3/project/{projectKey}`
3. Verify issue type is valid for the project
4. Check Jira sync logs table for detailed error

### Webhook Not Working

**Checklist:**
1. Webhook is registered in Jira (check `jira_webhooks` table)
2. Webhook URL is publicly accessible (test with curl)
3. Webhook events include "jira:issue_updated"
4. Check webhook logs in `jira_sync_logs`

## Performance Considerations

### Token Refresh

- Tokens are checked before each API call
- Automatic refresh if expiring within 5 minutes
- Refresh is cached to avoid race conditions

### Rate Limiting

Jira Cloud has rate limits:
- **Standard**: 10 requests/second
- **Premium**: 25 requests/second

**Recommendations:**
- Batch operations use queue with concurrency limit
- Implement exponential backoff on 429 errors
- Cache project/issue type data

### Webhook Processing

- Webhooks are acknowledged immediately (200 OK)
- Processing happens asynchronously
- Failed webhooks don't trigger retries (to avoid loops)

## Future Enhancements

- [ ] Webhook signature verification
- [ ] Custom field mapping
- [ ] Advanced JQL search integration
- [ ] Sprint integration
- [ ] Worklog tracking
- [ ] Comment sync (Jira ↔ SignalsLoop)
- [ ] Attachment support
- [ ] Multiple site selection UI
- [ ] Connection health monitoring
- [ ] Rate limit tracking and warnings

## Support

For issues or questions:
1. Check [Atlassian OAuth documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
2. Review Jira sync logs in database: `SELECT * FROM jira_sync_logs ORDER BY created_at DESC LIMIT 50`
3. Contact SignalsLoop support

## License

This integration is part of SignalsLoop and follows the same license terms.

---

**Built with**:
- Jira Cloud REST API v3
- OAuth 2.0 (3LO)
- OpenAI GPT-4
- Next.js API Routes
- Supabase PostgreSQL
- TypeScript
