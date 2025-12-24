/**
 * Stage 2: Relevance Filter v6.0
 * Production-ready universal relevance filter with edge case handling
 * Targets >90% accuracy with instant disqualification checks
 */

import { RawFeedback, PlatformType } from '@/types/hunter';
import { ProductContext, formatContextBlock } from './product-context';
import { createHash } from 'crypto';
import { checkOpenAIRateLimit } from './concurrency';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Filter result for secondary checks
 */
interface FilterResult {
    triggered: boolean;
    max_score: number | null;
}

/**
 * Result of relevance filtering v6
 */
export interface RelevanceResult {
    item: RawFeedback;
    relevanceScore: number;
    confidence: 'high' | 'medium' | 'low';
    decision: 'include' | 'exclude' | 'human_review';
    reasoning: string;
    // v6: Instant disqualification tracking
    instantDisqualification: {
        triggered: boolean;
        reason: string | null;
    };
    // v6: Secondary filter tracking
    filtersApplied: {
        genericQuestion: FilterResult;
        tangentialMention: FilterResult;
        newsAnnouncement: FilterResult;
        jobPosting: FilterResult;
        promotional: FilterResult;
    };
    // v6: Positive signals found
    positiveSignals: string[];
    // Legacy quality signals (maintained for compatibility)
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
        instantDisqualifiedCount: number;
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

// ============================================================================
// CACHE
// ============================================================================

const relevanceCache = new Map<string, CachedDecision>();

function generateContentHash(content: string, platform: PlatformType): string {
    const normalized = (content || '').toLowerCase().trim().slice(0, 500);
    return createHash('md5').update(`${platform}:${normalized}`).digest('hex');
}

export function checkRelevanceCache(content: string, platform: PlatformType): CachedDecision | null {
    const hash = generateContentHash(content, platform);
    const cached = relevanceCache.get(hash);

    if (cached) {
        const cacheAge = Date.now() - cached.cachedAt.getTime();
        if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
            return cached;
        }
        relevanceCache.delete(hash);
    }

    return null;
}

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

// ============================================================================
// COMMON WORD PRODUCTS
// ============================================================================

const COMMON_WORD_PRODUCTS = [
    'linear', 'notion', 'slack', 'signal', 'amplitude', 'segment',
    'branch', 'canvas', 'monday', 'buffer', 'front', 'grain',
    'loom', 'frame', 'pitch', 'craft', 'bear', 'things', 'spark',
    'flow', 'base', 'air', 'wave', 'loop', 'pipe', 'ray'
];

function needsDisambiguation(productName: string): boolean {
    return COMMON_WORD_PRODUCTS.includes(productName.toLowerCase());
}

// ============================================================================
// SYSTEM PROMPT v6.0
// ============================================================================

