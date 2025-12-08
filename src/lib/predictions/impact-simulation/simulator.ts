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
import { getOpenAI } from '@/lib/openai-client';
import { estimateFeatureEffort } from '@/lib/predictions/effort-estimation';


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

  // 3. Calculate predictions based on historical data and current feedback
  const predictions = await calculatePredictions(projectId, suggestionId, similarFeatures, theme);

  // 4. Use AI to generate business justification and insights
  const aiInsights = await generateAIInsights(suggestion, similarFeatures, predictions);

  // Calculate confidence and data quality using enhanced metrics
  const confidence = await calculateOverallConfidence(
    projectId,
    theme.id,
    similarFeatures.length,
    predictions
  );
  const dataQuality = await assessDataQuality(projectId, theme.id, similarFeatures.length);

  // Estimate effort based on historical data and theme characteristics
  const effortEstimate = await estimateFeatureEffort(
    projectId,
    theme.theme_name,
    theme.id,
    theme.frequency || 0
  );

  return {
    scenario: {
      action: 'build',
      suggestionId: suggestion.id,
      themeName: theme.theme_name,
      estimatedEffort: effortEstimate.effort,
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
    confidence,
    dataQuality
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
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find similar features using semantic embeddings
 * This provides more accurate matching than keyword-based approaches
 */
async function findSimilarFeaturesWithEmbeddings(
  projectId: string,
  themeName: string,
  features: any[]
): Promise<any[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }

  try {
    // Generate embedding for the theme name
    const response = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: themeName,
      encoding_format: 'float',
    });

    const themeEmbedding = response.data[0].embedding;

    // Calculate similarity for each feature
    const scored = await Promise.all(
      features.map(async (feature) => {
        try {
          // Generate embedding for feature name
          const featureResponse = await getOpenAI().embeddings.create({
            model: 'text-embedding-3-small',
            input: feature.feature_name,
            encoding_format: 'float',
          });

          const featureEmbedding = featureResponse.data[0].embedding;
          const similarity = cosineSimilarity(themeEmbedding, featureEmbedding);

          return {
            feature,
            similarity: Math.max(0, similarity) // Ensure non-negative
          };
        } catch (error) {
          console.error(`[Embeddings] Error processing feature ${feature.feature_name}:`, error);
          return { feature, similarity: 0 };
        }
      })
    );

    // Return top matches (similarity > 0.5 for embeddings)
    return scored
      .filter(s => s.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
      .map(s => ({
        name: s.feature.feature_name,
        sentimentImpact: Number(s.feature.sentiment_impact) || 0,
        churnImpact: Number(s.feature.churn_impact) || 0,
        adoptionRate: Number(s.feature.post_adoption_rate) || 0,
        successRating: s.feature.success_rating || 3,
        similarity: s.similarity
      }));
  } catch (error) {
    console.error('[Embeddings] Error in semantic feature matching:', error);
    return [];
  }
}

