# Devil's Advocate - Manual Mode Guide

## Overview

The Devil's Advocate Agent can operate in **Manual Mode** without Firecrawl, making it cost-effective for production scale (hundreds of projects).

## Cost Comparison

### Firecrawl Automated Mode
```
200 projects × 5 competitors × 30 days = 30,000 credits/month
Firecrawl Standard tier: $83/month
Annual cost: $996/year
```

### Manual Mode
```
GPT-4o analysis: ~$0.005 per event
OpenAI embeddings: ~$0.0001 per event
1,000 events/month: ~$5-10/month in OpenAI costs

Total: $5-10/month (vs $83/month)
Savings: ~$73-78/month ($876-936/year)
```

## How Manual Mode Works

### 1. Submit Competitor Events via UI

Navigate to: `/app/competitor-events?projectId={your-project-id}`

**Steps:**
1. Click "Add Event" button
2. Select competitor from dropdown
3. Enter event title (e.g., "Launched mobile offline mode")
4. Paste changelog text, press release, or description
5. Add source URL (optional but recommended)
6. Select event date
7. Click "Analyze & Save"

**What Happens:**
- GPT-4o analyzes the content using our summarization prompt
- Extracts: event type, impact assessment, strategic implications
- Generates 1536-dim vector embedding for semantic search
- Stores in `competitor_events` table
- Event is now searchable when analyzing PRDs

### 2. Submit via API

```typescript
POST /api/devils-advocate/events

Body:
{
  "competitor_id": "uuid-of-competitor",
  "project_id": "uuid-of-project",
  "raw_content": {
    "title": "Competitor X launches dark mode",
    "content": "Full text of changelog or press release...",
    "url": "https://competitor.com/changelog/2025-12-05",
    "date": "2025-12-05"
  }
}

Response:
{
  "success": true,
  "event": { ...analyzed event with strategic implications... },
  "message": "Competitor event created and analyzed with GPT-4o"
}
```

### 3. Programmatic Integration

```typescript
import { createCompetitorEvent } from '@/lib/devils-advocate';

const event = await createCompetitorEvent(
  competitorId,
  projectId,
  {
    title: "Feature launch",
    content: "Detailed description...",
    url: "https://source.com",
    date: "2025-12-05"
  }
);
```

## Scaling Strategies

### For 10-50 Projects

**Community-Sourced:**
- Let users submit competitor events for their own projects
- Gamify with points/badges for quality submissions
- Moderate submissions for accuracy
- **Cost: $0** (just OpenAI API)

### For 50-200 Projects

**Hybrid Automation:**
1. Subscribe to competitor RSS feeds (free)
2. Use Zapier ($20/month) or Make.com ($9/month)
3. Forward RSS updates to your API endpoint
4. API analyzes with GPT-4o automatically

**Cost: ~$30/month** vs $83/month for Firecrawl

### For 200+ Projects

**Choice Point:**

**Option A: Stay Manual/Hybrid**
- Hire VA for $10-15/hour to monitor top competitors
- 1 hour/day = ~$300/month
- Still cheaper than Firecrawl Growth tier ($333/month)
- Higher quality curation

**Option B: Add Firecrawl**
- Firecrawl Standard: $83/month (100k credits)
- Automatic daily scraping
- Less manual work

**Decision Criteria:**
- If Devil's Advocate drives revenue → worth $83/month
- If low engagement → stay manual

## Integration Examples

### Zapier Workflow

```
Trigger: RSS Feed (Competitor Changelog)
  ↓
Action: HTTP POST to your API
  URL: /api/devils-advocate/events
  Body: Map RSS fields to raw_content
  ↓
Result: Event analyzed and stored
```

### Email Integration

```
Trigger: Email arrives (changelog@yourcompany.com)
  ↓
Parser: Extract competitor, title, content
  ↓
Action: POST to API
  ↓
Result: Event stored
```

### Slack Bot

```
User: /track-competitor Acme Corp just launched feature X
  ↓
Bot: Parses message, calls API
  ↓
Response: ✅ Event tracked and analyzed
```

## Best Practices

### Event Quality

