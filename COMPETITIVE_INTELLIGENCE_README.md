# Competitive Intelligence Dashboard

A comprehensive competitive intelligence system for SignalsLoop that automatically transforms feedback into strategic competitive insights.

## Overview

The Competitive Intelligence Dashboard automatically:

1. **Identifies competitor mentions** in discovered feedback using AI extraction
2. **Tracks sentiment** - you vs each competitor
3. **Analyzes head-to-head comparisons** when users evaluate products
4. **Identifies feature gaps** - what competitors have that users want
5. **Monitors competitive threats & opportunities**
6. **Generates strategic recommendations** with ROI estimates

**Key Insight**: No additional data collection needed! The Feedback Hunter already captures competitor mentions. This feature extracts and analyzes that competitive intelligence.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Feedback Hunter                           │
│              (Discovers feedback from 8 platforms)              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              Competitor Extractor (GPT-4o-mini)                 │
│   Identifies competitor mentions, sentiment, context            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Competitive Intelligence DB                     │
│  • Competitors         • Competitive Mentions                   │
│  • Feature Gaps        • Competitive Events                     │
│  • Strategic Recommendations                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
  ┌──────────┐      ┌──────────────┐    ┌─────────────┐
  │ Feature  │      │  Strategic   │    │ Competitive │
  │   Gap    │      │  Analyzer    │    │  Dashboard  │
  │ Detector │      │   (GPT-4)    │    │     UI      │
  └──────────┘      └──────────────┘    └─────────────┘