/**
 * Find similar features from history based on theme name, category, etc.
 * Enhanced algorithm with better similarity scoring
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

  // Enhanced similarity: hybrid approach using embeddings + keyword matching
  // Try to use embeddings for semantic matching first
  const useEmbeddings = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;

  let embeddingResults: any[] = [];
  if (useEmbeddings) {
    try {
      embeddingResults = await findSimilarFeaturesWithEmbeddings(projectId, themeName, features);
    } catch (error) {
      console.error('[Impact Simulation] Embeddings search failed, falling back to keyword matching:', error);
    }
  }

  // Always do keyword matching as fallback/complement
  const themeWords = themeName.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Common stop words to ignore
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were', 'been', 'have', 'has']);
  const meaningfulWords = themeWords.filter(w => !stopWords.has(w));

  // Simple stemming function (basic suffix removal)
  const stem = (word: string): string => {
    // Remove common suffixes
    return word
      .replace(/(ing|ed|s|es|tion|ness|ment|ity|er|or|ly|ful)$/, '')
      .substring(0, Math.max(3, word.length - 3)); // Keep at least 3 chars
  };

  // Common feature synonyms for better matching
  const synonyms: Record<string, string[]> = {
    'dark': ['night', 'theme', 'mode'],
    'auth': ['login', 'signin', 'authentication', 'signup', 'register'],
    'search': ['find', 'lookup', 'query', 'filter'],
    'export': ['download', 'save', 'extract'],
    'import': ['upload', 'load', 'add'],
    'notification': ['alert', 'notify', 'reminder'],
    'performance': ['speed', 'fast', 'slow', 'optimize'],
    'bug': ['issue', 'error', 'problem', 'fix'],
    'integration': ['connect', 'link', 'sync'],
    'mobile': ['ios', 'android', 'app', 'phone'],
  };

  // Get stems and synonyms for theme words
  const themeStems = meaningfulWords.map(stem);
  const themeSynonyms = new Set(meaningfulWords.flatMap(w => synonyms[w] || []));

  const scored = features.map(f => {
    const featureWords = f.feature_name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const meaningfulFeatureWords = featureWords.filter(w => !stopWords.has(w));
    const featureStems = meaningfulFeatureWords.map(stem);

    // Calculate multiple similarity metrics
    let matchScore = 0;

    // 1. Exact word matches (highest weight)
    const exactMatches = meaningfulWords.filter(w => meaningfulFeatureWords.includes(w)).length;
    matchScore += exactMatches * 3;

    // 2. Stemmed word matches (high weight)
    const stemMatches = themeStems.filter(s => featureStems.includes(s)).length - exactMatches;
    matchScore += stemMatches * 2;

    // 3. Synonym matches (medium-high weight)
    const synonymMatches = meaningfulFeatureWords.filter(w => themeSynonyms.has(w)).length;
    matchScore += synonymMatches * 1.5;

    // 4. Partial word matches (medium weight)
    const partialMatches = meaningfulWords.filter(w =>
      meaningfulFeatureWords.some(fw => fw.includes(w) || w.includes(fw))
    ).length - exactMatches - stemMatches;
    matchScore += partialMatches * 1;

    // 3. Category match bonus
    if (f.feature_category) {
      const categoryWords = f.feature_category.toLowerCase().split(/\s+/);
      const categoryMatch = meaningfulWords.some(w => categoryWords.includes(w));
      if (categoryMatch) matchScore += 1;
    }

    // Normalize by average word count
    const avgWordCount = (meaningfulWords.length + meaningfulFeatureWords.length) / 2;
    const similarity = avgWordCount > 0 ? matchScore / avgWordCount : 0;

    return {
      feature: f,
      similarity: Math.min(1.0, similarity)
    };
  });

  // Merge embedding results with keyword results if both available
  if (embeddingResults.length > 0) {
    // Create a map of embedding results for quick lookup
    const embeddingMap = new Map(
      embeddingResults.map(r => [r.name, r.similarity])
    );

    // Combine scores: 70% embeddings, 30% keywords for features in both
    const combined = scored.map(s => {
      const embeddingSim = embeddingMap.get(s.feature.feature_name) || 0;
      const combinedScore = embeddingSim > 0
        ? embeddingSim * 0.7 + s.similarity * 0.3
        : s.similarity;

      return {
        feature: s.feature,
        similarity: combinedScore
      };
    });

    // Return top matches (similarity > 0.1)
    return combined
      .filter(s => s.similarity > 0.1)
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

  // Fallback to keyword-only results
  return scored
    .filter(s => s.similarity > 0.1)
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
 * Enhanced to use current feedback data when historical data is unavailable
 */