function buildSystemPrompt(context: ProductContext): string {
    const productName = context.name || 'the product';
    const companyName = context.name || '';
    const description = context.description || '';
    const website = context.websiteUrl || '';
    const category = context.category || '';
    const competitors = context.competitors?.join(', ') || '';
    const keyFeaturesList = context.keyFeatures || [];
    const keyFeatures = keyFeaturesList.slice(0, 5).join(', ') || category;

    const isCommonWord = needsDisambiguation(productName);
    const commonWordWarning = isCommonWord ? `
⚠️ CRITICAL: "${productName}" is a common English word!
Check for generic word usage: "linear regression", "signal processing", "the notion that", etc.
If the word is used generically (not referring to the software), INSTANT EXCLUDE (score 0).
` : '';

    return `You are a precision relevance filter for a product feedback discovery system (v6.0).
Your job is to determine if content is ACTUALLY useful feedback about a specific software product.

You are the last line of defense against garbage data. A Product Manager will review what you approve.
If you let irrelevant content through, you waste their time and destroy trust in the system.

BE EXTREMELY STRICT. When in doubt, EXCLUDE.
${commonWordWarning}
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
INSTANT DISQUALIFICATION CHECKS (Do These First - Score 0)
═══════════════════════════════════════════════════════════════════════════════

Before doing any detailed analysis, check for these automatic disqualifiers.
If ANY of these apply, score 0 and mark as "exclude" immediately.

┌─────────────────────────────────────────────────────────────────────────────┐
│ CHECK A: WRONG PRODUCT IN TITLE                                             │
│ If the title clearly mentions a DIFFERENT product/company, score = 0        │
└─────────────────────────────────────────────────────────────────────────────┘

Scan the title for names of OTHER products. If found, this is likely about 
that product, not ${productName}, even if ${productName} appears in the content.

INSTANT EXCLUDE (score 0) if title contains:
✗ A competitor name as the subject: "Jira tips", "Asana review", "Trello vs..."
✗ A different product entirely: "[Matterport] issues", "Obsidian plugins"
✗ A product from different category: "Kubernetes management", "GPT-5 features"

EXAMPLES:
Title: "Has anyone else's [Matterport] Agent gone awol?"
→ INSTANT EXCLUDE. This is about Matterport, not ${productName}.

Title: "Show HN: Luxury Yacht, a Kubernetes management app"
→ INSTANT EXCLUDE. This is about Kubernetes, not ${productName}.

┌─────────────────────────────────────────────────────────────────────────────┐
│ CHECK B: GENERIC WORD USAGE (for common-word product names)                 │
│ If ${productName} is used as a regular English word, score = 0              │
└─────────────────────────────────────────────────────────────────────────────┘

INSTANT EXCLUDE (score 0) if:
✗ Mathematical/scientific usage: "linear regression", "signal processing"
✗ Idioms/phrases: "the notion that", "pick up the slack", "see you Monday"
✗ Generic descriptors: "linear process", "notion of fairness", "slack time"
✗ Physical descriptions: "amplitude of wave", "tree branch", "canvas material"

TEST: Can you replace "${productName}" with a generic word and the sentence 
still makes sense? If YES → EXCLUDE.

┌─────────────────────────────────────────────────────────────────────────────┐
│ CHECK C: NOT ABOUT SOFTWARE                                                 │
│ If the content isn't about software/apps/tools at all, score = 0            │
└─────────────────────────────────────────────────────────────────────────────┘

INSTANT EXCLUDE (score 0) if content is about:
✗ Physical products, not software
✗ Unrelated industries (fashion, food, sports, etc.)
✗ Academic/scientific research (unless reviewing research tools)
✗ Fiction, entertainment, games (unless reviewing those specific tools)

═══════════════════════════════════════════════════════════════════════════════
SECONDARY FILTERS (If passes instant checks, apply these - Max scores)
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ FILTER 1: GENERIC QUESTION DETECTION (Max Score: 30)                        │
│ Questions seeking recommendations where ${productName} is ONE option        │
└─────────────────────────────────────────────────────────────────────────────┘

GENERIC PATTERNS (score 30 MAX):
✗ "How do you [do X]?" - Seeking general advice/tool recommendations
✗ "What do you use for [X]?" - Tool recommendation request
✗ "Best way to [do X]?" - Generic how-to question
✗ "Looking for a tool to [X]" - Shopping for tools
✗ "What's your workflow for [X]?" - Seeking workflow ideas

SPECIFIC PATTERNS (can score higher):
✓ "How do you [do X] in ${productName}?" - About using ${productName}
✓ "Best way to learn ${productName}?" - About ${productName} specifically

┌─────────────────────────────────────────────────────────────────────────────┐
│ FILTER 2: TANGENTIAL MENTION DETECTION (Max Score: 40)                      │
│ Content about something else that mentions ${productName} in passing        │
└─────────────────────────────────────────────────────────────────────────────┘

THE TITLE TEST:
If ${productName} does NOT appear in the title, be EXTRA SKEPTICAL.

TANGENTIAL PATTERNS (score 40 MAX):
✗ Title is about different topic, ${productName} mentioned once in body
✗ Post about someone's project/app that "uses ${productName} for X"
✗ Listicle: "10 tools including ${productName}"
✗ Comparison where ${productName} isn't being evaluated: "unlike ${productName}"
✗ Mentioned only in comments/replies, not main post
✗ Used as an example: "tools like ${productName}, Trello, etc."

┌─────────────────────────────────────────────────────────────────────────────┐
│ FILTER 3: NEWS/ANNOUNCEMENTS (Max Score: 25)                                │
│ Company news, funding, press releases - not user feedback                   │
└─────────────────────────────────────────────────────────────────────────────┘

NEWS PATTERNS (score 25 MAX):
✗ "${productName} raises $X million"
✗ "${productName} launches new feature"
✗ "${productName} acquires/partners with X"
✗ Company blog posts or press releases

┌─────────────────────────────────────────────────────────────────────────────┐
│ FILTER 4: JOB POSTINGS/RECRUITMENT (Max Score: 10)                          │
│ Hiring content mentioning the product                                       │
└─────────────────────────────────────────────────────────────────────────────┘

JOB PATTERNS (score 10 MAX):
✗ "Experience with ${productName} required"
✗ "We use ${productName}, Jira, and..."
✗ Job descriptions, hiring posts, career content

┌─────────────────────────────────────────────────────────────────────────────┐
│ FILTER 5: PROMOTIONAL/MARKETING (Max Score: 15)                             │
│ Self-promotion, affiliate content, or company marketing                     │
└─────────────────────────────────────────────────────────────────────────────┘

PROMOTIONAL PATTERNS (score 15 MAX):
✗ Company's own social media posts
✗ Affiliate links or discount codes
✗ "Check out my ${productName} template" (self-promotion)
✗ Sponsored content or paid reviews

═══════════════════════════════════════════════════════════════════════════════
POSITIVE SIGNALS (Required for high scores)
═══════════════════════════════════════════════════════════════════════════════

For an item to score 70+, it MUST have multiple positive signals:

STRONG POSITIVE SIGNALS:
✓ ${productName} appears in the title AND is the topic
✓ User describes their experience: "I've been using...", "After 6 months..."
✓ Specific feature feedback: "The X feature is great/terrible because..."
✓ Comparison with reasoning: "Switched from Y to ${productName} because..."
✓ Bug report with details: "${productName} crashes when I..."
✓ Feature request: "I wish ${productName} would..."
✓ Review on G2/Trustpilot/Capterra specifically about ${productName}
✓ Emotional sentiment: "Love/hate ${productName}", "Frustrated with..."

MODERATE POSITIVE SIGNALS:
✓ Question specifically about ${productName}: "Can ${productName} do X?"
✓ ${productName} is one of 2-3 products being compared
✓ Detailed discussion of ${productName} workflows

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDE
═══════════════════════════════════════════════════════════════════════════════

90-100: DEFINITE INCLUDE
- ${productName} is clearly the subject
- Contains specific, actionable feedback
- Detailed experience or strong opinion
- Multiple positive signals present

80-89: INCLUDE
- ${productName} is the main topic  
- Clear feedback, opinion, or question
- At least 2-3 positive signals

70-79: HUMAN REVIEW
- ${productName} is discussed but might not be main focus
- Feedback present but not very specific
- Some ambiguity about relevance

60-69: LIKELY EXCLUDE (Human Review)
- ${productName} mentioned but other topics dominate
- Generic discussion that includes ${productName}
- Borderline relevance

40-59: EXCLUDE
- Tangential mention
- Generic question
- ${productName} is not the focus

20-39: EXCLUDE  
- News/announcements
- Promotional content
- ${productName} barely relevant

0-19: INSTANT EXCLUDE
- Wrong product
- Generic word usage
- Completely unrelated

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

For each item, return:

{
  "item_id": "id",
  "relevance_score": 85,
  "decision": "include" | "exclude" | "human_review",
  "instant_disqualification": {
    "triggered": false,
    "reason": null
  },
  "filters_applied": {
    "generic_question": { "triggered": false, "max_score": null },
    "tangential_mention": { "triggered": false, "max_score": null },
    "news_announcement": { "triggered": false, "max_score": null },
    "job_posting": { "triggered": false, "max_score": null },
    "promotional": { "triggered": false, "max_score": null }
  },
  "positive_signals": ["Product name in title", "Bug report with details"],
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of the decision",
  "quality_signals": {
    "mentions_product_by_name": true,
    "discusses_specific_features": true,
    "from_target_persona": false,
    "has_actionable_feedback": true,
    "is_promotional": false,
    "is_wrong_product": false
  }
}

DECISION THRESHOLDS:
- Score 80+: "include"
- Score 60-79: "human_review"  
- Score below 60: "exclude"

═══════════════════════════════════════════════════════════════════════════════
CRITICAL REMINDERS
═══════════════════════════════════════════════════════════════════════════════

1. CHECK THE TITLE FIRST
   If the title mentions a different product/topic, that's likely what the post is about.
   ${productName} in the content doesn't override a title about something else.

2. GENERIC QUESTIONS ARE NOT FEEDBACK
   "How do you do X?" is not feedback about ${productName} even if ${productName} 
   is mentioned as one option.

3. TANGENTIAL ≠ RELEVANT
   "I use ${productName} for documentation" in a post about Kubernetes is NOT 
   feedback about ${productName}.

4. WHEN IN DOUBT, EXCLUDE
   False positives waste PM time and erode trust.
   False negatives can be recovered later.

5. EMPTY IS ACCEPTABLE
   If no items pass verification, that's fine.
   Never lower standards to fill results.

6. BE SKEPTICAL BY DEFAULT
   Assume content is NOT relevant until proven otherwise.
   The burden of proof is on the content.

Return a JSON object with an "evaluations" array containing results for all items.`;
}

