/**
 * Feature Extraction Service
 *
 * Extracts structured prediction features from unstructured PRD content
 * using GPT-4o to identify predictive signals
 */

import { complete } from '@/lib/ai/router';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type { PredictionInput } from '@/types/prediction';
import { z } from 'zod';

// Zod schema for validation
const ExtractedFeaturesSchema = z.object({
  feature_category: z.enum(['core', 'enhancement', 'integration', 'infrastructure', 'experimental']),
  target_segment: z.enum(['all', 'enterprise', 'smb', 'startup']),
  problem_clarity_score: z.number().min(0).max(1),
  solution_specificity_score: z.number().min(0).max(1),
  feedback_volume: z.number().int().min(0),
  feedback_intensity: z.number().min(0).max(1),
  theme_concentration: z.number().min(0).max(1),
  requester_arr_total: z.number().min(0),
  enterprise_requester_pct: z.number().min(0).max(1),
  competitor_has_feature: z.boolean(),
  competitor_advantage_months: z.number().int().min(0),
  estimated_effort_weeks: z.number().min(0),
  technical_complexity: z.enum(['low', 'medium', 'high']),
  has_clear_success_metric: z.boolean(),
  addresses_churn_theme: z.boolean(),
  addresses_expansion_theme: z.boolean(),
});

/**
 * Extract prediction features from spec/PRD content
 */
export async function extractFeaturesFromSpec(
  specId: string,
  projectId: string
): Promise<PredictionInput> {
  const supabase = getServiceRoleClient();
  // 1. Fetch spec content
  const { data: spec, error: specError } = await supabase
    .from('specs')
    .select('*')
    .eq('id', specId)
    .single();

  if (specError || !spec) {
    throw new Error(`Failed to fetch spec: ${specError?.message || 'Not found'}`);
  }

  // 2. Get related feedback data
  const feedbackData = await getRelatedFeedbackData(projectId, spec);

  // 3. Get competitor context
  const competitorContext = await getCompetitorContext(projectId, spec);

  // 4. Use GPT-4o to extract features
  const extractedFeatures = await extractWithAI(spec, feedbackData, competitorContext);

  return extractedFeatures;
}

/**
 * Get related feedback data for context
 */
async function getRelatedFeedbackData(projectId: string, spec: any) {
  const supabase = getServiceRoleClient();
  // Extract themes or keywords from spec title/description
  const specText = `${spec.title} ${spec.description || ''}`.toLowerCase();

  // Query feedback mentioning similar themes
  const { data: feedback, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      sentiment_analysis (sentiment_score, sentiment_category),
      theme_detection (theme_name)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !feedback) {
    console.warn('Failed to fetch feedback data:', error);
    return {
      feedback_count: 0,
      avg_sentiment: 0,
      enterprise_pct: 0,
      requester_arr: 0,
    };
  }

  // Calculate metrics
  const feedbackCount = feedback.length;
  const sentiments = feedback
    .map((f: any) => f.sentiment_analysis?.[0]?.sentiment_score)
    .filter((s: any) => s !== null && s !== undefined);

  const avgSentiment = sentiments.length > 0
    ? sentiments.reduce((sum: number, s: number) => sum + s, 0) / sentiments.length
    : 0;

  return {
    feedback_count: feedbackCount,
    avg_sentiment: avgSentiment,
    enterprise_pct: 0.5, // TODO: Calculate from actual customer data
    requester_arr: 100000, // TODO: Calculate from CRM data
  };
}

/**
 * Get competitor context
 */
async function getCompetitorContext(projectId: string, spec: any) {
  const supabase = getServiceRoleClient();
  // Check if competitors have similar features
  const { data: competitors, error } = await supabase
    .from('competitor_events')
    .select('*')
    .eq('project_id', projectId)
    .eq('event_type', 'feature_launch')
    .order('event_date', { ascending: false })
    .limit(10);

  if (error || !competitors) {
    return {
      competitors_with_feature: false,
      competitor_advantage_months: 0,
    };
  }

  // Simple keyword matching to see if competitors have similar features
  const specKeywords = extractKeywords(`${spec.title} ${spec.description || ''}`);
  const hasCompetitorFeature = competitors.some((c: any) => {
    const compKeywords = extractKeywords(`${c.event_title} ${c.event_summary}`);
    return specKeywords.some((k: string) => compKeywords.includes(k));
  });

  const competitorAdvantageMonths = hasCompetitorFeature ? 3 : 0; // Assume 3 months if they have it

  return {
    competitors_with_feature: hasCompetitorFeature,
    competitor_advantage_months: competitorAdvantageMonths,
  };
}

