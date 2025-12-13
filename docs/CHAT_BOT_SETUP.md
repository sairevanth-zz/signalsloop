# Natural Language Chat Bot Setup Guide

Complete setup guide for enabling natural language commands in Slack and Discord.

## Overview

SignalsLoop's chat integrations allow users to interact with the product using natural language:

```
User: "@SignalsLoop create feedback about slow checkout"
Bot:  "✅ Created feedback 'Slow checkout' in Feature Requests"

User: "what's our health score?"
Bot:  "🟢 Product Health: 78/100 (Good)
       • Sentiment: 72%
       • Response Rate: 85%"
```

## Supported Commands

| Command | Example | Description |
|---------|---------|-------------|
| Create feedback | "add feedback about X" | Creates a new feedback post |
| Vote | "vote for login bug as must-have" | Votes on existing feedback |
| Change status | "mark checkout issue as in-progress" | Updates post status |
| Get briefing | "what's happening today?" | Get Mission Control summary |
| Health score | "how healthy is our product?" | Get product health score |
| Search | "find feedback about payments" | Search existing feedback |
| Insights | "what are users asking for?" | Get top themes |
| Generate spec | "draft spec for dark mode" | Trigger spec generation |

---

## Slack Setup

### Step 1: Update Your Slack App

Go to [api.slack.com/apps](https://api.slack.com/apps) and select your SignalsLoop app.

### Step 2: Enable Events API

1. Navigate to **Event Subscriptions** in the sidebar
2. Turn on **Enable Events**
3. Set the **Request URL** to:
   ```
   https://your-domain.com/api/integrations/slack/events
   ```
4. Wait for URL verification to complete

### Step 3: Subscribe to Bot Events

Under **Subscribe to bot events**, add:

| Event Name | Description |
|------------|-------------|
| `app_mention` | User mentions @SignalsLoop in a channel |
| `message.im` | User sends direct message to the bot |

### Step 4: Update Bot Token Scopes

In **OAuth & Permissions**, ensure you have these scopes:

- `app_mentions:read` - Read @mentions
- `chat:write` - Post messages
- `im:history` - Read DM history
- `im:read` - View DM info
- `im:write` - Send DMs

### Step 5: Reinstall App

After making changes, reinstall the app to your workspace to get the new permissions.

---

## Discord Setup

### Discord Bot Approach

Discord requires a Bot with registered slash commands.

### Step 1: Create Discord Application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application**
3. Name it "SignalsLoop"

### Step 2: Create Bot

1. Go to the **Bot** tab
2. Click **Add Bot**
3. Copy the **Bot Token** (keep this secret!)
4. Enable these Privileged Gateway Intents:
   - `MESSAGE_CONTENT` (for reading @mentions)

### Step 3: Set Up Interactions Endpoint

1. Go to **General Information**
2. Set **Interactions Endpoint URL** to:
   ```
   https://your-domain.com/api/integrations/discord/events
   ```
3. Copy the **Public Key** for environment variables

### Step 4: Register Slash Commands

Run this script to register commands:

```bash
curl -X POST \
  "https://discord.com/api/v10/applications/YOUR_APP_ID/commands" \
  -H "Authorization: Bot YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "briefing",
    "description": "Get today'\''s Mission Control briefing"
  }'

curl -X POST \
  "https://discord.com/api/v10/applications/YOUR_APP_ID/commands" \
  -H "Authorization: Bot YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "health",
    "description": "Get current product health score"
  }'

curl -X POST \
  "https://discord.com/api/v10/applications/YOUR_APP_ID/commands" \
  -H "Authorization: Bot YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "feedback",
    "description": "Manage feedback",
    "options": [
      {
        "name": "action",
        "description": "What to do",
        "type": 3,
        "required": true,
        "choices": [
          {"name": "Create new feedback", "value": "create"},
          {"name": "Search feedback", "value": "search"},
          {"name": "Vote on feedback", "value": "vote"}
        ]
      },
      {
        "name": "text",
        "description": "Feedback content or search query",
        "type": 3,
        "required": true
      },
      {
        "name": "priority",
        "description": "Vote priority (for voting)",
        "type": 3,
        "required": false,
        "choices": [
          {"name": "Must Have", "value": "must_have"},
          {"name": "Important", "value": "important"},
          {"name": "Nice to Have", "value": "nice_to_have"}
        ]
      }
    ]
  }'

curl -X POST \
  "https://discord.com/api/v10/applications/YOUR_APP_ID/commands" \
  -H "Authorization: Bot YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "insights",
    "description": "Get current feedback insights and themes"
  }'
```

### Step 5: Add Bot to Server

1. Go to **OAuth2** > **URL Generator**
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions: `Send Messages`, `Read Message History`
4. Copy the generated URL and use it to add the bot to your server

---

## Environment Variables

Add these to your `.env`:

```bash
# Slack (already configured)
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret

# Discord (new)
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_PUBLIC_KEY=your_public_key
DISCORD_APPLICATION_ID=your_app_id

# AI (for intent parsing)
ANTHROPIC_API_KEY=sk-ant-...  # Primary (Claude)
OPENAI_API_KEY=sk-...         # Fallback (GPT-4)
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    User Message                              │
│  "@SignalsLoop create feedback about slow checkout"          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Slack Events API / Discord Gateway              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Intent Parser (Claude)                     │
│  Uses function calling to extract:                           │
│  { action: "create_feedback",                                │
│    parameters: { title: "Slow checkout", category: "Bug" }} │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Action Executor                            │
│  → Inserts into posts table                                  │
│  → Returns formatted result                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Response to User                           │
│  "✅ Created feedback 'Slow checkout' in Bug category"       │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing

### Test Slack

1. Open Slack
2. In any channel where the bot is present, type:
   ```
   @SignalsLoop what's our health score?
   ```
3. Or DM the bot directly

### Test Discord

1. Open Discord server with the bot
2. Type:
   ```
   /briefing
   ```
   or
   ```
   /feedback action:create text:Users want dark mode
   ```

---

## Troubleshooting

### "Bot not responding"

1. Check that the Events API URL is verified
2. Verify the bot has proper permissions
3. Check Vercel logs for errors

### "Invalid signature"

1. Ensure `SLACK_SIGNING_SECRET` matches your Slack app
2. For Discord, check `DISCORD_PUBLIC_KEY`

### "Action failed"

1. Check that the project connection is active
2. Verify the user has permission to perform the action
3. Check database connection

---

## Cost Considerations

Each natural language command uses Claude (or GPT-4 fallback) for intent parsing:

- **Claude Sonnet 4**: ~$0.003 per command
- **GPT-4o fallback**: ~$0.005 per command

At 1,000 commands/month: ~$3-5/month
