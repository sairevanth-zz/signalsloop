# AI Roadmap Suggestions Feature

## 🎯 Overview

The **AI Roadmap Suggestions** feature is the culmination of SignalsLoop's intelligence capabilities. It automatically analyzes all feedback themes and generates a prioritized product roadmap with AI-powered strategic reasoning.

This feature transforms hundreds of feedback themes into actionable roadmap recommendations by combining:
- Multi-factor scoring algorithm
- GPT-4 strategic analysis
- Visual priority matrices
- Rich export capabilities (Markdown, PDF)
- Manual override controls

## ✨ Key Features

### 1. **Multi-Factor Prioritization Algorithm**
Analyzes themes using weighted scoring across 5 factors:
- **Frequency (30%)** - How many users mention this
- **Sentiment (25%)** - User frustration level (negative = higher priority)
- **Business Impact (25%)** - Urgency, churn risk, revenue impact
- **Effort (10%)** - Lower effort = higher score (quick wins)
- **Competitive (10%)** - How many competitors have this feature

### 2. **GPT-4 Strategic Reasoning**
For each suggestion, GPT-4 generates:
- Why this matters now
- Business impact analysis
- User segments affected
- Implementation strategy
- Risks & dependencies
- Trade-offs
- Final recommendation

### 3. **Priority Matrix Visualization**
Interactive scatter plot showing:
- **Quick Wins** (High Impact, Low Effort) - DO FIRST
- **Big Bets** (High Impact, High Effort) - DO NEXT
- **Fill-Ins** (Low Impact, Low Effort) - DO WHEN IDLE
- **Low Priority** (Low Impact, High Effort) - DEFER

### 4. **Flexible Export System**
- **Markdown** - For GitHub, Notion, Confluence
- **PDF** - For stakeholder presentations
- Filtering by priority levels
- Optional AI reasoning inclusion

### 5. **Manual Overrides**
Product teams can:
- Pin critical items to top
- Adjust priority manually (-50 to +50 points)
- Mark status (suggested, in_progress, completed, deferred)
- Add internal notes

## 🗄️ Database Schema

### Tables Created

1. **`roadmap_suggestions`**
   - Stores AI-generated suggestions with scoring breakdown
   - Links to themes table
   - Contains GPT-4 reasoning text
   - Supports manual overrides

2. **`roadmap_exports`**
   - Tracks generated exports
   - Stores filter configuration
   - Counts downloads

3. **`roadmap_generation_logs`**
   - Logs each generation run
   - Tracks GPT-4 API usage
   - Performance metrics

## 📁 File Structure

```
migrations/
└── 202511171800_roadmap_suggestions.sql    # Database schema

src/lib/roadmap/
├── index.ts                                 # Main exports
├── prioritization.ts                        # Multi-factor scoring algorithm
├── ai-reasoning.ts                          # GPT-4 reasoning generation
├── exports.ts                               # Markdown/PDF export generation
└── BACKGROUND_JOBS.md                       # Background job documentation

src/app/api/roadmap/
├── generate/route.ts                        # POST - Generate roadmap
├── suggestions/route.ts                     # GET - Fetch suggestions
├── export/route.ts                          # POST - Generate exports
├── [id]/reasoning/route.ts                  # POST - Regenerate reasoning
└── [id]/override/route.ts                   # PATCH - Manual overrides

src/components/roadmap/
├── index.ts                                 # Component exports
├── RoadmapDashboard.tsx                     # Main dashboard with filters
├── RecommendationCard.tsx                   # Individual suggestion card
├── PriorityMatrix.tsx                       # Visual quadrant chart
└── ExportDialog.tsx                         # Export configuration modal

src/app/app/roadmap/
└── page.tsx                                 # Main roadmap page
```

## 🚀 Usage

### 1. Generate Roadmap

```typescript
// Trigger via API
const response = await fetch('/api/roadmap/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    projectId: 'your-project-id',
    generateReasoning: true // Optional: generate AI reasoning immediately
  })
});
```

### 2. Fetch Suggestions

```typescript
const response = await fetch(
  `/api/roadmap/suggestions?projectId=${projectId}&priorities=critical,high&sort=priority_score&order=desc`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const { suggestions, total } = await response.json();
```

### 3. Export Roadmap

```typescript
const response = await fetch('/api/roadmap/export', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    projectId: 'your-project-id',
    format: 'markdown', // or 'pdf'
    filters: {
      priorities: ['critical', 'high'],
      includeReasoning: true
    }
  })
});

const blob = await response.blob();
// Download file...
```

### 4. Apply Manual Override

```typescript
const response = await fetch(`/api/roadmap/${suggestionId}/override`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    manual_priority_adjustment: 20, // Boost by 20 points
    pinned: true,
    status: 'in_progress',
    internal_notes: 'CEO priority for Q1'
  })
});
```

## 🔌 Integration Points

### With Existing Features

1. **Theme Detection** → Source of themes for roadmap
2. **Sentiment Analysis** → Sentiment scoring factor
3. **AI Feedback Hunter** → Urgency and business impact
4. **Competitive Intel** → Competitive pressure scoring
5. **Jira Integration** → Export roadmap items as Jira epics
6. **Slack Integration** → Notify team when critical themes emerge

### Example: Auto-Regenerate on Theme Updates

```typescript
// After theme detection completes
if (newThemesDetected > 5) {
  await fetch('/api/roadmap/generate', {
    method: 'POST',
    body: JSON.stringify({ projectId, generateReasoning: false })
  });
}
```

## 🎨 UI Components

