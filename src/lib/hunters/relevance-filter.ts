/**
 * Stage 2: Relevance Filter
 * Scores discovered feedback items 0-100 for relevance to the product
 * Filters out false positives before expensive classification
 */

import { RawFeedback, PlatformType } from '@/types/hunter';
import { ProductContext, formatContextBlock } from './product-context';
import { createHash } from 'crypto';

/**
 * Result of relevance filtering
 */
export interface RelevanceResult {
    item: RawFeedback;
    relevanceScore: number;
    confidence: 'high' | 'medium' | 'low';
    decision: 'include' | 'exclude' | 'human_review';
    reasoning: string;
    falsePositiveFlags: string[];
    qualitySignals: {
        mentionsProductByName: boolean;
        discussesSpecificFeatures: boolean;
        fromTargetPersona: boolean;
        hasActionableFeedback: boolean;
        isPromotional: boolean;
        isWrongProduct: boolean;
    };
}

/**
 * Batch filter results
 */
export interface FilterBatchResult {
    included: RelevanceResult[];
    needsReview: RelevanceResult[];
    excluded: RelevanceResult[];
    stats: {
        totalProcessed: number;
        includedCount: number;
        needsReviewCount: number;
        excludedCount: number;
        avgScore: number;
    };
}

/**
 * Cached relevance decision
 */
interface CachedDecision {
    relevanceScore: number;
    decision: 'include' | 'exclude' | 'human_review';
    reasoning: string;
    cachedAt: Date;
}

// In-memory cache (can be replaced with Redis/Supabase later)
const relevanceCache = new Map<string, CachedDecision>();

/**
 * Generate content hash for caching
 */
function generateContentHash(content: string, platform: PlatformType): string {
    const normalized = content.toLowerCase().trim().slice(0, 500);
    return createHash('md5').update(`${platform}:${normalized}`).digest('hex');
}

/**
 * Check cache for existing decision
 */
export function checkRelevanceCache(content: string, platform: PlatformType): CachedDecision | null {
    const hash = generateContentHash(content, platform);
    const cached = relevanceCache.get(hash);

    if (cached) {
        // Cache expires after 7 days
        const cacheAge = Date.now() - cached.cachedAt.getTime();
        if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
            return cached;
        }
        relevanceCache.delete(hash);
    }

    return null;
}

/**
 * Cache a relevance decision
 */
export function cacheRelevanceDecision(
    content: string,
    platform: PlatformType,
    score: number,
    decision: 'include' | 'exclude' | 'human_review',
    reasoning: string
): void {
    const hash = generateContentHash(content, platform);
    relevanceCache.set(hash, {
        relevanceScore: score,
        decision,
        reasoning,
        cachedAt: new Date(),
    });
}

/**
 * Build the relevance filter system prompt
 */
