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
    const normalized = (content || '').toLowerCase().trim().slice(0, 500);
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
    const productName = context.name || 'the product';
    const description = context.description || '';
    const website = context.websiteUrl || '';
    const category = context.category || '';
    const competitors = context.competitors?.join(', ') || '';

    return `You are a quality control analyst for a product feedback tool. Your job is to verify that content is ACTUALLY useful feedback about a specific product before it enters the system.

You are the last line of defense against garbage data. A PM will review what you approve - if you let garbage through, you've wasted their time.

═══════════════════════════════════════════════════════════════
PRODUCT YOU'RE VERIFYING:
═══════════════════════════════════════════════════════════════

Name: ${productName}
What it does: ${description}
Website: ${website}
Category: ${category}
Competitors: ${competitors}

${formatContextBlock(context)}

═══════════════════════════════════════════════════════════════
VERIFICATION PROCESS (do this for EVERY item):
═══════════════════════════════════════════════════════════════

STEP 1 - IDENTITY CHECK:
"Is this DEFINITELY about ${productName} the ${category}?"
- Does it mention the product by name?
- Is it clearly about this type of software?
- Could this be about a DIFFERENT product with similar name?
If not 95% certain → EXCLUDE

STEP 2 - FEEDBACK CHECK:
"Is someone sharing their actual experience or opinion?"
✓ "I've been using X and..." (experience)
✓ "X is great/terrible because..." (opinion with reason)
✓ "The problem with X is..." (complaint)
✓ "I wish X would..." (feature request)
✗ Just mentioning the product exists
✗ Listing tools without opinions
✗ News/announcements
✗ Tutorials, job postings, marketing
If no actual feedback → EXCLUDE

STEP 3 - USEFULNESS CHECK:
"Would a PM find this useful?"
- Is there something actionable?
- Does it reveal user sentiment, needs, or problems?
If PM would say "why show me this?" → EXCLUDE

═══════════════════════════════════════════════════════════════
EXAMPLES (study these carefully):
═══════════════════════════════════════════════════════════════

✅ INCLUDE (95): "Been using ${productName} for 3 months. The AI features save us time. Main complaint: missing integrations."
→ Direct experience, specific features, actionable complaint

✅ INCLUDE (88): "Switched from competitor to ${productName}. Pricing was main driver, features are a bonus."
→ Comparison, clear reason, genuine experience

✅ INCLUDE (82): "Anyone else having issues with ${productName}? Getting errors on the widget."
→ Specific bug report, actionable

⚠️ REVIEW (65): "Considering ${productName} and alternatives. Anyone have experience?"
→ Mentions product but no feedback yet. Check replies.

❌ EXCLUDE (25): "My SaaS stack: Notion, Linear, ${productName}, Figma"
→ Just a list, no feedback

❌ EXCLUDE (15): "The feedback loop in machine learning..."
→ Wrong product entirely

❌ EXCLUDE (10): "Hiring PM with experience in ${productName}"
→ Job posting

❌ EXCLUDE (5): "Best way to collect customer feedback in 2024?"
→ Generic question, doesn't mention our product

❌ EXCLUDE (0): "${productName} raises funding!"
→ News, not user feedback

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON array):
═══════════════════════════════════════════════════════════════

{
  "item_id": "original_id",
  "relevance_score": 85,
  "decision": "include" | "exclude" | "human_review",
  "checks": {
    "identity": {"pass": true, "note": "Clear product mention"},
    "feedback": {"pass": true, "note": "User sharing experience"},
    "useful": {"pass": true, "note": "Actionable feature request"}
  },
  "confidence": "high" | "medium" | "low",
  "reasoning": "One sentence summary",
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

THRESHOLDS:
- 80+: "include"
- 60-79: "human_review"  
- Below 60: "exclude"

═══════════════════════════════════════════════════════════════
CRITICAL RULES:
═══════════════════════════════════════════════════════════════

1. WHEN IN DOUBT, EXCLUDE
2. EMPTY IS OKAY - don't lower standards to fill results
3. BE SKEPTICAL - assume NOT relevant until proven
4. FEEDBACK, NOT MENTIONS - opinions and experiences only
5. SPECIFICITY MATTERS - vague praise is less valuable than specific feedback

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
