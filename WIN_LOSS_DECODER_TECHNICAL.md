# Win/Loss Decoder - Technical Documentation

## Architecture Overview

The Win/Loss Decoder follows a serverless architecture with AI-powered analysis, built on Next.js 15, Supabase, and OpenAI.

```
┌─────────────────┐
│   User/CRM      │
│   (CSV/API)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│           API Layer (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ /deals/      │  │ /cron/       │            │
│  │  ingest      │  │  deal-autopsy│            │
│  │  [id]/autopsy│  │  deal-digest │            │
│  │  overview    │  │              │            │
│  └──────┬───────┘  └──────┬───────┘            │
└─────────┼──────────────────┼────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────┐
│         AI Analysis Layer                        │
│  ┌──────────────────────────────────┐           │
│  │ ai-deal-autopsy.ts               │           │
│  │  - generateDealAutopsy()         │           │
│  │  - findSimilarDeals()            │           │
│  │  - updateBattlecardWithDeal()    │           │
│  └──────────────┬───────────────────┘           │
└─────────────────┼────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  OpenAI GPT-4o │
         └────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         Database (Supabase PostgreSQL)          │
│  ┌──────────────┐  ┌──────────────────┐        │
│  │ deals        │  │ deal_autopsies   │        │
│  │              │  │                  │        │
│  └──────────────┘  └──────────────────┘        │
│  ┌──────────────┐  ┌──────────────────┐        │
│  │ battlecards  │  │ digest_subs      │        │
│  └──────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│              UI Layer (React)                   │
│  ┌──────────────────────────────────┐           │
│  │ EnhancedWinLossDashboard         │           │
│  │  ├─ KPI Cards                    │           │
│  │  ├─ Charts (Recharts)            │           │
│  │  └─ Tabs (Overview/Deals)        │           │
│  ├──────────────────────────────────┤           │
│  │ DealUploadDialog                 │           │
│  │  └─ CSV Parser & Uploader        │           │
│  ├──────────────────────────────────┤           │
│  │ AutopsyDetailPanel               │           │
│  │  └─ Comprehensive Analysis View  │           │
│  └──────────────────────────────────┘           │
└─────────────────────────────────────────────────┘
```

## File Structure

```
/home/user/signalsloop/
├── migrations/
│   └── 202511190001_win_loss_decoder.sql   # Database schema
├── src/
│   ├── app/
│   │   ├── [slug]/win-loss/
│   │   │   └── page.tsx                    # Main page route
│   │   └── api/
│   │       ├── deals/
│   │       │   ├── ingest/route.ts         # Bulk import endpoint
│   │       │   ├── [id]/autopsy/route.ts   # Generate/get autopsy
│   │       │   └── overview/route.ts       # Dashboard metrics
│   │       └── cron/
│   │           ├── deal-autopsy/route.ts   # Auto-generate autopsies
│   │           └── deal-digest/route.ts    # Daily digest sender
│   ├── components/
│   │   ├── EnhancedProjectCard.tsx         # Updated with Win/Loss button
│   │   └── win-loss/
│   │       ├── index.tsx                   # Component exports
│   │       ├── EnhancedWinLossDashboard.tsx # Main dashboard
│   │       ├── DealUploadDialog.tsx        # CSV upload
│   │       └── AutopsyDetailPanel.tsx      # Autopsy detail view
│   ├── lib/
│   │   └── ai-deal-autopsy.ts              # AI analysis logic
│   └── config/
│       └── ai-prompts.ts                   # Updated with autopsy prompts
├── sample-deals.csv                         # Sample data
├── WIN_LOSS_DECODER_GUIDE.md               # User guide
└── WIN_LOSS_DECODER_TECHNICAL.md           # This file
```

## Data Flow

### 1. Deal Ingestion
```typescript
// Client uploads CSV or sends API request
POST /api/deals/ingest
  ↓
// Backend validates and transforms data
{
  project_id: uuid,
  name, amount, status, ...
}
  ↓
// Insert into deals table
INSERT INTO deals (...)
  ↓
// Trigger battlecard update (if competitor exists)
TRIGGER: trigger_update_battlecard()
  ↓
// Return success
{ success: true, count: N }
```