function buildRelevanceSystemPrompt(context: ProductContext): string {
    return `You are a precision relevance scoring engine. Your job is to evaluate whether discovered content is ACTUALLY about a specific product, not just tangentially related.

${formatContextBlock(context)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELEVANCE SCORING CRITERIA (0-100)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORE 90-100: DEFINITE MATCH - INCLUDE
- Explicitly names the product AND discusses using it
- Links to product website
- @ mentions official account
- Reviews on product's actual review page
- "I use {product} for..." statements
- MUST have actual USER FEEDBACK about the product

SCORE 80-89: HIGH CONFIDENCE - INCLUDE
- Names product in context of discussing its features
- Direct comparison: "I switched from X to {product}"
- Discusses specific features/bugs of THIS product
- From relevant subreddit specifically for this product
- User is sharing THEIR experience with the product

SCORE 60-79: MODERATE - NEEDS HUMAN REVIEW
- Mentions product name but context is ambiguous
- Generic category discussion that briefly mentions product
- News/announcement about the product (not user feedback)
- Pass to human review queue

SCORE 40-59: LOW - EXCLUDE
- Product name appears but isn't the main subject
- Wrong product category entirely
- Name match but different product/company
- Discussion ABOUT the category, not specific product feedback
- DO NOT INCLUDE - exclude from results

SCORE 0-39: DEFINITE FALSE POSITIVE - EXCLUDE
- Completely unrelated content
- Different product with same name
- Spam/promotional content
- The product is only mentioned in passing
- DO NOT INCLUDE - exclude from results

⚠️ CRITICAL: BE VERY STRICT. Most content does NOT qualify.
- Generic productivity discussions = EXCLUDE
- "What tools do you use?" posts = EXCLUDE unless discussing THIS product specifically
- News articles = EXCLUDE (we want user feedback, not news)
- Tutorials/how-to = EXCLUDE unless user is giving feedback on the product


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FALSE POSITIVE DETECTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTOMATIC REJECTION (score = 0):

1. WRONG PRODUCT: Content is about a different product that shares a name
2. GENERIC CATEGORY: Discusses category without mentioning the specific product
3. NAME-ONLY MENTION: Product name appears but isn't being discussed
4. PROMOTIONAL: Company's own marketing content
5. RECRUITMENT: Job postings requiring experience with the product

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each item, return a JSON object:

{
  "item_id": "original_id",
  "relevance_score": 85,
  "confidence": "high" | "medium" | "low",
  "decision": "include" | "exclude" | "human_review",
  "reasoning": "Specific explanation of why this score was assigned",
  "false_positive_flags": [],
  "quality_signals": {
    "mentions_product_by_name": true,
    "discusses_specific_features": true,
    "from_target_persona": true,
    "has_actionable_feedback": true,
    "is_promotional": false,
    "is_wrong_product": false
  }
}

Return a JSON array of evaluations.`;
}

/**
 * Filter feedback items by relevance using GPT-4o-mini
 */
export async function filterByRelevance(
    items: RawFeedback[],
    context: ProductContext,
    apiKey?: string
): Promise<FilterBatchResult> {
    if (!apiKey) {
        apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
        console.warn('[RelevanceFilter] No OPENAI_API_KEY, including all items');
        return createPassthroughResult(items);
    }

    const results: RelevanceResult[] = [];
    const uncachedItems: RawFeedback[] = [];

    // Check cache first
    for (const item of items) {
        const cached = checkRelevanceCache(item.content, item.platform);
        if (cached) {
            results.push({
                item,
                relevanceScore: cached.relevanceScore,
                confidence: cached.relevanceScore >= 70 ? 'high' : cached.relevanceScore >= 50 ? 'medium' : 'low',
                decision: cached.decision,
                reasoning: `(cached) ${cached.reasoning}`,
                falsePositiveFlags: [],
                qualitySignals: {
                    mentionsProductByName: true,
                    discussesSpecificFeatures: false,
                    fromTargetPersona: false,
                    hasActionableFeedback: false,
                    isPromotional: false,
                    isWrongProduct: false,
                },
            });
        } else {
            uncachedItems.push(item);
        }
    }

    // Process uncached items in batches
    if (uncachedItems.length > 0) {
        const batchSize = 15;
        for (let i = 0; i < uncachedItems.length; i += batchSize) {
            const batch = uncachedItems.slice(i, i + batchSize);
            const batchResults = await evaluateBatch(batch, context, apiKey);
            results.push(...batchResults);

            // Cache the results
            for (const result of batchResults) {
                cacheRelevanceDecision(
                    result.item.content,
                    result.item.platform,
                    result.relevanceScore,
                    result.decision,
                    result.reasoning
                );
            }
        }
    }

    // Categorize results
    const included = results.filter(r => r.decision === 'include');
    const needsReview = results.filter(r => r.decision === 'human_review');
    const excluded = results.filter(r => r.decision === 'exclude');

    // Calculate stats
    const totalScore = results.reduce((sum, r) => sum + r.relevanceScore, 0);

    return {
        included,
        needsReview,
        excluded,
        stats: {
            totalProcessed: results.length,
            includedCount: included.length,
            needsReviewCount: needsReview.length,
            excludedCount: excluded.length,
            avgScore: results.length > 0 ? Math.round(totalScore / results.length) : 0,
        },
    };
}