async function calculatePredictions(
  projectId: string,
  suggestionId: string,
  similarFeatures: any[],
  theme: any
) {
  const supabase = getServiceRoleClient();

  // Fetch current feedback data for better baseline predictions
  const { data: feedbackData } = await supabase
    .from('posts')
    .select('id, vote_count, comment_count, category')
    .contains('themes', [theme.id])
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: sentimentData } = await supabase
    .from('sentiment_analysis')
    .select('sentiment_score, text_snippet')
    .contains('theme_ids', [theme.id])
    .order('created_at', { ascending: false })
    .limit(100);

  // Calculate current data metrics
  const currentDataMetrics = {
    feedbackVolume: feedbackData?.length || 0,
    avgEngagement: feedbackData
      ? feedbackData.reduce((sum, p) => sum + (p.vote_count || 0) + (p.comment_count || 0), 0) / Math.max(feedbackData.length, 1)
      : 0,
    currentSentiment: theme.avg_sentiment || 0,
    sentimentSampleSize: sentimentData?.length || 0
  };

  if (similarFeatures.length === 0) {
    // No historical data - use data-driven estimates based on current feedback
    return calculatePredictionsFromCurrentData(theme, currentDataMetrics);
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

  // Confidence based on multiple factors (not just sample size)
  const historicalDataConfidence = Math.min(0.5, 0.2 + similarFeatures.length * 0.05);
  const currentDataConfidence = calculateCurrentDataConfidence(currentDataMetrics);
  const confidence = Math.min(0.9, (historicalDataConfidence + currentDataConfidence) / 2);

  // Fixed revenue calculation - use proper estimation model
  const estimatedRevenue = calculateRevenueImpact(theme, avgChurnImpact, currentDataMetrics);

  return {
    sentimentImpact: {
      predicted: avgSentimentImpact,
      confidence,
      range: {
        min: avgSentimentImpact - sentimentStdDev * 1.5,
        max: avgSentimentImpact + sentimentStdDev * 1.5
      }
    },
    churnImpact: {
      predicted: avgChurnImpact,
      confidence,
      range: {
        min: avgChurnImpact - churnStdDev * 1.5,
        max: avgChurnImpact + churnStdDev * 1.5
      },
      affectedCustomers: estimateAffectedCustomers(theme, currentDataMetrics)
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
      confidence: confidence * 0.7, // Lower confidence on revenue (needs business data)
      range: {
        min: estimatedRevenue * 0.5,
        max: estimatedRevenue * 2.0
      }
    }
  };
}

/**
 * Calculate predictions using only current feedback data (no historical data available)
 * More accurate than hardcoded fallbacks
 */
function calculatePredictionsFromCurrentData(theme: any, currentDataMetrics: any) {
  // Predict sentiment impact based on current sentiment
  // If current sentiment is very negative, fixing it will have high positive impact
  const currentSentiment = currentDataMetrics.currentSentiment;
  let predictedSentimentImpact = 0.15; // Default moderate improvement

  if (currentSentiment < -0.3) {
    // High pain point - expect significant improvement
    predictedSentimentImpact = 0.25;
  } else if (currentSentiment < 0) {
    // Moderate pain point
    predictedSentimentImpact = 0.18;
  } else if (currentSentiment > 0.3) {
    // Nice-to-have feature - smaller improvement
    predictedSentimentImpact = 0.08;
  }

  // Predict churn impact based on sentiment and engagement
  const avgEngagement = currentDataMetrics.avgEngagement;
  let predictedChurnImpact = -0.015; // Default small churn reduction

  if (currentSentiment < -0.3 && avgEngagement > 5) {
    // High frustration with high engagement = significant churn risk
    predictedChurnImpact = -0.04; // 4% churn reduction if fixed
  } else if (currentSentiment < -0.1 && avgEngagement > 3) {
    // Moderate issue
    predictedChurnImpact = -0.025; // 2.5% churn reduction
  } else if (currentSentiment > 0.2) {
    // Positive feature request - minimal churn impact
    predictedChurnImpact = -0.005; // 0.5% churn reduction
  }

  // Predict adoption rate based on engagement
  let predictedAdoption = 0.35; // Default

  if (avgEngagement > 10) {
    // High engagement indicates high interest
    predictedAdoption = 0.55;
  } else if (avgEngagement > 5) {
    predictedAdoption = 0.45;
  } else if (avgEngagement < 2) {
    predictedAdoption = 0.25;
  }

  // Calculate confidence based on data quality
  const confidence = calculateCurrentDataConfidence(currentDataMetrics);

  // Revenue estimation (conservative without historical data)
  const estimatedRevenue = calculateRevenueImpact(theme, predictedChurnImpact, currentDataMetrics);

  return {
    sentimentImpact: {
      predicted: predictedSentimentImpact,
      confidence,
      range: {
        min: predictedSentimentImpact * 0.5,
        max: predictedSentimentImpact * 1.8
      }
    },
    churnImpact: {
      predicted: predictedChurnImpact,
      confidence,
      range: {
        min: predictedChurnImpact * 2.0, // Wider range due to uncertainty
        max: predictedChurnImpact * 0.3
      },
      affectedCustomers: estimateAffectedCustomers(theme, currentDataMetrics)
    },
    adoptionRate: {
      predicted: predictedAdoption,
      confidence,
      range: {
        min: Math.max(0.15, predictedAdoption - 0.25),
        max: Math.min(0.8, predictedAdoption + 0.25)
      }
    },
    revenueImpact: {
      predicted: estimatedRevenue,
      confidence: confidence * 0.6, // Lower confidence without historical data
      range: {
        min: 0, // Conservative lower bound
        max: estimatedRevenue * 3.0 // Wide upper range
      }
    }
  };
}

