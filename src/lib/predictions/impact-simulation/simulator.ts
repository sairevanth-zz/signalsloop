/**
 * Impact Simulation Engine
 *
 * Predicts the impact of roadmap decisions using historical data:
 * - What happens if we build Feature X?
 * - What happens if we deprioritize Feature Y?
 * - ROI estimation for features
 * - Churn risk assessment
 *
 * Uses correlation models built from feature_impact_history data
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================================
// TYPES
// =====================================================

export interface SimulationScenario {
  action: 'build' | 'defer' | 'deprioritize';
  suggestionId: string;
  themeName: string;
  estimatedEffort: 'low' | 'medium' | 'high' | 'very_high';
}

export interface ImpactPrediction {
  scenario: SimulationScenario;

  // Predicted outcomes (with confidence intervals)
  sentimentImpact: {
    predicted: number; // -1.0 to +1.0
    confidence: number; // 0-1
    range: { min: number; max: number };
  };

  churnImpact: {
    predicted: number; // Percentage change in churn
    confidence: number;
    range: { min: number; max: number };
    affectedCustomers: number; // Estimated # of customers
  };

  adoptionRate: {
    predicted: number; // 0-1 (percentage)
    confidence: number;
    range: { min: number; max: number };
  };

  revenueImpact: {
    predicted: number; // Dollar amount (could be negative)
    confidence: number;
    range: { min: number; max: number };
  };

  // Qualitative assessment
  riskLevel: 'low' | 'medium' | 'high';
  businessJustification: string;
  keyAssumptions: string[];
  mitigationStrategies: string[];

  // Supporting data
  similarFeatures: Array<{
    name: string;
    sentimentImpact: number;
    churnImpact: number;
    adoptionRate: number;
    successRating: number;
  }>;

  confidence: number; // Overall confidence (0-1)
  dataQuality: 'high' | 'medium' | 'low'; // Based on historical data availability
}

export interface ComparisonSimulation {
  scenarios: ImpactPrediction[];
  recommendation: string;
  rankedByROI: string[]; // Theme IDs sorted by ROI
  rankedByRisk: string[]; // Theme IDs sorted by risk
}

// =====================================================
// MAIN SIMULATION FUNCTIONS
// =====================================================

/**
 * Simulate the impact of building a feature
 */
export async function simulateFeatureImpact(
  projectId: string,
  suggestionId: string
): Promise<ImpactPrediction> {
  const supabase = getServiceRoleClient();

  // 1. Get the suggestion details
  const { data: suggestion, error } = await supabase
    .from('roadmap_suggestions')
    .select(`
      *,
      themes (
        id,
        theme_name,
        frequency,
        avg_sentiment
      )
    `)
    .eq('id', suggestionId)
    .single();

  if (error || !suggestion) {
    throw new Error(`Suggestion not found: ${suggestionId}`);
  }

  const theme = suggestion.themes as any;

  // 2. Find similar historical features
  const similarFeatures = await findSimilarFeatures(projectId, theme.theme_name);

  // 3. Calculate predictions based on historical data
  const predictions = calculatePredictions(similarFeatures, theme);

  // 4. Use AI to generate business justification and insights
  const aiInsights = await generateAIInsights(suggestion, similarFeatures, predictions);

  return {
    scenario: {
      action: 'build',
      suggestionId: suggestion.id,
      themeName: theme.theme_name,
      estimatedEffort: 'medium' // TODO: Get from suggestion
    },
    sentimentImpact: predictions.sentimentImpact,
    churnImpact: predictions.churnImpact,
    adoptionRate: predictions.adoptionRate,
    revenueImpact: predictions.revenueImpact,
    riskLevel: assessRiskLevel(predictions),
    businessJustification: aiInsights.justification,
    keyAssumptions: aiInsights.assumptions,
    mitigationStrategies: aiInsights.mitigations,
    similarFeatures: similarFeatures.slice(0, 5), // Top 5 similar
    confidence: calculateOverallConfidence(similarFeatures.length, predictions),
    dataQuality: assessDataQuality(similarFeatures.length)
  };
}