```

## Database Schema

### Tables Created

**`competitors`** - Tracks identified competitors
- Auto-detection from feedback mentions
- Manual addition supported
- Sentiment tracking (vs you & about them)
- Win/loss analysis (switches to/from)

**`competitive_mentions`** - Links feedback to competitors
- Mention type (comparison, switch, feature request, etc.)
- Dual sentiment scores
- Context extraction
- AI-generated insights

**`feature_gaps`** - Features competitors have that users want
- Priority & urgency scoring
- Revenue impact estimates
- Competitor ownership mapping
- Status tracking (identified → planned → building → shipped)

**`competitive_events`** - Significant competitive events
- Auto-detected from mention spikes
- Manual entry supported
- Impact assessment

**`strategic_recommendations`** - AI-generated strategic actions
- 4 types: ATTACK, DEFEND, REACT, IGNORE
- ROI estimates
- Priority scoring
- Action tracking

### Database Functions

- `get_competitive_overview(project_id)` - Dashboard stats
- `get_competitor_profile(competitor_id)` - Detailed competitor analysis
- `detect_competitive_event_spike(competitor_id, days_back)` - Spike detection
- `increment_competitor_mentions(competitor_id)` - Update mention count
- `update_competitor_sentiment(competitor_id)` - Recalculate sentiment averages

### Views

- `competitive_dashboard_overview` - Competitor summary with metrics
- `feature_gaps_with_competitors` - Feature gaps with competitor details
- `recent_competitive_activity` - Timeline of competitive events & mentions

## Core Modules

### 1. Competitor Extractor (`src/lib/competitive-intelligence/competitor-extractor.ts`)

**Purpose**: Extract competitor mentions from feedback using GPT-4o-mini

**Key Functions**:
- `extractCompetitorMentions(feedbackId)` - Process single feedback item
- `extractCompetitorMentionsBatch(feedbackIds[])` - Batch processing
- `getPendingFeedbackForExtraction(projectId)` - Get unprocessed items

**AI Prompt**: Identifies competitor name, mention type, context, sentiment (dual), and key insights

**Cost**: ~$0.002 per feedback item (GPT-4o-mini)

### 2. Feature Gap Detector (`src/lib/competitive-intelligence/feature-gap-detector.ts`)

**Purpose**: Cluster feature requests into gaps with priority & revenue impact

**Key Functions**:
- `detectFeatureGaps(projectId, daysBack)` - Analyze last N days of mentions
- `getTopFeatureGaps(projectId, limit)` - Get prioritized gaps
- `updateFeatureGapStatus(gapId, status)` - Track progress

**AI Prompt**: Groups similar requests, assesses priority, estimates revenue impact

**Cost**: Weekly batch analysis using GPT-4

### 3. Strategic Analyzer (`src/lib/competitive-intelligence/strategic-analyzer.ts`)

**Purpose**: Generate strategic recommendations based on competitive data

**Key Functions**:
- `generateStrategicRecommendations(projectId)` - Create recommendations
- `getStrategicRecommendations(projectId, status?)` - List recommendations
- `updateRecommendationStatus(recId, status)` - Track actions

**Recommendation Types**:
- **ATTACK**: Exploit competitor weakness
- **DEFEND**: Protect against competitor strength
- **REACT**: Respond to market shift
- **IGNORE**: Acknowledge but don't act

**Cost**: Weekly batch analysis using GPT-4

### 4. Integration Bridge (`src/lib/integrations/competitive-bridge.ts`)

**Purpose**: Connect competitive intelligence with existing features

**Key Functions**:
- `onFeedbackDiscovered(feedbackId)` - Auto-extract on new feedback
- `onCompetitiveMentionsAccumulated(projectId)` - Threshold-based analysis trigger
- `enrichSentimentWithCompetitiveContext(feedbackId)` - Add competitive data to sentiment
- `associateThemesWithCompetitors(projectId, themeId)` - Link themes to competitors
- `getCompetitiveContextForFeedback(feedbackId)` - Get competitor badges for UI

## Background Jobs (Cron)

### 1. Competitive Extraction (`/api/cron/competitive-extraction`)

**Schedule**: Every 30 minutes (after Hunter scan)

**Purpose**: Extract competitors from newly discovered feedback

**Process**:
1. Get projects with active hunters
2. Find pending feedback items (limit 20/project)
3. Extract competitor mentions using GPT-4o-mini
4. Store mentions and update competitor stats
5. Check for competitive event spikes

### 2. Feature Gap Detection (`/api/cron/detect-feature-gaps`)

**Schedule**: Daily at 2 AM

**Purpose**: Analyze competitive mentions to identify feature gaps

**Process**:
1. Get projects with competitive mentions
2. Analyze last 90 days of feature_comparison mentions
3. Cluster using GPT-4
4. Store/update feature gaps with priority & revenue impact

### 3. Strategic Recommendations (`/api/cron/strategic-recommendations`)

**Schedule**: Weekly (Monday 1 AM)

**Purpose**: Generate strategic recommendations

**Process**:
1. Get projects with meaningful competitive data (>5 mentions)
2. Gather competitive intelligence summary
3. Generate 3-7 recommendations using GPT-4
4. Store with priority, ROI, and impact estimates

## API Endpoints

### Competitive Overview

```
GET /api/competitive/overview?projectId={projectId}

Returns:
{
  overview: { total_competitors, active_competitors, total_mentions, net_switches, ... },
  competitors: [...],
  topFeatureGaps: [...],
  pendingRecommendations: [...],
  recentActivity: [...],
  sentimentTrend: [{ date, avg_sentiment, mention_count }]
}
```

### Competitors CRUD

```
GET    /api/competitive/competitors?projectId={projectId}[&status={status}]
POST   /api/competitive/competitors
       Body: { projectId, name, category?, website?, description? }
PUT    /api/competitive/competitors
       Body: { competitorId, name?, category?, website?, description?, status? }
DELETE /api/competitive/competitors?competitorId={competitorId}
```

### Competitor Profile

```
GET /api/competitive/profile?competitorId={competitorId}

Returns:
{
  competitor: {...},
  mentionBreakdown: [{ mention_type, count }],
  sentimentTrend: [{ date, avg_sentiment_vs_you, mention_count }],
  topMentions: [...]
}
```

### Feature Gaps

```
GET /api/competitive/feature-gaps?projectId={projectId}
GET /api/competitive/feature-gaps?gapId={gapId}  (detailed view)
PUT /api/competitive/feature-gaps
    Body: { gapId, status, assignedTo? }
