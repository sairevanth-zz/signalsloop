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

const supabase = getServiceRoleClient();

// Thresholds for strategy selection
const COLD_START_THRESHOLD = 10;
const WARM_THRESHOLD = 50;

/**
 * Main entry point: Generate feature success prediction
 */
export async function predictFeatureSuccess(
  projectId: string,
  features: PredictionInput
): Promise<PredictionOutput> {
  // 1. Determine which strategy to use based on historical data
  const historicalOutcomes = await getHistoricalOutcomes(projectId);
  const outcomeCount = historicalOutcomes.length;

  console.log(`[Prediction] Project has ${outcomeCount} historical outcomes`);

  let prediction: PredictionOutput;

  if (outcomeCount < COLD_START_THRESHOLD) {
    // Cold start: Use heuristic scoring
    prediction = await predictWithHeuristics(features);
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
 * COLD START STRATEGY: Heuristic scoring
 */
async function predictWithHeuristics(features: PredictionInput): Promise<PredictionOutput> {
  let adoptionScore = 50; // Base score (50%)

  const factors: ExplanationFactor[] = [];

  // Positive signals
  if (features.feedback_volume > 20) {
    adoptionScore += 10;
    factors.push({
      factor: 'High feedback volume from users',
      impact: '+10%',
      weight: 0.15,
    });
  }
  if (features.feedback_volume > 50) {
    adoptionScore += 5;
    factors.push({
      factor: 'Very high demand (50+ requests)',
      impact: '+5%',
      weight: 0.10,
    });
  }

  if (features.feedback_intensity > 0.7) {
    adoptionScore += 10;
    factors.push({
      factor: 'High emotional intensity in feedback',
      impact: '+10%',
      weight: 0.15,
    });
  }

  if (features.enterprise_requester_pct > 0.5) {
    adoptionScore += 8;
    factors.push({
      factor: 'Strong enterprise customer demand',
      impact: '+8%',
      weight: 0.12,
    });
  }

  if (features.requester_arr_total > 100000) {
    adoptionScore += 10;
    factors.push({
      factor: 'High ARR from requesters ($100K+)',
      impact: '+10%',
      weight: 0.15,
    });
  }

  if (features.addresses_churn_theme) {
    adoptionScore += 15;
    factors.push({
      factor: 'Addresses churn-related pain point',
      impact: '+15%',
      weight: 0.20,
    });
  }

  if (features.addresses_expansion_theme) {
    adoptionScore += 10;
    factors.push({
      factor: 'Enables expansion revenue opportunity',
      impact: '+10%',
      weight: 0.15,
    });
  }

  if (features.has_clear_success_metric) {
    adoptionScore += 5;
    factors.push({
      factor: 'Clear success metrics defined',
      impact: '+5%',
      weight: 0.08,
    });
  }

  if (features.problem_clarity_score > 0.8) {
    adoptionScore += 5;
    factors.push({
      factor: 'Well-defined problem statement',
      impact: '+5%',
      weight: 0.08,
    });
  }

  // Negative signals
  if (features.competitor_has_feature) {
    adoptionScore -= 10;
    factors.push({
      factor: 'Competitors already have this feature',
      impact: '-10%',
      weight: 0.15,
    });
  }

  if (features.competitor_advantage_months > 6) {
    adoptionScore -= 5;
    factors.push({
      factor: 'Competitor has 6+ month head start',
      impact: '-5%',
      weight: 0.10,
    });
  }

  if (features.technical_complexity === 'high') {
    adoptionScore -= 5;
    factors.push({
      factor: 'High technical complexity',
      impact: '-5%',
      weight: 0.08,
    });
  }

  if (features.estimated_effort_weeks > 8) {
    adoptionScore -= 5;
    factors.push({
      factor: 'Long development timeline (8+ weeks)',
      impact: '-5%',
      weight: 0.08,
    });
  }

  if (features.feature_category === 'experimental') {
    adoptionScore -= 10;
    factors.push({
      factor: 'Experimental feature category',
      impact: '-10%',
      weight: 0.12,
    });
  }

  // Clamp to 0-100
  adoptionScore = Math.max(0, Math.min(100, adoptionScore));

  // Convert to 0-1 range
  const predicted_adoption_rate = adoptionScore / 100;

  // Estimate sentiment impact based on feedback intensity
  const predicted_sentiment_impact = features.addresses_churn_theme
    ? 0.15
    : features.feedback_intensity > 0.6
    ? 0.10
    : 0.05;

  // Confidence is lower for heuristics
  const confidence_score = 0.6;

  return {
    predicted_adoption_rate,
    predicted_sentiment_impact,
    predicted_revenue_impact: null, // Not estimated in heuristics
    predicted_churn_reduction: features.addresses_churn_theme ? 0.08 : null,

    confidence_score,
    confidence_interval_low: Math.max(0, predicted_adoption_rate - 0.15),
    confidence_interval_high: Math.min(1, predicted_adoption_rate + 0.15),

    explanation_text: '', // Will be filled by AI
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
      taskType: 'writing',
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
      text: `This feature is predicted to achieve ${(prediction.predicted_adoption_rate! * 100).toFixed(0)}% adoption based on ${
        prediction.prediction_strategy === 'heuristic' ? 'heuristic analysis' : `${prediction.strategy_metadata.historical_outcomes_count} historical features`
      }. The prediction confidence is ${(prediction.confidence_score * 100).toFixed(0)}%.`,
      factors: prediction.explanation_factors,
    };
  }
}
