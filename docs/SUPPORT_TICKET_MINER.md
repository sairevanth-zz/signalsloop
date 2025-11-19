# Support Ticket Miner

Transform support tickets from Zendesk, Intercom, or CSV exports into actionable product insights with AI-powered analysis.

## Features

### 🎯 Core Capabilities
- **Automatic Theme Detection**: AI clusters tickets into recurring themes and patterns
- **Sentiment Analysis**: Track customer satisfaction and identify negative sentiment trends
- **ARR at Risk**: Calculate revenue impact from unhappy customers
- **Priority Scoring**: Automatically prioritize issues based on frequency, sentiment, and business impact
- **Top 5 Gaps**: Identify critical product gaps that need immediate attention
- **Roadmap Integration**: Auto-create roadmap posts from high-priority themes
- **Slack Digests**: Daily summaries of top themes and ARR at risk

### 📊 Analytics Dashboard
- Ticket volume trends
- Sentiment distribution
- Theme clustering visualization
- ARR at risk tracking
- Ticket table with theme links and sentiment badges

## Getting Started

### 1. Database Setup

Run the migration to create the required tables:

```bash
# Apply the migration
psql $DATABASE_URL -f migrations/202511192000_support_ticket_miner.sql
```

This creates:
- `support_ingests` - Tracks batch ingestion jobs
- `support_tickets` - Individual tickets with analysis results
- `support_ticket_summary` - Denormalized view for dashboard

### 2. Environment Variables

Add to your `.env.local`:

```bash
# Required for AI analysis
OPENAI_API_KEY=sk-...

# Required for cron jobs
CRON_SECRET=your-secure-random-string

# Optional: Slack webhook for daily digests
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional: App URL for Slack links
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### 3. Access the Dashboard

Navigate to `/app/support` and select your project.

## Usage

### Ingesting Tickets

#### Via UI (Recommended)

1. Go to `/app/support?projectId=YOUR_PROJECT_ID`
2. Click "Ingest Tickets"
3. Select source (CSV, Zendesk, Intercom)
4. Provide CSV file URL
5. Click "Ingest Tickets"

#### Via API

```bash
curl -X POST https://your-app.com/api/support/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "uuid",
    "source": "csv",
    "fileUrl": "https://example.com/tickets.csv"
  }'
```

Or with direct ticket array:

```bash
curl -X POST https://your-app.com/api/support/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "uuid",
    "source": "api",
    "tickets": [
      {
        "subject": "App crashes on login",
        "body": "Description of the issue...",
        "customer": "john@example.com",
        "plan": "Enterprise",
        "arr_value": 120000,
        "created_at": "2024-11-19T10:00:00Z"
      }
    ]
  }'
```

### CSV Format

Expected columns (case-insensitive):

| Column | Required | Description |
|--------|----------|-------------|
| `subject` | ✅ | Ticket subject/title |
| `body` | ✅ | Ticket description/content |
| `external_id` | ❌ | Original ticket ID from source system |
| `customer` | ❌ | Customer name or email |
| `plan` | ❌ | Subscription plan (Starter, Pro, Enterprise) |
| `arr_value` | ❌ | Annual Recurring Revenue for this customer |
| `created_at` | ❌ | Ticket creation date (ISO 8601) |

**Sample CSV**: See `examples/support-tickets-sample.csv`

### Analyzing Tickets

Tickets are automatically analyzed by the cron job every 10 minutes. You can also trigger analysis manually:

```bash
# Via UI
Click "Analyze" button in the dashboard

# Via API (requires CRON_SECRET)
curl https://your-app.com/api/cron/support-analyze \
  -H "Authorization: Bearer $CRON_SECRET"
```

The analysis process:
1. ✅ Extracts theme name and description
2. ✅ Calculates sentiment score (-1 to 1)
3. ✅ Assigns priority score (1-10)
4. ✅ Clusters similar tickets
5. ✅ Creates/updates themes in database
6. ✅ Creates roadmap posts for top 5 gaps

### Viewing Analytics

Get summary data:

```bash
curl "https://your-app.com/api/support/summary?projectId=uuid&days=30"
```

Returns:
- Total tickets and unanalyzed count
- Top themes with ticket counts
- Sentiment trend over time
- ARR at risk
- Volume by source
- High priority tickets

### Exporting Top Gaps

1. Go to support dashboard
2. Click "Export Top 5 Gaps"
3. Select gaps to export
4. Choose format (Markdown, CSV, JSON)
5. Download file
6. Import to Jira, Linear, or your project management tool

### Slack Digests

Daily digests are sent at 9 AM (configured in `vercel.json`).

Each digest includes:
- Total tickets (last 7 days)
- ARR at risk
- Sentiment breakdown
- Top 3 themes with ticket counts
- Link to full dashboard

## Architecture

### Database Schema

```sql
support_ingests
├─ id (uuid, pk)
├─ project_id (uuid, fk → projects)
├─ source (text) -- 'zendesk' | 'intercom' | 'csv' | 'api'
├─ status (text) -- 'pending' | 'processing' | 'completed' | 'failed'
├─ total (int)
├─ processed (int)
├─ errors (jsonb)
└─ created_at (timestamptz)

