import { getSupabaseServerClient } from './supabase-client';

// Free tier limits (monthly)
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
    sentiment_analysis: Infinity,
    auto_response: Infinity,
    duplicate_detection: Infinity,
    priority_scoring: Infinity,
    categorization: Infinity,
    writing_assistant: Infinity,
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

  // Pro users have unlimited access
  if (project.plan === 'pro') {
    return {
      allowed: true,
      current: 0,
      limit: Infinity,
      remaining: Infinity,
      isPro: true
    };
  }

  // Check usage for free tier
  const limit = AI_LIMITS.free[featureType];
  
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
    isPro: false
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

  // Get project plan
  const { data: project } = await supabase
    .from('projects')
    .select('plan')
    .eq('id', projectId)
    .single();

  // Don't track for pro users
  if (project?.plan === 'pro') {
    return;
  }

  // Increment usage
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

