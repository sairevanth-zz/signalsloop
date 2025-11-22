/**
 * Sentiment Analysis Agent (Event-Driven)
 *
 * Listens to: feedback.created events
 * Actions: Automatically analyzes sentiment of new feedback
 * Triggers: sentiment.analyzed event (via database trigger)
 *
 * This agent replaced the manual POST /api/analyze-sentiment workflow
 * Now feedback is analyzed automatically when created, not on-demand
 */

import { DomainEvent } from '@/lib/events/types';
import { analyzeSentimentWithRetry } from '@/lib/openai/sentiment';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

/**
 * Handle feedback.created event
 * Automatically analyze sentiment for newly created feedback
 */
export async function handleFeedbackCreated(event: DomainEvent): Promise<void> {
  const startTime = Date.now();
  const { payload, metadata } = event;

  console.log(`[SENTIMENT AGENT] 📨 Received feedback.created event for post: ${payload.title}`);

  try {
    const supabase = getServiceRoleClient();

    // Fetch the full post details
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, content, category, user_id, project_id')
      .eq('id', event.aggregate_id)
      .single();

    if (fetchError || !post) {
      console.error('[SENTIMENT AGENT] ❌ Failed to fetch post:', fetchError);
      return;
    }

    // Prepare sentiment analysis input
    const text = `${post.title}\n\n${post.content || ''}`;

    console.log(`[SENTIMENT AGENT] 🤖 Analyzing sentiment for: "${post.title.substring(0, 50)}..."`);

    // Analyze sentiment with retry logic
    const analysis = await analyzeSentimentWithRetry({
      text,
      postId: post.id,
      metadata: {
        title: post.title,
        category: post.category,
      },
    });

    // Store sentiment analysis result
    const { error: insertError } = await supabase
      .from('sentiment_analysis')
      .upsert(
        {
          post_id: post.id,
          sentiment_category: analysis.sentiment_category,
          sentiment_score: analysis.sentiment_score,
          emotional_tone: analysis.emotional_tone,
          confidence_score: analysis.confidence_score,
          key_themes: [], // Will be populated by theme agent
          emotional_intensity: Math.abs(analysis.sentiment_score),
          analyzed_at: new Date().toISOString(),
        },
        {
          onConflict: 'post_id',
          ignoreDuplicates: false,
        }
      );

    if (insertError) {
      console.error('[SENTIMENT AGENT] ❌ Failed to store sentiment:', insertError);
      throw insertError;
    }

    const duration = Date.now() - startTime;
    console.log(`[SENTIMENT AGENT] ✅ Sentiment analyzed in ${duration}ms:`, {
      category: analysis.sentiment_category,
      score: analysis.sentiment_score,
      tone: analysis.emotional_tone,
      confidence: analysis.confidence_score,
    });

    // The database trigger will automatically publish sentiment.analyzed event
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[SENTIMENT AGENT] ❌ Error after ${duration}ms:`, error);

    // Store fallback sentiment on error
    try {
      const supabase = getServiceRoleClient();
      await supabase
        .from('sentiment_analysis')
        .upsert(
          {
            post_id: event.aggregate_id,
            sentiment_category: 'neutral',
            sentiment_score: 0,
            emotional_tone: 'neutral',
            confidence_score: 0,
            key_themes: [],
            emotional_intensity: 0,
            analyzed_at: new Date().toISOString(),
          },
          {
            onConflict: 'post_id',
          }
        );
    } catch (fallbackError) {
      console.error('[SENTIMENT AGENT] ❌ Failed to store fallback sentiment:', fallbackError);
    }

    // Don't throw - we don't want to crash the agent
    // The error is logged and a fallback sentiment is stored
  }
}

/**
 * Batch sentiment analysis for multiple feedback items
 * Useful for backfilling or bulk operations
 */
export async function batchAnalyzeSentiment(postIds: string[]): Promise<void> {
  console.log(`[SENTIMENT AGENT] 📦 Batch analyzing ${postIds.length} posts...`);

  const supabase = getServiceRoleClient();

  // Fetch all posts
  const { data: posts, error: fetchError } = await supabase
    .from('posts')
    .select('id, title, content, category')
    .in('id', postIds);

  if (fetchError || !posts) {
    console.error('[SENTIMENT AGENT] ❌ Failed to fetch posts:', fetchError);
    return;
  }

  // Process in parallel (limited concurrency)
  const BATCH_SIZE = 10;
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (post) => {
        try {
          const text = `${post.title}\n\n${post.content || ''}`;
          const analysis = await analyzeSentimentWithRetry({
            text,
            postId: post.id,
            metadata: {
              title: post.title,
              category: post.category,
            },
          });

          await supabase
            .from('sentiment_analysis')
            .upsert({
              post_id: post.id,
              sentiment_category: analysis.sentiment_category,
              sentiment_score: analysis.sentiment_score,
              emotional_tone: analysis.emotional_tone,
              confidence_score: analysis.confidence_score,
              key_themes: [],
              emotional_intensity: Math.abs(analysis.sentiment_score),
              analyzed_at: new Date().toISOString(),
            });
        } catch (error) {
          console.error(`[SENTIMENT AGENT] ❌ Failed to analyze post ${post.id}:`, error);
        }
      })
    );

    console.log(`[SENTIMENT AGENT] ✅ Processed batch ${i / BATCH_SIZE + 1} of ${Math.ceil(posts.length / BATCH_SIZE)}`);
  }

  console.log(`[SENTIMENT AGENT] ✅ Batch analysis complete`);
}
