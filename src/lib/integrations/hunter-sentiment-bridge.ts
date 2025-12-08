/**
 * Hunter-Sentiment Integration Bridge
 * Connects Hunter feedback with Sentiment Analysis feature
 */

import { createClient } from '@supabase/supabase-js';
import { getOpenAI } from '@/lib/openai-client';


/**
 * Trigger sentiment analysis for discovered feedback items
 */
export async function analyzeSentimentForHunterFeedback(
  feedbackIds: string[]
): Promise<{ success: boolean; analyzed: number; failed: number }> {
  const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  let analyzed = 0;
  let failed = 0;

  try {
    // Get feedback items
    const { data: feedbackItems, error } = await supabase
      .from('discovered_feedback')
      .select('*')
      .in('id', feedbackIds)
      .is('sentiment_analysis_id', null);

    if (error || !feedbackItems || feedbackItems.length === 0) {
      return { success: false, analyzed: 0, failed: 0 };
    }

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < feedbackItems.length; i += batchSize) {
      const batch = feedbackItems.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (item) => {
          try {
            // Use OpenAI to analyze sentiment
            const response = await getOpenAI().chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `Analyze the sentiment of this feedback. Return JSON with:
- sentiment_category: positive | negative | neutral | mixed
- sentiment_score: -1 to 1
- emotional_tone: excited | satisfied | frustrated | angry | confused | concerned | disappointed | hopeful | neutral | urgent
- confidence_score: 0 to 1`,
                },
                {
                  role: 'user',
                  content: item.content,
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.3,
            });

            const sentiment = JSON.parse(
              response.choices[0].message.content || '{}'
            );

            // Create sentiment analysis record
            const { data: sentimentRecord } = await supabase
              .from('sentiment_analysis')
              .insert({
                post_id: item.id, // Using feedback ID as post_id for compatibility
                sentiment_category: sentiment.sentiment_category,
                sentiment_score: sentiment.sentiment_score,
                emotional_tone: sentiment.emotional_tone,
                confidence_score: sentiment.confidence_score,
              })
              .select('id')
              .single();

            if (sentimentRecord) {
              // Update feedback item with sentiment info
              await supabase
                .from('discovered_feedback')
                .update({
                  sentiment_score: sentiment.sentiment_score,
                  sentiment_category: sentiment.sentiment_category,
                  sentiment_analysis_id: sentimentRecord.id,
                })
                .eq('id', item.id);

              analyzed++;
            } else {
              failed++;
            }
          } catch (error) {
            console.error('[Hunter-Sentiment] Error analyzing item:', error);
            failed++;
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < feedbackItems.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return { success: true, analyzed, failed };
  } catch (error) {
    console.error('[Hunter-Sentiment] Error:', error);
    return { success: false, analyzed, failed };
  }
}

/**
 * Check for sentiment alerts based on hunter feedback
 */
export async function checkSentimentAlerts(
  projectId: string
): Promise<boolean> {
  const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

  try {
    // Get recent feedback (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentFeedback } = await supabase
      .from('discovered_feedback')
      .select('sentiment_score')
      .eq('project_id', projectId)
      .gte('discovered_at', oneDayAgo)
      .not('sentiment_score', 'is', null);

    if (!recentFeedback || recentFeedback.length < 5) {
      return false;
    }

    // Calculate average sentiment
    const avgSentiment =
      recentFeedback.reduce((sum, f) => sum + (f.sentiment_score || 0), 0) /
      recentFeedback.length;

    // If average sentiment drops below -0.3, it's concerning
    if (avgSentiment < -0.3) {
      console.log(
        `[Hunter-Sentiment] Alert: Negative sentiment trend for project ${projectId}: ${avgSentiment.toFixed(2)}`
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Hunter-Sentiment] Error checking alerts:', error);
    return false;
  }
}
