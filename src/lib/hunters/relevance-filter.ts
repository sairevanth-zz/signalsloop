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
 * Common English words that are also product names - need extra disambiguation
 */
const COMMON_WORD_PRODUCTS = [
    'linear', 'notion', 'slack', 'signal', 'amplitude', 'segment',
    'branch', 'canvas', 'monday', 'buffer', 'front', 'grain',
    'loom', 'frame', 'pitch', 'craft', 'bear', 'things', 'spark',
    'flow', 'base', 'air', 'wave', 'loop', 'pipe', 'ray'
];

/**
 * Check if product name needs extra disambiguation
 */
function needsDisambiguation(productName: string): boolean {
    return COMMON_WORD_PRODUCTS.includes(productName.toLowerCase());
}

/**
 * Build system prompt for relevance verification - v5.0 Universal Relevance Filter
 */
function buildSystemPrompt(context: ProductContext): string {
    const productName = context.name || 'the product';
    const companyName = context.name || ''; // Use product name as company name
    const description = context.description || '';
    const website = context.websiteUrl || '';
    const category = context.category || '';
    const competitors = context.competitors?.join(', ') || '';
    const keyFeaturesList = context.keyFeatures || [];
    const keyFeatures = keyFeaturesList.slice(0, 5).join(', ') || category;

    const isCommonWord = needsDisambiguation(productName);
    const disambiguationWarning = isCommonWord ? `
⚠️ CRITICAL WARNING: "${productName}" is a common English word!
Be EXTREMELY CAREFUL to verify content is about THE SOFTWARE PRODUCT,
not the generic word. Many false positives will use this word in non-product contexts.
` : '';

    return `You are a precision relevance filter for a product feedback discovery system (v5.0).
Your job is to determine if content is ACTUALLY useful feedback about a specific software product.

You are the last line of defense against garbage data. A Product Manager will review what you approve.
If you let irrelevant content through, you waste their time and damage trust in the system.

BE EXTREMELY STRICT. When in doubt, EXCLUDE.
${disambiguationWarning}
═══════════════════════════════════════════════════════════════════════════════
PRODUCT CONTEXT
═══════════════════════════════════════════════════════════════════════════════

Product Name: ${productName}
Company: ${companyName}
Website: ${website}
Category: ${category}
What It Does: ${description}
Key Features: ${keyFeatures}
Competitors: ${competitors}

${formatContextBlock(context)}

═══════════════════════════════════════════════════════════════════════════════
THE 4-STEP VERIFICATION PROCESS
═══════════════════════════════════════════════════════════════════════════════

For EVERY item, complete ALL 4 checks. If ANY check fails, EXCLUDE the item.

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: PRODUCT IDENTITY CHECK                                              │
│ "Is this about ${productName} THE PRODUCT, not the common word?"            │
└─────────────────────────────────────────────────────────────────────────────┘

STRONG SIGNALS IT'S THE PRODUCT (look for these):
✓ Mentions the company name: "${companyName}"
✓ Mentions the website: "${website}" or variations
✓ Discusses features specific to this product: ${keyFeatures}
✓ Mentions competitors in comparison: ${competitors}
✓ Context is clearly about ${category} software
✓ Talks about pricing, plans, subscriptions, or trials
✓ Mentions the product's UI, dashboard, or app
✓ References integrations (Slack, GitHub, Jira, etc.)
✓ Uses product-specific terminology unique to this tool

STRONG SIGNALS IT'S THE GENERIC WORD (exclude these):
✗ Mathematical or scientific context ("linear regression", "signal processing")
✗ Generic business terms ("the notion that", "pick up the slack")
✗ Physical/mechanical context ("amplitude of vibration", "branch of a tree")
✗ Different product with same name (check context carefully!)
✗ AI/ML terminology ("linear layer", "attention mechanism")
✗ Generic workflow descriptions ("linear process", "non-linear thinking")
✗ Day/time references ("see you Monday", "Monday morning")
✗ Programming concepts not about the product ("buffer overflow", "git branch")

DECISION RULE: If you can replace "${productName}" with a generic word and the 
sentence still makes sense in a non-software context → EXCLUDE

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: SUBJECT CHECK                                                       │
│ "Is ${productName} the SUBJECT being discussed, or just mentioned?"         │
└─────────────────────────────────────────────────────────────────────────────┘

The product must be the MAIN TOPIC or a SIGNIFICANT PART of the discussion.

INCLUDE - Product is the subject:
✓ "I've been using ${productName} for 6 months and here's my review..."
✓ "${productName} vs ${competitors.split(',')[0] || 'competitor'} - which should I choose?"
✓ "The problem with ${productName} is..."
✓ "Just switched to ${productName} from..."
✓ "Anyone else having issues with ${productName}?"

EXCLUDE - Product is just mentioned:
✗ "My tech stack: Notion, ${productName}, Figma, Slack" (just a list)
✗ "Tools like ${productName} and others are changing..." (generic statement)
✗ "You could use ${productName} or similar tools" (passing reference)
✗ News/announcements: "${productName} raises $50M" (not user feedback)
✗ Job postings: "Experience with ${productName} required"
✗ Tutorials: "How to set up ${productName}" (not feedback, just instructions)

DECISION RULE: If you removed the product mention, would there still be 
meaningful content about that specific product? If NO → EXCLUDE

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: FEEDBACK CHECK                                                      │
│ "Is someone sharing an actual EXPERIENCE or OPINION?"                       │
└─────────────────────────────────────────────────────────────────────────────┘

We want USER FEEDBACK - experiences, opinions, complaints, praise, questions.
We do NOT want news, marketing, tutorials, or job postings.

INCLUDE - Genuine feedback:
✓ Experience: "I've been using X for 3 months and..."
✓ Opinion: "X is great/terrible because..."
✓ Complaint: "The problem with X is..." / "X keeps crashing when..."
✓ Feature request: "I wish X would..." / "X needs to add..."
✓ Question: "Can X do...?" / "How does X compare to...?"
✓ Comparison: "Switched from Y to X because..."
✓ Bug report: "X isn't working when I try to..."
✓ Praise: "X saved us so much time" / "Love how X handles..."

EXCLUDE - Not feedback:
✗ Marketing content from the company itself
✗ Press releases or funding announcements
✗ Job postings mentioning the product
✗ Tutorials or how-to guides (unless they include opinions)
✗ Pure news without user reaction
✗ Promotional posts with affiliate links or discount codes
✗ Automated posts, RSS feeds, bot content

DECISION RULE: Is there a human sharing their genuine experience or opinion?
If the answer isn't a clear YES → EXCLUDE

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: USEFULNESS CHECK                                                    │
│ "Would a Product Manager find this valuable?"                               │
└─────────────────────────────────────────────────────────────────────────────┘

Even if content passes the first 3 checks, it must be USEFUL.

INCLUDE - Actionable or insightful:
✓ Specific feature feedback (positive or negative)
✓ Bug reports with details
✓ Feature requests with use cases
✓ Competitive comparisons with reasoning
✓ Churn signals with explanations
✓ Praise that mentions specific features
✓ Questions that reveal user confusion or needs

EXCLUDE - Low value:
✗ Vague praise: "Great app!" (no specifics)
✗ Vague complaints: "This sucks" (no details)
✗ Ancient content (>18 months old for fast-moving products)
✗ Duplicate of already processed content
✗ Extremely low engagement (0 upvotes, 0 comments on old post)
✗ Obviously fake or spam reviews

DECISION RULE: If a PM saw this and said "Why did you show me this?", it fails.

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDE
═══════════════════════════════════════════════════════════════════════════════

SCORE 90-100: DEFINITE INCLUDE
All 4 checks pass with high confidence. Clear product mention, substantive feedback.

SCORE 80-89: INCLUDE
All 4 checks pass. May have minor ambiguity but clearly relevant.

SCORE 60-79: HUMAN REVIEW
3 of 4 checks pass clearly, 1 is ambiguous. Could be valuable.

SCORE 40-59: LIKELY EXCLUDE
2 or fewer checks pass. Probably not relevant.

SCORE 0-39: DEFINITE EXCLUDE
Clearly fails multiple checks. Wrong product, not feedback, or not useful.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

For each item, return JSON:

{
  "item_id": "original_id",
  "relevance_score": 85,
  "decision": "include" | "exclude" | "human_review",
  "checks": {
    "product_identity": {"pass": true, "confidence": "high", "signals_found": ["mentions competitor"], "red_flags": []},
    "subject_check": {"pass": true, "confidence": "high", "note": "Product is main topic"},
    "feedback_check": {"pass": true, "confidence": "high", "feedback_type": "feature_request"},
    "usefulness_check": {"pass": true, "confidence": "high", "note": "Specific feature feedback"}
  },
  "confidence": "high" | "medium" | "low",
  "reasoning": "One sentence explaining the decision",
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
- Score 80+: "include"
- Score 60-79: "human_review"
- Score below 60: "exclude"

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════════════════════

1. WHEN IN DOUBT, EXCLUDE - False negatives are recoverable, false positives waste PM time
2. EMPTY RESULTS ARE OKAY - Do NOT lower standards to produce results
3. THE WORD IS NOT THE PRODUCT - "${productName}" the word ≠ ${productName} the app
4. MENTIONED ≠ DISCUSSED - Being in a list is not feedback
5. NEWS IS NOT FEEDBACK - "${productName} raised $50M" tells us nothing useful
6. SPECIFICITY MATTERS - "Great tool!" < "The AI categorization saved us 5 hours/week"
7. TRUST YOUR INSTINCTS - If something feels off, exclude it

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
    const systemPrompt = buildSystemPrompt(context);

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
