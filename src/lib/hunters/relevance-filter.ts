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
TANGENTIAL MENTION DETECTION (Critical for search-sourced content)
═══════════════════════════════════════════════════════════════════════════════

Search APIs return content where the product name appears ANYWHERE - including 
comments, replies, or passing mentions. You must determine if the product is 
the TOPIC or just MENTIONED.

THE TITLE TEST:
If the product name does NOT appear in the title, be EXTRA SKEPTICAL.
Ask: "Is this post ABOUT ${productName}, or does it just mention it somewhere?"

TANGENTIAL MENTION SIGNALS (score 40 MAX):
✗ Post title is about something else entirely (Kubernetes, AI models, trains, etc.)
✗ Product mentioned once in a long post about a different topic
✗ Product mentioned only in comments/replies, not the main content
✗ Product used as an example: "tools like ${productName}, Trello, etc."
✗ Product mentioned for comparison but isn't being evaluated

EXAMPLES:

Post: "Show HN: Luxury Yacht, a Kubernetes management app"
Content: "...for our docs we use ${productName} but this post is about Kubernetes..."
Decision: EXCLUDE (score: 25)
Reason: Post is about Kubernetes. ${productName} mentioned once tangentially.

Post: "GPT-5.2-Codex advances in coding"  
Content: "...I keep my coding notes in ${productName}..."
Decision: EXCLUDE (score: 20)
Reason: Post is about AI coding. ${productName} is just where someone stores notes.

Post: "I Love Offline Mode, but I Don't Like Automatic Downloads"
Content: "I'm facing an issue with ${productName} and I'd really like to discuss..."
Decision: INCLUDE (score: 85)
Reason: Post IS about ${productName}. ${productName} is the subject being discussed.

RULE: If the title suggests a different topic than ${productName}, 
the item needs OVERWHELMING evidence in the content that it's actually 
about ${productName} to score above 60. Otherwise, max score is 40.

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDE
═══════════════════════════════════════════════════════════════════════════════

SCORE 90-100: DEFINITE INCLUDE
All 4 checks pass with high confidence. Clear product mention, substantive feedback.

SCORE 80-89: INCLUDE
All 4 checks pass. May have minor ambiguity but clearly relevant.

SCORE 70-79: HUMAN REVIEW
3-4 checks pass, product is the topic but feedback may be thin.

SCORE 60-69: HUMAN REVIEW (borderline)
3 of 4 checks pass, but some ambiguity. Worth a quick look.

SCORE 40-59: LIKELY EXCLUDE
2 or fewer checks pass. Probably not relevant. Tangential mentions score here.

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
    const productName = context.name?.toLowerCase() || '';

    // Format items for evaluation with title flag heuristic
    const itemsForEval = items.map((item, index) => {
        const title = item.title || '';
        const titleHasProduct = productName && title.toLowerCase().includes(productName);

        return {
            id: index.toString(),
            platform: item.platform,
            content: item.content.slice(0, 1000), // Truncate long content
            title: title,
            author: item.author_username || 'unknown',
            // Add warning hint when product not in title
            analysis_hint: !titleHasProduct && productName
                ? `⚠️ WARNING: Product name "${context.name}" not found in title. Be extra strict - this may be a tangential mention. Max score 40 unless content clearly proves otherwise.`
                : null
        };
    });

    const userPrompt = `TASK: Score the relevance of these ${items.length} items for "${context.name}"

CRITICAL: Pay close attention to the "analysis_hint" field. If it contains a warning, the product was NOT found in the title, meaning it may only be mentioned tangentially in the content.

ITEMS TO EVALUATE:
${JSON.stringify(itemsForEval, null, 2)}

SCORING THRESHOLDS:
- Score 80+: "include" (product is clearly the main topic with substantive feedback)
- Score 60-79: "human_review" (product is discussed but may need verification)
- Score below 60: "exclude" (tangential mention, wrong product, or not feedback)

REMEMBER: If the title is about a different topic (Kubernetes, AI models, trains, etc.), 
the product is likely just mentioned in passing. Score 40 MAX unless the content 
overwhelmingly proves the item is actually about ${context.name}.

Return a JSON object with an "evaluations" array.`;

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

        const results = items.map((item, index) => {
            const evaluation = evaluations.find((e: any) => e.item_id === index.toString()) || {};
            const titleHasProduct = productName && (item.title || '').toLowerCase().includes(productName);

            const result: RelevanceResult = {
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

            // Debug logging for each item
            console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[RelevanceFilter] ${result.decision.toUpperCase()} (Score: ${result.relevanceScore})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${item.title}
Platform: ${item.platform}
Title contains "${context.name}": ${titleHasProduct ? '✅ YES' : '⚠️ NO'}
Content preview: ${item.content?.slice(0, 150)}...
Reasoning: ${result.reasoning}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            `);

            return result;
        });

        // Summary stats
        const included = results.filter(r => r.decision === 'include').length;
        const excluded = results.filter(r => r.decision === 'exclude').length;
        const review = results.filter(r => r.decision === 'human_review').length;
        const noTitleMatch = items.filter(item =>
            productName && !(item.title || '').toLowerCase().includes(productName)
        ).length;

        console.log(`
📊 [RelevanceFilter] BATCH SUMMARY
──────────────────────────────
Include: ${included}
Exclude: ${excluded}
Human Review: ${review}
Items without "${context.name}" in title: ${noTitleMatch}
        `);

        return results;
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