support_tickets
├─ id (uuid, pk)
├─ project_id (uuid, fk → projects)
├─ ingest_id (uuid, fk → support_ingests)
├─ external_id (text)
├─ subject (text)
├─ body (text)
├─ customer (text)
├─ plan (text)
├─ arr_value (decimal)
├─ created_at (timestamptz)
├─ analyzed_at (timestamptz)
├─ theme_id (uuid, fk → themes)
├─ post_id (uuid, fk → posts)
├─ sentiment_score (decimal) -- -1 to 1
├─ sentiment_category (text) -- 'positive' | 'negative' | 'neutral' | 'mixed'
├─ priority_score (int) -- 1-10
└─ metadata (jsonb)
```

### API Endpoints

- `POST /api/support/ingest` - Ingest tickets
- `GET /api/support/ingest?ingestId=xxx` - Get ingest status
- `GET /api/support/summary?projectId=xxx&days=30` - Get analytics summary
- `GET /api/cron/support-analyze` - Analyze unprocessed tickets (cron)
- `GET /api/cron/support-digest` - Send daily Slack digest (cron)

### AI Services

**Ticket Analysis** (`src/lib/openai/support-tickets.ts`):
- Theme extraction using GPT-4o
- Sentiment analysis using existing sentiment service
- Priority scoring based on severity, ARR, and sentiment
- Clustering by theme name

**Analysis Output**:
```typescript
{
  ticket_id: string
  theme_name: string
  theme_description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  sentiment_score: number // -1 to 1
  priority_score: number // 1-10
  arr_risk: number // Calculated ARR at risk
  recommendation: string
}
```

### Cron Jobs

Configured in `vercel.json`:

```json
{
  "path": "/api/cron/support-analyze",
  "schedule": "*/10 * * * *" // Every 10 minutes
},
{
  "path": "/api/cron/support-digest",
  "schedule": "0 9 * * *" // Daily at 9 AM
}
```

## Testing

### 1. Test CSV Ingestion

```bash
# Upload the sample CSV to a public URL (e.g., GitHub Gist, S3)
# Then ingest via API or UI

curl -X POST http://localhost:3000/api/support/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "source": "csv",
    "fileUrl": "https://gist.githubusercontent.com/.../support-tickets-sample.csv"
  }'
```

### 2. Trigger Analysis

```bash
curl http://localhost:3000/api/cron/support-analyze \
  -H "Authorization: Bearer dev-secret"
```

### 3. View Summary

```bash
curl "http://localhost:3000/api/support/summary?projectId=YOUR_PROJECT_ID&days=30"
```

### 4. Test Slack Digest

```bash
curl http://localhost:3000/api/cron/support-digest \
  -H "Authorization: Bearer dev-secret"
```

## Customization

### Adjusting AI Prompts

Edit the system prompts in:
- `src/lib/openai/support-tickets.ts` - Theme extraction
- `src/lib/openai/sentiment.ts` - Sentiment analysis

### Priority Scoring Algorithm

Modify `analyzeTicketInternal()` in `src/lib/openai/support-tickets.ts`:

```typescript
let adjustedPriority = themeResult.priority_score;

// Boost priority for negative sentiment
if (sentimentResult.sentiment_score < -0.5) {
  adjustedPriority = Math.min(10, adjustedPriority + 1);
}

// Boost priority for high-value customers
if (ticket.arr_value && ticket.arr_value > 50000) {
  adjustedPriority = Math.min(10, adjustedPriority + 1);
}
```

### ARR Risk Calculation

Modify risk calculation in the same file:

```typescript
// Current: 50% max risk for very negative tickets
const riskPercentage = Math.abs(sentimentResult.sentiment_score) * 0.5;
arrRisk = ticket.arr_value * riskPercentage;

// Custom: Scale by severity
const severityMultiplier = {
  critical: 0.8,
  high: 0.5,
  medium: 0.3,
  low: 0.1
}[themeResult.severity];
arrRisk = ticket.arr_value * Math.abs(sentimentResult.sentiment_score) * severityMultiplier;
```

## Troubleshooting

### Tickets not being analyzed

1. Check that tickets were ingested: Query `support_tickets` table
2. Check cron job is running: Look at Vercel logs
3. Manually trigger analysis: Call `/api/cron/support-analyze`
4. Check OpenAI API key: Ensure `OPENAI_API_KEY` is set correctly

### Themes not appearing

1. Ensure analysis completed: Check `analyzed_at` is not null
2. Check theme creation: Query `themes` table for your project
3. Look for errors in cron job logs

### Slack digests not sending

1. Verify `SLACK_WEBHOOK_URL` is set
2. Check that projects have analyzed tickets
3. Test webhook manually with curl

### CSV parsing errors

1. Ensure CSV has header row
2. Check column names match expected format (see CSV Format section)
3. Verify subject and body columns are present
4. Look at ingestion errors: Check `support_ingests.errors` field

## Performance Considerations

- **Batch Size**: Analysis processes 20 tickets per cron run (10 minutes) = ~3,000 tickets/day
- **Rate Limits**: Uses OpenAI API - respect your tier's rate limits
- **Caching**: AI responses are cached to reduce costs
- **Database**: Indexes on `analyzed_at`, `theme_id`, `priority_score` for fast queries

## Roadmap

Future enhancements:
- [ ] Real-time Zendesk/Intercom webhooks
- [ ] Custom theme taxonomy
- [ ] Automated reply suggestions
- [ ] Integration with Linear, Jira (direct API)
- [ ] Multi-language support
- [ ] Advanced clustering algorithms
- [ ] Ticket deduplication
- [ ] Trend forecasting

## Support

For issues or questions:
1. Check the logs in Vercel dashboard
2. Review the database tables for data issues
3. Open an issue on GitHub

## License

Part of SignalsLoop - see main LICENSE file.