/**
 * Calculate confidence based on current data quality
 */
function calculateCurrentDataConfidence(metrics: any): number {
  let confidence = 0.2; // Base confidence

  // More feedback = higher confidence
  if (metrics.feedbackVolume >= 50) {
    confidence += 0.2;
  } else if (metrics.feedbackVolume >= 20) {
    confidence += 0.15;
  } else if (metrics.feedbackVolume >= 10) {
    confidence += 0.1;
  } else if (metrics.feedbackVolume >= 5) {
    confidence += 0.05;
  }

  // Sentiment sample size matters
  if (metrics.sentimentSampleSize >= 30) {
    confidence += 0.15;
  } else if (metrics.sentimentSampleSize >= 10) {
    confidence += 0.1;
  } else if (metrics.sentimentSampleSize >= 5) {
    confidence += 0.05;
  }

  // Engagement indicates data quality
  if (metrics.avgEngagement >= 10) {
    confidence += 0.1;
  } else if (metrics.avgEngagement >= 5) {
    confidence += 0.05;
  }

  return Math.min(0.7, confidence); // Cap at 0.7 without historical validation
}

/**
 * Fixed revenue calculation - doesn't use mention count as customer count
 */
function calculateRevenueImpact(theme: any, churnImpact: number, currentDataMetrics: any): number {
  // Revenue impact calculation requires actual business metrics
  // Without subscriber data, we estimate conservatively

  // Estimate potential annual value based on engagement and mention frequency
  const mentionFrequency = theme.frequency || 0;
  const avgEngagement = currentDataMetrics.avgEngagement || 1;

  // High engagement + many mentions = higher potential value
  // Assume each highly engaged mention represents ~$100-500/year in risk/opportunity
  const valuePerMention = avgEngagement > 5 ? 300 : avgEngagement > 2 ? 150 : 50;

  // Churn impact translates to revenue
  // If we reduce churn by X%, revenue impact = (affected customers * value per mention)
  const estimatedAnnualImpact = Math.abs(churnImpact) * mentionFrequency * valuePerMention;

  // Return conservative estimate
  return Math.round(estimatedAnnualImpact);
}

/**
 * Estimate affected customers (not using mention count directly)
 */