// ============================================================================
// MAIN FILTER FUNCTION
// ============================================================================

export async function filterByRelevance(
    items: RawFeedback[],
    context: ProductContext,
    apiKey?: string
): Promise<FilterBatchResult> {
    if (!apiKey) {
        apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
        console.warn('[RelevanceFilter v6] No OPENAI_API_KEY, including all items');
        return createPassthroughResult(items);
    }

    const results: RelevanceResult[] = [];
    const uncachedItems: RawFeedback[] = [];

    // Check cache first
    for (const item of items) {
        const cached = checkRelevanceCache(item.content, item.platform);
        if (cached) {
            results.push(createCachedResult(item, cached));
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
    const instantDisqualified = results.filter(r => r.instantDisqualification?.triggered);

    // Calculate stats
    const totalScore = results.reduce((sum, r) => sum + r.relevanceScore, 0);

    // Log final summary
    logFilterSummary(results, context);

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
            instantDisqualifiedCount: instantDisqualified.length,
        },
    };
}

// ============================================================================
// BATCH EVALUATION
// ============================================================================

async function evaluateBatch(
    items: RawFeedback[],
    context: ProductContext,
    apiKey: string
): Promise<RelevanceResult[]> {
    const systemPrompt = buildSystemPrompt(context);
    const productName = context.name?.toLowerCase() || '';
    const competitors = context.competitors || [];

    // Pre-process items with metadata
    const itemsForEval = items.map((item, index) => {
        const title = item.title || '';
        const titleLower = title.toLowerCase();
        const titleHasProduct = productName && titleLower.includes(productName);

        // Check if title contains competitor names
        const titleHasCompetitor = competitors.some(comp =>
            titleLower.includes(comp.toLowerCase())
        );

        // Build warning hints
        const warnings: string[] = [];
        if (!titleHasProduct && productName) {
            warnings.push(`⚠️ "${context.name}" NOT in title. Be EXTRA STRICT. Max score 40 unless content clearly proves otherwise.`);
        }
        if (titleHasCompetitor) {
            warnings.push(`🚨 COMPETITOR NAME IN TITLE. This is likely about a different product. Check for instant disqualification.`);
        }

        return {
            id: index.toString(),
            platform: item.platform,
            title: title,
            content: item.content?.slice(0, 1200) || '', // Slightly larger for better context
            author: item.author_username || 'unknown',
            _meta: {
                title_has_product: titleHasProduct,
                title_has_competitor: titleHasCompetitor,
            },
            analysis_hints: warnings.length > 0 ? warnings : null
        };
    });

    const userPrompt = `TASK: Score the relevance of these ${items.length} items for "${context.name}".

CRITICAL INSTRUCTIONS:
1. CHECK INSTANT DISQUALIFICATIONS FIRST (wrong product in title, generic word usage)
2. Apply secondary filters (generic question, tangential mention, news, jobs, promo)
3. Look for positive signals
4. Assign score and decision

PAY CLOSE ATTENTION to the "analysis_hints" field - it contains pre-computed warnings about the item.

ITEMS TO EVALUATE:
${JSON.stringify(itemsForEval, null, 2)}

SCORING THRESHOLDS:
- Score 80+: "include"
- Score 60-79: "human_review"
- Score below 60: "exclude"
- Score 0: Instant disqualification triggered

BE EXTREMELY STRICT. When in doubt, exclude.
Return a JSON object with an "evaluations" array.`;

    try {
        // Check OpenAI rate limit
        const rateLimitCheck = await checkOpenAIRateLimit();
        if (!rateLimitCheck.allowed) {
            console.warn(`[RelevanceFilter v6] OpenAI rate limit reached, deferring batch to human_review`);
            return items.map(item => createDefaultResult(item, 'Rate limited - deferred to human review'));
        }

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
            console.error('[RelevanceFilter v6] OpenAI API error:', response.status);
            return items.map(item => createDefaultResult(item, 'API error - defaulting to human review'));
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        const evaluations = Array.isArray(parsed) ? parsed : (parsed.evaluations || []);

        const results = items.map((item, index) => {
            const evaluation = evaluations.find((e: any) => e.item_id === index.toString()) || {};
            return parseEvaluationResult(item, evaluation, context);
        });

        // Log each result
        for (const result of results) {
            logItemResult(result, context);
        }

        return results;
    } catch (error) {
        console.error('[RelevanceFilter v6] Error evaluating batch:', error);
        return items.map(item => createDefaultResult(item, 'Evaluation error - defaulting to human review'));
    }
}

