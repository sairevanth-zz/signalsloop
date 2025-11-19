# AI Feedback Hunter - API Keys Setup Guide

This guide will walk you through getting API keys for all platforms that the AI Feedback Hunter monitors.

## 🎯 Overview

You'll need to obtain API keys for:
- ✅ **Reddit** - FREE, no API key needed! (uses public JSON API)
- ✅ **Hacker News** - FREE, no API key needed (uses Algolia)
- 💰 **Twitter/X** - $100/month (Essential API tier)
- 💰 **Product Hunt** - FREE (requires application approval, 1-3 days)
- ⚠️ **G2** - No official API (web scraping, no key needed)

**Total Monthly Cost**: ~$100/month (just Twitter)
**Platforms with No Setup**: Reddit, Hacker News, G2 ✨

---

## 1️⃣ Reddit (FREE - No Setup Required!) ✨

**Great news!** Reddit doesn't require any API keys or authentication.

The Hunter uses Reddit's **RSS feeds** which are completely free and require no setup:
- Works for all public posts and comments
- No authentication needed
- Extremely reliable (RSS feeds never get blocked)
- No rate limits for reasonable usage
- Instant - ready to use right now!

### How It Works

Reddit provides RSS/XML feeds for all public content:
- Search: `https://www.reddit.com/search.rss?q=your_query`
- Subreddit new: `https://www.reddit.com/r/subreddit/new/.rss`

The Hunter automatically uses these RSS feeds to monitor mentions of your product.
These are more reliable than the JSON API as they don't require any authentication
and are never blocked by Reddit.

**Nothing to configure!** ✅

---

## 2️⃣ Twitter API Setup ($100/month)

Twitter killed their free API tier. You need to pay for "Essential" access.

### Step 1: Apply for API Access

1. Go to: https://developer.twitter.com/
2. Click **"Sign up"** (or log in if you have an account)
3. Choose **"Essential"** tier ($100/month)
4. Fill out the application:
   - **Use case**: "Monitor social media mentions for customer feedback analysis"
   - **Will you analyze Twitter data?**: Yes
   - **Will you display Tweets?**: No
   - **Will government entities use this?**: No

### Step 2: Create an App

1. Go to: https://developer.twitter.com/en/portal/projects-and-apps
2. Click **"Create App"**
3. Fill in:
   - **App name**: `SignalsLoop Hunter`
   - **Environment**: Production
4. Click **"Create"**

### Step 3: Get API Keys

