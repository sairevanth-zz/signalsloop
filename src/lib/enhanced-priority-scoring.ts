/**
 * Advanced Priority Scoring System
 * Multi-factor analysis for intelligent prioritization
 * Updated: 2025-01-06 - Enforced bug minimums
 */

import OpenAI from 'openai';
import { withCache } from './ai-cache-manager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODELS = {
  PRIORITY_SCORING: process.env.PRIORITY_MODEL || 'gpt-4o-mini',
};

const BUG_PATTERNS = [
  /bug/i,
  /error/i,
  /broken/i,
  /not\s+work/i,
  /doesn['’]?t\s+work/i,
  /doesn['’]?t\s+open/i,
  /won['’]?t\s+open/i,
  /fail(?:ed|s)?\s+to/i,
  /unable\s+to/i,
  /cannot/i,
  /can't/i,
  /won't/i,
  /stuck/i,
  /block(?:er|ed)?/i,
  /crash/i,
  /glitch/i,
  /freeze/i,
  /unresponsive/i,
  /partial(?:ly)?\s+open/i,
  /modal\s+(?:is\s+)?(?:not|never|won['’]?t|doesn['’]?t)\s+open/i,
  /loading\s+forever/i
];

const FRUSTRATION_PATTERNS = [
  /frustrat/i,
  /annoy/i,
  /difficult/i,
  /pain/i,
  /disrupt/i,
  /block/i,
  /urgent/i,
  /asap/i,
  /critical/i,
  /can't/i,
  /cannot/i,
  /unable/i,
  /stuck/i
];

export interface PriorityContext {
  post: {
    id: string;
    title: string;
    description: string;
    category?: string;
    createdAt: Date;
  };
  metrics: {
    voteCount: number;
    commentCount: number;
    uniqueVoters: number;
    percentageOfActiveUsers: number;
    similarPostsCount: number;
  };
  user: {
    tier: 'free' | 'pro' | 'enterprise';
    companySize?: number;
    mrr?: number;
    isChampion?: boolean; // Power user who promotes your product
  };
  businessContext?: {
    currentQuarter: string;
    companyStrategy: 'growth' | 'retention' | 'enterprise' | 'profitability';
    competitorFeatures?: string[];
    upcomingMilestone?: string; // e.g., "Series B", "Enterprise Launch"
  };
}

export interface PriorityScore {
  scores: {
    revenueImpact: number;      // 0-10
    userReach: number;           // 0-10
    strategicAlignment: number;  // 0-10
    implementationEffort: number; // 0-10 (inverted: easy=10, hard=0)
    competitiveAdvantage: number;// 0-10
    riskMitigation: number;      // 0-10
    userSatisfaction: number;    // 0-10
  };
  weightedScore: number;         // 0-10
  priorityLevel: 'immediate' | 'current-quarter' | 'next-quarter' | 'backlog' | 'declined';
  quarterRecommendation: string;
  businessJustification: string;
  suggestedAction: 'implement' | 'investigate' | 'prototype' | 'combine' | 'defer' | 'decline';
  estimatedDays?: number;
  dependencies?: string[];
  relatedPosts?: string[];
}

// Strategy-based weight profiles
const WEIGHT_PROFILES = {
  growth: {
    revenueImpact: 0.20,
    userReach: 0.25,
    strategicAlignment: 0.10,
    implementationEffort: 0.10,
    competitiveAdvantage: 0.20,
    riskMitigation: 0.05,
    userSatisfaction: 0.10
  },
  retention: {
    revenueImpact: 0.15,
    userReach: 0.15,
    strategicAlignment: 0.10,
    implementationEffort: 0.10,
    competitiveAdvantage: 0.10,
    riskMitigation: 0.15,
    userSatisfaction: 0.25
  },
  enterprise: {
    revenueImpact: 0.25,
    userReach: 0.10,
    strategicAlignment: 0.15,
    implementationEffort: 0.05,
    competitiveAdvantage: 0.15,
    riskMitigation: 0.20,
    userSatisfaction: 0.10
  },
  profitability: {
    revenueImpact: 0.30,
    userReach: 0.10,
    strategicAlignment: 0.15,
    implementationEffort: 0.20, // Higher weight on easy wins
    competitiveAdvantage: 0.10,
    riskMitigation: 0.10,
    userSatisfaction: 0.05
  }
};

async function calculatePriorityScoreInternal(
  context: PriorityContext
): Promise<PriorityScore> {
  const { post, metrics, user, businessContext } = context;

  const normalizedTitle = post.title.toLowerCase();
  const normalizedDescription = (post.description || '').toLowerCase();
  const combinedText = `${normalizedTitle} ${normalizedDescription}`;
  const bugPatternMatch = BUG_PATTERNS.some(pattern => pattern.test(post.title) || pattern.test(post.description || ''));
  const issueDetected = combinedText.includes('issue') || combinedText.includes('problem');
  const severitySignal = /(broken|error|fail|failed|failing|cannot|can't|cant|won't|wont|doesn't|doesnt|stuck|block|blocked|blocking|modal|button|open|load|loading|crash|bug|urgent|critical|prevent|unable)/.test(combinedText);
  const isBugReport = post.category === 'bug' || bugPatternMatch || (issueDetected && severitySignal);
  const frustrationDetected = FRUSTRATION_PATTERNS.some(pattern => pattern.test(post.title) || pattern.test(post.description || ''));

  // Build comprehensive analysis prompt
  const systemPrompt = `You are a senior product strategist with expertise in SaaS prioritization and revenue optimization. Analyze feedback with a strong focus on business impact.

Company Context:
- Strategy: ${businessContext?.companyStrategy || 'growth'}
- Current Quarter: ${businessContext?.currentQuarter || 'Q1'}
- Upcoming Milestone: ${businessContext?.upcomingMilestone || 'none'}

CRITICAL SCORING PRINCIPLES:

1. Revenue Impact (0-10):
   - BUGS THAT BLOCK WORKFLOW = 8-10 (prevent user from doing their job → immediate churn risk)
   - BUGS WITH WORKAROUNDS = 5-7 (friction → slow churn risk)
   - Missing features = 3-6 (expansion opportunity)
   - Nice-to-haves = 0-3
   - Pro/Enterprise bugs = automatic +2 bonus (higher ARPU at risk)

2. User Reach (0-10):
   - Based on ${metrics.percentageOfActiveUsers.toFixed(1)}% of active users affected
   - 0-5% = score 1-3
   - 5-15% = score 4-6
   - 15-30% = score 7-8
   - 30%+ = score 9-10

3. Strategic Alignment (0-10):
   - ${businessContext?.companyStrategy === 'retention' ? 'RETENTION STRATEGY: Prioritize bugs and UX improvements (score 7-10)' : ''}
   - ${businessContext?.companyStrategy === 'growth' ? 'GROWTH STRATEGY: Prioritize viral features and onboarding (score 7-10)' : ''}
   - ${businessContext?.companyStrategy === 'enterprise' ? 'ENTERPRISE STRATEGY: Prioritize scale, security, integrations (score 7-10)' : ''}

4. Implementation Effort (0-10): INVERTED SCALE
   - 10 = 1-2 days (CSS fix, config change)
   - 8 = 3-5 days (small feature, simple bug)
   - 6 = 1-2 weeks (medium feature)
   - 4 = 3-4 weeks (complex feature)
   - 2 = 1-2 months (major refactor)
   - 0 = 3+ months (architectural change)

5. Competitive Advantage (0-10):
   - Table stakes feature = 6-8
   - Unique differentiation = 8-10
   - Me-too feature = 2-4

6. Risk Mitigation (0-10):
   - Security/data loss bugs = 9-10
   - Compliance issues = 8-10
   - Workflow blockers = 7-9
   - Minor bugs = 2-4

7. User Satisfaction (0-10):
   - Eliminates major frustration = 8-10
   - Fixes annoyance = 5-7
   - Small improvement = 2-4

Context Signals:
- ${metrics.voteCount} votes from ${metrics.uniqueVoters} unique users
- ${metrics.percentageOfActiveUsers.toFixed(1)}% of active user base affected
- ${metrics.commentCount} comments (${metrics.commentCount > 5 ? 'HIGH engagement - users are vocal about this' : 'moderate engagement'})
- ${metrics.similarPostsCount} similar posts found (${metrics.similarPostsCount > 3 ? 'TRENDING NEED - multiple users reporting' : 'isolated request'})
- User tier: ${user.tier} (${user.tier === 'pro' || user.tier === 'enterprise' ? 'PAYING CUSTOMER - prioritize to prevent churn' : 'free user'})

Return comprehensive JSON analysis only, no markdown or extra text.`;

  console.log('[BUG DETECTION]', {
    title: post.title,
    category: post.category,
    isBugReport,
    userTier: user.tier,
    hasIssueInTitle: normalizedTitle.includes('issue'),
    bugPatternMatch,
    issueDetected,
    severitySignal,
    frustrationDetected
  });

  const userPrompt = `Analyze this feedback for prioritization:

**Title:** "${post.title}"
**Description:** "${post.description}"
**Category:** ${post.category || 'uncategorized'} ${isBugReport && !post.category ? '(DETECTED AS BUG REPORT from content)' : ''}

**User Context:**
- Tier: ${user.tier} ${user.tier === 'pro' || user.tier === 'enterprise' ? '← PAYING CUSTOMER' : ''}
- Company Size: ${user.companySize || 'unknown'}
- MRR Contribution: $${user.mrr || 0}
- Power User: ${user.isChampion ? 'Yes - frequent voter' : 'No'}

**Engagement Metrics:**
- ${metrics.voteCount} total votes from ${metrics.uniqueVoters} unique users
- ${metrics.commentCount} comments ${metrics.commentCount > 3 ? '← High engagement!' : ''}
- Affecting ${metrics.percentageOfActiveUsers.toFixed(1)}% of active users ${metrics.percentageOfActiveUsers > 10 ? '← Significant reach!' : ''}
- ${metrics.similarPostsCount} similar posts ${metrics.similarPostsCount > 2 ? '← Multiple users reporting this!' : ''}

**Analysis Instructions:**
${isBugReport ? `
🚨 THIS IS A BUG REPORT ${post.category === 'bug' ? '(explicit)' : '(detected from content)'}
MANDATORY MINIMUM SCORES FOR BUGS:
- revenueImpact: MINIMUM 7 (bugs cause churn, ${user.tier} tier = ${user.tier === 'pro' || user.tier === 'enterprise' ? 'MINIMUM 8' : '7'})
- riskMitigation: MINIMUM 7 (all bugs are risks)
- userSatisfaction: MINIMUM 7 (bugs frustrate users)
- If description mentions "frustrat", "difficult", "disrupt": revenueImpact = 9-10
` : ''}

${frustrationDetected ? `
⚠️ USER FRUSTRATION DETECTED
- Description mentions frustration/difficulty/disruption
- This indicates significant UX friction
- userSatisfaction score should be 8-10 (high impact on satisfaction)
- revenueImpact should factor in churn risk from frustration
` : ''}

Provide scoring as JSON with this exact structure.
${isBugReport && (user.tier === 'pro' || user.tier === 'enterprise') ? `
CRITICAL: This is a ${user.tier.toUpperCase()} USER BUG - DO NOT score below these minimums:
- revenueImpact >= 8 (PAYING CUSTOMER BUG = HIGH CHURN RISK)
- riskMitigation >= 7
- userSatisfaction >= 7
` : ''}
{
  "scores": {
    "revenueImpact": <0-10>,
    "userReach": <0-10>,
    "strategicAlignment": <0-10>,
    "implementationEffort": <0-10>,
    "competitiveAdvantage": <0-10>,
    "riskMitigation": <0-10>,
    "userSatisfaction": <0-10>
  },
  "estimatedDays": <number or null>,
  "dependencies": [<list of technical dependencies>],
  "businessJustification": "<1-2 sentence business case>",
  "suggestedAction": "implement|investigate|prototype|combine|defer|decline",
  "relatedPosts": []
}`;

  try {
    // Log the data being analyzed for debugging
    console.log('[PRIORITY SCORING] Analyzing:', {
      title: post.title,
      category: post.category,
      metrics: metrics,
      userTier: user.tier,
      strategy: businessContext?.companyStrategy
    });

    const response = await openai.chat.completions.create({
      model: MODELS.PRIORITY_SCORING,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Lower temperature for more consistent results
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    const aiResponse = JSON.parse(content);

    // ENFORCE mandatory minimums for bugs (AI sometimes ignores instructions)
    if (isBugReport) {
      const minRevenue = (user.tier === 'pro' || user.tier === 'enterprise') ? 8 : 7;
      aiResponse.scores.revenueImpact = Math.max(aiResponse.scores.revenueImpact, minRevenue);
      aiResponse.scores.riskMitigation = Math.max(aiResponse.scores.riskMitigation, 7);
      aiResponse.scores.userSatisfaction = Math.max(aiResponse.scores.userSatisfaction, 7);

      console.log('[PRIORITY SCORING] Enforced bug minimums:', aiResponse.scores);
    }

    // Calculate weighted score based on strategy
    const strategy = businessContext?.companyStrategy || 'growth';
    const weights = WEIGHT_PROFILES[strategy];

    let weightedScore = 0;
    for (const [factor, score] of Object.entries(aiResponse.scores)) {
      weightedScore += score * weights[factor as keyof typeof weights];
    }

    // Apply user tier multiplier
    const tierMultiplier = user.tier === 'enterprise' ? 1.3 : user.tier === 'pro' ? 1.1 : 1.0;
    weightedScore = Math.min(10, weightedScore * tierMultiplier);

    let highImpactBug = false;

    if (isBugReport) {
      const signals = {
        tier: user.tier === 'enterprise' ? 0.9 : user.tier === 'pro' ? 0.65 : 0.4,
        votes: metrics.voteCount >= 10 ? 0.5 : metrics.voteCount >= 3 ? 0.3 : metrics.voteCount > 0 ? 0.15 : 0,
        comments: metrics.commentCount >= 3 ? 0.25 : metrics.commentCount >= 1 ? 0.1 : 0,
        reach: metrics.percentageOfActiveUsers >= 25 ? 0.5 : metrics.percentageOfActiveUsers >= 10 ? 0.3 : metrics.percentageOfActiveUsers >= 5 ? 0.2 : 0,
        similar: metrics.similarPostsCount >= 3 ? 0.2 : metrics.similarPostsCount >= 1 ? 0.1 : 0,
        frustration: frustrationDetected ? 0.35 : 0,
        risk: aiResponse.scores.riskMitigation >= 8 ? 0.2 : 0
      };

      const bugBoost = Object.values(signals).reduce((total, value) => total + value, 0);

      if (bugBoost > 0) {
        const beforeBoost = weightedScore;
        weightedScore = Math.min(10, weightedScore + bugBoost);
        console.log('[PRIORITY SCORING] Bug boost applied', {
          beforeBoost,
          bugBoost,
          afterBoost: weightedScore,
          signals
        });
      }

      const highImpactSignals = (user.tier === 'pro' || user.tier === 'enterprise') ||
        metrics.percentageOfActiveUsers >= 5 ||
        metrics.voteCount >= 3 ||
        metrics.commentCount >= 2 ||
        frustrationDetected ||
        aiResponse.scores.riskMitigation >= 8;

      highImpactBug = highImpactSignals;

      const bugFloor = highImpactSignals
        ? (user.tier === 'enterprise' ? 9 : user.tier === 'pro' ? 8.6 : 7.5)
        : (user.tier === 'enterprise' ? 8.4 : user.tier === 'pro' ? 7.8 : 7);

      if (weightedScore < bugFloor) {
        console.log('[PRIORITY SCORING] Bug floor enforced', {
          previous: weightedScore,
          bugFloor
        });
        weightedScore = bugFloor;
      }
    }

    // Determine priority level and quarter recommendation
    let priorityLevel = getPriorityLevel(weightedScore, aiResponse.scores.riskMitigation);

    if (isBugReport) {
      if (highImpactBug) {
        priorityLevel = 'immediate';
      } else if (priorityLevel === 'next-quarter') {
        priorityLevel = 'current-quarter';
      }
    }
    const quarterRecommendation = getQuarterRecommendation(
      priorityLevel,
      businessContext?.currentQuarter || 'Q1'
    );

    const result = {
      scores: aiResponse.scores,
      weightedScore: Math.round(weightedScore * 10) / 10,
      priorityLevel,
      quarterRecommendation,
      businessJustification: aiResponse.businessJustification,
      suggestedAction: aiResponse.suggestedAction,
      estimatedDays: aiResponse.estimatedDays,
      dependencies: aiResponse.dependencies || [],
      relatedPosts: aiResponse.relatedPosts || []
    };

    console.log('[PRIORITY SCORING] Result:', {
      title: post.title,
      priorityLevel,
      weightedScore: result.weightedScore,
      scores: aiResponse.scores
    });

    return result;

  } catch (error) {
    console.error('Priority scoring error:', error);
    return getFallbackPriorityScore(context);
  }
}

function getPriorityLevel(
  score: number,
  riskScore: number
): PriorityScore['priorityLevel'] {
  // Override for critical risk items
  if (riskScore >= 9) return 'immediate';

  if (score >= 8.5) return 'immediate';
  if (score >= 7.0) return 'current-quarter';
  if (score >= 5.0) return 'next-quarter';
  if (score >= 3.0) return 'backlog';
  return 'declined';
}

function getQuarterRecommendation(
  level: PriorityScore['priorityLevel'],
  currentQuarter: string
): string {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const currentIndex = quarters.indexOf(currentQuarter);

  switch (level) {
    case 'immediate':
      return 'This Sprint';
    case 'current-quarter':
      return currentQuarter;
    case 'next-quarter':
      return quarters[(currentIndex + 1) % 4];
    case 'backlog':
      return 'Future';
    default:
      return 'Not Planned';
  }
}

function getFallbackPriorityScore(context: PriorityContext): PriorityScore {
  // Simple heuristic-based scoring when AI fails
  const { metrics, user } = context;

  const voteScore = Math.min(10, metrics.voteCount / 10);
  const userScore = user.tier === 'enterprise' ? 8 : user.tier === 'pro' ? 5 : 3;
  const engagementScore = Math.min(10, metrics.commentCount / 5);

  const avgScore = (voteScore + userScore + engagementScore) / 3;

  return {
    scores: {
      revenueImpact: userScore,
      userReach: voteScore,
      strategicAlignment: 5,
      implementationEffort: 5,
      competitiveAdvantage: 5,
      riskMitigation: 3,
      userSatisfaction: engagementScore
    },
    weightedScore: Math.round(avgScore * 10) / 10,
    priorityLevel: avgScore >= 7 ? 'current-quarter' : avgScore >= 4 ? 'next-quarter' : 'backlog',
    quarterRecommendation: 'Q2',
    businessJustification: 'Prioritized based on user engagement and tier',
    suggestedAction: avgScore >= 7 ? 'implement' : 'investigate',
    estimatedDays: undefined,
    dependencies: [],
    relatedPosts: []
  };
}

// Export WITHOUT caching to ensure fresh calculations
// TODO: Re-enable caching after confirming scoring works correctly
export const calculatePriorityScore = calculatePriorityScoreInternal;

// Batch scoring for dashboard views
export async function batchScorePosts(
  posts: PriorityContext[]
): Promise<Map<string, PriorityScore>> {
  const results = new Map<string, PriorityScore>();

  // Process in parallel with concurrency limit
  const batchSize = 5;
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const scores = await Promise.all(
      batch.map(post => calculatePriorityScore(post))
    );

    batch.forEach((post, index) => {
      results.set(post.post.id, scores[index]);
    });
  }

  return results;
}
