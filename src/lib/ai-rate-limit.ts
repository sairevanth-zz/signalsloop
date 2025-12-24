import { getSupabaseServerClient } from './supabase-client';

// Monthly AI usage limits - 3 tiers: free, pro ($19), premium ($79)
export const AI_LIMITS = {
  free: {
    // Daily limits (tracked per day)
    categorization: 30,             // 30 per day
    sentiment_analysis: 30,         // 30 per day
    duplicate_detection: 10,        // 10 per day
    auto_response: 5,               // 5 per day (smart replies)
    priority_scoring: 30,           // 30 per day
    writing_assistant: 0,           // Not available on free
    // Advanced AI - Not available on free
    spec_generation: 0,
    spec_quality: 0,
    devils_advocate: 0,
    ask_signalsloop: 0,
    theme_detection: 0,
    executive_briefs: 0,
    call_intelligence: 0,
    // Hunter (Reddit + HackerNews + PlayStore only - no Grok platforms)
    hunter_scan: 4,                  // 1 per week (4/month)
    // API
    api_calls: 0,
  },
  pro: {
    // Monthly limits
    categorization: 1000,           // 1,000 per month
    sentiment_analysis: 1000,       // 1,000 per month
    duplicate_detection: 1000,      // 1,000 per month
    auto_response: 200,             // 200 smart replies per month
    priority_scoring: 1000,         // 1,000 per month
    writing_assistant: 500,         // 500 per month
    // Advanced AI (GPT-4o)
    spec_generation: 10,            // 10 specs per month
    spec_quality: 8,                // 8 quality scores per month
    devils_advocate: 5,             // 5 analyses per month
    ask_signalsloop: 50,            // 50 queries per month
    theme_detection: 8,             // 8 theme analyses per month
    // Premium AI (taste test)
    executive_briefs: 1,            // 1 per month
    call_intelligence: 5,           // 5 transcripts per month
    // Hunter (Reddit + HackerNews + PlayStore only - no Grok platforms to reduce costs)
    hunter_scan: 30,                // 1 per day (30/month)
    // API
    api_calls: 1000,                // 1,000 API calls per month
  },
  premium: {
    // Monthly limits - generous/unlimited
    categorization: 100000,         // Effectively unlimited
    sentiment_analysis: 100000,     // Effectively unlimited
    duplicate_detection: 100000,    // Effectively unlimited
    auto_response: 1000,            // 1,000 smart replies per month
    priority_scoring: 100000,       // Effectively unlimited
    writing_assistant: 100000,      // Effectively unlimited
    // Advanced AI (GPT-4o)
    spec_generation: 30,            // 30 specs per month
    spec_quality: 30,               // 30 quality scores per month
    devils_advocate: 15,            // 15 analyses per month
    ask_signalsloop: 100,           // 100 queries per month
    theme_detection: 100000,        // Effectively unlimited
    // Premium AI
    executive_briefs: 4,            // 4 per month (weekly + monthly)
    call_intelligence: 20,          // 20 transcripts per month
    // Hunter (ALL platforms including Grok-powered: Twitter, G2, Capterra, Trustpilot, ProductHunt)
    hunter_scan: 30,                // 1 per day (30/month) - Grok is expensive!
    // API
    api_calls: 5000,                // 5,000 API calls per month
  }
};

export type AIFeatureType = keyof typeof AI_LIMITS.free;
export type PlanType = 'free' | 'pro' | 'premium';

interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  plan: PlanType;
}

function getPlanLimits(plan: PlanType): typeof AI_LIMITS.free {
  switch (plan) {
    case 'premium':
      return AI_LIMITS.premium;
    case 'pro':
      return AI_LIMITS.pro;
    default:
      return AI_LIMITS.free;
  }
}

export async function checkAIUsageLimit(
  projectId: string,
  featureType: AIFeatureType
): Promise<UsageCheckResult> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  // Get project plan
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('plan')
    .eq('id', projectId)
    .single();

  if (projectError) {
    console.error('Project lookup error:', projectError, 'for projectId:', projectId);
    // Fail open - allow usage if we can't check the limit
    return {
      allowed: true,
      current: 0,
      limit: AI_LIMITS.free[featureType],
      remaining: AI_LIMITS.free[featureType],
      plan: 'free'
    };
  }

  if (!project) {
    console.error('Project not found for projectId:', projectId);
    // Fail open - allow usage if project doesn't exist
    return {
      allowed: true,
      current: 0,
      limit: AI_LIMITS.free[featureType],
      remaining: AI_LIMITS.free[featureType],
      plan: 'free'
    };
  }

  // Get appropriate limit based on plan (supports free, pro, premium)
  const plan: PlanType = (project.plan === 'premium' || project.plan === 'pro') ? project.plan : 'free';
  const planLimits = getPlanLimits(plan);
  const limit = planLimits[featureType];

  const { data, error } = await supabase.rpc('check_ai_usage_limit', {
    p_project_id: projectId,
    p_feature_type: featureType,
    p_limit: limit
  });

  if (error) {
    console.error('Error checking AI usage limit:', error);
    // Allow on error (fail open for better UX)
    return {
      allowed: true,
      current: 0,
      limit: limit,
      remaining: limit,
      plan: plan
    };
  }

  return {
    ...data,
    plan: plan
  };
}

export async function incrementAIUsage(
  projectId: string,
  featureType: AIFeatureType,
  increment = 1
): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const times = Number.isFinite(increment) && increment > 1 ? Math.floor(increment) : 1;

  for (let i = 0; i < times; i += 1) {
    await supabase.rpc('increment_ai_usage', {
      p_project_id: projectId,
      p_feature_type: featureType
    });
  }
}

export function getFeatureName(featureType: AIFeatureType): string {
  const names: Record<AIFeatureType, string> = {
    categorization: 'Auto-Categorization',
    sentiment_analysis: 'Sentiment Analysis',
    duplicate_detection: 'Duplicate Detection',
    auto_response: 'Smart Replies',
    priority_scoring: 'Priority Scoring',
    writing_assistant: 'Writing Assistant',
    spec_generation: 'Spec Generation',
    spec_quality: 'Spec Quality Scoring',
    devils_advocate: "Devil's Advocate",
    ask_signalsloop: 'Ask SignalsLoop',
    theme_detection: 'Theme Detection',
    executive_briefs: 'Executive Briefs',
    call_intelligence: 'Call Intelligence',
    hunter_scan: 'X/Twitter Feedback Hunter',
    api_calls: 'API Calls',
  };
  return names[featureType];
}

export function getUpgradeMessage(featureType: AIFeatureType, limit: number, currentPlan: 'free' | 'pro' = 'free'): string {
  const featureName = getFeatureName(featureType);
  if (currentPlan === 'free') {
    return `You've reached your free tier limit of ${limit} ${featureName} uses. Upgrade to Pro for more!`;
  }
  return `You've reached your Pro limit of ${limit} ${featureName} uses this month. Upgrade to Premium for higher limits!`;
}

