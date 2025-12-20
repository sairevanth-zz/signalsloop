/**
 * Background Processing Cron Job
 * Processes pending feedback items with Stage 2 (Relevance Filter) and Stage 3 (Classification)
 * 
 * Runs every minute via Vercel Cron
 * Processes 10 items per run to stay under 60s execution limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { buildProductContext } from '@/lib/hunters/product-context';
import { filterByRelevance } from '@/lib/hunters/relevance-filter';
import OpenAI from 'openai';
import {
    RawFeedback,
    ClassifiedFeedback,
    FeedbackClassification,
    HunterConfig
} from '@/types/hunter';

// Cron authentication - Vercel adds this header
const CRON_SECRET = process.env.CRON_SECRET;

// Process up to 10 items per cron run to stay under 60s limit
const BATCH_SIZE = 10;

/**
 * GET handler for cron job
 * Vercel Cron uses GET requests
 */
export async function GET(request: NextRequest) {
    // Verify cron secret (Vercel adds this automatically)
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        console.warn('[Cron] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Cron] Starting background processing...');

    try {
        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            throw new Error('Supabase not available');
        }

        // Fetch pending items (oldest first)
        const { data: pendingItems, error: fetchError } = await supabase
            .from('discovered_feedback')
            .select('*, projects!inner(id, name)')
            .eq('processing_status', 'pending')
            .order('created_at', { ascending: true })
            .limit(BATCH_SIZE);

        if (fetchError) {
            throw new Error(`Failed to fetch pending items: ${fetchError.message}`);
        }

        if (!pendingItems || pendingItems.length === 0) {
            console.log('[Cron] No pending items to process');
            return NextResponse.json({
                success: true,
                message: 'No pending items',
                processed: 0,
                durationMs: Date.now() - startTime,
            });
        }

        console.log(`[Cron] Found ${pendingItems.length} pending items`);

        // Mark items as processing
        const itemIds = pendingItems.map(item => item.id);
        await supabase
            .from('discovered_feedback')
            .update({ processing_status: 'processing' })
            .in('id', itemIds);

        // Group items by project for efficient config lookup
        const itemsByProject = new Map<string, typeof pendingItems>();
        for (const item of pendingItems) {
            const projectId = item.project_id;
            if (!itemsByProject.has(projectId)) {
                itemsByProject.set(projectId, []);
            }
            itemsByProject.get(projectId)!.push(item);
        }

        let processed = 0;
        let failed = 0;

        // Process each project's items
        for (const [projectId, items] of itemsByProject) {
            try {
                // Fetch hunter config for this project
                const { data: config } = await supabase
                    .from('hunter_configs')
                    .select('*')
                    .eq('project_id', projectId)
                    .eq('is_active', true)
                    .single();

                if (!config) {
                    console.warn(`[Cron] No config found for project ${projectId}, classifying without context`);
                }

                // Convert DB items to RawFeedback format for processing
                const rawItems: RawFeedback[] = items.map(item => ({
                    platform: item.platform,
                    platform_id: item.platform_id,
                    platform_url: item.platform_url,
                    title: item.title || '',
                    content: item.content,
                    author_username: item.author_username,
                    author_profile_url: item.author_profile_url,
                    discovered_at: new Date(item.discovered_at),
                    engagement_metrics: item.engagement_metrics || {},
                }));

                // Stage 2: Relevance filtering (if product context exists)
                let itemsToClassify = rawItems;
                let relevanceResults: Map<string, { score: number; reasoning: string; needsReview: boolean }> = new Map();

                const hasProductContext = config?.product_description || config?.product_tagline || config?.product_category;

                if (hasProductContext && process.env.OPENAI_API_KEY) {
                    console.log(`[Cron] Running Stage 2 for project ${projectId}...`);
                    try {
                        const context = buildProductContext(config as HunterConfig);
                        const filterResult = await filterByRelevance(rawItems, context);

                        // Store relevance scores and filter out excluded items
                        for (const included of filterResult.included) {
                            relevanceResults.set(included.item.platform_id, {
                                score: included.relevanceScore,
                                reasoning: included.reasoning,
                                needsReview: false,
                            });
                        }

                        for (const review of filterResult.needsReview) {
                            relevanceResults.set(review.item.platform_id, {
                                score: review.relevanceScore,
                                reasoning: review.reasoning,
                                needsReview: true,
                            });
                        }

                        // Mark excluded items as complete (with low relevance)
                        for (const excluded of filterResult.excluded) {
                            await supabase
                                .from('discovered_feedback')
                                .update({
                                    processing_status: 'complete',
                                    relevance_score: excluded.relevanceScore,
                                    relevance_reasoning: excluded.reasoning,
                                    classification: 'other',
                                    is_archived: true, // Auto-archive false positives
                                })
                                .eq('platform_id', excluded.item.platform_id)
                                .eq('project_id', projectId);
                        }

                        // Only classify included + needs_review items
                        itemsToClassify = [...filterResult.included, ...filterResult.needsReview].map(r => r.item);
                        console.log(`[Cron] Stage 2: ${filterResult.stats.includedCount} included, ${filterResult.stats.needsReviewCount} review, ${filterResult.stats.excludedCount} excluded`);
                    } catch (error) {
                        console.error(`[Cron] Stage 2 error, proceeding with all items:`, error);
                        // Continue with all items if Stage 2 fails
                    }
                }

                // Stage 3: Classification
                if (itemsToClassify.length > 0 && process.env.OPENAI_API_KEY) {
                    console.log(`[Cron] Running Stage 3 for ${itemsToClassify.length} items...`);

                    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                    for (const item of itemsToClassify) {
                        try {
                            // Classify the item
                            const classification = await classifyFeedback(openai, item, config);
                            const relevance = relevanceResults.get(item.platform_id);

                            // Update the database
                            await supabase
                                .from('discovered_feedback')
                                .update({
                                    processing_status: 'complete',
                                    classification: classification.classification,
                                    sentiment_score: classification.sentiment_score,
                                    sentiment_label: classification.sentiment_label,
                                    urgency_level: classification.urgency_level,
                                    key_topics: classification.key_topics,
                                    relevance_score: relevance?.score,
                                    relevance_reasoning: relevance?.reasoning,
                                    needs_review: relevance?.needsReview || false,
                                })
                                .eq('platform_id', item.platform_id)
                                .eq('project_id', projectId);

                            processed++;
                        } catch (error) {
                            console.error(`[Cron] Error classifying item:`, error);
                            await supabase
                                .from('discovered_feedback')
                                .update({ processing_status: 'failed' })
                                .eq('platform_id', item.platform_id)
                                .eq('project_id', projectId);
                            failed++;
                        }
                    }
                } else {
                    // No OpenAI key - mark as complete with default classification
                    for (const item of items) {
                        await supabase
                            .from('discovered_feedback')
                            .update({
                                processing_status: 'complete',
                                classification: 'other',
                            })
                            .eq('id', item.id);
                        processed++;
                    }
                }
            } catch (error) {
                console.error(`[Cron] Error processing project ${projectId}:`, error);
                // Mark all items in this project as failed
                for (const item of items) {
                    await supabase
                        .from('discovered_feedback')
                        .update({ processing_status: 'failed' })
                        .eq('id', item.id);
                    failed++;
                }
            }
        }

        const duration = Date.now() - startTime;
        console.log(`[Cron] Completed: ${processed} processed, ${failed} failed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            message: `Processed ${processed} items`,
            processed,
            failed,
            durationMs: duration,
        });
    } catch (error) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            durationMs: Date.now() - startTime,
        }, { status: 500 });
    }
}

/**
 * Classify a single feedback item using GPT-4o-mini
 */
async function classifyFeedback(
    openai: OpenAI,
    item: RawFeedback,
    config: HunterConfig | null
): Promise<{
    classification: FeedbackClassification;
    sentiment_score: number;
    sentiment_label: string;
    urgency_level: string;
    key_topics: string[];
}> {
    const systemPrompt = `You are a feedback classification AI. Analyze the feedback and return a JSON object with:
- classification: one of "bug", "feature_request", "usability_issue", "praise", "complaint", "comparison", "churn_risk", "question", "other"
- sentiment_score: -1 to 1 (negative to positive)
- sentiment_label: "negative", "neutral", or "positive"
- urgency_level: "low", "medium", "high", "critical"
- key_topics: array of 2-5 key topics/themes

${config ? `Product context: ${config.company_name} - ${config.product_description || config.industry || 'Software product'}` : ''}`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Classify this feedback:\n\nTitle: ${item.title || 'N/A'}\nContent: ${item.content.slice(0, 1500)}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
        classification: parsed.classification || 'other',
        sentiment_score: parsed.sentiment_score ?? 0,
        sentiment_label: parsed.sentiment_label || 'neutral',
        urgency_level: parsed.urgency_level || 'medium',
        key_topics: parsed.key_topics || [],
    };
}
