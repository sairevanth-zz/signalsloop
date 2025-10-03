import { getSupabaseServerClient } from './supabase-client';

// Monthly AI usage limits
export const AI_LIMITS = {
  free: {
    sentiment_analysis: 10,        // 10 sentiment analyses per month
    auto_response: 25,              // 25 auto-responses per month
    duplicate_detection: 15,        // 15 duplicate checks per month
    priority_scoring: 15,           // 15 priority analyses per month
    categorization: 50,             // 50 auto-categorizations per month
    writing_assistant: 100,         // 100 writing assists per month
  },
  pro: {
    sentiment_analysis: 10000,      // 10,000 per month - prevents abuse while allowing normal usage
    auto_response: 5000,            // 5,000 per month - high limit for auto-responses
    duplicate_detection: 10000,     // 10,000 per month - plenty for duplicate checks
    priority_scoring: 10000,        // 10,000 per month - generous limit
    categorization: 50000,          // 50,000 per month - very high for categorization
    writing_assistant: 20000,       // 20,000 per month - ample for writing assistance
  }
};

export type AIFeatureType = keyof typeof AI_LIMITS.free;

interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  isPro: boolean;
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

  if (projectError || !project) {
    throw new Error('Project not found');
  }

  // Get appropriate limit based on plan
  const isPro = project.plan === 'pro';
  const limit = isPro ? AI_LIMITS.pro[featureType] : AI_LIMITS.free[featureType];
  
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
      isPro: false
    };
  }

  return {
    ...data,
    isPro: isPro
  };
}

export async function incrementAIUsage(
  projectId: string,
  featureType: AIFeatureType
): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return;
  }

  // Increment usage for all users (both free and pro)
  await supabase.rpc('increment_ai_usage', {
    p_project_id: projectId,
    p_feature_type: featureType
  });
}

export function getFeatureName(featureType: AIFeatureType): string {
  const names: Record<AIFeatureType, string> = {
    sentiment_analysis: 'Sentiment Analysis',
    auto_response: 'AI Auto-Response',
    duplicate_detection: 'Duplicate Detection',
    priority_scoring: 'Priority Scoring',
    categorization: 'Auto-Categorization',
    writing_assistant: 'Writing Assistant'
  };
  return names[featureType];
}

export function getUpgradeMessage(featureType: AIFeatureType, limit: number): string {
  const featureName = getFeatureName(featureType);
  return `You've reached your free tier limit of ${limit} ${featureName} uses this month. Upgrade to Pro for unlimited AI features!`;
}

