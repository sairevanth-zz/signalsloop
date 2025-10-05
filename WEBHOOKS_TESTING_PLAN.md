# SignalsLoop Webhooks - Complete Testing Plan

## Overview
This document provides a comprehensive testing plan for the SignalsLoop webhooks feature, including setup instructions, test cases, and troubleshooting guides.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Local Testing Setup](#local-testing-setup)
4. [API Testing](#api-testing)
5. [Event Trigger Testing](#event-trigger-testing)
6. [Security Testing](#security-testing)
7. [Performance Testing](#performance-testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- **PostgreSQL** (via Supabase)
- **Node.js** environment with Next.js
- **API Testing Tool**: Postman, Insomnia, or cURL
- **Webhook Testing Tool**: webhook.site, ngrok, or RequestBin
- **API Key** from your SignalsLoop project

### Environment Variables
Ensure these are set in your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your deployment URL
```

---

## Database Setup

### Step 1: Run Database Migration

Execute the webhook schema SQL file:

```bash
# Connect to your Supabase database
psql -h your-db-host -U postgres -d your-database

# Run the schema
\i add-feedback-webhooks-schema.sql
```

Or via Supabase Dashboard:
1. Navigate to **SQL Editor**
2. Open `add-feedback-webhooks-schema.sql`
3. Click **Run**

### Step 2: Verify Tables

Check that tables were created successfully:

```sql
-- Verify feedback_webhooks table
SELECT * FROM feedback_webhooks LIMIT 1;

-- Verify webhook_deliveries table
SELECT * FROM webhook_deliveries LIMIT 1;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename IN ('feedback_webhooks', 'webhook_deliveries');

-- Verify RLS policies
SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('feedback_webhooks', 'webhook_deliveries');
```

Expected results:
- ✅ Both tables exist
- ✅ Indexes created (6 total)
- ✅ RLS policies enabled (7 total)

---

## Local Testing Setup

### Option 1: Using webhook.site

1. Go to [webhook.site](https://webhook.site)
2. Copy your unique URL (e.g., `https://webhook.site/abc-123`)
3. Use this URL as your webhook endpoint
4. Keep the page open to see incoming requests

### Option 2: Using ngrok (for local server)

1. Install ngrok: `npm install -g ngrok`
2. Create a local webhook server:

```javascript
// test-webhook-server.js
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  console.log('📩 Webhook received:');
  console.log('Event:', req.body.event);
  console.log('Timestamp:', req.body.timestamp);
  console.log('Data:', JSON.stringify(req.body.data, null, 2));
  console.log('Signature:', signature);

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (`sha256=${expectedSig}` === signature) {
    console.log('✅ Signature verified');
  } else {
    console.log('❌ Signature verification failed');
  }

  res.status(200).send('OK');
});

app.listen(3001, () => {
  console.log('Webhook server running on port 3001');
});
```

3. Run the server: `node test-webhook-server.js`
4. Expose via ngrok: `ngrok http 3001`
5. Use the ngrok URL (e.g., `https://abc123.ngrok.io/webhook`)

---

## API Testing

### Test 1: Create a Webhook

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://webhook.site/YOUR_UNIQUE_ID",
    "events": ["post.created", "post.status_changed", "comment.created", "vote.created"],
    "description": "Test webhook for all events"
  }' \
  "http://localhost:3000/api/projects/YOUR_PROJECT_ID/webhooks"
```

**Expected Response (201):**
```json
{
  "data": {
    "id": "uuid-here",
    "project_id": "your-project-id",
    "webhook_url": "https://webhook.site/YOUR_UNIQUE_ID",
    "webhook_secret": "generated-secret-here",
    "events": ["post.created", "post.status_changed", "comment.created", "vote.created"],
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Verification:**
- ✅ Response status is 201
- ✅ Webhook ID is returned
- ✅ `webhook_secret` is auto-generated
- ✅ Database record created

---

### Test 2: List Webhooks

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3000/api/projects/YOUR_PROJECT_ID/webhooks"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": "webhook-id",
      "project_id": "project-id",
      "webhook_url": "https://webhook.site/...",
      "events": ["post.created", "post.status_changed"],
      "is_active": true,
      "last_triggered_at": null,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Verification:**
- ✅ Array of webhooks returned
- ✅ Webhook secrets NOT exposed

---

### Test 3: Update a Webhook

**Request:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false,
    "description": "Temporarily disabled"
  }' \
  "http://localhost:3000/api/projects/YOUR_PROJECT_ID/webhooks/WEBHOOK_ID"
```

**Expected Response (200):**
```json
{
  "data": {
    "id": "webhook-id",
    "is_active": false,
    "description": "Temporarily disabled",
    ...
  }
}
```

**Verification:**
- ✅ Webhook updated
- ✅ Inactive webhooks don't receive events

---

### Test 4: Test Webhook Delivery

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3000/api/projects/YOUR_PROJECT_ID/webhooks/WEBHOOK_ID/test"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Webhook test successful",
  "status_code": 200,
  "duration_ms": 145
}
```

**Verification:**
- ✅ Test payload received at webhook URL
- ✅ Signature header present
- ✅ Delivery logged in database

---

### Test 5: View Delivery Logs

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3000/api/projects/YOUR_PROJECT_ID/webhooks/WEBHOOK_ID/deliveries?limit=10"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": "delivery-id",
      "webhook_id": "webhook-id",
      "event_type": "post.created",
      "status_code": 200,
      "success": true,
      "delivery_duration_ms": 145,
      "delivered_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 25,
    "has_more": true
  }
}
```

**Verification:**
- ✅ Delivery history returned
- ✅ Pagination works correctly
- ✅ Failed deliveries show error messages

---

### Test 6: Delete a Webhook

**Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3000/api/projects/YOUR_PROJECT_ID/webhooks/WEBHOOK_ID"
```

**Expected Response (200):**
```json
{
  "success": true
}
```

**Verification:**
- ✅ Webhook deleted from database
- ✅ Associated delivery logs also deleted (CASCADE)

---

## Event Trigger Testing

### Test 7: post.created Event

**Setup:**
1. Create a webhook with `post.created` event
2. Keep webhook.site open

**Action:**
Create a new post via API or widget:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "YOUR_PROJECT_ID",
    "board_id": "YOUR_BOARD_ID",
    "title": "Test webhook post",
    "description": "Testing post.created webhook",
    "author_name": "Test User",
    "author_email": "test@example.com"
  }' \
  "http://localhost:3000/api/posts"
```

**Expected Webhook Payload:**
```json
{
  "event": "post.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "project_id": "your-project-id",
  "data": {
    "post": {
      "id": "post-id",
      "title": "Test webhook post",
      "description": "Testing post.created webhook",
      "status": "open",
      "author_name": "Test User",
      "author_email": "test@example.com",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "project": {
      "id": "your-project-id"
    }
  }
}
```

**Verification:**
- ✅ Webhook fired immediately after post creation
- ✅ Correct event type
- ✅ Complete post data included
- ✅ Signature header present

---

### Test 8: post.status_changed Event

**Setup:**
1. Create a webhook with `post.status_changed` event
2. Have an existing post

**Action:**
Change post status:

```bash
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "POST_ID",
    "newStatus": "planned",
    "projectId": "PROJECT_ID"
  }' \
  "http://localhost:3000/api/posts/POST_ID/status"
```

**Expected Webhook Payload:**
```json
{
  "event": "post.status_changed",
  "timestamp": "2024-01-15T10:35:00Z",
  "project_id": "your-project-id",
  "data": {
    "post": {
      "id": "post-id",
      "title": "Test webhook post",
      "old_status": "open",
      "new_status": "planned",
      "updated_at": "2024-01-15T10:35:00Z"
    },
    "project": {
      "id": "your-project-id"
    }
  }
}
```

**Verification:**
- ✅ Webhook triggered on status change
- ✅ Both old and new status included
- ✅ NOT triggered if status unchanged

---

### Test 9: comment.created Event

**Setup:**
1. Create a webhook with `comment.created` event
2. Have an existing post

**Action:**
Add a comment:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test comment",
    "name": "Commenter Name",
    "email": "commenter@example.com"
  }' \
  "http://localhost:3000/api/posts/POST_ID/comments"
```

**Expected Webhook Payload:**
```json
{
  "event": "comment.created",
  "timestamp": "2024-01-15T10:40:00Z",
  "project_id": "your-project-id",
  "data": {
    "comment": {
      "id": "comment-id",
      "content": "This is a test comment",
      "author_name": "Commenter Name",
      "author_email": "commenter@example.com",
      "parent_id": null,
      "created_at": "2024-01-15T10:40:00Z"
    },
    "post": {
      "id": "post-id",
      "title": "Test webhook post"
    },
    "project": {
      "id": "your-project-id"
    }
  }
}
```

**Verification:**
- ✅ Webhook triggered on comment creation
- ✅ Comment and post data included
- ✅ Works for both comments and replies (parent_id)

---

### Test 10: vote.created Event

**Setup:**
1. Create a webhook with `vote.created` event
2. Have an existing post

**Action:**
Vote on a post (via widget or API):

```bash
curl -X POST \
  "http://localhost:3000/api/posts/POST_ID/vote"
```

**Expected Webhook Payload:**
```json
{
  "event": "vote.created",
  "timestamp": "2024-01-15T10:45:00Z",
  "project_id": "your-project-id",
  "data": {
    "vote": {
      "post_id": "post-id",
      "vote_count": 5,
      "created_at": "2024-01-15T10:45:00Z"
    },
    "post": {
      "id": "post-id",
      "title": "Test webhook post"
    },
    "project": {
      "id": "your-project-id"
    }
  }
}
```

**Verification:**
- ✅ Webhook triggered on vote
- ✅ Updated vote count included

---

## Security Testing

### Test 11: Signature Verification

**Setup:**
1. Capture a webhook payload and signature
2. Use the verification code from the docs

**Code:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  );
}

