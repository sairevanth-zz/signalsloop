# Mission Control Dashboard

## Overview

The Mission Control Dashboard is an AI-powered executive briefing interface for SignalsLoop. It provides product leaders with a daily intelligence summary, key metrics, and actionable insights in a high-density Bento Grid layout.

## Features

### 1. Daily AI Briefing (Hero Card)
- **AI-Generated Summary**: GPT-4o analyzes the last 7 days of product data
- **Critical Alerts**: Highlights urgent issues requiring immediate attention
- **Recommended Actions**: Prioritized action items with context
- **One-Click Refresh**: Regenerate briefing on demand

### 2. Real-Time Metrics
- **Sentiment Score**: NPS-style sentiment tracking with trend indicators
- **Feedback Velocity**: Issues per week with trend analysis
- **Roadmap Pulse**: In-progress, planned, and completed items
- **Competitive Intelligence**: New insights and high-priority threats

### 3. Opportunities Dashboard
- **AI-Ranked Features**: Top feature requests ranked by impact
- **Vote Tracking**: Community validation through vote counts
- **Impact Assessment**: High/Medium/Low impact classification

### 4. Threat Monitoring
- **Risk Detection**: Automated threat identification
- **Severity Levels**: Critical, high, medium, low classification
- **Proactive Alerts**: Early warning system for product risks

## File Structure

```
/migrations/
  └── 202511201800_mission_control.sql       # Database schema and functions

/src/lib/ai/
  └── mission-control.ts                     # AI service layer

/src/app/api/dashboard/briefing/
  └── route.ts                               # API endpoints (GET/POST)

/src/components/dashboard/
  ├── BentoCard.tsx                          # Reusable card wrapper
  ├── MetricCard.tsx                         # Metric display component
  ├── BriefingCard.tsx                       # Hero briefing card
  └── MissionControlGrid.tsx                 # Main grid layout

/src/app/[slug]/dashboard/
  └── page.tsx                               # Dashboard page (Next.js 15 App Router)
```

## Database Schema

### `daily_briefings` Table
```sql
CREATE TABLE daily_briefings (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, date(created_at))
);
```

### Helper Functions
- `get_today_briefing(project_id)`: Retrieves today's cached briefing
- `get_dashboard_metrics(project_id)`: Aggregates real-time metrics

## API Endpoints

### GET `/api/dashboard/briefing?projectId=<uuid>`
Returns today's briefing (cached) or generates a new one.

**Response:**
```json
{
  "success": true,
  "briefing": {
    "id": "uuid",
    "content": {
      "sentiment_score": 64,
      "sentiment_trend": "down",
      "critical_alerts": ["..."],
      "recommended_actions": [...],
      "briefing_text": "...",
      "opportunities": [...],
      "threats": [...]
    },
    "created_at": "timestamp",
    "cached": true
  },
  "metrics": {
    "sentiment": {...},
    "feedback": {...},
    "roadmap": {...},
    "competitors": {...}
  }
}
```

### POST `/api/dashboard/briefing`
Force regenerate today's briefing (consumes AI quota).

**Request:**
```json
{
  "projectId": "uuid"
}
```

## Usage

### Accessing the Dashboard
Navigate to `/{project-slug}/dashboard` to view the Mission Control interface.

**Authentication Required:**
- User must be logged in
- User must own the project

### Running the Migration
```sql
psql -U postgres -d signalsloop -f migrations/202511201800_mission_control.sql
```

Or use your preferred Supabase migration tool.

## Design System

### Colors
- **Background**: `slate-950` (dark mode default)
- **Cards**: `slate-900/50` with `backdrop-blur` (glassmorphism)
- **Borders**: `slate-800`
- **Accents**:
  - Success/Green: Positive trends, opportunities
  - Red: Critical alerts, threats
  - Blue: Neutral metrics
  - Purple: Competitive intelligence

### Layout (Bento Grid)
```
┌────────────────────────┬────────────┬────────────┐
│  AI BRIEFING (2x2)     │  Sentiment │  Velocity  │
│                        ├────────────┼────────────┤
│                        │  Threats   │  Roadmap   │
├────────────────────────┴────────────┴────────────┤
│  Opportunities (2x1)                │            │
└─────────────────────────────────────┴────────────┘
```

## AI Rate Limiting

The dashboard uses the existing `ai-rate-limit.ts` system:
- **Free Plan**: 10 briefings/month
- **Pro Plan**: 10,000 briefings/month

Briefings are cached daily, so users typically consume 1 quota per day (unless manually refreshed).

## Performance Optimizations

1. **Daily Caching**: Briefings are cached per project per day
2. **Server-Side Rendering**: Data fetched during SSR for instant page loads
3. **Suspense Boundaries**: Skeleton loaders prevent layout shift
4. **Optimistic UI**: Refresh button shows loading state immediately

## Error Handling

### Fallback States
- **AI Service Unavailable**: Shows cached briefing or error message
- **Rate Limit Exceeded**: Returns 429 with upgrade prompt
- **Database Error**: Graceful degradation with retry logic
- **Authorization Failed**: Redirects to login

### Logging
All errors are logged to console with context for debugging.

## Future Enhancements

- [ ] Email Daily Digest: Send briefing via email
- [ ] Slack Integration: Post briefing to Slack channel
- [ ] Historical Trends: View past briefings
- [ ] Custom Alerts: User-configured alert rules
- [ ] Export to PDF: Download briefing as PDF
- [ ] Mobile Optimization: Responsive grid for mobile devices
- [ ] Multi-Project View: Compare multiple projects

## Security

- **RLS Policies**: Row-level security on `daily_briefings` table
- **Service Role**: Backend uses service role for aggregations
- **Auth Guards**: Page requires authentication and project ownership
- **Input Validation**: All API inputs validated
- **Rate Limiting**: AI quota prevents abuse

## Dependencies

- Next.js 15 (App Router)
- React 19
- OpenAI SDK (GPT-4o)
- Supabase (PostgreSQL + Auth)
- Tailwind CSS 4
- Lucide Icons
- Radix UI primitives

## Testing

TypeScript compilation verified. The implementation:
- ✅ Compiles without errors (app code)
- ✅ Follows Next.js 15 patterns (async params)
- ✅ Uses proper TypeScript interfaces
- ✅ Implements error boundaries
- ✅ Handles loading states

## Support

For issues or questions:
1. Check the database migration ran successfully
2. Verify OpenAI API key is configured
3. Ensure Supabase RLS policies are active
4. Check browser console for client errors
5. Review server logs for API errors

---

**Built with ❤️ for SignalsLoop - Your AI-Native Product OS**