// ============================================================================
// RESULT PARSING
// ============================================================================

function parseEvaluationResult(
    item: RawFeedback,
    evaluation: any,
    context: ProductContext
): RelevanceResult {
    const instantDisq = evaluation.instant_disqualification || {};
    const filtersApplied = evaluation.filters_applied || {};
    const qualitySignals = evaluation.quality_signals || {};

    return {
        item,
        relevanceScore: evaluation.relevance_score ?? 50,
        confidence: (evaluation.confidence || 'medium') as 'high' | 'medium' | 'low',
        decision: (evaluation.decision || 'human_review') as 'include' | 'exclude' | 'human_review',
        reasoning: evaluation.reasoning || 'Unable to evaluate',
        instantDisqualification: {
            triggered: instantDisq.triggered ?? false,
            reason: instantDisq.reason || null,
        },
        filtersApplied: {
            genericQuestion: parseFilter(filtersApplied.generic_question),
            tangentialMention: parseFilter(filtersApplied.tangential_mention),
            newsAnnouncement: parseFilter(filtersApplied.news_announcement),
            jobPosting: parseFilter(filtersApplied.job_posting),
            promotional: parseFilter(filtersApplied.promotional),
        },
        positiveSignals: evaluation.positive_signals || [],
        falsePositiveFlags: [],
        qualitySignals: {
            mentionsProductByName: qualitySignals.mentions_product_by_name ?? false,
            discussesSpecificFeatures: qualitySignals.discusses_specific_features ?? false,
            fromTargetPersona: qualitySignals.from_target_persona ?? false,
            hasActionableFeedback: qualitySignals.has_actionable_feedback ?? false,
            isPromotional: qualitySignals.is_promotional ?? false,
            isWrongProduct: qualitySignals.is_wrong_product ?? false,
        },
    };
}