1. Go to your app's **"Keys and tokens"** tab
2. Click **"Generate"** under "API Key and Secret"
3. **Save these values**:
   - `API Key`: (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2`)
   - `API Secret`: (looks like: `A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0`)
4. Click **"Generate"** under "Bearer Token"
5. **Save the Bearer Token**: (looks like: `AAAAAAAAAAAAAAAAAAAAABcdef...`)

You'll need the **Bearer Token** for the Hunter.

---

## 2️⃣ Product Hunt API Setup (FREE)

Product Hunt API is free but requires approval.

### Step 1: Apply for API Access

1. Go to: https://api.producthunt.com/v2/docs
2. Click **"Request Access"**
3. Fill out the form:
   - **Name**: Your name
   - **Email**: Your email
   - **App name**: SignalsLoop
   - **App description**: "Customer feedback aggregation platform monitoring Product Hunt for product mentions"
   - **Use case**: "We help companies discover feedback about their products across multiple platforms"

### Step 2: Wait for Approval

- Usually takes 1-3 business days
- You'll receive an email with your API key

### Step 3: Get Your Token

Once approved:
1. Go to: https://www.producthunt.com/v2/oauth/applications
2. Click **"New Application"**
3. Fill in:
   - **Name**: SignalsLoop Hunter
   - **Redirect URI**: `http://localhost:3000/callback`
4. Click **"Create Application"**
5. **Save these values**:
   - `Client ID`
   - `Client Secret`

For server-side access, you'll create a developer token:
1. Go to: https://www.producthunt.com/v2/oauth/applications
2. Click on your app
3. Click **"Create Token"**
4. **Save the token**

---

## 3️⃣ Hacker News (FREE - No Setup Required!) ✨

Hacker News uses the free Algolia API. No API key needed!

**Endpoint**: `https://hn.algolia.com/api/v1/search`

Nothing to configure ✅

---

## 4️⃣ G2 Reviews (No Official API)

G2 doesn't have a public API. We use web scraping with Cheerio.

⚠️ **Important Limitations**:
- Must respect robots.txt
- Use conservative rate limiting (1 request per 5 seconds)
- May break if G2 changes their HTML structure
- Risk of IP blocking if too aggressive

**No API key needed**, but scraping is fragile.

---

## 🔐 Adding Keys to Your Environment

Once you have the keys, add them to your `.env` file:

```bash
# AI Feedback Hunter - Centralized API Keys
# These are used server-side for all projects

# Twitter/X (Essential tier - $100/month)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# Product Hunt (FREE - requires approval)
PRODUCTHUNT_API_TOKEN=your_producthunt_token

# Cron Secret (for secure scheduled scans)
CRON_SECRET=your_random_secret_here_min_32_chars

# OpenAI (for classification - you should already have this)
OPENAI_API_KEY=your_openai_api_key

# ✨ NO KEYS NEEDED FOR:
# Reddit (uses public JSON API)
# Hacker News (uses public Algolia API)
# G2 (web scraping)
```

**Also add to `.env.local`** for local development.

---

## 🚀 Production Deployment

For production (Vercel/etc), add these as **Environment Variables** in your hosting dashboard:

### Vercel:
1. Go to your project settings
2. Click **Environment Variables**
3. Add each variable above
4. Redeploy

### Railway/Render:
1. Go to your project
2. Click **Variables** or **Environment**
3. Add each variable
4. Redeploy

---

## 📊 Cost Breakdown

| Platform | Cost | Notes |
|----------|------|-------|
| **Reddit** | **FREE** | Public JSON API - no auth needed! ✨ |
| **Twitter** | **$100/month** | Essential API tier |
| **Product Hunt** | **FREE** | Approval required (1-3 days) |
| **Hacker News** | **FREE** | Public Algolia API ✨ |
| **G2** | **FREE** | Web scraping (fragile) |
| **OpenAI** | ~$10-50/month | Classification costs |
| **TOTAL** | **~$110-150/month** | Mainly Twitter |

---

## 🛡️ Rate Limits (Per Platform)

To avoid being blocked, the Hunter respects these limits:

- **Reddit**: 60 requests/minute (free tier)
- **Twitter**: 500K tweets/month (Essential tier)
- **Product Hunt**: 1000 requests/hour
- **Hacker News**: Unlimited (Algolia)
- **G2**: 1 request per 5 seconds (self-imposed)

The code automatically handles rate limiting and retries.

---

## ✅ Next Steps

After adding keys to `.env`:

1. Restart your dev server: `npm run dev`
2. Go to any project's Hunter page
3. Click **Settings**
4. Complete the setup wizard (only company name and keywords now!)
5. Click **Scan Now** to test

The Hunter will use your centralized API keys automatically! 🎉

---

## 🆘 Troubleshooting

### Reddit: No results found
- Reddit uses RSS feeds - no authentication needed!
- RSS feeds are extremely reliable and never blocked
- Check if your keywords are too specific
- Try broader search terms
- RSS feeds may have slight delay (usually 1-2 minutes)
- Make sure you're searching for public subreddits (private subs won't appear)

### Twitter: "Not authenticated"
- Verify you're on Essential tier ($100/month paid)
- Check Bearer Token is correct (it's very long)
- Make sure token hasn't been revoked

### Product Hunt: "Unauthorized"
- Check if your application was approved
- Verify API token is correct
- Try regenerating the token

### G2: "Blocked" or empty results
- G2 may have changed their HTML structure
- Check if you're being rate-limited
- Try increasing delay between requests

---

## 📝 Security Best Practices

1. **Never commit API keys to git**
   - Add `.env` and `.env.local` to `.gitignore` (already done)

2. **Use different keys for dev/production**
   - Create separate apps for development

3. **Rotate keys regularly**
   - Change keys every 3-6 months

4. **Monitor usage**
   - Check Twitter API usage dashboard
   - Watch for unusual spikes

5. **Generate strong CRON_SECRET**
   - Use: `openssl rand -base64 32`
   - This protects your cron endpoints from unauthorized access

---

Need help? Check the logs in `/api/hunter/trigger` or contact support!