/**
 * Evaluate a batch of items
 */
async function evaluateBatch(
    items: RawFeedback[],
    context: ProductContext,
    apiKey: string
): Promise<RelevanceResult[]> {
    const systemPrompt = buildRelevanceSystemPrompt(context);

    // Format items for evaluation
    const itemsForEval = items.map((item, index) => ({
        id: index.toString(),
        platform: item.platform,
        content: item.content.slice(0, 1000), // Truncate long content
        title: item.title || '',
        author: item.author_username || 'unknown',
    }));

    const userPrompt = `TASK: Score the relevance of these ${items.length} items for "${context.name}"

ITEMS TO EVALUATE:
${JSON.stringify(itemsForEval, null, 2)}

For each item, provide a relevance score (0-100) and decision.
Only items scoring 70+ should have decision "include".
Items scoring 50-69 should have decision "human_review".
Items scoring below 50 should have decision "exclude".

Return a JSON array of evaluations.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            console.error('[RelevanceFilter] OpenAI API error:', response.status);
            return items.map(item => createDefaultResult(item));
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        // Handle both array response and object with evaluations property
        const evaluations = Array.isArray(parsed) ? parsed : (parsed.evaluations || []);

        return items.map((item, index) => {
            const evaluation = evaluations.find((e: any) => e.item_id === index.toString()) || {};
            return {
                item,
                relevanceScore: evaluation.relevance_score || 50,
                confidence: (evaluation.confidence || 'medium') as 'high' | 'medium' | 'low',
                decision: (evaluation.decision || 'human_review') as 'include' | 'exclude' | 'human_review',
                reasoning: evaluation.reasoning || 'Unable to evaluate',
                falsePositiveFlags: evaluation.false_positive_flags || [],
                qualitySignals: {
                    mentionsProductByName: evaluation.quality_signals?.mentions_product_by_name ?? false,
                    discussesSpecificFeatures: evaluation.quality_signals?.discusses_specific_features ?? false,
                    fromTargetPersona: evaluation.quality_signals?.from_target_persona ?? false,
                    hasActionableFeedback: evaluation.quality_signals?.has_actionable_feedback ?? false,
                    isPromotional: evaluation.quality_signals?.is_promotional ?? false,
                    isWrongProduct: evaluation.quality_signals?.is_wrong_product ?? false,
                },
            };
        });
    } catch (error) {
        console.error('[RelevanceFilter] Error evaluating batch:', error);
        return items.map(item => createDefaultResult(item));
    }
}

/**
 * Create a default result for error cases
 */
function createDefaultResult(item: RawFeedback): RelevanceResult {
    return {
        item,
        relevanceScore: 50,
        confidence: 'low',
        decision: 'human_review',
        reasoning: 'Unable to evaluate - defaulting to human review',
        falsePositiveFlags: [],
        qualitySignals: {
            mentionsProductByName: false,
            discussesSpecificFeatures: false,
            fromTargetPersona: false,
            hasActionableFeedback: false,
            isPromotional: false,
            isWrongProduct: false,
        },
    };
}

/**
 * Create passthrough result when no API key is available
 */
function createPassthroughResult(items: RawFeedback[]): FilterBatchResult {
    const results = items.map(item => ({
        item,
        relevanceScore: 75,
        confidence: 'medium' as const,
        decision: 'include' as const,
        reasoning: 'No API key - passing through all items',
        falsePositiveFlags: [],
        qualitySignals: {
            mentionsProductByName: true,
            discussesSpecificFeatures: false,
            fromTargetPersona: false,
            hasActionableFeedback: false,
            isPromotional: false,
            isWrongProduct: false,
        },
    }));

    return {
        included: results,
        needsReview: [],
        excluded: [],
        stats: {
            totalProcessed: results.length,
            includedCount: results.length,
            needsReviewCount: 0,
            excludedCount: 0,
            avgScore: 75,
        },
    };
}
