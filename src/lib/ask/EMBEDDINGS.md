# Feedback Embeddings for Semantic Search

This document explains how to generate and manage embeddings for feedback items to enable semantic search in the "Ask SignalsLoop Anything" feature.

## Overview

The embeddings system converts feedback items (posts) into vector representations that enable semantic similarity search. This allows AI to find relevant feedback even when users don't use exact keywords.

## Architecture

### Components

1. **`src/lib/ask/embeddings.ts`** - Core embedding generation functions
2. **`scripts/generate-embeddings.ts`** - CLI tool for batch processing
3. **Database Table** - `feedback_embeddings` stores vectors with metadata

### How It Works

1. Feedback content (title + body) is converted to text
2. OpenAI `text-embedding-3-small` generates a 1536-dimensional vector
3. Vector is stored in `feedback_embeddings` table with content hash
4. HNSW index enables fast cosine similarity search
5. Content hash prevents unnecessary re-embedding

## Usage

### Initial Setup: Generate Embeddings for Existing Feedback

When you first set up the Ask feature, you need to generate embeddings for all existing feedback:

```bash
# Generate embeddings for a project
npm run embeddings <project-id>

# Example
npm run embeddings 550e8400-e29b-41d4-a716-446655440000
```

**What it does:**
- Fetches all feedback items in the project
- Skips items that already have embeddings
- Processes in batches of 20 with 1-second delays
- Shows progress and final statistics

**Output example:**
```
✅ Embedding generation complete!

Results:
  Total items:     150
  Already had:     50
  Newly created:   100
  Errors:          0
  Duration:        32.5s
```

### Automatic: Handle New Feedback

When new feedback is created, you can automatically generate embeddings using one of these methods:

#### Option 1: Database Webhook (Recommended)

Set up a Supabase Edge Function that triggers on `posts` INSERT:

```sql
-- Create webhook in Supabase dashboard
-- Target: Your edge function URL
-- Events: INSERT on posts table
```

```typescript
// Your edge function
import { handleNewFeedback } from './embeddings.ts';

Deno.serve(async (req) => {
  const { record } = await req.json();
  const result = await handleNewFeedback(record.id);
  return new Response(JSON.stringify(result));
});
```

#### Option 2: API Integration

Call `handleNewFeedback()` after creating feedback in your API:

```typescript
// In your create-post API route
import { handleNewFeedback } from '@/lib/ask/embeddings';

// After creating post
const { data: newPost } = await supabase
  .from('posts')
  .insert({ ... })
  .select()
  .single();

// Generate embedding (fire-and-forget or await)
await handleNewFeedback(newPost.id);
```

#### Option 3: Cron Job

Run the batch script periodically to catch any missed items:

```bash
# Add to crontab or similar
0 */6 * * * cd /path/to/project && npm run embeddings $PROJECT_ID
```

### Manual: Update Single Feedback

Update embedding when feedback is edited:

```typescript
import { updateFeedbackEmbedding } from '@/lib/ask/embeddings';

const result = await updateFeedbackEmbedding(feedbackId);
```

### Manual: Delete Embedding

Remove embedding when feedback is deleted:

```typescript
import { deleteFeedbackEmbedding } from '@/lib/ask/embeddings';

const result = await deleteFeedbackEmbedding(feedbackId);
```

## Functions Reference

### `generateProjectEmbeddings(projectId)`

Batch process all feedback in a project.

**Parameters:**
- `projectId` (string) - UUID of the project

**Returns:**
```typescript
{
  success: number;   // Successfully created embeddings
  errors: number;    // Failed embeddings
  total: number;     // Total feedback items
  skipped: number;   // Already had embeddings
}
```

**Rate Limiting:**
- Processes 20 items per batch
- 1-second delay between batches
- Uses OpenAI batch API for efficiency

### `handleNewFeedback(feedbackId)`

Generate embedding for a single feedback item.

**Parameters:**
- `feedbackId` (string) - UUID of the feedback item

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Features:**
- Checks if embedding already exists
- Skips if content hasn't changed (uses content hash)
- Validates required fields (title, content)

### `updateFeedbackEmbedding(feedbackId)`

Update embedding for edited feedback.

**Parameters:**
- `feedbackId` (string) - UUID of the feedback item

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

### `deleteFeedbackEmbedding(feedbackId)`

Delete embedding when feedback is removed.

**Parameters:**
- `feedbackId` (string) - UUID of the feedback item

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

## Database Schema

### `feedback_embeddings` Table

```sql
CREATE TABLE feedback_embeddings (
  id UUID PRIMARY KEY,
  feedback_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  embedding vector(1536),      -- OpenAI text-embedding-3-small
  content_hash TEXT,            -- SHA-256 of content
  created_at TIMESTAMPTZ,
  UNIQUE(feedback_id)
);

-- HNSW index for fast cosine similarity
CREATE INDEX feedback_embeddings_hnsw_idx
  ON feedback_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

## Environment Variables

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...
```

## Cost Estimation

**OpenAI Pricing (text-embedding-3-small):**
- $0.020 per 1M tokens
- Average feedback: ~200 tokens
- 1000 feedback items ≈ 200K tokens ≈ $0.004

**Example:**
- 10,000 feedback items ≈ $0.04
- Very cost-effective for semantic search

## Performance

**Embedding Generation:**
- Single item: ~100-200ms
- Batch of 20: ~1-2 seconds
- 1000 items: ~2-3 minutes (with rate limiting)

**Search Performance:**
- HNSW index: O(log n) approximate nearest neighbor
- 10K vectors: <10ms per query
- 100K vectors: <20ms per query

## Troubleshooting

### "Missing Supabase credentials"

Ensure `.env.local` has:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### "Failed to generate embedding"

Check:
- OpenAI API key is valid
- Content is not empty
- Rate limits not exceeded

### Embeddings not updating

Verify:
- Content hash is different (edit actually changed content)
- Service role key has table access
- Database webhook is configured correctly

## Best Practices

1. **Initial Setup**: Run batch generation once when setting up Ask feature
2. **New Feedback**: Use database webhook or API integration for real-time
3. **Edited Feedback**: Call `updateFeedbackEmbedding` after updates
4. **Deleted Feedback**: Let CASCADE handle it or call `deleteFeedbackEmbedding`
5. **Monitoring**: Check logs for failed embeddings
6. **Recovery**: Run batch script periodically to catch missed items

## Example Workflow

```typescript
// 1. Initial setup for project
await generateProjectEmbeddings(projectId);

// 2. When creating new feedback
const newPost = await createPost({ title, content, ... });
await handleNewFeedback(newPost.id);

// 3. When editing feedback
const updatedPost = await updatePost(postId, { content: newContent });
await updateFeedbackEmbedding(postId);

// 4. When deleting feedback
await deletePost(postId);
// Embedding automatically deleted via CASCADE
```

## Related Files

- `src/lib/ask/embeddings.ts` - Core functions
- `src/lib/ask/retrieval.ts` - Semantic search using embeddings
- `src/lib/ask/classifier.ts` - Query classification
- `migrations/202511211200_ask_signalsloop_chat.sql` - Database schema
- `scripts/generate-embeddings.ts` - CLI tool
