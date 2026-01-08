/**
 * Feature Success Prediction Engine
 *
 * Predicts feature success using hybrid strategies:
 * - Cold start: Heuristic scoring (< 10 outcomes)
 * - Warm: Similar feature matching (10-50 outcomes)
 * - Hot: ML model (50+ outcomes) - future enhancement
 */

import { complete } from '@/lib/ai/router';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type {
  PredictionInput,
  PredictionOutput,
  SimilarFeature,
  ExplanationFactor,
  PredictionStrategy,
  StrategyMetadata,
} from '@/types/prediction';

// Thresholds for strategy selection
const COLD_START_THRESHOLD = 10;
const WARM_THRESHOLD = 50;

/**
 * Main entry point: Generate feature success prediction
 */
export async function predictFeatureSuccess(
  projectId: string,
  features: PredictionInput,
  featureName?: string,
  featureDescription?: string
): Promise<PredictionOutput> {
  // 1. Determine which strategy to use based on historical data
  const historicalOutcomes = await getHistoricalOutcomes(projectId);
  const outcomeCount = historicalOutcomes.length;

  console.log(`[Prediction] Project has ${outcomeCount} historical outcomes`);

  let prediction: PredictionOutput;

  if (outcomeCount < COLD_START_THRESHOLD) {
    // Cold start: Use AI-powered heuristics with feature text
    prediction = await predictWithHeuristics(features, featureName, featureDescription);
  } else if (outcomeCount < WARM_THRESHOLD) {
    // Warm: Use similar feature matching
    prediction = await predictFromSimilarFeatures(features, projectId, historicalOutcomes);
  } else {
    // Hot: Use similar features (ML model is future enhancement)
    prediction = await predictFromSimilarFeatures(features, projectId, historicalOutcomes);
  }

  // 2. Generate explanation using AI
  const explanation = await generateExplanation(features, prediction);

  return {
    ...prediction,
    explanation_text: explanation.text,
    explanation_factors: explanation.factors,
  };
}

/**
 * COLD START STRATEGY: AI-powered prediction with industry benchmarks
 */
async function predictWithHeuristics(features: PredictionInput, featureName?: string, featureDescription?: string): Promise<PredictionOutput> {
  // Industry benchmark adoption rates by category
  const categoryBenchmarks: Record<string, { base: number; range: number }> = {
    core: { base: 75, range: 15 },           // 60-90%
    enhancement: { base: 55, range: 20 },    // 35-75%
    integration: { base: 50, range: 15 },    // 35-65%
    infrastructure: { base: 40, range: 15 }, // 25-55%
    experimental: { base: 30, range: 15 },   // 15-45%
  };

  // Get base from category benchmark or default
  const benchmark = categoryBenchmarks[features.feature_category] || { base: 50, range: 20 };

  // Use AI to get smarter prediction if we have feature text
  if (featureName || featureDescription) {
    try {
      const aiPrediction = await getAIPrediction(
        featureName || '',
        featureDescription || '',
        features,
        benchmark
      );
      return aiPrediction;
    } catch (error) {
      console.error('[Prediction] AI prediction failed, falling back to enhanced heuristics:', error);
    }
  }

  // Fallback: Enhanced heuristics with variance
  return getEnhancedHeuristicPrediction(features, benchmark);
}

/**
 * AI-powered prediction using GPT-4o
 */