```

### Strategic Recommendations

```
GET /api/competitive/recommendations?projectId={projectId}[&status={status}]
GET /api/competitive/recommendations?recommendationId={recId}  (detailed view)
GET /api/competitive/recommendations?projectId={projectId}&refresh=true  (regenerate)
PUT /api/competitive/recommendations
    Body: { recommendationId, status, userId?, outcomeNotes? }
```

## Integration with Existing Features

### 1. Sentiment Analysis

- Competitive mentions automatically get dual sentiment scores:
  - `sentiment_vs_you`: How they compare you to competitor (-1 to +1)
  - `sentiment_about_competitor`: Their general feeling about competitor
- Use `enrichSentimentWithCompetitiveContext(feedbackId)` to add competitive data to sentiment displays

### 2. Theme Detection

- Themes can be linked to competitors using `associateThemesWithCompetitors()`
- Show which competitor is most associated with each theme
- Display "Users want Feature X like CompetitorA has"

### 3. Feedback Feed

- Use `getCompetitiveContextForFeedback(feedbackId)` to get competitor badges
- Display competitor names on feedback items
- Filter by: "mentions CompetitorA", "mentions any competitor", "comparisons only"

### 4. Hunter Integration

- Automatically calls `onFeedbackDiscovered()` after feedback is discovered
- Triggers competitive extraction in the flow
- No manual intervention needed

## TypeScript Types

All types are defined in `src/types/competitive-intelligence.ts`:

```typescript
import {
  Competitor,
  CompetitiveMention,
  FeatureGap,
  StrategicRecommendation,
  CompetitiveOverviewResponse,
  CompetitorProfileResponse,
  // ... and more
} from '@/types/competitive-intelligence';
```

## Cost Optimization

1. **Competitor Extraction**: GPT-4o-mini (~$0.002/item) - runs on all feedback
2. **Feature Gap Detection**: GPT-4 (~$0.01/batch) - runs daily on batches
3. **Strategic Recommendations**: GPT-4 (~$0.02/project) - runs weekly

**Caching Strategy**:
- Competitor profiles refreshed hourly
- Sentiment rankings refreshed every 15 minutes
- Extraction results cached based on feedback content

**Smart Alerts**:
- Only notify on HIGH impact competitive events
- Spike detection: >3x average mentions in 24 hours
- Threshold: Minimum 20 mentions to trigger event

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the migration
psql your_database < migrations/202511161200_competitive_intelligence.sql

# Or use your migration tool
# The migration creates all tables, indexes, views, functions, and RLS policies
```

### 2. Configure Cron Jobs

Add these cron schedules to your hosting platform (Vercel Cron, GitHub Actions, etc.):

```
# Every 30 minutes - Competitive extraction
*/30 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/competitive-extraction

# Daily at 2 AM - Feature gap detection
0 2 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/detect-feature-gaps

# Weekly Monday 1 AM - Strategic recommendations
0 1 * * 1 curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/strategic-recommendations
```

### 3. Environment Variables

Ensure these are set:

```env
OPENAI_API_KEY=your_openai_key
CRON_SECRET=your_cron_secret
COMPETITOR_EXTRACTION_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
FEATURE_GAP_MODEL=gpt-4o  # Optional, defaults to gpt-4o
STRATEGIC_ANALYSIS_MODEL=gpt-4o  # Optional, defaults to gpt-4o
```

### 4. Connect to Feedback Hunter

The integration is automatic! When feedback is discovered:

```typescript
// In your hunter scan completion handler
import { onFeedbackDiscovered } from '@/lib/integrations/competitive-bridge';

// After storing feedback
const feedbackId = result.id;
await onFeedbackDiscovered(feedbackId);
// This automatically extracts competitors
```

## Usage Examples

### Get Competitive Overview

```typescript
const response = await fetch(`/api/competitive/overview?projectId=${projectId}`);
const data = await response.json();

console.log(`You have ${data.overview.active_competitors} active competitors`);
console.log(`Net user switches: ${data.overview.net_switches}`);
console.log(`Top competitor: ${data.competitors[0].competitor_name}`);
```

