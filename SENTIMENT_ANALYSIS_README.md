# Sentiment Analysis Engine - Documentation

## Overview

The Sentiment Analysis Engine is a comprehensive AI-powered feature for SignalsLoop that analyzes user feedback sentiment using OpenAI GPT-4. It provides real-time sentiment tracking, visualization, and filtering capabilities.

## Features

### 1. **AI-Powered Analysis**
- Uses OpenAI GPT-4 for accurate sentiment detection
- Analyzes sentiment category: positive, negative, neutral, or mixed
- Calculates sentiment score from -1 (very negative) to 1 (very positive)
- Detects emotional tone (excited, frustrated, satisfied, etc.)
- Provides confidence scores for analysis quality

### 2. **Database Schema**
- `sentiment_analysis` table stores analysis results
- Linked to posts via foreign key
- Database functions for distribution and trend queries
- Row Level Security (RLS) policies for data protection
- Real-time updates via Supabase subscriptions

### 3. **API Endpoints**

#### POST /api/analyze-sentiment
Analyzes sentiment for one or more posts.

**Request:**
```json
{
  "postIds": ["uuid1", "uuid2", ...],
  "projectId": "project-uuid" // optional
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "postId": "uuid",
      "sentiment_category": "positive",
      "sentiment_score": 0.8,
      "emotional_tone": "excited",
      "confidence_score": 0.92,
      "success": true
    }
  ],
  "processed": 10,
  "failed": 0
}
```

**Features:**
- Batch processing up to 1000 items per request
- Rate limiting (respects AI usage limits)
- Retry logic with exponential backoff
- Stores results in database automatically

#### GET /api/analyze-sentiment?projectId=xxx&days=30
Gets sentiment distribution and trends for a project.

**Response:**
```json
{
  "success": true,
  "distribution": [
    {
      "sentiment_category": "positive",
      "count": 45,
      "percentage": 45.0
    }
  ],
  "trend": [
    {
      "date": "2025-11-13",
      "avg_sentiment_score": 0.65,
      "positive_count": 10,
      "negative_count": 2,
      "neutral_count": 5,
      "mixed_count": 1
    }
  ]
}
```

### 4. **React Components**

All components are located in `src/components/sentiment/`.

#### SentimentBadge
Displays color-coded sentiment badges.

```tsx
import { SentimentBadge } from '@/components/sentiment';

<SentimentBadge
  sentiment_category="positive"
  sentiment_score={0.8}
  size="md"
  showScore={true}
  showEmoji={true}
/>
```

**Props:**
- `sentiment_category`: 'positive' | 'negative' | 'neutral' | 'mixed'
- `sentiment_score?`: number (-1 to 1)
- `size?`: 'sm' | 'md' | 'lg'
- `showScore?`: boolean
- `showEmoji?`: boolean

**Color Scheme:**
- **Positive**: Green (bg-green-100, text-green-800, border-green-300) 😊
- **Negative**: Red (bg-red-100, text-red-800, border-red-300) 😞
- **Neutral**: Gray (bg-gray-100, text-gray-800, border-gray-300) 😐
- **Mixed**: Orange (bg-orange-100, text-orange-800, border-orange-300) 🤔

#### SentimentWidget
Dashboard widget with pie chart visualization.

```tsx
import { SentimentWidget } from '@/components/sentiment';

<SentimentWidget
  projectId="project-uuid"
  defaultTimeRange={30}
  onFilterChange={(category) => handleFilter(category)}
/>
```

**Features:**
- Pie chart showing distribution
- Time range selector (7/30/90 days)
- Click-to-filter functionality
- Auto-refresh capability

#### SentimentTrendChart
Line chart showing sentiment trends over time.

```tsx
import { SentimentTrendChart } from '@/components/sentiment';

<SentimentTrendChart
  projectId="project-uuid"
  defaultTimeRange={30}
/>
```

**Features:**
- Line chart with average sentiment score
- Date range tabs
- Trend direction indicator (improving/declining/stable)
- Significant change annotations
- Summary statistics

#### FeedbackListWithSentiment
Enhanced feedback list with sentiment badges.

```tsx
import { FeedbackListWithSentiment } from '@/components/sentiment';

<FeedbackListWithSentiment
  projectId="project-uuid"
  filterBySentiment={null}
  onSentimentFilter={(category) => handleFilter(category)}
/>
```

**Features:**
- Real-time updates via Supabase subscriptions
- Filter by sentiment category
- Loading and empty states
- Responsive design
- Vote and comment counts

## Installation & Setup

### 1. Database Migration

Run the migration to create the sentiment_analysis table:

```bash
# Apply migration via Supabase CLI
supabase db push

# Or run the SQL file directly
psql -d your_database -f migrations/202511131600_sentiment_analysis.sql
```

### 2. Environment Variables