/**
 * Simulate deprioritizing a feature (what happens if we don't build it)
 */
export async function simulateDeprioritization(
  projectId: string,
  suggestionId: string
): Promise<ImpactPrediction> {
  const buildImpact = await simulateFeatureImpact(projectId, suggestionId);

  // Invert the predictions (if building improves sentiment by +0.2, not building = -0.2)
  return {
    ...buildImpact,
    scenario: {
      ...buildImpact.scenario,
      action: 'deprioritize'
    },
    sentimentImpact: {
      predicted: -buildImpact.sentimentImpact.predicted,
      confidence: buildImpact.sentimentImpact.confidence,
      range: {
        min: -buildImpact.sentimentImpact.range.max,
        max: -buildImpact.sentimentImpact.range.min
      }
    },
    churnImpact: {
      predicted: -buildImpact.churnImpact.predicted,
      confidence: buildImpact.churnImpact.confidence,
      range: {
        min: -buildImpact.churnImpact.range.max,
        max: -buildImpact.churnImpact.range.min
      },
      affectedCustomers: buildImpact.churnImpact.affectedCustomers
    },
    revenueImpact: {
      predicted: -buildImpact.revenueImpact.predicted,
      confidence: buildImpact.revenueImpact.confidence,
      range: {
        min: -buildImpact.revenueImpact.range.max,
        max: -buildImpact.revenueImpact.range.min
      }
    },
    businessJustification: `Deprioritizing this feature may have the following negative consequences: ${buildImpact.businessJustification}`
  };
}

/**
 * Compare multiple scenarios and recommend best approach
 */
export async function compareScenarios(
  projectId: string,
  suggestionIds: string[]
): Promise<ComparisonSimulation> {
  const predictions = await Promise.all(
    suggestionIds.map(id => simulateFeatureImpact(projectId, id))
  );

  // Calculate ROI for each scenario
  const withROI = predictions.map(p => ({
    prediction: p,
    roi: calculateROI(p)
  }));

  // Rank by ROI
  const rankedByROI = withROI
    .sort((a, b) => b.roi - a.roi)
    .map(item => item.prediction.scenario.suggestionId);

  // Rank by risk (low risk first)
  const rankedByRisk = predictions
    .sort((a, b) => {
      const riskOrder = { low: 1, medium: 2, high: 3 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    })
    .map(p => p.scenario.suggestionId);

  // Generate recommendation using AI
  const recommendation = await generateComparisonRecommendation(predictions);

  return {
    scenarios: predictions,
    recommendation,
    rankedByROI,
    rankedByRisk
  };
}

// =====================================================
// CORRELATION & PREDICTION LOGIC
// =====================================================

/**
 * Find similar features from history based on theme name, category, etc.
 */
async function findSimilarFeatures(
  projectId: string,
  themeName: string
): Promise<any[]> {
  const supabase = getServiceRoleClient();

  // Get all historical features
  const { data: features } = await supabase
    .from('feature_impact_history')
    .select('*')
    .eq('project_id', projectId)
    .not('launched_at', 'is', null)
    .order('launched_at', { ascending: false });

  if (!features || features.length === 0) {
    return [];
  }

  // Simple similarity: keyword matching for now
  // TODO: Use embeddings for better semantic matching
  const keywords = themeName.toLowerCase().split(' ');

  const scored = features.map(f => {
    const featureKeywords = f.feature_name.toLowerCase().split(' ');
    const matchCount = keywords.filter(k => featureKeywords.some(fk => fk.includes(k) || k.includes(fk))).length;

    return {
      feature: f,
      similarity: matchCount / Math.max(keywords.length, featureKeywords.length)
    };
  });

  // Return top matches
  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)
    .map(s => ({
      name: s.feature.feature_name,
      sentimentImpact: Number(s.feature.sentiment_impact) || 0,
      churnImpact: Number(s.feature.churn_impact) || 0,
      adoptionRate: Number(s.feature.post_adoption_rate) || 0,
      successRating: s.feature.success_rating || 3
    }));
}

/**
 * Calculate predictions from historical similar features
 */