### 2. Autopsy Generation
```typescript
// Triggered manually or via cron
POST /api/deals/{id}/autopsy
  ↓
// Fetch deal from database
SELECT * FROM deals WHERE id = {id}
  ↓
// Send to AI for analysis
generateDealAutopsy(deal)
  ↓
// OpenAI processes with structured prompt
GPT-4o analyzes deal context
  ↓
// Extract structured response
{
  summary, primary_reason, objections,
  competitor_signals, recommendations, ...
}
  ↓
// Find similar deals
findSimilarDeals(dealId) → similar_open_deal_ids[]
  ↓
// Save autopsy to database
INSERT/UPDATE deal_autopsies (...)
  ↓
// Update battlecard asynchronously
updateBattlecardWithDeal(...)
  ↓
// Return autopsy
{ success: true, autopsy: {...} }
```

### 3. Dashboard Loading
```typescript
// User navigates to /{slug}/win-loss
GET /api/deals/overview?projectId={id}
  ↓
// Execute database function
SELECT * FROM get_deals_overview(projectId, 30)
  ↓
// Fetch deals with autopsies
SELECT * FROM deals_dashboard_view
  ↓
// Fetch top competitors and loss reasons
SELECT ... GROUP BY ...
  ↓
// Return comprehensive data
{
  overview: { win_rate, revenue_lost, ... },
  deals: [...],
  loss_reasons: [...],
  competitors: [...]
}
  ↓
// React renders dashboard with charts
EnhancedWinLossDashboard.render()
```

## AI Integration

### Prompt Engineering

The system uses a carefully crafted prompt system in `src/config/ai-prompts.ts`:

```typescript
DEAL_AUTOPSY_SYSTEM_PROMPT
  - Role: Expert sales analyst
  - Context: B2B deals, win/loss analysis
  - Output: Structured JSON with insights

DEAL_AUTOPSY_USER_PROMPT(deal)
  - Deal details: name, amount, stage, competitor
  - Notes: full context from deal notes
  - Expected output schema
```

### Response Structure

```typescript
{
  "summary": "Executive summary...",
  "primary_reason": "pricing | features | competitor | ...",
  "primary_reason_detail": "Specific explanation...",
  "objections": [
    {
      "category": "pricing",
      "description": "...",
      "severity": "high|medium|low",
      "frequency": 1-10
    }
  ],
  "competitor_signals": [
    {
      "competitor_name": "...",
      "mentioned_features": [...],
      "perceived_advantages": [...],
      "perceived_disadvantages": [...],
      "sentiment": "positive|neutral|negative"
    }
  ],
  "key_themes": [...],
  "recommendations": "Markdown formatted...",
  "action_items": [...],
  "confidence": 0.0-1.0
}
```

### Rate Limiting

- 1 second delay between batch autopsy generations
- OpenAI rate limits handled with retries
- Cron jobs process max 10 deals per batch

## Database Design

### Tables

#### deals
```sql
- id (uuid, pk)
- project_id (uuid, fk → projects)
- name, amount, stage, status
- competitor, competitor_product
- notes (full context text)
- contact_name, contact_email, contact_company
- closed_at, expected_close_date
- source (manual, csv, webhook, api)
- metadata (jsonb for custom fields)
```

#### deal_autopsies
```sql
- id (uuid, pk)
- deal_id (uuid, fk → deals, unique)
- summary, primary_reason, primary_reason_detail
- objections (jsonb)
- competitor_signals (jsonb)
- key_themes (text[])
- recommendations (text)
- action_items (text[])
- similar_open_deal_ids (uuid[])
- similar_lost_deal_ids (uuid[])
- confidence (numeric 0-1)
- ai_model, processing_time_ms
- generated_at, regenerated_count
```

#### deal_battlecards
```sql
- id (uuid, pk)
- project_id, competitor_name (unique)
- total_deals_competing, deals_won, deals_lost
- win_rate (calculated)
- revenue metrics (total_at_stake, won, lost)
- common_objections, win_factors, loss_factors (text[])
- strengths, weaknesses (text[])
- recommended_positioning (text)
- deal_ids (uuid[])
```

### Functions

#### get_deals_overview(project_id, days_back)
Returns comprehensive metrics:
- Win rate, revenue totals
- Deal counts by status
- Top loss reasons (from autopsies)
- Top competitors (with win/loss)
- Recent loss count

