# Call Intelligence Engine - Setup Guide

## Overview

The Call Intelligence Engine analyzes customer call transcripts to extract actionable insights including feature requests, objections, competitor mentions, and revenue signals.

## Installation Steps

### 1. Apply Database Migration

Run the migration to create the necessary tables:

```bash
# If using Supabase CLI
supabase db push

# Or manually apply the migration file
psql $DATABASE_URL -f migrations/create-call-intelligence-tables.sql
```

This creates:
- `call_ingests` - Tracks batch uploads
- `call_records` - Individual call records with analysis
- Extensions to `posts` table for call metadata

### 2. Configure Environment Variables

Ensure these variables are set in `.env.local`:

```bash
# Required for AI analysis
OPENAI_API_KEY=sk-...

# Required for cron job authentication
CRON_SECRET=your-secret-here

# Optional: For Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional: For email notifications
RESEND_API_KEY=re_...
```

### 3. Set Up Cron Job

Configure the cron job to run periodically (recommended: every 5 minutes):

**Vercel:**
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/calls-analyze",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Manual trigger (for testing):**
```bash
curl -X GET https://your-domain.com/api/cron/calls-analyze \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Usage

### 1. Access the Dashboard

Navigate to `/app/calls` and select your project.

### 2. Ingest Call Transcripts

**Option A: Via File URL**
- Click "Ingest Calls"
- Select "File URL"
- Provide a URL to a CSV file with columns: `customer, transcript, amount, stage, deal_id`

**Option B: Manual Entry**
- Click "Ingest Calls"
- Select "Manual Entry"
- Enter call details and transcript

**Option C: API Integration**
```bash
curl -X POST https://your-domain.com/api/calls/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "uuid-here",
    "source": "api",
    "transcripts": [
      {
        "customer": "Acme Corp",
        "deal_id": "DEAL-001",
        "amount": 50000,
        "stage": "Negotiation",
        "transcript": "Full call transcript here..."
      }
    ]
  }'
```

### 3. Analysis Process

1. Calls are ingested and stored in `call_records`
2. The cron job (`/api/cron/calls-analyze`) processes pending calls
3. AI analyzes each call to extract:
   - 30-second highlight summary
   - Feature requests
   - Objections
   - Competitor mentions
   - Expansion/churn signals
   - Sentiment score
   - Priority score
4. Results are stored and posts/themes are created automatically

### 4. View Insights

The dashboard displays:
- **Metrics Cards:** Total calls, expansion revenue, churn risk, sentiment
- **Top Insights:** Key findings from all calls
- **Feature Heatmap:** Most requested features
- **Call Records Table:** Detailed view of each call
- **Objections & Competitors:** Top mentions

### 5. Export & Share

**Export Report:**
- Click "Export PDF" or "Export Markdown"
- Generates a comprehensive Call Audit report

**Share to Slack:**
- Click "Share to Slack"
- Sends a summary to your configured Slack channel

## Sample CSV Format

```csv
customer,transcript,amount,stage,deal_id
Acme Corp,"Sales rep: Thanks for joining today. Customer: Happy to be here. We're interested in your analytics features...",50000,Negotiation,DEAL-001
Beta Inc,"Sales rep: Let's discuss your needs. Customer: We need better reporting...",25000,Discovery,DEAL-002
```

## API Reference

### POST /api/calls/ingest
Ingest call transcripts

**Request:**
```json
{
  "projectId": "uuid",
  "source": "csv|zip|api|manual",
  "fileUrl": "https://...", // optional
  "transcripts": [ ... ] // optional
}
```

### GET /api/calls/summary?projectId=uuid
Get call analytics summary

**Response:**
```json
{
  "summary": {
    "total_calls": 10,
    "analyzed_calls": 10,
    "expansion_revenue": 150000,
    "churn_risk_revenue": 25000,
    "avg_sentiment": 0.65,
    "top_objections": [ ... ],
    "top_competitors": [ ... ],
    "feature_frequency": [ ... ],
    "top_insights": [ ... ]
  }
}
```

### GET /api/calls/export?projectId=uuid&format=pdf|md
Export call audit report

### POST /api/calls/share
Share summary to Slack/email

**Request:**
```json
{
  "projectId": "uuid",
  "channel": "slack|email"
}
```

## Troubleshooting

### Calls not being analyzed
1. Check cron job is running: `/api/cron/calls-analyze`
2. Verify `OPENAI_API_KEY` is set
3. Check `call_ingests` status in database

### AI analysis failing
1. Ensure OpenAI API key is valid
2. Check rate limits (cron processes 10 calls at a time)
3. Review logs for specific errors

### No posts/themes created
1. Verify project has at least one board
2. Check RLS policies allow service role access
3. Review cron job logs

## Architecture

```
User uploads transcripts
    ↓
POST /api/calls/ingest
    ↓
call_ingests + call_records created (status: pending)
    ↓
Cron job: /api/cron/calls-analyze (every 5 min)
    ↓
For each pending call:
  - AI analyzes transcript (OpenAI GPT-4)
  - Extract insights
  - Update call_record
  - Create posts/themes
  - Update progress
    ↓
User views dashboard
  - Metrics & insights
  - Export reports
  - Share to Slack
```

## Cost Estimation

**OpenAI API Costs (GPT-4):**
- ~2000 tokens per call analysis
- $0.03 per 1K input tokens, $0.06 per 1K output tokens
- Estimate: ~$0.15-0.25 per call
- 100 calls = $15-25

**Recommendations:**
- Batch process calls during off-peak hours
- Use GPT-3.5-turbo for lower costs (change in `ai-prompts.ts`)
- Cache results to avoid re-analyzing

## Support

For issues or questions:
1. Check logs in Vercel/hosting platform
2. Review database tables for data integrity
3. Test individual API endpoints
4. Verify environment variables

---

Built with ❤️ by SignalsLoop