function calculatePredictions(similarFeatures: any[], theme: any) {
  if (similarFeatures.length === 0) {
    // No historical data - use conservative estimates
    return {
      sentimentImpact: {
        predicted: 0.1,
        confidence: 0.3,
        range: { min: -0.1, max: 0.3 }
      },
      churnImpact: {
        predicted: -0.02,
        confidence: 0.3,
        range: { min: -0.05, max: 0.01 },
        affectedCustomers: Math.round((theme.frequency || 0) * 0.1)
      },
      adoptionRate: {
        predicted: 0.4,
        confidence: 0.3,
        range: { min: 0.2, max: 0.6 }
      },
      revenueImpact: {
        predicted: 0,
        confidence: 0.2,
        range: { min: -5000, max: 10000 }
      }
    };
  }

  // Calculate averages from similar features
  const avgSentimentImpact =
    similarFeatures.reduce((sum, f) => sum + f.sentimentImpact, 0) / similarFeatures.length;

  const avgChurnImpact =
    similarFeatures.reduce((sum, f) => sum + f.churnImpact, 0) / similarFeatures.length;

  const avgAdoptionRate =
    similarFeatures.reduce((sum, f) => sum + f.adoptionRate, 0) / similarFeatures.length;

  // Calculate standard deviation for confidence intervals
  const sentimentStdDev = Math.sqrt(
    similarFeatures.reduce((sum, f) => sum + Math.pow(f.sentimentImpact - avgSentimentImpact, 2), 0) /
      similarFeatures.length
  );

  const churnStdDev = Math.sqrt(
    similarFeatures.reduce((sum, f) => sum + Math.pow(f.churnImpact - avgChurnImpact, 2), 0) /
      similarFeatures.length
  );

  // Confidence based on sample size
  const confidence = Math.min(0.9, 0.4 + similarFeatures.length * 0.1);

  // Estimate revenue impact (simplistic model)
  // Assume reducing churn by 1% = $10,000/year for every 100 customers
  const customerBase = theme.frequency || 100;
  const estimatedRevenue = avgChurnImpact * customerBase * 100 * 1000;

  return {
    sentimentImpact: {
      predicted: avgSentimentImpact,
      confidence,
      range: {
        min: avgSentimentImpact - sentimentStdDev,
        max: avgSentimentImpact + sentimentStdDev
      }
    },
    churnImpact: {
      predicted: avgChurnImpact,
      confidence,
      range: {
        min: avgChurnImpact - churnStdDev,
        max: avgChurnImpact + churnStdDev
      },
      affectedCustomers: Math.round(customerBase * Math.abs(avgChurnImpact) * 10)
    },
    adoptionRate: {
      predicted: avgAdoptionRate,
      confidence,
      range: {
        min: Math.max(0, avgAdoptionRate - 0.2),
        max: Math.min(1, avgAdoptionRate + 0.2)
      }
    },
    revenueImpact: {
      predicted: estimatedRevenue,
      confidence: confidence * 0.7, // Lower confidence on revenue
      range: {
        min: estimatedRevenue * 0.5,
        max: estimatedRevenue * 1.5
      }
    }
  };
}

/**
 * Use AI to generate business insights
 */
