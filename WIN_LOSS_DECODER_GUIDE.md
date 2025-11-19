# Win/Loss Decoder - Complete Feature Guide

## 🎯 Overview

The Win/Loss Decoder is an AI-powered deal analysis system that automatically generates comprehensive autopsies for closed deals, identifies loss patterns, and provides actionable insights to improve win rates.

## 🚀 Quick Start

### 1. Access the Feature

**From Project Dashboard:**
- Click the **Trophy icon** (🏆) button on any project card
- Or use the dropdown menu → "Win/Loss Decoder"
- Direct URL: `/{your-project-slug}/win-loss`

### 2. Import Deals

**Option A: CSV Upload**
1. Click "Upload CSV" button in the dashboard
2. Download the sample CSV template
3. Fill in your deal data with these fields:
   - `name` - Deal name (required)
   - `amount` - Deal value in dollars (required)
   - `status` - won/lost/open (required)
   - `stage` - prospecting/qualification/proposal/negotiation/closed
   - `competitor` - Competitor name
   - `competitor_product` - Competitor product
   - `notes` - Deal notes and context
   - `contact_name` - Customer contact
   - `contact_company` - Customer company
   - `close_reason` - Reason for win/loss
   - `closed_at` - ISO 8601 timestamp

4. Upload and wait for confirmation

**Option B: API Integration**
```bash
curl -X POST https://your-domain.com/api/deals/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "deals": [
      {
        "name": "Acme Corp Deal",
        "amount": 50000,
        "status": "lost",
        "competitor": "Salesforce",
        "notes": "Lost to pricing..."
      }
    ]
  }'
```

### 3. Generate Autopsy

**Automatic (Recommended):**
- Deals closed in the last 7 days are automatically analyzed daily
- Cron job runs: `/api/cron/deal-autopsy`

**Manual:**
1. Go to the "Deals" tab
2. Find a closed deal (won/lost)
3. Click "Generate" button
4. Wait ~10-30 seconds for AI analysis
5. Click "View" to see the full autopsy

## 📊 Dashboard Features

### KPI Cards
1. **Win Rate** - Percentage of deals won (last 30 days)
2. **Revenue Lost** - Total lost revenue with count of recent losses
3. **Revenue Won** - Total won revenue
4. **Pipeline** - Open deal value and count
5. **Avg Deal** - Average deal size

### Tabs

#### Overview Tab
- **Loss Reasons Pie Chart** - Visual breakdown of why deals are lost
- **Competitor Performance** - Win/loss comparison by competitor

#### Deals Tab
- **Search** - Find deals by name or competitor
- **Filter** - Filter by status (all/won/lost/open)
- **Table View** - All deals with:
  - Deal name and company
  - Amount
  - Status badge
  - Competitor
  - Autopsy status (Ready/Pending/-)
  - Actions (View/Generate)

#### Analytics Tab
- Coming soon: Advanced metrics and predictions

## 🔍 Autopsy Detail View

Click "View" on any deal with an autopsy to see:

### 1. Analysis Confidence
- AI confidence score (0-100%)
- Visual progress bar

### 2. Executive Summary
- 3-5 sentence overview
- Key outcome factors
- Overall context

### 3. Primary Loss Reason
- Categorized reason (pricing, features, competitor, timing, etc.)
- Detailed explanation

### 4. Key Objections
- Category and severity (high/medium/low)
- Description
- Frequency count

### 5. Competitive Intelligence
- Competitor name
- Features mentioned
- Their advantages vs. you
- Their weaknesses vs. you
- Customer sentiment

### 6. Recommendations
- 3-5 actionable bullet points
- Specific steps to prevent similar losses

### 7. Action Items
- Concrete next steps
- Checkbox format for task tracking

### 8. Key Themes
- Recurring topics from deal notes

### Actions
- **Regenerate** - Re-run AI analysis with updated context
- **Export MD** - Download autopsy as Markdown file
- **Close** - Return to dashboard

## 🔔 Daily Digest (Coming Soon)

Set up automated Slack/email notifications:

```sql
-- Example: Insert digest subscription
INSERT INTO deal_digest_subscriptions (
  project_id,
  channel,
  destination,
  frequency,
  include_lost,
  include_at_risk
) VALUES (
  'your-project-id',
  'slack',
  'https://hooks.slack.com/...',
  'daily',
  true,
  true
);
```

Daily digest includes:
- New losses in last 24h
- At-risk open deals (similar to recent losses)
- Top loss reasons
- Competitor trends

## 🎯 Battlecards (Auto-Generated)

The system automatically builds competitor battlecards by analyzing deal patterns:

- **Win/Loss Rates** - Per competitor
- **Revenue Impact** - Lost and won amounts
- **Common Objections** - Recurring themes
- **Win Factors** - What works against them
- **Loss Factors** - What doesn't work
- **Strengths** - Their competitive advantages
- **Weaknesses** - Their competitive disadvantages
- **Recommended Positioning** - AI-suggested strategy

Access via: `/api/deals/battlecards?projectId=xxx`

## 🔧 API Reference

### Endpoints

#### 1. Ingest Deals
```
POST /api/deals/ingest
```
**Body:**
```json
{
  "projectId": "uuid",
  "deals": [
    {
      "name": "string",
      "amount": number,
      "status": "won|lost|open",
      ...
    }
  ]
}
```

#### 2. Generate Autopsy
```
POST /api/deals/{dealId}/autopsy
```
**Response:** Autopsy object with AI analysis

#### 3. Get Autopsy
```
GET /api/deals/{dealId}/autopsy
```

#### 4. Get Overview
```
GET /api/deals/overview?projectId={id}&days={30}
```

## 📈 Best Practices

### 1. Data Quality
- Include detailed notes in `notes` field
- Add competitor information when available
- Set accurate close dates
- Use consistent naming

### 2. Regular Imports
- Import deals weekly or after each close
- Keep data fresh for trend analysis
- Run autopsy cron job daily

### 3. Action on Insights
- Review autopsies within 24h of generation
- Share with sales team
- Update playbooks based on recommendations
- Track action item completion

### 4. Competitive Intelligence
- Monitor battlecards monthly
- Adjust positioning based on AI recommendations
- Share insights with product team
- Use in sales training

## 🐛 Troubleshooting

### Autopsy Not Generating
- Ensure deal is marked as won/lost (not open)
- Check `closed_at` timestamp is set
- Verify OpenAI API key is configured
- Check logs for errors

### Upload Fails
- Verify CSV format matches template
- Ensure all required fields present
- Check amount is numeric
- Validate status values (won/lost/open)

### Missing Data
- Run database migration first
- Verify project_id is correct
- Check RLS policies allow access

## 🔐 Security

- Row-Level Security (RLS) ensures data isolation
- Only project owners/members can view deals
- API endpoints require authentication
- Cron jobs use secret bearer token

## 📝 Database Schema

Key tables:
- `deals` - All deal records
- `deal_autopsies` - AI-generated analyses
- `deal_battlecards` - Competitor insights
- `deal_digest_subscriptions` - Notification settings

See `/migrations/202511190001_win_loss_decoder.sql` for full schema.

## 🎨 UI Components

Reusable components in `/src/components/win-loss/`:
- `EnhancedWinLossDashboard` - Main dashboard
- `DealUploadDialog` - CSV import
- `AutopsyDetailPanel` - Full autopsy view

## 🚦 Next Steps

1. Run the database migration
2. Upload sample CSV to test
3. Generate your first autopsy
4. Set up daily cron jobs
5. Configure Slack digest (optional)
6. Review and act on insights!

---

**Need Help?** Check the API docs or reach out to support.