### RoadmapDashboard
Main dashboard with:
- Filtering by priority levels
- Search functionality
- Sorting options
- List/Matrix view toggle
- Generate/Export actions

### RecommendationCard
Individual suggestion display:
- Priority badge and score
- Theme metrics
- Scoring breakdown (visual bars)
- Expandable AI reasoning
- Pin/unpin controls

### PriorityMatrix
Interactive scatter plot:
- X-axis: Effort
- Y-axis: Impact
- Color-coded by priority
- Click to view details
- Quadrant labels

### ExportDialog
Export configuration:
- Format selection (Markdown/PDF)
- Priority filters
- Include/exclude reasoning
- Download handling

## 📊 Priority Levels

| Level | Score Range | Label | Description |
|-------|-------------|-------|-------------|
| 🔴 Critical | ≥ 75 | P0 | Immediate action required |
| 🟠 High | 60-74 | P1 | Build in next quarter |
| 🟡 Medium | 40-59 | P2 | Consider for future sprints |
| 🔵 Low | < 40 | P3 | Nice to have |

## 🧮 Scoring Algorithm Details

### Frequency Score
```typescript
// Logarithmic scale to prevent dominance of super popular themes
normalizedFrequency = log10(mentions + 1) / log10(maxMentions + 1)
```

### Sentiment Score
```typescript
// Negative sentiment = HIGHER priority
if (sentiment < 0) {
  score = 0.5 + (Math.abs(sentiment) * 0.5)  // -1.0 → 1.0
} else {
  score = 0.5 - (sentiment * 0.5)            // +1.0 → 0.0
}
```

### Business Impact Score
Combines:
- High-value keywords (churn, cancel, enterprise, deal)
- Average urgency from AI Feedback Hunter
- Mention velocity (rapid growth = higher priority)

### Effort Score
```typescript
// Lower effort = higher score (prioritize quick wins)
effortMap = {
  'low': 0.9,        // < 1 week
  'medium': 0.5,     // 1-3 weeks
  'high': 0.3,       // 3-6 weeks
  'very_high': 0.1   // 6+ weeks
}
```

### Competitive Score
```typescript
competitiveScore = competitorCount / totalCompetitors
```

## 🤖 AI Reasoning Generation

### Rate Limiting
- 1 GPT-4 request per second to avoid API limits
- Can be deferred to background jobs
- Tracks token usage in logs

### Prompt Structure
For each theme, GPT-4 receives:
- Theme overview (score, mentions, sentiment)
- Top 5 user feedback samples
- Competitive context
- Related themes

Returns structured analysis:
1. Why this matters now
2. Business impact
3. User segments affected
4. Implementation strategy
5. Risks & dependencies
6. Trade-offs
7. Recommendation

## 📈 Performance Monitoring

Query generation logs:

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as runs,
  AVG(generation_time_ms) as avg_time_ms,
  SUM(gpt4_tokens_used) as total_tokens,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_runs
FROM roadmap_generation_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔄 Background Jobs

See `src/lib/roadmap/BACKGROUND_JOBS.md` for:
- Weekly roadmap refresh
- Event-driven regeneration triggers
- Slack notifications for critical themes
- Jira epic auto-creation

## 🧪 Testing

### Manual Testing Checklist

1. ✅ Generate roadmap for project with themes
2. ✅ Verify priority scores calculated correctly
3. ✅ Generate AI reasoning (check token usage)
4. ✅ Filter by priority levels
5. ✅ Search themes
6. ✅ Sort by score/name
7. ✅ Pin/unpin suggestions
8. ✅ Apply manual priority adjustments
9. ✅ Export as Markdown
10. ✅ Export as PDF
11. ✅ View priority matrix
12. ✅ Check generation logs

### Unit Test Examples

```typescript
// Test priority scoring
describe('calculatePriorityScore', () => {
  it('should score high frequency themes higher', () => {
    const theme = { mention_count: 100, /* ... */ };
    const { totalScore } = calculatePriorityScore(theme, context);
    expect(totalScore).toBeGreaterThan(60);
  });

  it('should prioritize negative sentiment', () => {
    const theme = { avg_sentiment: -0.8, /* ... */ };
    const { breakdown } = calculatePriorityScore(theme, context);
    expect(breakdown.sentiment).toBeGreaterThan(0.7);
  });
});
```

## 🚨 Troubleshooting

### Roadmap not generating?
- Check that themes exist for the project
- Verify theme detection has completed
- Check roadmap_generation_logs for errors

### AI reasoning empty?
- Verify OPENAI_API_KEY is set
- Check rate limiting (1/sec)
- Review roadmap_generation_logs for API errors

### Export failing?
- PDF: Ensure Puppeteer executable path is correct
- Markdown: Check file permissions
- Both: Verify suggestions exist with applied filters

## 📝 Future Enhancements

- [ ] Jira epic auto-creation from high-priority items
- [ ] Slack channel notifications for critical themes
- [ ] Theme clustering to group related suggestions
- [ ] Historical trending (priority changes over time)
- [ ] Custom scoring weight configuration per project
- [ ] Export to Linear, Asana, other PM tools
- [ ] AI-generated implementation estimates
- [ ] Dependency detection between themes

## 🎉 Credits

This feature integrates data from:
- Theme Detection engine
- Sentiment Analysis system
- AI Feedback Hunter
- Competitive Intelligence crawler
- User feedback from Reddit, Twitter, G2, HN, Product Hunt

---

**Built with:** Next.js 15, TypeScript, Supabase, OpenAI GPT-4, Recharts, Puppeteer