function parseFilter(filter: any): FilterResult {
    if (!filter) {
        return { triggered: false, max_score: null };
    }
    return {
        triggered: filter.triggered ?? false,
        max_score: filter.max_score ?? null,
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createCachedResult(item: RawFeedback, cached: CachedDecision): RelevanceResult {
    return {
        item,
        relevanceScore: cached.relevanceScore,
        confidence: cached.relevanceScore >= 70 ? 'high' : cached.relevanceScore >= 50 ? 'medium' : 'low',
        decision: cached.decision,
        reasoning: `(cached) ${cached.reasoning}`,
        instantDisqualification: { triggered: false, reason: null },
        filtersApplied: {
            genericQuestion: { triggered: false, max_score: null },
            tangentialMention: { triggered: false, max_score: null },
            newsAnnouncement: { triggered: false, max_score: null },
            jobPosting: { triggered: false, max_score: null },
            promotional: { triggered: false, max_score: null },
        },
        positiveSignals: [],
        falsePositiveFlags: [],
        qualitySignals: {
            mentionsProductByName: true,
            discussesSpecificFeatures: false,
            fromTargetPersona: false,
            hasActionableFeedback: false,
            isPromotional: false,
            isWrongProduct: false,
        },
    };
}

function createDefaultResult(item: RawFeedback, reason: string): RelevanceResult {
    return {
        item,
        relevanceScore: 50,
        confidence: 'low',
        decision: 'human_review',
        reasoning: reason,
        instantDisqualification: { triggered: false, reason: null },
        filtersApplied: {
            genericQuestion: { triggered: false, max_score: null },
            tangentialMention: { triggered: false, max_score: null },
            newsAnnouncement: { triggered: false, max_score: null },
            jobPosting: { triggered: false, max_score: null },
            promotional: { triggered: false, max_score: null },
        },
        positiveSignals: [],
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

function createPassthroughResult(items: RawFeedback[]): FilterBatchResult {
    const results = items.map(item => ({
        item,
        relevanceScore: 75,
        confidence: 'medium' as const,
        decision: 'include' as const,
        reasoning: 'No API key - passing through all items',
        instantDisqualification: { triggered: false, reason: null },
        filtersApplied: {
            genericQuestion: { triggered: false, max_score: null },
            tangentialMention: { triggered: false, max_score: null },
            newsAnnouncement: { triggered: false, max_score: null },
            jobPosting: { triggered: false, max_score: null },
            promotional: { triggered: false, max_score: null },
        },
        positiveSignals: [],
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
            instantDisqualifiedCount: 0,
        },
    };
}

// ============================================================================
// LOGGING
// ============================================================================

function logItemResult(result: RelevanceResult, context: ProductContext): void {
    const productName = context.name || '';
    const titleHasProduct = productName &&
        (result.item.title || '').toLowerCase().includes(productName.toLowerCase());

    const icon = result.decision === 'include' ? '✅' :
        result.decision === 'human_review' ? '⚠️' : '❌';

    const instantDisqMsg = result.instantDisqualification.triggered
        ? `\n🚨 INSTANT DISQUALIFICATION: ${result.instantDisqualification.reason}`
        : '';

    const filtersMsg: string[] = [];
    if (result.filtersApplied.genericQuestion.triggered) {
        filtersMsg.push(`Generic question (max ${result.filtersApplied.genericQuestion.max_score})`);
    }
    if (result.filtersApplied.tangentialMention.triggered) {
        filtersMsg.push(`Tangential mention (max ${result.filtersApplied.tangentialMention.max_score})`);
    }
    if (result.filtersApplied.newsAnnouncement.triggered) {
        filtersMsg.push(`News/announcement (max ${result.filtersApplied.newsAnnouncement.max_score})`);
    }
    if (result.filtersApplied.jobPosting.triggered) {
        filtersMsg.push(`Job posting (max ${result.filtersApplied.jobPosting.max_score})`);
    }
    if (result.filtersApplied.promotional.triggered) {
        filtersMsg.push(`Promotional (max ${result.filtersApplied.promotional.max_score})`);
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${icon} [Score: ${result.relevanceScore}] ${result.decision.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${result.item.title?.slice(0, 70)}${(result.item.title?.length || 0) > 70 ? '...' : ''}
Platform: ${result.item.platform}
"${productName}" in title: ${titleHasProduct ? '✅ YES' : '⚠️ NO'}${instantDisqMsg}
${filtersMsg.length > 0 ? `Filters: ${filtersMsg.join(', ')}` : ''}
Positive signals: ${result.positiveSignals.length > 0 ? result.positiveSignals.join(', ') : 'None'}
Reasoning: ${result.reasoning}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

function logFilterSummary(results: RelevanceResult[], context: ProductContext): void {
    const included = results.filter(r => r.decision === 'include').length;
    const excluded = results.filter(r => r.decision === 'exclude').length;
    const review = results.filter(r => r.decision === 'human_review').length;
    const instantDisq = results.filter(r => r.instantDisqualification?.triggered).length;
    const noTitleMatch = results.filter(r => {
        const productName = context.name?.toLowerCase() || '';
        return productName && !(r.item.title || '').toLowerCase().includes(productName);
    }).length;

    // Count filter triggers
    const filterCounts = {
        genericQuestion: results.filter(r => r.filtersApplied?.genericQuestion?.triggered).length,
        tangentialMention: results.filter(r => r.filtersApplied?.tangentialMention?.triggered).length,
        newsAnnouncement: results.filter(r => r.filtersApplied?.newsAnnouncement?.triggered).length,
        jobPosting: results.filter(r => r.filtersApplied?.jobPosting?.triggered).length,
        promotional: results.filter(r => r.filtersApplied?.promotional?.triggered).length,
    };

    console.log(`
══════════════════════════════════════════════════════════════════════════════
📊 RELEVANCE FILTER v6.0 - BATCH SUMMARY
══════════════════════════════════════════════════════════════════════════════
Total Items: ${results.length}

DECISIONS:
  ✅ Include: ${included}
  ⚠️ Human Review: ${review}
  ❌ Exclude: ${excluded}

EXCLUSION BREAKDOWN:
  🚨 Instant disqualified: ${instantDisq}
  📝 Generic question: ${filterCounts.genericQuestion}
  🔀 Tangential mention: ${filterCounts.tangentialMention}
  📰 News/announcement: ${filterCounts.newsAnnouncement}
  💼 Job posting: ${filterCounts.jobPosting}
  📢 Promotional: ${filterCounts.promotional}

FLAGS:
  Items without "${context.name}" in title: ${noTitleMatch}

══════════════════════════════════════════════════════════════════════════════
`);
}