async function generateAIInsights(
  suggestion: any,
  similarFeatures: any[],
  predictions: any
): Promise<{ justification: string; assumptions: string[]; mitigations: string[] }> {
  const theme = suggestion.themes as any;

  const prompt = `You are a product strategy AI analyzing a roadmap decision.

Feature Being Considered: ${theme.theme_name}
Current Priority: ${suggestion.priority_level} (score: ${suggestion.priority_score})
User Mentions: ${theme.frequency}
Current Sentiment: ${theme.avg_sentiment}

Historical Similar Features (${similarFeatures.length} found):
${similarFeatures.slice(0, 3).map((f: any) => `- ${f.name}: Sentiment impact ${f.sentimentImpact.toFixed(2)}, Churn impact ${f.churnImpact.toFixed(2)}, Success: ${f.successRating}/5`).join('\n')}

Predicted Impact if Built:
- Sentiment: ${predictions.sentimentImpact.predicted > 0 ? '+' : ''}${predictions.sentimentImpact.predicted.toFixed(2)}
- Churn Reduction: ${predictions.churnImpact.predicted > 0 ? '+' : ''}${(predictions.churnImpact.predicted * 100).toFixed(1)}%
- Expected Adoption: ${(predictions.adoptionRate.predicted * 100).toFixed(0)}%
- Revenue Impact: $${predictions.revenueImpact.predicted.toLocaleString()}

Provide:
1. A 2-3 sentence business justification for building or deferring this feature
2. Key assumptions this prediction relies on (3 items)
3. Risk mitigation strategies (3 items)

Format as JSON:
{
  "justification": "...",
  "assumptions": ["...", "...", "..."],
  "mitigations": ["...", "...", "..."]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      justification: result.justification || 'Unable to generate justification',
      assumptions: result.assumptions || [],
      mitigations: result.mitigations || []
    };
  } catch (error) {
    console.error('[Impact Simulation] Error generating AI insights:', error);
    return {
      justification: 'Unable to generate AI insights due to an error',
      assumptions: [
        'Historical data is representative of future outcomes',
        'Customer behavior remains consistent',
        'No major market changes occur'
      ],
      mitigations: [
        'Run a beta test with subset of users',
        'Monitor metrics closely post-launch',
        'Prepare rollback plan if needed'
      ]
    };
  }
}

/**
 * Generate comparison recommendation using AI
 */
async function generateComparisonRecommendation(predictions: ImpactPrediction[]): Promise<string> {
  const prompt = `You are a product strategy advisor. Compare these ${predictions.length} feature scenarios and provide a clear recommendation (2-3 sentences).

Scenarios:
${predictions.map((p, i) => `
${i + 1}. ${p.scenario.themeName} (${p.scenario.action})
   - Sentiment Impact: ${p.sentimentImpact.predicted > 0 ? '+' : ''}${p.sentimentImpact.predicted.toFixed(2)}
   - Churn Impact: ${(p.churnImpact.predicted * 100).toFixed(1)}%
   - Revenue: $${p.revenueImpact.predicted.toLocaleString()}
   - Risk: ${p.riskLevel}
   - Confidence: ${(p.confidence * 100).toFixed(0)}%
`).join('\n')}

Recommendation:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0].message.content || 'Unable to generate recommendation';
  } catch (error) {
    console.error('[Impact Simulation] Error generating recommendation:', error);
    return 'Unable to generate recommendation due to an error';
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Assess overall risk level
 */
function assessRiskLevel(predictions: any): 'low' | 'medium' | 'high' {
  const { sentimentImpact, churnImpact } = predictions;

  // High risk if predictions show negative outcomes
  if (sentimentImpact.predicted < -0.1 || churnImpact.predicted > 0.02) {
    return 'high';
  }

  // Low risk if predictions are very positive
  if (sentimentImpact.predicted > 0.2 && churnImpact.predicted < -0.02) {
    return 'low';
  }

  return 'medium';
}

/**
 * Calculate overall confidence based on data availability
 */
function calculateOverallConfidence(similarFeatureCount: number, predictions: any): number {
  if (similarFeatureCount === 0) return 0.2;
  if (similarFeatureCount < 3) return 0.4;
  if (similarFeatureCount < 5) return 0.6;
  if (similarFeatureCount < 10) return 0.8;
  return 0.9;
}

/**
 * Assess data quality
 */
function assessDataQuality(similarFeatureCount: number): 'high' | 'medium' | 'low' {
  if (similarFeatureCount >= 5) return 'high';
  if (similarFeatureCount >= 2) return 'medium';
  return 'low';
}

/**
 * Calculate ROI for ranking
 */
function calculateROI(prediction: ImpactPrediction): number {
  const effortCost = {
    low: 5000,
    medium: 20000,
    high: 50000,
    very_high: 100000
  };

  const cost = effortCost[prediction.scenario.estimatedEffort];
  const benefit = prediction.revenueImpact.predicted;

  return benefit / cost;
}