// Test
const payload = { /* captured payload */ };
const signature = 'sha256=abc123...';
const secret = 'your-webhook-secret';

console.log(verifyWebhookSignature(payload, signature, secret)); // Should be true
```

**Verification:**
- ✅ Valid signatures pass
- ✅ Invalid signatures fail
- ✅ Tampered payloads detected

---

### Test 12: Authorization Testing

**Test Invalid API Key:**
```bash
curl -X GET \
  -H "Authorization: Bearer INVALID_KEY" \
  "http://localhost:3000/api/projects/PROJECT_ID/webhooks"
```

**Expected:** 401 Unauthorized

**Test Missing API Key:**
```bash
curl -X GET \
  "http://localhost:3000/api/projects/PROJECT_ID/webhooks"
```

**Expected:** 401 Unauthorized

**Test Wrong Project API Key:**
```bash
# Use Project A's API key to access Project B's webhooks
curl -X GET \
  -H "Authorization: Bearer PROJECT_A_API_KEY" \
  "http://localhost:3000/api/projects/PROJECT_B_ID/webhooks"
```

**Expected:** 401 Unauthorized

**Verification:**
- ✅ All unauthorized requests blocked
- ✅ No data leakage between projects

---

## Performance Testing

### Test 13: Multiple Webhooks

**Setup:**
1. Create 5 webhooks for the same project
2. All subscribed to `post.created`

**Action:**
Create a single post

**Verification:**
- ✅ All 5 webhooks receive the event
- ✅ Deliveries happen in parallel (not sequential)
- ✅ No performance degradation on post creation
- ✅ All deliveries logged

---

### Test 14: Webhook Timeout

**Setup:**
1. Create a webhook pointing to a slow endpoint
2. Use a service like [slowwly.robertomurray.co.uk](http://slowwly.robertomurray.co.uk/delay/15000/url/https://webhook.site/abc)

**Action:**
Trigger an event

**Expected Behavior:**
- Webhook times out after 10 seconds
- Timeout logged as failure in webhook_deliveries
- Error message: "aborted" or "timeout"

**Verification:**
- ✅ Request aborts after 10s
- ✅ Failure logged correctly
- ✅ Main request (e.g., post creation) succeeds

---

### Test 15: Failed Webhook Handling

**Setup:**
1. Create a webhook pointing to a non-existent URL
2. Or use webhook.site and then delete the unique URL

**Action:**
Trigger an event

**Expected Behavior:**
- Delivery fails (4xx or 5xx status)
- Failure logged in webhook_deliveries
- `failure_count` incremented in feedback_webhooks
- Main request still succeeds

**Verification:**
- ✅ Failures don't break main flow
- ✅ Error details captured
- ✅ Retry logic (if implemented) works

---

## Error Handling Testing

### Test 16: Invalid Webhook URL

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "not-a-valid-url",
    "events": ["post.created"]
  }' \
  "http://localhost:3000/api/projects/PROJECT_ID/webhooks"
```

