/**
 * Advanced Priority Scoring System
 * Multi-factor analysis for intelligent prioritization
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
  /not working/i,
  /doesn['’]?t work/i,
  /doesn['’]?t open/i,
  /won['’]?t open/i,
  /fail/i,
  /unable/i,
  /cannot/i,
  /can't/i,
  /crash/i,
  /block/i,
  /stuck/i,
  /freeze/i,
  /glitch/i
];

const CRITICAL_BUG_COMBINATIONS: string[][] = [
  ['modal', 'open'],
  ['modal', 'partial'],
  ['modal', 'only'],
  ['modal', 'blocked'],
  ['cannot', 'open'],
  ['cannot', 'access'],
  ['unable', 'access'],
  ['unable', 'open'],
  ['can\'t', 'open'],
  ['can\'t', 'access'],
  ['only', 'partially'],
  ['white', 'screen'],
  ['blank', 'screen'],
  ['login', 'fails'],
  ['login', 'error'],
  ['payment', 'fails'],
  ['data', 'loss'],
  ['workflow', 'blocked'],
  ['blocker']
];

const TEST_KEYWORD_PATTERNS = [
  /\btest\b/i,
  /\btesting\b/i,
  /\bqa\b/i,
  /\bdemo\b/i,
  /\bplaceholder\b/i,
  /\bsample\b/i,
  /\bchecking\b/i,
  /\bverification\b/i
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

  const normalizedTitle = (post.title || '').toLowerCase();
  const normalizedDescription = (post.description || '').toLowerCase();
  const combinedText = `${normalizedTitle} ${normalizedDescription}`;
  const wordCount = combinedText.trim().split(/\s+/).filter(Boolean).length;

  const isBugReport = post.category === 'bug' ||
    BUG_PATTERNS.some(pattern => pattern.test(normalizedTitle)) ||
    BUG_PATTERNS.some(pattern => pattern.test(normalizedDescription));

  const isTestFeedback = TEST_KEYWORD_PATTERNS.some(pattern => pattern.test(normalizedTitle)) ||
    TEST_KEYWORD_PATTERNS.some(pattern => pattern.test(normalizedDescription));

  const matchesCriticalCombination = CRITICAL_BUG_COMBINATIONS.some(words =>
    words.every(word => combinedText.includes(word))
  );

  const hasCriticalKeywords = /\b(can't|cannot|unable|blocker|blocked|prevent|workflow|crash|white screen|blank screen|freeze|stuck|login error|payment failed|partial)\b/i.test(combinedText);

  const isCriticalBug = isBugReport && (matchesCriticalCombination || hasCriticalKeywords);

  console.log('[PRIORITY SCORING] Heuristics', {
    title: post.title,
    isBugReport,
    isCriticalBug,
    isTestFeedback,
    wordCount,
    votes: metrics.voteCount,
    comments: metrics.commentCount,
    similarPosts: metrics.similarPostsCount,
    tier: user.tier
  });

  const systemPrompt = `You are a senior product strategist with expertise in SaaS prioritization and revenue optimization. Analyze feedback with a strong focus on business impact.

Company Context:
- Strategy: ${businessContext?.companyStrategy || 'growth'}
- Current Quarter: ${businessContext?.currentQuarter || 'Q1'}
- Upcoming Milestone: ${businessContext?.upcomingMilestone || 'none'}

Scoring Guidelines:
1. Revenue Impact (0-10): Direct effect on revenue, churn reduction, expansion potential.
2. User Reach (0-10): Portion of user base affected, viral/cohort impact.
3. Strategic Alignment (0-10): How well this supports current company direction.
4. Implementation Effort (0-10): INVERTED — 10=very easy, 0=very hard (consider tech debt & dependencies).
5. Competitive Advantage (0-10): Differentiation, parity gaps, defensibility.
6. Risk Mitigation (0-10): Security, compliance, reliability, brand risk.
7. User Satisfaction (0-10): Friction reduction, delight factor, NPS impact.

Signals Provided:
- Votes: ${metrics.voteCount} (unique voters: ${metrics.uniqueVoters}, ${metrics.percentageOfActiveUsers.toFixed(1)}% of active base).
- Comments: ${metrics.commentCount} (${metrics.commentCount > 5 ? 'high' : metrics.commentCount > 0 ? 'moderate' : 'none'} engagement).
- Similar Requests: ${metrics.similarPostsCount} (${metrics.similarPostsCount > 3 ? 'trend' : 'isolated'}).
- User Tier: ${user.tier} (Pro/Enterprise reports mean higher retention risk).
- AI Heuristics: ${isBugReport ? 'Detected BUG' : 'Not detected as bug'}${isCriticalBug ? ' • CRITICAL BLOCKER (workflow impacted)' : ''}${isTestFeedback ? ' • QA/TEST PLACEHOLDER' : ''}.
- Description length: ${wordCount} words.

Behavioural Rules:
- Treat CRITICAL BLOCKER bugs (cannot proceed, crashes, blank screens, login/payment failures) as top priority: revenueImpact, riskMitigation, and userSatisfaction must land 8-10 and overall priority should be "immediate" unless metrics prove otherwise.
- QA/TEST placeholders ("test", "QA", demo text) should receive very low scores (typically <=3) and priority level "declined" or "backlog" unless there is clear business impact.
- Very short descriptions (<15 words) usually indicate low confidence; be conservative unless strong signals contradict.
- Reference engagement metrics when scoring (votes/comments drive userReach & satisfaction).
- Provide a concise business justification referencing churn risk, retention, or strategic alignment.

Return JSON only.`;

  const userPrompt = `Analyze this feedback:

Title: "${post.title}"
Description: "${post.description}"
Category: ${post.category || 'uncategorized'}

User Context:
- Tier: ${user.tier}
- Company Size: ${user.companySize || 'unknown'}
- MRR: ${user.mrr || 0}
- Champion: ${user.isChampion ? 'Yes' : 'No'}

Provide JSON:
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
  "estimatedDays": <number|null>,
  "dependencies": [<technical dependencies>],
  "businessJustification": "<1-2 sentence business case>",
  "suggestedAction": "implement|investigate|prototype|combine|defer|decline",
  "relatedPosts": []
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.PRIORITY_SCORING,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 450,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    const aiResponse = JSON.parse(content);

    if (isBugReport) {
      const minRevenue = (user.tier === 'pro' || user.tier === 'enterprise') ? 8 : 7;
      aiResponse.scores.revenueImpact = Math.max(aiResponse.scores.revenueImpact, minRevenue);
      aiResponse.scores.riskMitigation = Math.max(aiResponse.scores.riskMitigation, 7);
      aiResponse.scores.userSatisfaction = Math.max(aiResponse.scores.userSatisfaction, 7);
    }

    if (isCriticalBug) {
      const criticalRevenueFloor = user.tier === 'enterprise' ? 9 : 8.5;
      const criticalRiskFloor = user.tier === 'enterprise' ? 9 : 8.5;
      aiResponse.scores.revenueImpact = Math.max(aiResponse.scores.revenueImpact, criticalRevenueFloor);
      aiResponse.scores.riskMitigation = Math.max(aiResponse.scores.riskMitigation, criticalRiskFloor);
      aiResponse.scores.userSatisfaction = Math.max(aiResponse.scores.userSatisfaction, 8.5);
      aiResponse.scores.userReach = Math.max(
        aiResponse.scores.userReach,
        Math.min(9, metrics.voteCount >= 5 ? 8.5 : metrics.voteCount >= 2 ? 7 : 6)
      );
    }

    if (isTestFeedback) {
      for (const key of Object.keys(aiResponse.scores) as Array<keyof PriorityScore['scores']>) {
        aiResponse.scores[key] = Math.min(aiResponse.scores[key], 3);
      }
    }

    const strategy = businessContext?.companyStrategy || 'growth';
    const weights = WEIGHT_PROFILES[strategy];

    let weightedScore = 0;
    for (const [factor, score] of Object.entries(aiResponse.scores)) {
      weightedScore += score * weights[factor as keyof typeof weights];
    }

    const tierMultiplier = user.tier === 'enterprise' ? 1.3 : user.tier === 'pro' ? 1.1 : 1.0;
    weightedScore = Math.min(10, weightedScore * tierMultiplier);

    if (isCriticalBug) {
      const criticalFloor = user.tier === 'enterprise' ? 9.3 : user.tier === 'pro' ? 9.0 : 8.5;
      weightedScore = Math.max(weightedScore, criticalFloor);
    }

    if (isTestFeedback) {
      weightedScore = Math.min(weightedScore, wordCount > 20 ? 3.5 : 2.8);
    }

    const basePriorityLevel = getPriorityLevel(weightedScore, aiResponse.scores.riskMitigation);
    const finalPriorityLevel = isCriticalBug
      ? 'immediate'
      : (isTestFeedback && weightedScore < 3 ? 'declined' : basePriorityLevel);

    const quarterRecommendation = getQuarterRecommendation(
      finalPriorityLevel,
      businessContext?.currentQuarter || 'Q1'
    );

    return {
      scores: aiResponse.scores,
      weightedScore: Math.round(weightedScore * 10) / 10,
      priorityLevel: finalPriorityLevel,
      quarterRecommendation,
      businessJustification: aiResponse.businessJustification,
      suggestedAction: aiResponse.suggestedAction,
      estimatedDays: aiResponse.estimatedDays,
      dependencies: aiResponse.dependencies || [],
      relatedPosts: aiResponse.relatedPosts || []
    };
  } catch (error) {
    console.error('[PRIORITY SCORING] Error:', error);
    return getFallbackPriorityScore(context);
  }
}

function getPriorityLevel(
  score: number,
  riskScore: number
): PriorityScore['priorityLevel'] {
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

export const calculatePriorityScore = withCache(
  calculatePriorityScoreInternal,
  'priorityScoring',
  (context) => ({
    title: context.post.title,
    category: context.post.category,
    voteCount: context.metrics.voteCount,
    userTier: context.user.tier
  })
);

export async function batchScorePosts(
  posts: PriorityContext[]
): Promise<Map<string, PriorityScore>> {
  const results = new Map<string, PriorityScore>();

  const batchSize = 5;
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const scores = await Promise.all(batch.map(post => calculatePriorityScore(post)));

    batch.forEach((post, index) => {
      results.set(post.post.id, scores[index]);
    });
  }

  return results;
}