Ensure these variables are set in your `.env.local`:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Custom model
SENTIMENT_MODEL=gpt-4o-mini
```

### 3. Install Dependencies

All required dependencies are already installed:
- `openai` - OpenAI API client
- `recharts` - Charting library
- `@supabase/supabase-js` - Supabase client
- `date-fns` - Date formatting

## Usage Examples

### Analyze Sentiment for New Feedback

```typescript
// In your API route or server action
const response = await fetch('/api/analyze-sentiment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postIds: ['post-uuid-1', 'post-uuid-2'],
    projectId: 'project-uuid',
  }),
});

const data = await response.json();
console.log(`Analyzed ${data.processed} posts`);
```

### Display Sentiment in Dashboard

```tsx
import { SentimentWidget, SentimentTrendChart } from '@/components/sentiment';

export function Dashboard({ projectId }: { projectId: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SentimentWidget projectId={projectId} />
      <SentimentTrendChart projectId={projectId} />
    </div>
  );
}
```

### Add Sentiment to Feedback List

```tsx
import { FeedbackListWithSentiment } from '@/components/sentiment';

export function FeedbackPage({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState(null);

  return (
    <FeedbackListWithSentiment
      projectId={projectId}
      filterBySentiment={filter}
      onSentimentFilter={setFilter}
    />
  );
}
```

## Architecture

### Data Flow

1. **User submits feedback** → Post created in database
2. **Trigger analysis** → Call `/api/analyze-sentiment` with post IDs
3. **OpenAI analysis** → GPT-4 analyzes text and returns sentiment
4. **Store results** → Results saved to `sentiment_analysis` table
5. **Real-time update** → Supabase subscriptions notify connected clients
6. **UI updates** → Components automatically refresh with new data

### Caching Strategy

The sentiment service uses the existing AI cache manager:
- Cache key: First 100 characters of feedback text
- Cache duration: Configurable (default 24 hours)
- Benefits: Reduces API calls, faster responses, cost savings

### Rate Limiting

Uses the existing AI rate limit system:
- Free tier: 1,000 analyses per month
- Pro tier: 50,000 analyses per month
- Demo users: IP-based rate limiting
- Graceful degradation on limit exceeded

## Database Schema

### sentiment_analysis Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| post_id | UUID | Foreign key to posts table |
| sentiment_category | TEXT | positive, negative, neutral, or mixed |
| sentiment_score | DECIMAL | -1 to 1 |
| emotional_tone | TEXT | Detected emotional tone |
| confidence_score | DECIMAL | 0 to 1 |
| analyzed_at | TIMESTAMPTZ | When analysis was performed |
| created_at | TIMESTAMPTZ | Record creation time |

### Database Functions

#### get_sentiment_distribution(project_id, days_ago)
Returns sentiment distribution for a project.

```sql
SELECT * FROM get_sentiment_distribution('project-uuid', 30);
```

#### get_sentiment_trend(project_id, days_ago)
Returns daily sentiment trend data.

```sql
SELECT * FROM get_sentiment_trend('project-uuid', 90);
```

### Database View

#### posts_with_sentiment
Joins posts and sentiment_analysis tables.

```sql
SELECT * FROM posts_with_sentiment WHERE project_id = 'uuid';
```

## Performance Considerations

### Batch Processing

- Processes up to 100 items per batch
- Parallel processing within batches
- Sequential batches to avoid rate limits
- 500ms delay between batches

### Optimization Tips

1. **Analyze on demand** - Don't analyze all posts at once
2. **Use filters** - Query only the data you need
3. **Cache results** - Results are cached automatically
4. **Real-time updates** - Use subscriptions instead of polling

## Error Handling

The system includes comprehensive error handling:

- **API errors**: Returns user-friendly error messages
- **Database errors**: Logged and reported
- **OpenAI errors**: Automatic retry with exponential backoff
- **Rate limit errors**: Clear messaging with upgrade prompts
- **Validation errors**: Input validation on all endpoints

## Testing

### Manual Testing

1. **Create test posts** in your project
2. **Call the API** to analyze sentiment
3. **Verify results** in the database
4. **Check UI** for real-time updates

### Example Test

```bash
# Analyze sentiment for a post
curl -X POST http://localhost:3000/api/analyze-sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "postIds": ["your-post-uuid"],
    "projectId": "your-project-uuid"
  }'
```

## Troubleshooting

### "No sentiment data" in widgets

- Verify posts have been analyzed
- Check the time range selector
- Ensure database migration ran successfully

### API returns 429 (Rate Limit)

- Check AI usage limits for the project
- Consider upgrading plan
- Wait for rate limit reset

### Real-time updates not working

- Verify Supabase subscriptions are enabled
- Check browser console for connection errors
- Ensure RLS policies are correctly configured

### OpenAI analysis fails

- Verify `OPENAI_API_KEY` is set
- Check OpenAI API status
- Review server logs for detailed errors

## Future Enhancements

Potential improvements:
- Multi-language sentiment analysis
- Sentiment-based automated responses
- Anomaly detection for sudden sentiment shifts
- Sentiment correlation with other metrics
- Export sentiment reports
- Custom sentiment categories per project

## License

This feature is part of SignalsLoop and follows the same license.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Contact the development team