**Expected:** 400 Bad Request
```json
{
  "error": "Valid webhook URL is required"
}
```

---

### Test 17: Invalid Event Type

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://webhook.site/abc",
    "events": ["invalid.event", "post.created"]
  }' \
  "http://localhost:3000/api/projects/PROJECT_ID/webhooks"
```

**Expected:** 400 Bad Request
```json
{
  "error": "Invalid events"
}
```

---

## Integration Testing Checklist

### End-to-End Workflow

- [ ] **Setup Phase**
  - [ ] Database schema applied successfully
  - [ ] API keys generated for test project
  - [ ] Webhook endpoint ready (webhook.site or ngrok)

- [ ] **Webhook Management**
  - [ ] Create webhook successfully
  - [ ] List webhooks shows created webhook
  - [ ] Update webhook (change events, disable)
  - [ ] Delete webhook removes it

- [ ] **Event Triggering**
  - [ ] post.created fires on new post
  - [ ] post.status_changed fires on status update
  - [ ] comment.created fires on new comment
  - [ ] vote.created fires on new vote
  - [ ] Inactive webhooks don't receive events

- [ ] **Security**
  - [ ] Signatures are valid
  - [ ] Unauthorized requests blocked
  - [ ] Secrets not exposed in API responses

- [ ] **Delivery Tracking**
  - [ ] Successful deliveries logged
  - [ ] Failed deliveries logged with errors
  - [ ] Delivery logs queryable via API

- [ ] **Performance**
  - [ ] Multiple webhooks fire in parallel
  - [ ] Timeouts handled gracefully
  - [ ] Main requests not blocked by webhooks

---

## Troubleshooting

### Issue: Webhooks not firing

**Check:**
1. Is the webhook `is_active: true`?
   ```sql
   SELECT is_active FROM feedback_webhooks WHERE id = 'your-webhook-id';
   ```

2. Are the events configured correctly?
   ```sql
   SELECT events FROM feedback_webhooks WHERE id = 'your-webhook-id';
   ```

3. Check server logs for webhook trigger attempts:
   ```
   ✅ Webhooks triggered for post.created: post-123
   ```

4. Verify the event is actually happening in your project

---

### Issue: Signature verification fails

**Check:**
1. Are you using the correct secret?
   ```sql
   SELECT webhook_secret FROM feedback_webhooks WHERE id = 'your-webhook-id';
   ```

2. Are you stringifying the payload correctly?
   - Use `JSON.stringify(payload)` exactly as received
   - Don't modify the payload before verification

3. Check the signature header format:
   - Should be `sha256=abc123...`

---

### Issue: Delivery failures

**Check:**
1. Review delivery logs:
   ```sql
   SELECT * FROM webhook_deliveries
   WHERE webhook_id = 'your-webhook-id'
   ORDER BY delivered_at DESC
   LIMIT 10;
   ```

2. Common issues:
   - **Timeout**: Endpoint too slow (>10s)
   - **4xx**: Invalid URL or endpoint returning error
   - **SSL Error**: Endpoint has invalid certificate
   - **DNS Error**: Endpoint domain doesn't resolve

3. Test the endpoint manually:
   ```bash
   curl -X POST https://your-endpoint.com/webhook -d '{"test": "payload"}'
   ```

---

### Issue: Database errors

**Check RLS policies:**
```sql
-- Disable RLS temporarily for debugging
ALTER TABLE feedback_webhooks DISABLE ROW LEVEL SECURITY;
-- Re-enable after testing
ALTER TABLE feedback_webhooks ENABLE ROW LEVEL SECURITY;
```

**Check service role access:**
- Ensure `SUPABASE_SERVICE_ROLE` env variable is set
- Service role should bypass RLS

---

## Testing Tools & Resources

### Webhook Testing Services
- [webhook.site](https://webhook.site) - Free, instant webhook receiver
- [RequestBin](https://requestbin.com) - Inspect HTTP requests
- [ngrok](https://ngrok.com) - Expose local servers
- [Postman](https://www.postman.com) - API testing
- [Insomnia](https://insomnia.rest) - API testing

### Database Tools
- [Supabase Dashboard](https://supabase.com/dashboard) - Database management
- [pgAdmin](https://www.pgadmin.org) - PostgreSQL admin
- [DBeaver](https://dbeaver.io) - Universal database tool

---

## Success Criteria

The webhooks feature is considered fully functional when:

- ✅ All 17 test cases pass
- ✅ End-to-end workflow checklist complete
- ✅ No unauthorized access possible
- ✅ Failed webhooks don't break main functionality
- ✅ Delivery logs accurately track all attempts
- ✅ Signature verification works consistently
- ✅ Documentation is complete and accurate

---

## Next Steps

After testing:
1. Deploy to staging environment
2. Run full test suite against staging
3. Monitor webhook deliveries for 24 hours
4. Address any performance issues
5. Deploy to production
6. Monitor error rates and delivery success rates

---

## Support

For issues or questions:
- Check the [API Documentation](/docs/api)
- Review error logs in Supabase
- Contact support with delivery logs for debugging