async function getAIPrediction(
  featureName: string,
  featureDescription: string,
  features: PredictionInput,
  benchmark: { base: number; range: number }
): Promise<PredictionOutput> {
  const systemPrompt = `You are an expert product analyst predicting feature adoption rates.

Analyze the feature and predict its adoption rate based on:
1. Feature type and category
2. Market demand signals
3. Industry benchmarks
4. Technical complexity

INDUSTRY BENCHMARKS (typical adoption ranges):
- Core features: 60-90% (essential functionality everyone uses)
- Enhancements/UX: 35-75% (depends on discoverability and value)
- Integrations: 35-65% (depends on ecosystem and partners)
- Infrastructure: 25-55% (backend, less visible to users)
- Experimental: 15-45% (high variance, early adopters only)

HIGH ADOPTION INDICATORS (+10-20%):
- Accessibility features (dark mode, mobile support)
- Time-saving automation
- Popular integration targets (Slack, Jira, etc.)
- Security/compliance features for B2B
- Features competitors already have

LOW ADOPTION INDICATORS (-10-20%):
- Niche use cases
- Technical features with steep learning curve
- Features requiring behavior change
- Platform-specific features

Respond with ONLY valid JSON:
{
  "predicted_adoption_rate": 0.0-1.0,
  "confidence_score": 0.0-1.0,
  "sentiment_impact": -0.3 to 0.3,
  "key_factors": [
    { "factor": "reason", "impact": "+X%" or "-X%", "weight": 0.0-1.0 }
  ],
  "reasoning": "1-2 sentence explanation"
}`;

  const userPrompt = `FEATURE: ${featureName}
${featureDescription ? `DESCRIPTION: ${featureDescription}` : ''}

CHARACTERISTICS:
- Category: ${features.feature_category}
- Target Segment: ${features.target_segment}
- Technical Complexity: ${features.technical_complexity}
- Effort: ${features.estimated_effort_weeks} weeks
- Feedback Volume: ${features.feedback_volume}
- Addresses Churn: ${features.addresses_churn_theme ? 'Yes' : 'No'}
- Enterprise Demand: ${Math.round(features.enterprise_requester_pct * 100)}%

BASE BENCHMARK: ${benchmark.base}% (±${benchmark.range}%)

Predict adoption and provide reasoning:`;

  const result = await complete({
    type: 'reasoning',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    options: {
      temperature: 0.4,
      maxTokens: 500,
      responseFormat: 'json',
    },
  });

  const parsed = JSON.parse(result.content);

  // Build explanation factors from AI response
  const factors: ExplanationFactor[] = (parsed.key_factors || []).map((f: any) => ({
    factor: f.factor,
    impact: f.impact,
    weight: f.weight || 0.15,
  }));

  const predicted_adoption_rate = Math.max(0, Math.min(1, parsed.predicted_adoption_rate));
  const confidence_score = Math.max(0.5, Math.min(0.95, parsed.confidence_score || 0.7));

  return {
    predicted_adoption_rate,
    predicted_sentiment_impact: parsed.sentiment_impact || 0.05,
    predicted_revenue_impact: null,
    predicted_churn_reduction: features.addresses_churn_theme ? 0.08 : null,

    confidence_score,
    confidence_interval_low: Math.max(0, predicted_adoption_rate - (1 - confidence_score) * 0.25),
    confidence_interval_high: Math.min(1, predicted_adoption_rate + (1 - confidence_score) * 0.25),

    explanation_text: parsed.reasoning || '',
    explanation_factors: factors,

    prediction_strategy: 'heuristic',
    strategy_metadata: {
      historical_outcomes_count: 0,
    },

    similar_feature_ids: [],
  };
}

/**
 * Enhanced heuristic prediction (fallback when AI fails)
 */
function getEnhancedHeuristicPrediction(
  features: PredictionInput,
  benchmark: { base: number; range: number }
): PredictionOutput {
  let adoptionScore = benchmark.base;
  const factors: ExplanationFactor[] = [];

  // Apply adjustments based on signals (with more variance)
  if (features.feedback_volume > 20) {
    adoptionScore += 12;
    factors.push({ factor: 'High user demand (20+ requests)', impact: '+12%', weight: 0.18 });
  } else if (features.feedback_volume === 0) {
    adoptionScore -= 8;
    factors.push({ factor: 'No direct user feedback', impact: '-8%', weight: 0.12 });
  }

  if (features.feedback_intensity > 0.7) {
    adoptionScore += 10;
    factors.push({ factor: 'Strong emotional need from users', impact: '+10%', weight: 0.15 });
  }

  if (features.enterprise_requester_pct > 0.6) {
    adoptionScore += 10;
    factors.push({ factor: 'Strong enterprise demand', impact: '+10%', weight: 0.15 });
  }

  if (features.addresses_churn_theme) {
    adoptionScore += 18;
    factors.push({ factor: 'Addresses churn risk', impact: '+18%', weight: 0.22 });
  }

  if (features.competitor_has_feature) {
    adoptionScore += 8; // Now positive - table stakes
    factors.push({ factor: 'Competitors have this (table stakes)', impact: '+8%', weight: 0.12 });
  }

  if (features.technical_complexity === 'high') {
    adoptionScore -= 8;
    factors.push({ factor: 'High technical complexity', impact: '-8%', weight: 0.10 });
  }

  if (features.estimated_effort_weeks > 8) {
    adoptionScore -= 6;
    factors.push({ factor: 'Long development time', impact: '-6%', weight: 0.08 });
  }

  // Add randomness within benchmark range for variety
  const variance = (Math.random() - 0.5) * benchmark.range * 0.5;
  adoptionScore += variance;

  adoptionScore = Math.max(15, Math.min(95, adoptionScore));
  const predicted_adoption_rate = adoptionScore / 100;

  // Varied confidence based on signal strength
  const signalStrength = factors.reduce((sum, f) => sum + f.weight, 0);
  const confidence_score = Math.min(0.85, 0.55 + signalStrength * 0.3);

  return {
    predicted_adoption_rate,
    predicted_sentiment_impact: features.addresses_churn_theme ? 0.15 : 0.05,
    predicted_revenue_impact: null,
    predicted_churn_reduction: features.addresses_churn_theme ? 0.08 : null,

    confidence_score,
    confidence_interval_low: Math.max(0, predicted_adoption_rate - 0.15),
    confidence_interval_high: Math.min(1, predicted_adoption_rate + 0.15),

    explanation_text: '',
    explanation_factors: factors,

    prediction_strategy: 'heuristic',
    strategy_metadata: {
      historical_outcomes_count: 0,
    },

    similar_feature_ids: [],
  };
}