#### find_similar_deals(deal_id, limit)
Similarity algorithm:
- Competitor match: 40 points
- Amount similarity: 30 points
- Stage match: 20 points
- Notes text overlap: 10 points

Returns similar deals sorted by score.

#### update_battlecard_stats(deal_id)
Auto-updates battlecard when deal closes:
- Recalculates win/loss counts
- Updates revenue totals
- Computes win rate percentage
- Updates last_analyzed_at

### Views

#### deals_dashboard_view
Joins deals + autopsies for fast dashboard loading:
```sql
SELECT d.*, da.summary, da.primary_reason,
       (d.status='lost' AND da.id IS NULL) as needs_autopsy
FROM deals d
LEFT JOIN deal_autopsies da ON da.deal_id = d.id
```

## API Endpoints

### POST /api/deals/ingest
```typescript
Request: {
  projectId: string,
  deals: Deal[]  // or single `deal` object
}

Response: {
  success: boolean,
  message: string,
  deals: Deal[],
  count: number
}

Validation:
- projectId required
- At least one deal
- Each deal must have: name, amount
- Amount must be numeric >= 0
```

### POST /api/deals/[id]/autopsy
```typescript
Request: (none, deal ID in URL)

Response: {
  success: boolean,
  autopsy: DealAutopsy,
  processing_time_ms: number,
  similar_deals: {
    open_count: number,
    lost_count: number
  }
}

Errors:
- 404: Deal not found
- 400: Deal is still open (can't autopsy)
- 500: AI generation failed
```

### GET /api/deals/[id]/autopsy
```typescript
Request: (none)

Response: {
  success: boolean,
  autopsy: DealAutopsy & { deals: Deal }
}

Errors:
- 404: Autopsy not found
```

### GET /api/deals/overview
```typescript
Request: ?projectId={id}&days={30}

Response: {
  success: boolean,
  overview: {
    total_deals, open_deals, won_deals, lost_deals,
    win_rate, revenue_won, revenue_lost, revenue_in_pipeline,
    top_loss_reasons: [...],
    top_competitors: [...],
    recent_losses, avg_deal_size
  },
  deals: Deal[],
  battlecards: Battlecard[],
  revenue_trend: [...],
  loss_reasons: [...],
  needs_autopsy: Deal[],
  at_risk_deals: Deal[]
}
```

## Cron Jobs

### /api/cron/deal-autopsy
- **Schedule**: Daily
- **Purpose**: Auto-generate autopsies for newly closed deals
- **Process**:
  1. Find deals closed in last 7 days without autopsies
  2. Generate autopsy for each (max 10 per run)
  3. Update battlecards
  4. 1-second delay between generations
- **Auth**: Bearer token via CRON_SECRET env var

### /api/cron/deal-digest
- **Schedule**: Daily
- **Purpose**: Send Slack/email digest of new losses
- **Process**:
  1. Get active digest subscriptions
  2. For each project:
     - Find losses in last 24h
     - Find at-risk open deals
     - Get top loss reasons (30 days)
  3. Format Slack message with blocks
  4. Send to webhook URL
- **Auth**: Bearer token via CRON_SECRET

## UI Components

### EnhancedWinLossDashboard
**Props:**
```typescript
{
  projectId: string,
  projectSlug: string
}
```

**State:**
```typescript
{
  loading: boolean,
  overview: OverviewData,
  deals: Deal[],
  selectedDeal: Deal | null,
  autopsyLoading: boolean,
  uploadDialogOpen: boolean,
  searchTerm: string,
  statusFilter: 'all' | 'won' | 'lost' | 'open',
  activeTab: 'overview' | 'deals' | 'analytics'
}
```

**Key Methods:**
- `loadDashboardData()` - Fetch all dashboard data
- `generateAutopsy(dealId)` - Trigger AI analysis
- `viewAutopsy(deal)` - Load and display autopsy

### DealUploadDialog
**Props:**
```typescript
{
  open: boolean,
  onOpenChange: (open: boolean) => void,
  projectId: string,
  onSuccess: () => void
}
```

**Features:**
- File input with drag-and-drop
- CSV parsing with validation
- Sample CSV download
- Progress indicator
- Success/error feedback