function estimateAffectedCustomers(theme: any, currentDataMetrics: any): number {
  const mentionFrequency = theme.frequency || 0;
  const avgEngagement = currentDataMetrics.avgEngagement || 1;

  // Each mention might represent 1-5 affected customers depending on engagement
  // High engagement = more customers affected per mention
  const multiplier = avgEngagement > 10 ? 5 : avgEngagement > 5 ? 3 : avgEngagement > 2 ? 2 : 1;

  return Math.round(mentionFrequency * multiplier);
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
    const response = await getOpenAI().chat.completions.create({
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
    const response = await getOpenAI().chat.completions.create({
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
 * Detect product maturity based on historical data
 */
async function detectProductMaturity(projectId: string): Promise<'early' | 'growth' | 'mature'> {
  const supabase = getServiceRoleClient();

  // Count total launched features
  const { count: launchedFeatures } = await supabase
    .from('feature_impact_history')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  // Count total feedback items
  const { count: totalFeedback } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  // Determine maturity stage
  if ((launchedFeatures || 0) < 3 || (totalFeedback || 0) < 20) {
    return 'early'; // Early-stage: Limited historical data
  } else if ((launchedFeatures || 0) < 10 || (totalFeedback || 0) < 100) {
    return 'growth'; // Growth-stage: Building data
  } else {
    return 'mature'; // Mature: Rich historical data
  }
}

/**
 * Calculate overall confidence based on multiple data sources
 * Enhanced to consider both historical and current data quality
 * Adjusted for product maturity to avoid penalizing early-stage products
 */
async function calculateOverallConfidence(
  projectId: string,
  themeId: string,
  similarFeatureCount: number,
  predictions: any
): Promise<number> {
  const supabase = getServiceRoleClient();

  // Detect product maturity
  const maturity = await detectProductMaturity(projectId);

  // Get current data availability
  const { count: feedbackCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .contains('themes', [themeId]);

  const { count: sentimentCount } = await supabase
    .from('sentiment_analysis')
    .select('id', { count: 'exact', head: true })
    .contains('theme_ids', [themeId]);

  // Adjust base confidence based on maturity
  // Early-stage products start with higher base confidence since they have less data by nature
  let confidence = maturity === 'early' ? 0.3 : maturity === 'growth' ? 0.25 : 0.2;

  // Historical data contribution (up to 0.4)
  // More progressive scoring for early-stage products
  if (maturity === 'early') {
    // Early-stage: More forgiving thresholds
    if (similarFeatureCount >= 3) {
      confidence += 0.4;
    } else if (similarFeatureCount >= 2) {
      confidence += 0.3;
    } else if (similarFeatureCount >= 1) {
      confidence += 0.2;
    }
  } else if (maturity === 'growth') {
    // Growth-stage: Moderate thresholds
    if (similarFeatureCount >= 5) {
      confidence += 0.4;
    } else if (similarFeatureCount >= 3) {
      confidence += 0.3;
    } else if (similarFeatureCount >= 2) {
      confidence += 0.2;
    } else if (similarFeatureCount >= 1) {
      confidence += 0.1;
    }
  } else {
    // Mature: Original strict thresholds
    if (similarFeatureCount >= 10) {
      confidence += 0.4;
    } else if (similarFeatureCount >= 5) {
      confidence += 0.3;
    } else if (similarFeatureCount >= 3) {
      confidence += 0.2;
    } else if (similarFeatureCount >= 1) {
      confidence += 0.1;
    }
  }

  // Current feedback data contribution (up to 0.3)
  // Progressive scoring based on maturity
  const feedbackScore = (feedbackCount || 0);
  if (maturity === 'early') {
    // Early-stage: Lower thresholds
    if (feedbackScore >= 10) {
      confidence += 0.3;
    } else if (feedbackScore >= 5) {
      confidence += 0.25;
    } else if (feedbackScore >= 3) {
      confidence += 0.2;
    } else if (feedbackScore >= 1) {
      confidence += 0.15;
    }
  } else if (maturity === 'growth') {
    // Growth-stage: Moderate thresholds
    if (feedbackScore >= 30) {
      confidence += 0.3;
    } else if (feedbackScore >= 15) {
      confidence += 0.25;
    } else if (feedbackScore >= 8) {
      confidence += 0.2;
    } else if (feedbackScore >= 3) {
      confidence += 0.15;
    }
  } else {
    // Mature: Original thresholds
    if (feedbackScore >= 50) {
      confidence += 0.3;
    } else if (feedbackScore >= 20) {
      confidence += 0.2;
    } else if (feedbackScore >= 10) {
      confidence += 0.15;
    } else if (feedbackScore >= 5) {
      confidence += 0.1;
    }
  }

  // Sentiment data contribution (up to 0.1)
  const sentimentScore = (sentimentCount || 0);
  if (maturity === 'early') {
    // Early-stage: Lower thresholds
    if (sentimentScore >= 5) {
      confidence += 0.1;
    } else if (sentimentScore >= 2) {
      confidence += 0.07;
    } else if (sentimentScore >= 1) {
      confidence += 0.05;
    }
  } else if (maturity === 'growth') {
    // Growth-stage: Moderate thresholds
    if (sentimentScore >= 15) {
      confidence += 0.1;
    } else if (sentimentScore >= 7) {
      confidence += 0.07;
    } else if (sentimentScore >= 3) {
      confidence += 0.05;
    }
  } else {
    // Mature: Original thresholds
    if (sentimentScore >= 30) {
      confidence += 0.1;
    } else if (sentimentScore >= 10) {
      confidence += 0.05;
    }
  }

  return Math.min(0.9, confidence);
}

/**
 * Assess data quality based on multiple factors
 * Enhanced to look at all available data sources
 * Adjusted thresholds based on product maturity
 */
async function assessDataQuality(
  projectId: string,
  themeId: string,
  similarFeatureCount: number
): Promise<'high' | 'medium' | 'low'> {
  const supabase = getServiceRoleClient();

  // Detect product maturity
  const maturity = await detectProductMaturity(projectId);

  // Get current data availability
  const { count: feedbackCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .contains('themes', [themeId]);

  const { count: sentimentCount } = await supabase
    .from('sentiment_analysis')
    .select('id', { count: 'exact', head: true })
    .contains('theme_ids', [themeId]);

  // Score data quality (0-100 scale) with maturity-adjusted thresholds
  let qualityScore = 0;

  // Historical features (up to 40 points)
  if (maturity === 'early') {
    // Early-stage: Lower bar for quality
    if (similarFeatureCount >= 2) {
      qualityScore += 40;
    } else if (similarFeatureCount >= 1) {
      qualityScore += 30;
    }
  } else if (maturity === 'growth') {
    // Growth-stage: Moderate bar
    if (similarFeatureCount >= 3) {
      qualityScore += 40;
    } else if (similarFeatureCount >= 2) {
      qualityScore += 30;
    } else if (similarFeatureCount >= 1) {
      qualityScore += 20;
    }
  } else {
    // Mature: Original strict thresholds
    if (similarFeatureCount >= 5) {
      qualityScore += 40;
    } else if (similarFeatureCount >= 3) {
      qualityScore += 30;
    } else if (similarFeatureCount >= 1) {
      qualityScore += 15;
    }
  }

  // Feedback volume (up to 40 points)
  const feedbackScore = (feedbackCount || 0);
  if (maturity === 'early') {
    // Early-stage: Lower bar
    if (feedbackScore >= 10) {
      qualityScore += 40;
    } else if (feedbackScore >= 5) {
      qualityScore += 30;
    } else if (feedbackScore >= 3) {
      qualityScore += 20;
    } else if (feedbackScore >= 1) {
      qualityScore += 10;
    }
  } else if (maturity === 'growth') {
    // Growth-stage: Moderate bar
    if (feedbackScore >= 30) {
      qualityScore += 40;
    } else if (feedbackScore >= 15) {
      qualityScore += 30;
    } else if (feedbackScore >= 8) {
      qualityScore += 20;
    } else if (feedbackScore >= 3) {
      qualityScore += 10;
    }
  } else {
    // Mature: Original thresholds
    if (feedbackScore >= 50) {
      qualityScore += 40;
    } else if (feedbackScore >= 20) {
      qualityScore += 30;
    } else if (feedbackScore >= 10) {
      qualityScore += 20;
    } else if (feedbackScore >= 5) {
      qualityScore += 10;
    }
  }

  // Sentiment analysis (up to 20 points)
  const sentimentScore = (sentimentCount || 0);
  if (maturity === 'early') {
    // Early-stage: Lower bar
    if (sentimentScore >= 5) {
      qualityScore += 20;
    } else if (sentimentScore >= 2) {
      qualityScore += 15;
    } else if (sentimentScore >= 1) {
      qualityScore += 10;
    }
  } else if (maturity === 'growth') {
    // Growth-stage: Moderate bar
    if (sentimentScore >= 15) {
      qualityScore += 20;
    } else if (sentimentScore >= 7) {
      qualityScore += 15;
    } else if (sentimentScore >= 3) {
      qualityScore += 10;
    }
  } else {
    // Mature: Original thresholds
    if (sentimentScore >= 30) {
      qualityScore += 20;
    } else if (sentimentScore >= 10) {
      qualityScore += 15;
    } else if (sentimentScore >= 5) {
      qualityScore += 10;
    }
  }

  // Classify quality with maturity context
  // Early-stage products have lower bars for "high" quality
  if (maturity === 'early') {
    if (qualityScore >= 60) return 'high';
    if (qualityScore >= 30) return 'medium';
    return 'low';
  } else if (maturity === 'growth') {
    if (qualityScore >= 65) return 'high';
    if (qualityScore >= 35) return 'medium';
    return 'low';
  } else {
    // Mature: Original thresholds
    if (qualityScore >= 70) return 'high';
    if (qualityScore >= 40) return 'medium';
    return 'low';
  }
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