/**
 * WARM/HOT STRATEGY: Similar feature matching
 */
async function predictFromSimilarFeatures(
  features: PredictionInput,
  projectId: string,
  historicalOutcomes: any[]
): Promise<PredictionOutput> {
  // 1. Find similar features from history
  const similarFeatures = findSimilarFeatures(features, historicalOutcomes);

  if (similarFeatures.length === 0) {
    // Fallback to heuristics
    console.log('[Prediction] No similar features found, using heuristics');
    return predictWithHeuristics(features);
  }

  console.log(`[Prediction] Found ${similarFeatures.length} similar features`);

  // 2. Calculate weighted predictions
  const totalSimilarity = similarFeatures.reduce((sum, f) => sum + f.similarity_score, 0);

  let weightedAdoption = 0;
  let weightedSentiment = 0;
  let validOutcomes = 0;

  similarFeatures.forEach((similar) => {
    const weight = similar.similarity_score / totalSimilarity;

    if (similar.actual_adoption_rate !== null) {
      weightedAdoption += similar.actual_adoption_rate * weight;
      validOutcomes++;
    }

    if (similar.actual_sentiment_impact !== null) {
      weightedSentiment += similar.actual_sentiment_impact * weight;
    }
  });

  const predicted_adoption_rate = validOutcomes > 0 ? weightedAdoption : 0.5;
  const predicted_sentiment_impact = validOutcomes > 0 ? weightedSentiment : 0.05;

  // 3. Calculate confidence based on similarity and sample size
  const avgSimilarity = totalSimilarity / similarFeatures.length;
  const sampleSizeConfidence = Math.min(1, similarFeatures.length / 10);
  const confidence_score = avgSimilarity * 0.7 + sampleSizeConfidence * 0.3;

  // 4. Generate explanation factors
  const factors: ExplanationFactor[] = [
    {
      factor: `Based on ${similarFeatures.length} similar feature(s) from your history`,
      impact: `${(predicted_adoption_rate * 100).toFixed(0)}% avg adoption`,
      weight: avgSimilarity,
    },
  ];

  // Add top contributing factors
  if (features.addresses_churn_theme) {
    factors.push({
      factor: 'Addresses churn-related theme',
      impact: '+20%',
      weight: 0.25,
    });
  }

  if (features.enterprise_requester_pct > 0.6) {
    factors.push({
      factor: 'Strong enterprise demand',
      impact: '+15%',
      weight: 0.20,
    });
  }

  return {
    predicted_adoption_rate,
    predicted_sentiment_impact,
    predicted_revenue_impact: null,
    predicted_churn_reduction: features.addresses_churn_theme ? 0.10 : null,

    confidence_score,
    confidence_interval_low: Math.max(0, predicted_adoption_rate - (1 - confidence_score) * 0.2),
    confidence_interval_high: Math.min(1, predicted_adoption_rate + (1 - confidence_score) * 0.2),

    explanation_text: '', // Will be filled by AI
    explanation_factors: factors,

    prediction_strategy: 'similar_features',
    strategy_metadata: {
      similar_features_used: similarFeatures.map((f) => f.id),
      historical_outcomes_count: historicalOutcomes.length,
    },

    similar_feature_ids: similarFeatures.map((f) => f.id),
  };
}