/**
 * Extract features using GPT-4o
 */
async function extractWithAI(
  spec: any,
  feedbackData: any,
  competitorContext: any
): Promise<PredictionInput> {
  const systemPrompt = `You are a product analyst extracting predictive signals from a PRD/spec.

Extract features that will be used to predict feature success. Be thorough and analytical.

Respond with ONLY valid JSON matching this exact structure (no markdown, no explanations):
{
  "feature_category": "core|enhancement|integration|infrastructure|experimental",
  "target_segment": "all|enterprise|smb|startup",
  "problem_clarity_score": 0.0-1.0,
  "solution_specificity_score": 0.0-1.0,
  "feedback_volume": integer,
  "feedback_intensity": 0.0-1.0,
  "theme_concentration": 0.0-1.0,
  "requester_arr_total": integer,
  "enterprise_requester_pct": 0.0-1.0,
  "competitor_has_feature": boolean,
  "competitor_advantage_months": integer,
  "estimated_effort_weeks": number,
  "technical_complexity": "low|medium|high",
  "has_clear_success_metric": boolean,
  "addresses_churn_theme": boolean,
  "addresses_expansion_theme": boolean
}`;

  const userPrompt = `SPEC/PRD CONTENT:
Title: ${spec.title}
Description: ${spec.description || 'N/A'}

RELATED FEEDBACK DATA:
- Feedback count: ${feedbackData.feedback_count}
- Average sentiment: ${feedbackData.avg_sentiment.toFixed(2)}
- % from Enterprise: ${(feedbackData.enterprise_pct * 100).toFixed(0)}%
- Total ARR of requesters: $${feedbackData.requester_arr.toLocaleString()}

COMPETITOR CONTEXT:
- Competitors with similar feature: ${competitorContext.competitors_with_feature ? 'Yes' : 'No'}
- Competitive advantage (months): ${competitorContext.competitor_advantage_months}

Extract all features in JSON format.`;

  try {
    const result = await complete({
      taskType: 'analysis',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        temperature: 0.3, // Lower temperature for more consistent extraction
        responseFormat: 'json',
      },
    });

    // Parse and validate the response
    const parsed = JSON.parse(result.content);
    const validated = ExtractedFeaturesSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error('Feature extraction failed:', error);

    // Return fallback heuristic-based features
    return getFallbackFeatures(spec, feedbackData, competitorContext);
  }
}

/**
 * Fallback feature extraction if AI fails
 */
function getFallbackFeatures(
  spec: any,
  feedbackData: any,
  competitorContext: any
): PredictionInput {
  const title = spec.title.toLowerCase();
  const description = (spec.description || '').toLowerCase();

  // Determine category based on keywords
  let feature_category: PredictionInput['feature_category'] = 'enhancement';
  if (title.includes('integration') || title.includes('api')) {
    feature_category = 'integration';
  } else if (title.includes('infrastructure') || title.includes('performance')) {
    feature_category = 'infrastructure';
  } else if (title.includes('new') || title.includes('launch')) {
    feature_category = 'core';
  }

  // Determine complexity
  let technical_complexity: PredictionInput['technical_complexity'] = 'medium';
  if (
    title.includes('simple') ||
    title.includes('ui') ||
    title.includes('button')
  ) {
    technical_complexity = 'low';
  } else if (
    title.includes('migration') ||
    title.includes('architecture') ||
    title.includes('refactor')
  ) {
    technical_complexity = 'high';
  }

  return {
    feature_category,
    target_segment: 'all',
    problem_clarity_score: 0.7,
    solution_specificity_score: 0.6,
    feedback_volume: feedbackData.feedback_count,
    feedback_intensity: Math.min(1, Math.abs(feedbackData.avg_sentiment)),
    theme_concentration: 0.5,
    requester_arr_total: feedbackData.requester_arr,
    enterprise_requester_pct: feedbackData.enterprise_pct,
    competitor_has_feature: competitorContext.competitors_with_feature,
    competitor_advantage_months: competitorContext.competitor_advantage_months,
    estimated_effort_weeks: technical_complexity === 'high' ? 8 : technical_complexity === 'medium' ? 4 : 2,
    technical_complexity,
    has_clear_success_metric: description.includes('metric') || description.includes('measure'),
    addresses_churn_theme: description.includes('churn') || description.includes('retention'),
    addresses_expansion_theme: description.includes('expansion') || description.includes('revenue'),
  };
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}
