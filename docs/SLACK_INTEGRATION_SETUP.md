# Enhanced Slack Integration Setup Guide

Complete setup guide for SignalsLoop's enhanced Slack integration with OAuth 2.0, Block Kit, and intelligent alerting.

## 🎯 Features Overview

- **OAuth 2.0 Authentication** - Secure, user-authorized connection (better than webhooks)
- **Rich Block Kit Messages** - Beautiful, contextual alerts with interactive buttons
- **Smart Alert Rules** - Configurable thresholds to reduce noise and amplify signal
- **Multi-Channel Routing** - Different alert types go to different channels
- **Interactive Actions** - Create Jira issues, acknowledge alerts with one click
- **Weekly Digests** - Automated Monday 9am comprehensive summary
- **Thread Replies** - Keep related alerts organized
- **User Mentions** - @mention specific team members for alerts

## 📋 Prerequisites

1. SignalsLoop account with admin access
2. Slack workspace with admin permissions
3. Encryption key generated (for token security)
4. Domain with HTTPS (required for Slack OAuth)

## 🚀 Step-by-Step Setup

### Step 1: Generate Encryption Key

The integration uses AES-256-GCM encryption to securely store Slack tokens. Generate a 32-character encryption key:

```bash
# Generate a secure 32-character key
openssl rand -hex 32 | cut -c1-32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Add this to your `.env` file:

```bash
ENCRYPTION_KEY=your_generated_32_character_key
```

### Step 2: Create Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. **App Name:** `SignalsLoop`
4. **Pick a workspace** to develop your app in

### Step 3: Configure OAuth & Permissions

In your Slack app settings:

1. Navigate to **"OAuth & Permissions"** in the left sidebar

2. **Redirect URLs** - Add your callback URL:
   ```
   https://yourdomain.com/api/integrations/slack/callback
   ```

3. **Bot Token Scopes** - Add the following scopes:
   - `chat:write` - Post messages as the bot
   - `chat:write.public` - Post to channels without joining
   - `channels:read` - List public channels
   - `groups:read` - List private channels
   - `users:read` - Get user information (for mentions)
   - `im:write` - Send direct messages
   - `incoming-webhook` - (Optional) Backward compatibility

4. Click **"Save Changes"**

### Step 4: Enable Interactivity

1. Navigate to **"Interactivity & Shortcuts"**
2. Turn on **"Interactivity"**
3. **Request URL:**
   ```
   https://yourdomain.com/api/integrations/slack/interactions
   ```
4. Click **"Save Changes"**

### Step 5: Get App Credentials

1. Navigate to **"Basic Information"**
2. Under **"App Credentials"**, you'll find:
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**

3. Copy these values

### Step 6: Configure Environment Variables

Add the Slack credentials to your `.env` file:

```bash
# Slack App Credentials
SLACK_CLIENT_ID=123456789012.123456789012
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Slack OAuth Redirect URI (must match exactly what's in Slack app settings)
SLACK_REDIRECT_URI=https://yourdomain.com/api/integrations/slack/callback

# Encryption key for storing tokens securely
ENCRYPTION_KEY=your_32_character_encryption_key
```

### Step 7: Run Database Migration

Apply the enhanced Slack integration migration:

```bash
# Using Supabase CLI
supabase db push

# Or apply the migration file directly
psql $DATABASE_URL < migrations/202511171600_slack_enhanced_integration.sql
```

This creates:
- `slack_connections` - OAuth tokens and workspace info
- `slack_channel_mappings` - Alert type → channel routing
- `slack_alert_rules` - Configurable alert conditions
- `slack_message_logs` - Audit trail of sent messages
- `slack_interaction_logs` - User interaction tracking

### Step 8: Connect Slack in UI

1. Navigate to your project settings → **Integrations** tab
2. Find the **Slack** section
3. Click **"Connect to Slack"**
4. Authorize the app in your Slack workspace
5. You'll be redirected back to SignalsLoop

### Step 9: Configure Channel Routing

After connecting:

1. Go to **Channel Routing** tab
2. Map alert types to Slack channels:
   - **Critical Feedback** → `#urgent-feedback`
   - **Sentiment Drop** → `#product-alerts`
   - **New Theme Detected** → `#customer-insights`
   - **Competitive Threat** → `#competitive-intel`
   - **Weekly Digest** → `#team-updates`
   - **Jira Created** → `#integrations`

3. Click **"Save Channel Mappings"**
4. Use **"Test"** button to verify each channel works

### Step 10: Configure Alert Rules

1. Go to **Alert Rules** tab
2. Customize thresholds for each rule type:

   **Critical Feedback:**
   - Sentiment threshold: `-0.7` (very negative)
   - Minimum urgency: `4` (out of 5)
   - Keywords: `churn, cancel, refund, frustrated, switching`
   - Revenue risk minimum: `$1000` (optional)

   **Sentiment Drop:**
   - Drop percentage: `20%`
   - Time period: `7 days`
   - Minimum sample size: `50 feedback items`

   **New Theme:**
   - Minimum mentions: `10`
   - Time window: `24 hours`
   - Sentiment filter: `negative` (or `any`)
   - Minimum urgency: `3`

   **Competitive Threat:**
   - Minimum mentions: `20`
   - Time window: `48 hours`
   - Sentiment spike: `30%` increase

3. Toggle rules on/off as needed
4. Click **"Save"** for each rule

## 🎨 Alert Types & Examples

### 🚨 Critical Feedback Alert

Triggered when high-risk feedback is detected (churn risk, high revenue impact).

**Example:**
```
🚨 CRITICAL FEEDBACK ALERT

High-Risk Customer Feedback Detected
Immediate attention required to prevent churn

😡 Sentiment Score: -0.85 (Very Negative)
💰 Revenue at Risk: $50,000/year
🔴 Urgency Level: 5/5 (Critical)
⏱️ Response Time: < 2 hours recommended

📝 Customer Feedback:
> "We're seriously considering switching to [Competitor] because this issue has been affecting us for weeks. Our team is frustrated and we can't continue like this."

📍 Platform: Intercom
👤 User: John Smith (Enterprise Customer)
🏷️ Theme: Integration Reliability
📅 Date: Nov 17, 2025

🔍 Context & Signals:
• 12 similar issues reported recently
• Trend: ▲ +35% vs. last 7 days
• Keywords detected: churn, switching, frustrated

⚡ Recommended Actions:
1. 🎫 Create P0 Jira ticket immediately
2. 📧 Reach out to customer directly
3. 📢 Post internal acknowledgment
4. 👥 Escalate to product & engineering

[Create Jira Issue] [View in Dashboard] [Acknowledge]
```

### 🆕 New Theme Alert

Triggered when AI detects emerging patterns in customer feedback.

**Example:**
```
🆕 NEW THEME DETECTED

"Dark Mode Support"
Users are requesting dark mode across the platform for better accessibility and reduced eye strain

📈 Mentions: 25 (last 24h)
😊 Avg Sentiment: 0.45
📊 Trend: Rising
🕐 First Seen: Nov 17, 2025

📊 Sources Distribution:
• Twitter: 12 mentions
• Product Hunt: 8 mentions
• Support: 5 mentions

💬 Top User Quotes:
1. "Would love to see dark mode! Been using the app at night and it's too bright."
2. "Dark mode is a must-have for modern apps. Please prioritize this!"
3. "My eyes are hurting after long sessions. Dark theme would be amazing."

💡 Competitive Intelligence:
3 out of 5 top competitors already offer dark mode. This is becoming table stakes.

[Create Epic] [View All Mentions] [Mute Theme]
```

### 📉 Sentiment Drop Alert

Triggered when overall sentiment decreases significantly.

### ⚔️ Competitive Threat Alert

Triggered when competitor mentions spike in customer feedback.

### 📊 Weekly Digest

Comprehensive summary sent every Monday at 9am with:
- Total feedback & change
- Overall sentiment & trend
- Top themes
- Critical issues status
- Wins & positive highlights
- Competitive landscape updates
- Action items for the week

## 🔧 Troubleshooting

### "Invalid signature" errors

The Slack Signing Secret might be incorrect. Verify:
1. Copy the exact value from Slack app settings
2. No extra spaces or newlines in `.env`
3. Restart your app after changing environment variables

### Messages not sending

Check the logs in **Slack Settings** → **Logs** tab:
- Verify channel mappings are correct
- Check bot has permission to post in channels
- Review alert rules - they might be too restrictive

### OAuth callback fails

Ensure:
1. `SLACK_REDIRECT_URI` matches exactly what's in Slack app settings
2. URL uses HTTPS (required by Slack)
3. No trailing slashes

### Buttons not working

1. Verify **Request URL** is set correctly in Slack app
2. Check **Signing Secret** is correct
3. Ensure interactions endpoint is deployed and accessible

## 📊 Monitoring & Analytics

### View Message Logs

1. Go to **Slack Settings**
2. Connection status card shows:
   - Total messages sent
   - Success/failure count
   - Success rate

### Interaction Logs

Track when users click buttons:
- Create Jira Issue clicks
- Acknowledge clicks
- View Dashboard clicks

### Performance Metrics

Query `slack_message_logs` table:
```sql
-- Success rate by alert type
SELECT
  alert_type,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM slack_message_logs
GROUP BY alert_type;
```

## 🔐 Security Best Practices

1. **Encryption Key**: Never commit to Git, store securely
2. **Signing Secret**: Always verify request signatures
3. **Token Storage**: Tokens are encrypted at rest using AES-256-GCM
4. **RLS Policies**: Database enforces row-level security
5. **HTTPS Only**: Always use HTTPS for OAuth and interactions

## 🚀 Advanced Configuration

### Custom Alert Rules

Create project-specific rules:
```typescript
await updateAlertRule(projectId, 'critical_feedback', {
  sentiment_threshold: -0.8,
  keywords: ['enterprise', 'churning', 'lawsuit'],
  urgency_min: 5,
  revenue_risk_min: 10000
}, true);
```

### Weekly Digest Scheduling

Default: Every Monday at 9am UTC

To customize, modify the cron expression in background jobs.

### Custom Channels for Different Teams

Map channels based on team structure:
- Engineering team: `#eng-alerts`
- Product team: `#product-feedback`
- Customer success: `#cs-urgent`
- Executive team: `#executive-summary`

## 📚 Architecture

```
┌─────────────┐
│   User/AI   │ Detects critical feedback, themes, etc.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Alert Engine│ Evaluates rules (sentiment, keywords, etc.)
└──────┬──────┘
       │
       ▼ (if rules match)
┌─────────────┐
│Block Kit    │ Builds beautiful formatted message
│ Builder     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Slack Client │ Posts to configured channel
│             │ (with encrypted bot token)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Slack     │ User sees alert, clicks button
│ Workspace   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Interactions │ Verifies signature, processes action
│  Handler    │ (Create Jira, Acknowledge, etc.)
└─────────────┘
```

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review `slack_message_logs` for error messages
3. Verify environment variables are set correctly
4. Check Slack app configuration matches this guide
5. Contact support with:
   - Error message from logs
   - Alert type that failed
   - Slack connection ID

---

Built with ❤️ by the SignalsLoop team