/**
 * Find similar features from historical outcomes
 */
function findSimilarFeatures(
  features: PredictionInput,
  historicalOutcomes: any[]
): SimilarFeature[] {
  const similar: SimilarFeature[] = [];

  historicalOutcomes.forEach((outcome) => {
    const inputFeatures = outcome.input_features as Partial<PredictionInput>;
    let similarity = 0;
    let factors = 0;

    // Compare key features
    if (inputFeatures.target_segment === features.target_segment) {
      similarity += 0.3;
      factors++;
    }

    if (inputFeatures.feature_category === features.feature_category) {
      similarity += 0.2;
      factors++;
    }

    if (
      inputFeatures.feedback_volume &&
      features.feedback_volume &&
      Math.abs(inputFeatures.feedback_volume - features.feedback_volume) / features.feedback_volume < 0.2
    ) {
      similarity += 0.2;
      factors++;
    }

    if (
      inputFeatures.addresses_churn_theme === features.addresses_churn_theme &&
      features.addresses_churn_theme
    ) {
      similarity += 0.2;
      factors++;
    }

    if (inputFeatures.technical_complexity === features.technical_complexity) {
      similarity += 0.1;
      factors++;
    }

    // Only include if similarity > 0.3
    if (similarity > 0.3 && factors > 0) {
      similar.push({
        id: outcome.id,
        feature_name: outcome.feature_name,
        similarity_score: similarity,
        input_features: inputFeatures,
        actual_adoption_rate: outcome.actual_adoption_rate,
        actual_sentiment_impact: outcome.actual_sentiment_impact,
      });
    }
  });

  // Sort by similarity and take top 5
  return similar.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 5);
}

/**
 * Get historical outcomes for a project
 */
async function getHistoricalOutcomes(projectId: string) {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    console.error('[Prediction] Database connection not available');
    return [];
  }

  const { data, error } = await supabase
    .from('feature_predictions')
    .select('*')
    .eq('project_id', projectId)
    .not('actual_adoption_rate', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch historical outcomes:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate explanation using AI
 */
async function generateExplanation(
  features: PredictionInput,
  prediction: PredictionOutput
): Promise<{ text: string; factors: ExplanationFactor[] }> {
  const systemPrompt = `Generate a human-readable explanation for a feature success prediction.

Write 3-4 sentences explaining why this prediction was made. Mention specific factors that increased or decreased the score. End with the most important consideration for the PM.

Keep it concise, actionable, and data-driven.`;

  const userPrompt = `FEATURE CHARACTERISTICS:
- Category: ${features.feature_category}
- Target Segment: ${features.target_segment}
- Feedback Volume: ${features.feedback_volume}
- Feedback Intensity: ${(features.feedback_intensity * 100).toFixed(0)}%
- Enterprise Demand: ${(features.enterprise_requester_pct * 100).toFixed(0)}%
- Technical Complexity: ${features.technical_complexity}
- Addresses Churn: ${features.addresses_churn_theme ? 'Yes' : 'No'}

PREDICTION RESULTS:
- Predicted Adoption: ${(prediction.predicted_adoption_rate! * 100).toFixed(0)}%
- Predicted Sentiment Impact: ${prediction.predicted_sentiment_impact?.toFixed(2) || 'N/A'}
- Confidence: ${(prediction.confidence_score * 100).toFixed(0)}%
- Strategy: ${prediction.prediction_strategy}

KEY FACTORS:
${prediction.explanation_factors.map((f) => `- ${f.factor}: ${f.impact}`).join('\n')}

Write the explanation:`;

  try {
    const result = await complete({
      type: 'generation',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        temperature: 0.7,
        maxTokens: 300,
      },
    });

    return {
      text: result.content.trim(),
      factors: prediction.explanation_factors,
    };
  } catch (error) {
    console.error('Failed to generate explanation:', error);

    // Fallback explanation
    return {
      text: `This feature is predicted to achieve ${(prediction.predicted_adoption_rate! * 100).toFixed(0)}% adoption based on ${prediction.prediction_strategy === 'heuristic' ? 'heuristic analysis' : `${prediction.strategy_metadata.historical_outcomes_count} historical features`
        }. The prediction confidence is ${(prediction.confidence_score * 100).toFixed(0)}%.`,
      factors: prediction.explanation_factors,
    };
  }
}
