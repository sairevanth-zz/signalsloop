# Webhooks UI - Setup Complete

## ✅ Implementation Summary

The Webhooks feature is now fully accessible through your project settings dashboard!

---

## 📍 How to Access

1. Navigate to your project settings: `https://signalsloop.com/{your-project-slug}/settings`
2. Click on the **"Webhooks"** tab (with ⚡ icon)
3. Enter your API key when prompted (copy from the "API" tab)
4. Start managing webhooks!

---

## 🎨 Features Included

### Main Dashboard
- ✅ **Create webhooks** with custom URLs and event subscriptions
- ✅ **View all webhooks** for your project
- ✅ **Enable/disable** webhooks on the fly
- ✅ **Test webhook delivery** with sample payloads
- ✅ **View delivery logs** with success/failure tracking
- ✅ **Delete webhooks** when no longer needed

### Event Selection
Subscribe to any combination of:
- `post.created` - When new feedback is submitted
- `post.status_changed` - When post status changes (open → planned → done)
- `post.deleted` - When a post is deleted
- `comment.created` - When someone comments
- `vote.created` - When someone votes

### Security Features
- 🔐 **Webhook secrets** with show/hide toggle
- 📋 **One-click copy** for webhook secrets
- 🔒 **API key stored locally** in browser (never sent to server)
- ✅ **HMAC signature** generation for verification

### Monitoring & Debugging
- 📊 **Real-time delivery stats** (last triggered, status codes, failure count)
- 📝 **Detailed delivery logs** showing:
  - Event type
  - Success/failure status
  - HTTP status codes
  - Response times (ms)
  - Error messages
- 🔄 **Test endpoint** to verify webhook setup

---

## 🚀 Quick Start Guide

### Step 1: Get Your API Key
1. Go to the **"API"** tab in settings
2. Click **"Create New API Key"**
3. Copy the generated key (starts with `sk_...`)

### Step 2: Access Webhooks Tab
1. Click on **"Webhooks"** tab
2. Paste your API key when prompted
3. Click **"Continue"**

### Step 3: Create Your First Webhook
1. Click **"Create Webhook"** button
2. Enter your webhook URL (must be HTTPS)
3. Select events you want to receive
4. (Optional) Add a description
5. Click **"Create Webhook"**
6. **Save the webhook secret** shown in the response!

### Step 4: Test Your Webhook
1. Click **"Test"** button on your webhook
2. Check your endpoint received the test payload
3. Verify the signature matches

### Step 5: Monitor Deliveries
1. Click **"View Logs"** on any webhook
2. See real-time delivery attempts
3. Debug any failures with error messages

---

## 📖 Using Webhooks

### Example: Receive Notifications in Slack

```javascript
// Your webhook endpoint (e.g., on Vercel, Railway, etc.)
import crypto from 'crypto';

export default async function handler(req, res) {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET; // Your webhook secret

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (`sha256=${expectedSignature}` !== signature) {
    return res.status(401).send('Invalid signature');
  }

  // Process the event
  const { event, data } = req.body;

  if (event === 'post.created') {
    // Send to Slack
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🎉 New feedback: ${data.post.title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${data.post.title}*\n${data.post.description}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `From: ${data.post.author_name}`
              }
            ]
          }
        ]
      })
    });
  }

  res.status(200).send('OK');
}
```

### Example Payload (post.created)

```json
{
  "event": "post.created",
  "timestamp": "2024-10-04T10:30:00Z",
  "project_id": "your-project-id",
  "data": {
    "post": {
      "id": "post-abc123",
      "title": "Add dark mode",
      "description": "Please add dark mode support",
      "status": "open",
      "author_name": "John Doe",
      "author_email": "john@example.com",
      "created_at": "2024-10-04T10:30:00Z"
    },
    "project": {
      "id": "your-project-id"
    }
  }
}
```

---

## 🔧 Troubleshooting

### "API Key Required" screen won't go away
- Make sure you're entering the full API key (starts with `sk_`)
- Copy directly from the API Keys tab
- The key is stored in your browser's localStorage

### Webhook test fails
- Check that your endpoint is publicly accessible (HTTPS)
- Verify your endpoint returns 200 status
- Check your server logs for errors
- Make sure you're not blocking the request

### Deliveries show as failed
- Click "View Logs" to see error messages
- Common issues:
  - Endpoint timeout (>10 seconds)
  - Invalid SSL certificate
  - Endpoint returning 4xx/5xx errors
  - DNS issues

### Need to reset API key in UI
```javascript
// In browser console:
localStorage.removeItem('webhook_api_key_YOUR_PROJECT_ID');
// Refresh the page
```

---

## 🎯 Best Practices

1. **Use HTTPS Only**
   - Production webhooks must use HTTPS
   - Use ngrok for local testing

2. **Verify Signatures**
   - Always verify the `X-Webhook-Signature` header
   - Use timing-safe comparison functions

3. **Handle Failures Gracefully**
   - Return 200 even if processing fails
   - Process webhook async after responding
   - Implement retry logic for critical events

4. **Monitor Your Endpoints**
   - Set up alerting for webhook failures
   - Check delivery logs regularly
   - Keep endpoints fast (<10s response time)

5. **Secure Your Secrets**
   - Store webhook secrets in environment variables
   - Never commit secrets to version control
   - Rotate secrets if compromised

---

## 📚 Additional Resources

- **API Documentation**: [https://signalsloop.com/docs/api](/docs/api) → Webhooks tab
- **Testing Guide**: See `WEBHOOKS_TESTING_PLAN.md`
- **Webhook.site**: [https://webhook.site](https://webhook.site) - Test webhooks instantly
- **ngrok**: [https://ngrok.com](https://ngrok.com) - Expose local servers

---

## 🆘 Need Help?

- Check the delivery logs for detailed error messages
- Review the API documentation for payload examples
- Test with webhook.site to debug endpoint issues
- Contact support with webhook ID for assistance

---

## ✨ What's Next?

Now that webhooks are set up, you can:
- Build custom integrations with your tools
- Send notifications to Slack, Discord, or Teams
- Trigger workflows in Zapier or Make
- Sync feedback data to your CRM
- Build custom dashboards and analytics
- Automate status updates
- And much more!

Happy automating! 🚀