**Good Event Submission:**
```
Title: "Competitor X launches mobile offline mode"
Content: "Today Competitor X announced full offline support
          for their mobile app. Users can now access all features
          without internet connection. This has been their #1
          requested feature for 2 years. Early reviews are very
          positive with 4.8 star ratings."
URL: https://competitor.com/blog/offline-mode
Date: 2025-12-05
```

**Why Good:**
- Specific feature description
- Context (user demand, reviews)
- Source for verification
- Accurate date

**Bad Event Submission:**
```
Title: "Update"
Content: "They updated something"
URL: (empty)
Date: (wrong)
```

### Monitoring Frequency

**Daily Monitoring (Manual):**
- 5-10 minutes per competitor
- Check changelog, blog, Twitter
- Submit 1-2 events per week per competitor

**Weekly Batch:**
- 30 minutes once per week
- Review all competitors
- Submit all notable events

## ROI Calculation

### Value of Devil's Advocate

Assume:
- 1 bad PRD prevented per month
- Average engineering cost: $100k/year per engineer
- Bad feature wastes 2 weeks of 3 engineers
- Cost of bad feature: ($100k/52) × 2 × 3 = ~$11,500

**ROI:**
- Cost of Manual Mode: $10/month = $120/year
- Value prevented: $11,500 × 12 months = $138,000/year
- **ROI: 1,150x**

Even if Devil's Advocate prevents just 1 bad decision per year:
- Cost: $120
- Value: $11,500
- **ROI: 96x**

### When to Upgrade to Firecrawl

Upgrade when:
1. Manual work takes >2 hours/week ($1,000+/year of labor)
2. Missing important competitor updates
3. Devil's Advocate is heavily used (>100 PRD analyses/month)
4. Feature drives measurable business value

## Monitoring Setup

### Step 1: Identify Competitors

For each project, maintain list of:
- Direct competitors (3-5)
- Adjacent products (2-3)
- Emerging threats (1-2)

### Step 2: Find Information Sources

**Free Sources:**
- Competitor changelog pages
- Company blog RSS feeds
- Product Hunt launches
- Twitter/LinkedIn company accounts
- TechCrunch, Product Hunt
- Reddit communities
- GitHub releases (if open source)

### Step 3: Set Up Notifications

**RSS Readers:**
- Feedly (free)
- Inoreader (free tier)
- NewsBlur ($36/year)

**Twitter Lists:**
- Create list of competitor accounts
- Check daily or use alerts

**Google Alerts:**
- Set up for competitor names
- Daily digest to email

### Step 4: Submission Routine

**Daily (5-10 min):**
- Check RSS reader
- Scan Twitter lists
- Submit 1-2 events if notable

**Weekly (30 min):**
- Deep dive on top 3 competitors
- Check changelogs, blogs
- Submit batch of events

## FAQ

### Q: Do I need to submit every competitor update?

**A:** No! Only submit:
- New feature launches
- Major updates
- Pricing changes
- Strategic moves (funding, acquisitions)
- Anything that might affect your product decisions

Skip minor bug fixes, maintenance updates, etc.

### Q: How many events should I aim for?

**A:** Quality over quantity:
- 5-10 high-quality events/month per project is excellent
- 20-30 events/month is ideal
- 100+ events/month is probably too many (noise)

### Q: What if I miss an event?

**A:** Not a problem:
- Historical events are still valuable
- Submit when you discover them
- Focus on major competitive intelligence

### Q: Can I bulk import events?

**A:** Yes! Use the API:

```bash
# Bulk import script
for event in events.json; do
  curl -X POST /api/devils-advocate/events \
    -H "Content-Type: application/json" \
    -d "$event"
done
```

### Q: How do I train my team to use this?

**A:** Make it easy:
1. Create Slack channel #competitor-intel
2. Pin instructions with API endpoint
3. Create simple form for non-technical users
4. Gamify with leaderboard
5. Show impact (PRD alerts generated)

## Summary

**Manual Mode is perfect for:**
- ✅ Production scale (100s of projects)
- ✅ Cost-conscious deployments
- ✅ High-quality curation
- ✅ Community-sourced intelligence

**Use Firecrawl when:**
- ⚠️ Manual work becomes burden
- ⚠️ Missing critical updates
- ⚠️ Need 100% automation

**Bottom Line:**
Start with Manual Mode, upgrade to Firecrawl only if ROI justifies it.
