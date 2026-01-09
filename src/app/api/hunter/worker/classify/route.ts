/**
 * Classify Worker
 * Classifies filtered items and stores final feedback
 * Triggered by cron every minute
 * 
 * Also triggers Competitive Intelligence extraction for newly imported feedback.
 */

import { NextResponse } from 'next/server';
import {
    claimJob,
    completeJob,
    failJob,
    getItemsForClassification,
    updateItemClassification,
    updateScanStats,
    updatePlatformStatus,
    checkScanComplete,
    createJob,
} from '@/lib/hunters/job-queue';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { extractCompetitorMentions } from '@/lib/competitive-intelligence';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import OpenAI from 'openai';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
    return POST();
}

export async function POST() {
    console.log('[Classify Worker] Starting...');

    try {
        // Claim a pending classify job
        const job = await claimJob('classify');

        if (!job) {
            console.log('[Classify Worker] No pending jobs');
            return NextResponse.json({ processed: 0, message: 'No pending jobs' });
        }

        console.log(`[Classify Worker] Claimed job ${job.id} for ${job.platform}`);
        await updatePlatformStatus(job.scan_id, job.platform, 'classifying');

        const supabase = getServiceRoleClient();
        if (!supabase) {
            console.error('[Classify Worker] FAILED: Supabase client not available');
            await failJob(job.id, 'Supabase client not available', false);
            return NextResponse.json({ processed: 0, error: 'No supabase client' });
        }

        // Get items to classify (reduced batch size to avoid timeout)
        const items = await getItemsForClassification(job.scan_id, job.platform, 5);

        if (items.length === 0) {
            console.log(`[Classify Worker] No items to classify for ${job.platform}`);
            await completeJob(job.id);
            await updatePlatformStatus(job.scan_id, job.platform, 'complete');
            await checkScanComplete(job.scan_id);
            return NextResponse.json({ processed: 1, classified: 0 });
        }

        console.log(`[Classify Worker] Classifying ${items.length} items for ${job.platform}`);

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        let classifiedCount = 0;

        // Classify each item
        for (const item of items) {
            try {
                const classification = await classifyItem(openai, item.content, item.title);
                await updateItemClassification(item.id, classification);

                // Store in discovered_feedback (final table)
                const { error: storeError } = await supabase
                    .from('discovered_feedback')
                    .upsert({
                        project_id: job.project_id,
                        platform: job.platform,
                        platform_id: item.external_id || item.id,
                        platform_url: item.external_url || '',
                        title: item.title,
                        content: item.content,
                        author_username: item.author,
                        discovered_at: item.posted_at || item.created_at || new Date().toISOString(),
                        // Use correct column names from schema
                        classification: classification.classification,
                        classification_confidence: classification.confidence || 0.5,
                        classification_reason: classification.quotable || null,
                        sentiment_score: classification.sentiment || 0,
                        urgency_score: classification.urgency || 1,
                        urgency_reason: classification.action_needed ? 'Action needed' : null,
                        tags: classification.tags || [],
                        processed_at: new Date().toISOString(),
                        // Required for feed query to find items
                        is_duplicate: false,
                        is_archived: false,
                        // Flag for human review if relevance filter marked it
                        needs_review: item.relevance_decision === 'human_review',
                    }, {
                        onConflict: 'project_id,platform,platform_id',
                    });

                if (storeError) {
                    console.error(`[Classify Worker] Error storing item:`, storeError);
                } else {
                    classifiedCount++;
                }
            } catch (error) {
                console.error(`[Classify Worker] Error classifying item ${item.id}:`, error);
            }
        }

        // Update scan stats
        await updateScanStats(job.scan_id, { classified: classifiedCount });

        // Mark this job complete
        await completeJob(job.id);

        // Check if there are more items to classify
        const remainingItems = await getItemsForClassification(job.scan_id, job.platform, 1);

        if (remainingItems.length > 0) {
            // More items to classify - create another job (cron will pick it up)
            await createJob({
                scanId: job.scan_id,
                projectId: job.project_id,
                jobType: 'classify',
                platform: job.platform,
            });
            console.log(`[Classify Worker] Created follow-up classify job for ${job.platform} (${remainingItems.length}+ items remaining)`);
        } else {
            // No more items - mark platform complete
            await updatePlatformStatus(job.scan_id, job.platform, 'complete');
            await checkScanComplete(job.scan_id);
            console.log(`[Classify Worker] Platform ${job.platform} complete`);

            // Auto-trigger competitive intelligence extraction for newly imported feedback
            await triggerCompetitiveExtraction(job.project_id, classifiedCount);
        }

        console.log(`[Classify Worker] Classified ${classifiedCount} items for ${job.platform}`);

        return NextResponse.json({
            processed: 1,
            platform: job.platform,
            classified: classifiedCount,
        });
    } catch (error) {
        console.error('[Classify Worker] Error:', error);
        return NextResponse.json({
            processed: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Classify a single feedback item
 */
async function classifyItem(
    openai: OpenAI,
    content: string,
    title?: string | null
): Promise<Record<string, unknown>> {
    const systemPrompt = `Classify this product feedback. Return JSON only.

CLASSIFICATION (pick ONE):
- bug: broken, errors, crashes
- feature_request: "I wish", "please add"
- usability_issue: works but confusing
- praise: positive, recommendation
- complaint: negative without specific bug
- comparison: mentions competitors
- question: "how do I", "can it do"
- churn_risk: "thinking of switching"
- other: doesn't fit above

URGENCY (1-5):
5: Data loss, security, viral complaint
4: Major bug, workflow blocked
3: Feature request with traction
2: Minor suggestion
1: Pure praise

SENTIMENT (-1 to +1):
-1 to -0.5: Very negative
-0.5 to 0: Negative  
0 to 0.5: Positive
0.5 to 1: Very positive

OUTPUT JSON:
{
  "classification": "feature_request",
  "confidence": 0.9,
  "urgency": 3,
  "sentiment": 0.3,
  "tags": ["integrations", "slack"],
  "quotable": "Best quote from feedback",
  "action_needed": true
}`;

    const userPrompt = `Classify this feedback:

${title ? `Title: ${title}\n` : ''}Content: ${content}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return result;
    } catch (error) {
        console.error('[Classify Worker] OpenAI error:', error);
        return {
            classification: 'other',
            confidence: 0,
            urgency: 1,
            sentiment: 0,
            tags: [],
            error: 'Classification failed',
        };
    }
}

/**
 * Trigger Competitive Intelligence extraction for newly imported feedback
 * Runs in the background after Hunter completes - respects tier limits
 */
async function triggerCompetitiveExtraction(projectId: string, feedbackCount: number): Promise<void> {
    try {
        // Check if project has competitive extraction quota
        const usageCheck = await checkAIUsageLimit(projectId, 'competitor_extraction');

        if (!usageCheck.allowed || usageCheck.remaining === 0) {
            console.log(`[Classify Worker] Skipping competitive extraction - no quota remaining (${usageCheck.current}/${usageCheck.limit})`);
            return;
        }

        // Get recently imported feedback that needs competitive extraction
        const supabase = getServiceRoleClient();
        if (!supabase) return;

        // Get feedback items from last 5 minutes that haven't been analyzed for competitors
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data: recentFeedback } = await supabase
            .from('discovered_feedback')
            .select('id')
            .eq('project_id', projectId)
            .gte('processed_at', fiveMinutesAgo)
            .limit(Math.min(usageCheck.remaining, 10)); // Limit to available quota, max 10 per batch

        if (!recentFeedback || recentFeedback.length === 0) {
            console.log('[Classify Worker] No recent feedback to analyze for competitors');
            return;
        }

        console.log(`[Classify Worker] Running competitive extraction on ${recentFeedback.length} newly imported feedback items`);

        // Extract competitor mentions from each feedback item
        let extractedCount = 0;
        for (const feedback of recentFeedback) {
            try {
                const result = await extractCompetitorMentions(feedback.id);
                if (result.success && result.mentionsFound > 0) {
                    extractedCount++;
                    console.log(`[Classify Worker] Found ${result.mentionsFound} competitor mentions in feedback ${feedback.id}`);
                }
            } catch (err) {
                console.error(`[Classify Worker] Error extracting competitors from ${feedback.id}:`, err);
            }
        }

        // Increment usage for successful extractions
        if (extractedCount > 0) {
            await incrementAIUsage(projectId, 'competitor_extraction', recentFeedback.length);
            console.log(`[Classify Worker] Competitive extraction complete. Analyzed ${recentFeedback.length} items, found mentions in ${extractedCount}`);
        }
    } catch (error) {
        // Don't throw - this is a background enhancement, not critical path
        console.error('[Classify Worker] Competitive extraction failed (non-critical):', error);
    }
}
