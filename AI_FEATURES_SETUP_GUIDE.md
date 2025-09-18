# 🤖 AI Features Setup Guide

## Prerequisites

### 1. Database Schema Setup
Run the following SQL in your **Supabase SQL Editor**:

```sql
-- Copy and paste the contents of add-ai-features-schema.sql
-- This adds:
-- - priority_score, priority_reason, ai_analyzed_at columns to posts table
-- - post_similarities table for duplicate tracking
-- - Proper indexes and RLS policies
```

### 2. Environment Variables
Add these to your `.env.local` file:

```bash
# OpenAI Configuration (Required for AI features)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Site URL (Required for internal API calls)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
# For local development: NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API Keys**
3. Click **Create new secret key**
4. Copy the key and add it to your `.env.local`

## Testing the Features

### 1. Create Test Data
Create a few test posts in your project to test duplicate detection:

```
Post 1: "Add dark mode support"
Post 2: "Please add dark theme option"
Post 3: "We need night mode for better UX"
```

### 2. Test Duplicate Detection
1. Go to any post in your Pro project
2. Look for the "AI Duplicate Detection" component
3. Click "Check for Duplicates"
4. Should detect similar posts with similarity scores

### 3. Test Priority Scoring
1. Go to any post in your Pro project
2. Look for the "AI Priority Scoring" component
3. Click "Analyze Priority"
4. Should show priority score with urgency/impact breakdown

### 4. Run Test Script
```bash
# Make sure your environment variables are set
node test-ai-features.js
```

## How It Works

### AI Duplicate Detection
- Uses OpenAI embeddings to compare post content
- 75% similarity threshold for duplicate detection
- Automatically triggered when new posts are created
- Shows similarity percentage and AI reasoning

### AI Priority Scoring
- Analyzes urgency keywords (critical, urgent, broken, etc.)
- Analyzes impact keywords (affects all users, revenue, etc.)
- Considers engagement metrics (votes, comments)
- Returns 0-10 priority score with reasoning

## Troubleshooting

### Common Issues

1. **"Authentication required" error**
   - Make sure user is logged in and has Pro plan
   - Check SUPABASE_SERVICE_ROLE is set correctly

2. **"OpenAI API key missing" error**
   - Verify OPENAI_API_KEY is set in .env.local
   - Make sure the key is valid and has credits

3. **"Database error"**
   - Run the database schema SQL first
   - Check Supabase connection is working

4. **Features not showing**
   - Ensure project has Pro plan
   - Check feature gating is working correctly

### Debug Mode
Add this to your `.env.local` for detailed logging:
```bash
DEBUG_AI_FEATURES=true
```

## Cost Estimation

### OpenAI API Costs
- **Embeddings**: ~$0.0001 per post (text-embedding-3-small)
- **GPT-3.5-turbo**: ~$0.001 per analysis (priority scoring)
- **Estimated cost**: ~$0.01 per 100 posts analyzed

### Example Usage
- 1000 posts per month = ~$0.10 in OpenAI costs
- Very cost-effective for the value provided

## Next Steps

1. ✅ Run database schema
2. ✅ Add environment variables
3. ✅ Test with sample data
4. ✅ Deploy to production
5. 🎉 Enjoy AI-powered feedback management!

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure database schema is applied correctly
4. Test with the provided test script

The AI features will significantly enhance your Pro offering and justify the $19/month pricing! 🚀
