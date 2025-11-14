# AI Feedback Hunter - API Keys Setup Guide

This guide will walk you through getting API keys for all platforms that the AI Feedback Hunter monitors.

## 🎯 Overview

You'll need to obtain API keys for:
- ✅ **Hacker News** - FREE, no API key needed (uses Algolia)
- 💰 **Reddit** - FREE (OAuth setup required)
- 💰 **Twitter/X** - $100/month (Essential API tier)
- 💰 **Product Hunt** - FREE (requires application approval)
- ⚠️ **G2** - No official API (web scraping, no key needed)

**Total Monthly Cost**: ~$100/month (just Twitter)

---

## 1️⃣ Reddit API Setup (FREE)

Reddit uses OAuth 2.0. You need to create a Reddit app and get a refresh token.

### Step 1: Create a Reddit App

1. Go to: https://www.reddit.com/prefs/apps
2. Click **"create another app..."** at the bottom
3. Fill in:
   - **name**: `SignalsLoop Feedback Hunter`
   - **App type**: Select **"script"**
   - **description**: `Autonomous feedback discovery for SignalsLoop`
   - **about url**: `https://signalsloop.com`
   - **redirect uri**: `http://localhost:8080`
4. Click **"create app"**
5. **Save these values**:
   - `client_id`: Under the app name (looks like: `a1b2c3d4e5f6g7`)
   - `client_secret`: Next to "secret" (looks like: `A1B2C3D4E5F6G7H8I9J0K1L2M3`)

### Step 2: Get Refresh Token

This requires running a one-time authorization flow:

```bash
# Install snoowrap temporarily
npm install snoowrap

# Create a file: get-reddit-token.js
```

**get-reddit-token.js**:
```javascript
const snoowrap = require('snoowrap');

// Replace with your values from Step 1
const CLIENT_ID = 'your_client_id_here';
const CLIENT_SECRET = 'your_client_secret_here';
const USERNAME = 'your_reddit_username';
const PASSWORD = 'your_reddit_password';

snoowrap.fromApplicationOnlyAuth({
  userAgent: 'SignalsLoop/1.0',
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  grantType: snoowrap.grantType.PASSWORD,
  username: USERNAME,
  password: PASSWORD
}).then(reddit => {
  console.log('✅ Successfully authenticated!');
  console.log('\nAdd these to your .env file:');
  console.log(`REDDIT_CLIENT_ID=${CLIENT_ID}`);
  console.log(`REDDIT_CLIENT_SECRET=${CLIENT_SECRET}`);
  console.log(`REDDIT_USERNAME=${USERNAME}`);
  console.log(`REDDIT_PASSWORD=${PASSWORD}`);
}).catch(err => {
  console.error('❌ Error:', err.message);
});
```

Run it:
```bash
node get-reddit-token.js
```

**Save the output values** - you'll add them to `.env` later.

**Security Note**: Create a dedicated Reddit account for SignalsLoop (don't use your personal account).

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

## 3️⃣ Product Hunt API Setup (FREE)

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

## 4️⃣ Hacker News (FREE - No Setup Required!)

Hacker News uses the free Algolia API. No API key needed!

**Endpoint**: `https://hn.algolia.com/api/v1/search`

Nothing to configure ✅

---

## 5️⃣ G2 Reviews (No Official API)

G2 doesn't have a public API. We use web scraping with Cheerio.

⚠️ **Important Limitations**:
- Must respect robots.txt
- Use conservative rate limiting (1 request per 5 seconds)
- May break if G2 changes their HTML structure
- Risk of IP blocking if too aggressive

**No API key needed**, but scraping is fragile.

---

## 🔐 Adding Keys to Your Environment

Once you have all the keys, add them to your `.env` file:

```bash
# AI Feedback Hunter - Centralized API Keys
# These are used server-side for all projects

# Reddit (FREE)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_bot_username
REDDIT_PASSWORD=your_reddit_bot_password

# Twitter/X (Essential tier - $100/month)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# Product Hunt (FREE - requires approval)
PRODUCTHUNT_API_TOKEN=your_producthunt_token

# Hacker News (FREE - no key needed)
# Nothing to configure!

# G2 (Web scraping - no official API)
# Nothing to configure!

# OpenAI (for classification)
OPENAI_API_KEY=your_openai_api_key  # You should already have this
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
| **Reddit** | FREE | OAuth setup required |
| **Twitter** | **$100/month** | Essential API tier |
| **Product Hunt** | FREE | Approval required (1-3 days) |
| **Hacker News** | FREE | No setup needed |
| **G2** | FREE | Web scraping (fragile) |
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

### Reddit: "Invalid credentials"
- Double-check client_id and client_secret
- Make sure you're using "script" app type
- Verify username/password are correct
- Try creating a new Reddit app

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

5. **Reddit bot account**
   - Create a dedicated Reddit account
   - Don't use your personal account
   - Use a strong unique password

---

Need help? Check the logs in `/api/hunter/trigger` or contact support!