### AutopsyDetailPanel
**Props:**
```typescript
{
  deal: Deal,
  autopsy: DealAutopsy,
  onClose: () => void,
  onRegenerate?: () => void,
  regenerating?: boolean
}
```

**Features:**
- Fixed overlay with scrollable content
- Sectioned layout with separators
- Color-coded badges and indicators
- Export to Markdown
- Regenerate button

## Testing

### Local Testing

1. **Run migrations:**
```sql
-- In Supabase SQL Editor
\i migrations/202511190001_win_loss_decoder.sql
```

2. **Import sample data:**
```bash
# Use the sample CSV via UI, or:
curl -X POST http://localhost:3000/api/deals/ingest \
  -H "Content-Type: application/json" \
  -d @sample-deals-payload.json
```

3. **Test autopsy generation:**
```bash
curl -X POST http://localhost:3000/api/deals/{deal-id}/autopsy
```

4. **Test cron jobs:**
```bash
curl http://localhost:3000/api/cron/deal-autopsy \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Unit Tests (TODO)

Recommended test coverage:
```
src/lib/ai-deal-autopsy.test.ts
  - parseCSV()
  - generateDealAutopsy()
  - findSimilarDeals()
  - extractLossPatterns()

src/app/api/deals/ingest/route.test.ts
  - Valid CSV upload
  - Invalid data handling
  - Duplicate deal detection

src/components/win-loss/*.test.tsx
  - Component rendering
  - User interactions
  - Error states
```

## Performance Considerations

### Database
- Indexed on: project_id, status, closed_at, competitor
- Views for common joins (deals_dashboard_view)
- RPC functions for complex aggregations
- Estimated query times: <100ms

### AI Processing
- GPT-4o call: ~5-15 seconds per autopsy
- Batch processing with delays
- Async battlecard updates
- Retry logic for failures

### UI Rendering
- React memoization for charts
- Lazy loading for large tables
- Debounced search input
- Optimistic UI updates

## Security

### RLS Policies
```sql
-- Users can only access their project's deals
SELECT: EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = deals.project_id
    AND projects.owner_id = auth.uid()
)
```

### API Authentication
- Next.js middleware validates auth
- Supabase service role for cron jobs
- CRON_SECRET env var for job authorization

### Data Sanitization
- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- XSS prevention in UI (dangerouslySetInnerHTML limited use)

## Deployment

### Environment Variables
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
OPENAI_API_KEY=sk-xxx

# Optional
CRON_SECRET=your-secret-here
```

### Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/deal-autopsy",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/deal-digest",
      "schedule": "0 8 * * *"
    }
  ]
}
```

## Extending the Feature

### Adding New Loss Reasons
Update enum in migration:
```sql
ALTER TYPE loss_reason_category
  ADD VALUE 'new_reason';
```

### Custom Autopsy Fields
Add to `deal_autopsies.metadata` (jsonb):
```typescript
metadata: {
  custom_field: 'value',
  ...
}
```

### Additional AI Models
Update `src/config/ai-prompts.ts`:
```typescript
AI_MODELS.DEAL_AUTOPSY = 'gpt-4o-2024-11-20';
```

### New Visualizations
Add to `EnhancedWinLossDashboard`:
```typescript
<ResponsiveContainer>
  <LineChart data={revenueTrend}>
    ...
  </LineChart>
</ResponsiveContainer>
```

## Troubleshooting

### Common Issues

**1. Autopsy Generation Fails**
- Check OpenAI API key is set
- Verify API quota/credits
- Check deal has sufficient notes
- Review error logs

**2. RLS Policy Denies Access**
- Verify user is project owner/member
- Check auth.uid() is set
- Ensure project_id is correct

**3. Cron Jobs Not Running**
- Verify CRON_SECRET matches
- Check Vercel cron configuration
- Review deployment logs
- Test manually with curl

**4. UI Not Loading**
- Check browser console for errors
- Verify API endpoints are accessible
- Ensure components are imported correctly
- Check for TypeScript errors

## Maintenance

### Regular Tasks
- Monitor OpenAI usage and costs
- Review autopsy quality
- Update AI prompts based on feedback
- Archive old autopsies (>1 year)
- Backup battlecards periodically

### Monitoring
- Track autopsy generation success rate
- Monitor API response times
- Alert on failed cron jobs
- Track win rate trends

---

**For questions or contributions, see the main project README.**
