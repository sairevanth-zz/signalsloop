# Customer Call Intelligence Engine

## Summary

This PR adds a comprehensive Call Intelligence Engine that analyzes customer call transcripts using AI to extract actionable insights.

## Features Added

### 🗄️ Database Schema
- `call_ingests` table - tracks batch uploads of call transcripts
- `call_records` table - stores individual calls with AI analysis results
- Extended `posts` table with call metadata fields
- Full RLS policies and analytics views

### 🔌 API Endpoints
- `POST /api/calls/ingest` - Upload calls via URL or manual entry
- `GET /api/calls/summary` - Get analytics dashboard data
- `GET /api/calls/export` - Export PDF/Markdown reports
- `POST /api/calls/share` - Share to Slack/email
- `GET /api/cron/calls-analyze` - Background AI processing (runs every 5 min)

### 🤖 AI Analysis
- Analyzes transcripts using GPT-4
- Extracts feature requests with priority and ARR impact
- Detects customer objections by type and severity
- Identifies competitor mentions with context
- Calculates expansion/churn signals (0-100 score)
- Generates 30-second highlight summaries
- Sentiment analysis (-1 to 1 scale)
- Priority scoring (1-100)
- Automatic theme detection

### 🎨 UI Dashboard
- Dashboard at `/app/calls` with project selection
- Metrics cards: calls, expansion revenue, churn risk, sentiment, objections, competitors
- Top insights list
- Feature request heatmap (Recharts visualization)
- Call records table with highlights
- Manual and URL-based ingest dialog
- Export and Slack share actions

### 🔗 Integration
- Added to Quick Actions Sidebar (AI Features section)
- Prominent button on project cards with "NEW" badge and pulsing indicator
- Included in project dropdown menu
- Feature announcement in notifications
- Updated changelog with v2.4.0 release

### ⚙️ Automation
- Vercel cron configured to run every 5 minutes
- Processes 10 calls per batch
- Auto-creates posts and themes from insights
- Deduplication of feature requests

## Test Data
- Sample CSV with 5 realistic call transcripts in `test-data/sample-calls.csv`

## Documentation
- Complete setup guide in `docs/CALL_INTELLIGENCE_SETUP.md`
- API reference
- Architecture overview
- Cost estimation

## Files Changed
- **16 new files** in initial commit
- **3 modified files** for integration
- Database migration ready to apply

## Next Steps
1. ✅ Merge PR
2. Apply database migration: `psql $DATABASE_URL -f migrations/create-call-intelligence-tables.sql`
3. Set environment variables:
   - `OPENAI_API_KEY` - Required for AI analysis
   - `CRON_SECRET` - Required for cron authentication
   - `SLACK_WEBHOOK_URL` - Optional, for Slack sharing
4. Deploy to activate cron job
5. Test with sample CSV

## Impact
Delivers the "48h Call Audit" capability - turning hundreds of unwatched Gong/Chorus calls into actionable product insights, revenue signals, and competitive intelligence.

## Testing
- [ ] Database migration runs successfully
- [ ] Call ingest endpoint accepts CSV/manual input
- [ ] Cron job processes calls and creates posts
- [ ] Dashboard displays metrics correctly
- [ ] Export functionality works
- [ ] Slack sharing works (if configured)