### Track Feature Gap

```typescript
// Update gap status when you start building
await fetch('/api/competitive/feature-gaps', {
  method: 'PUT',
  body: JSON.stringify({
    gapId: 'gap-id',
    status: 'building',
    assignedTo: userId,
  }),
});

// Mark as shipped when done
await fetch('/api/competitive/feature-gaps', {
  method: 'PUT',
  body: JSON.stringify({
    gapId: 'gap-id',
    status: 'shipped',
  }),
});
```

### Accept Strategic Recommendation

```typescript
await fetch('/api/competitive/recommendations', {
  method: 'PUT',
  body: JSON.stringify({
    recommendationId: 'rec-id',
    status: 'accepted',
    userId: currentUserId,
  }),
});
```

### Add Competitor Manually

```typescript
await fetch('/api/competitive/competitors', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 'project-id',
    name: 'Notion',
    category: 'Direct Competitor',
    website: 'https://notion.so',
    description: 'All-in-one workspace',
  }),
});
```

## Data Flow Example

1. **User posts**: "Switched from Linear to YourApp because pricing was too high. Love it!"

2. **Hunter discovers** the feedback from Reddit

3. **Competitive Extractor** (auto-triggered):
   - Identifies "Linear" as competitor
   - Type: `switch_from` (switched FROM Linear TO you)
   - Sentiment vs you: +0.8 (favors you)
   - Sentiment about Linear: -0.3 (negative about pricing)
   - Key points: ["Left Linear due to pricing", "Happy with YourApp"]

4. **Database stores**:
   - Creates/updates "Linear" in `competitors`
   - Adds entry to `competitive_mentions`
   - Increments Linear's `switches_to_you` count
   - Updates Linear's `avg_sentiment_vs_you`

5. **Nightly Feature Gap Detector**:
   - Finds 15 mentions of "Linear has better dark mode"
   - Creates feature gap: "Dark Mode/Theming"
   - Priority: HIGH
   - Revenue impact: "Mentioned in 3 enterprise sales calls"

6. **Weekly Strategic Analyzer**:
   - Sees: Linear losing users to you due to pricing
   - Generates: **ATTACK** recommendation
   - Title: "Launch competitive pricing campaign targeting Linear users"
   - ROI: High - could capture 20% of Linear's SMB market

7. **Dashboard shows**:
   - Linear: 45 mentions, +12 net switches (winning!)
   - Dark Mode: Top feature gap (15 requests)
   - Recommendation: Attack Linear's pricing weakness

## Testing

### Test Competitor Extraction

```bash
# Manually trigger extraction for a feedback item
curl -X POST http://localhost:3000/api/cron/competitive-extraction \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Test Feature Gap Detection

```bash
# Manually trigger feature gap analysis
curl -X POST http://localhost:3000/api/cron/detect-feature-gaps \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Test Strategic Recommendations

```bash
# Manually trigger strategic analysis
curl -X POST http://localhost:3000/api/cron/strategic-recommendations \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Next Steps: Frontend Components

The backend is complete! To build the UI, create these React components:

1. **`CompetitiveOverview`** - Main dashboard landing page
2. **`CompetitorProfile`** - Deep dive on single competitor
3. **`FeatureGapAnalysis`** - Prioritized feature gap list
4. **`StrategicRecommendations`** - Action items with ROI
5. **`HeadToHeadComparison`** - Side-by-side comparison tool
6. **`CompetitiveBadges`** - Small badges for feedback items

See `/src/types/competitive-intelligence.ts` for component prop types.

## Troubleshooting

**Competitors not being detected?**
- Check OpenAI API key is set
- Verify cron job is running
- Check logs for extraction errors
- Ensure feedback contains actual competitor names

**Feature gaps not appearing?**
- Need at least 1 `feature_comparison` mention
- Daily cron must run (check last run time)
- Check project has competitive mentions

**Strategic recommendations empty?**
- Need at least 5 mentions to trigger
- Weekly cron must run
- Verify competitive data exists (competitors, gaps, mentions)

## License

Part of SignalsLoop - All rights reserved.
