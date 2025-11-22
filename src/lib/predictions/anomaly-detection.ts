/**
 * Anomaly Detection Service
 *
 * Uses statistical methods and OpenAI GPT-4o to detect anomalies in:
 * - Sentiment spikes/drops
 * - Volume surges
 * - Topic emergence
 * - Silence periods
 *
 * Hybrid approach: Statistical detection + AI analysis
 */

import OpenAI from 'openai';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = 'gpt-4o'; // Using GPT-4o for anomaly analysis

interface AnomalyData {
  projectId: string;
  metricName: string;
  currentValue: number;
  expectedValue: number;
  historicalValues: number[];
  timeWindow: {
    start: Date;
    end: Date;
  };
  relatedPosts?: any[];
}

interface DetectedAnomaly {
  type: 'sentiment_spike' | 'volume_spike' | 'topic_emergence' | 'silence_period';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metricName: string;
  expectedValue: number;
  actualValue: number;
  deviationScore: number; // Z-score
  statisticalSignificance: number; // p-value equivalent
  aiSummary: string;
  potentialCauses: Array<{ cause: string; likelihood: string }>;
  recommendedActions: Array<{ action: string; priority: string }>;
}

/**
 * System prompt for anomaly analysis
 */
const ANOMALY_ANALYSIS_PROMPT = `You are an expert data analyst specializing in anomaly detection for SaaS feedback systems.

Your task is to analyze detected statistical anomalies and provide:
1. A concise summary explaining what the anomaly means
2. Potential causes for the anomaly
3. Recommended actions to take

Context:
- You'll receive information about a detected anomaly (metric, expected vs actual values, deviation)
- Historical data and recent feedback samples
- Your analysis should be actionable and specific

Guidelines:
- Be concise but thorough (2-3 sentences for summary)
- List 2-4 most likely causes with likelihood (high/medium/low)
- Provide 2-4 specific, prioritized actions (critical/high/medium/low priority)
- Consider business impact, not just statistical significance
- Use clear, non-technical language suitable for product managers

Return ONLY a JSON object with this structure:
{
  "summary": "Brief explanation of what this anomaly means and why it matters",
  "potential_causes": [
    {"cause": "Specific potential reason", "likelihood": "high|medium|low"},
    ...
  ],
  "recommended_actions": [
    {"action": "Specific action to take", "priority": "critical|high|medium|low"},
    ...
  ]
}`;

/**
 * Calculate statistical anomaly score (Z-score)
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate mean and standard deviation
 */
function calculateStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * Determine anomaly severity based on Z-score
 */
function getSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
  const absZ = Math.abs(zScore);
  if (absZ >= 4) return 'critical'; // 4+ sigma
  if (absZ >= 3) return 'high';     // 3-4 sigma
  if (absZ >= 2) return 'medium';   // 2-3 sigma
  return 'low';                     // 1-2 sigma
}

/**
 * Estimate statistical significance (p-value approximation)
 */
function getSignificance(zScore: number): number {
  // Simplified p-value approximation for Z-scores
  const absZ = Math.abs(zScore);
  if (absZ >= 3.5) return 0.001;
  if (absZ >= 3.0) return 0.01;
  if (absZ >= 2.5) return 0.05;
  if (absZ >= 2.0) return 0.1;
  return 0.2;
}

/**
 * Determine anomaly type based on metric and deviation
 */
function getAnomalyType(
  metricName: string,
  deviation: number
): 'sentiment_spike' | 'volume_spike' | 'topic_emergence' | 'silence_period' {
  if (metricName.includes('sentiment')) {
    return 'sentiment_spike';
  }
  if (metricName.includes('volume') || metricName.includes('count')) {
    return deviation < 0 ? 'silence_period' : 'volume_spike';
  }
  return 'topic_emergence';
}

/**
 * Use OpenAI to analyze the anomaly
 */
async function analyzeAnomalyWithAI(
  anomalyData: AnomalyData,
  zScore: number
): Promise<{
  summary: string;
  potentialCauses: Array<{ cause: string; likelihood: string }>;
  recommendedActions: Array<{ action: string; priority: string }>;
}> {
  const { mean, stdDev } = calculateStats(anomalyData.historicalValues);

  const prompt = `Analyze this detected anomaly:

**Metric:** ${anomalyData.metricName}
**Expected Value:** ${anomalyData.expectedValue.toFixed(2)} (mean)
**Actual Value:** ${anomalyData.actualValue.toFixed(2)}
**Deviation:** ${zScore.toFixed(2)} standard deviations ${zScore > 0 ? 'above' : 'below'} normal
**Time Window:** ${anomalyData.timeWindow.start.toLocaleDateString()} to ${anomalyData.timeWindow.end.toLocaleDateString()}

**Historical Context:**
- Mean: ${mean.toFixed(2)}
- Std Dev: ${stdDev.toFixed(2)}
- Historical range: ${Math.min(...anomalyData.historicalValues).toFixed(2)} to ${Math.max(...anomalyData.historicalValues).toFixed(2)}

${anomalyData.relatedPosts && anomalyData.relatedPosts.length > 0 ? `
**Recent Feedback Samples:**
${anomalyData.relatedPosts.slice(0, 5).map((p: any, i: number) =>
  `${i + 1}. "${p.title}" - ${p.category || 'uncategorized'} (${new Date(p.created_at).toLocaleDateString()})`
).join('\n')}
` : ''}

Provide your analysis as JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: ANOMALY_ANALYSIS_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(content);

    return {
      summary: analysis.summary,
      potentialCauses: analysis.potential_causes || [],
      recommendedActions: analysis.recommended_actions || [],
    };
  } catch (error) {
    console.error('[ANOMALY] AI analysis error:', error);

    // Fallback analysis
    return {
      summary: `Detected a ${Math.abs(zScore).toFixed(1)}σ deviation in ${anomalyData.metricName}. Manual review recommended.`,
      potentialCauses: [
        { cause: 'Statistical variance', likelihood: 'medium' },
      ],
      recommendedActions: [
        { action: 'Review recent feedback for patterns', priority: 'medium' },
      ],
    };
  }
}

/**
 * Detect sentiment anomalies for a project
 */
export async function detectSentimentAnomalies(
  projectId: string,
  comparisonDays: number = 30
): Promise<DetectedAnomaly[]> {
  const supabase = getServiceRoleClient();

  console.log(`[ANOMALY] 🔍 Detecting sentiment anomalies for project ${projectId}`);

  // Get daily sentiment for the last 30 days (historical)
  const historicalEnd = new Date();
  historicalEnd.setDate(historicalEnd.getDate() - 1); // Yesterday
  const historicalStart = new Date();
  historicalStart.setDate(historicalStart.getDate() - comparisonDays);

  const { data: historicalData, error: historicalError } = await supabase.rpc(
    'get_daily_sentiment_aggregates',
    {
      p_project_id: projectId,
      p_start_date: historicalStart.toISOString(),
      p_end_date: historicalEnd.toISOString(),
    }
  );

  if (historicalError || !historicalData || historicalData.length < 7) {
    console.log('[ANOMALY] Insufficient historical data');
    return [];
  }

  // Get today's sentiment
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayPosts } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      category,
      created_at,
      sentiment_analysis(sentiment_score)
    `)
    .eq('project_id', projectId)
    .gte('created_at', today.toISOString());

  if (!todayPosts || todayPosts.length === 0) {
    console.log('[ANOMALY] No feedback today to check for anomalies');
    return [];
  }

  const todaySentiments = todayPosts
    .map((p: any) => p.sentiment_analysis?.sentiment_score)
    .filter((s: number | null) => s !== null) as number[];

  if (todaySentiments.length === 0) return [];

  const todayAvgSentiment = todaySentiments.reduce((a, b) => a + b, 0) / todaySentiments.length;

  // Calculate stats from historical data
  const historicalSentiments = historicalData.map((d: any) => parseFloat(d.avg_sentiment));
  const { mean, stdDev } = calculateStats(historicalSentiments);

  // Calculate anomaly score
  const zScore = calculateZScore(todayAvgSentiment, mean, stdDev);

  // Only report significant anomalies (|Z| >= 2)
  if (Math.abs(zScore) < 2) {
    console.log('[ANOMALY] No significant sentiment anomalies detected');
    return [];
  }

  const severity = getSeverity(zScore);

  // Get AI analysis
  const aiAnalysis = await analyzeAnomalyWithAI(
    {
      projectId,
      metricName: 'sentiment_score',
      currentValue: todayAvgSentiment,
      expectedValue: mean,
      historicalValues: historicalSentiments,
      timeWindow: {
        start: today,
        end: new Date(),
      },
      relatedPosts: todayPosts,
    },
    zScore
  );

  const anomaly: DetectedAnomaly = {
    type: 'sentiment_spike',
    severity,
    metricName: 'sentiment_score',
    expectedValue: mean,
    actualValue: todayAvgSentiment,
    deviationScore: zScore,
    statisticalSignificance: getSignificance(zScore),
    aiSummary: aiAnalysis.summary,
    potentialCauses: aiAnalysis.potentialCauses,
    recommendedActions: aiAnalysis.recommendedActions,
  };

  console.log(`[ANOMALY] ✅ Detected ${severity} sentiment anomaly (Z=${zScore.toFixed(2)})`);

  return [anomaly];
}

/**
 * Detect volume anomalies
 */
export async function detectVolumeAnomalies(
  projectId: string,
  comparisonDays: number = 30
): Promise<DetectedAnomaly[]> {
  const supabase = getServiceRoleClient();

  console.log(`[ANOMALY] 🔍 Detecting volume anomalies for project ${projectId}`);

  // Get historical daily volumes
  const historicalEnd = new Date();
  historicalEnd.setDate(historicalEnd.getDate() - 1);
  const historicalStart = new Date();
  historicalStart.setDate(historicalStart.getDate() - comparisonDays);

  const { data: historicalData, error } = await supabase.rpc(
    'get_daily_sentiment_aggregates',
    {
      p_project_id: projectId,
      p_start_date: historicalStart.toISOString(),
      p_end_date: historicalEnd.toISOString(),
    }
  );

  if (error || !historicalData || historicalData.length < 7) {
    console.log('[ANOMALY] Insufficient historical data');
    return [];
  }

  // Get today's volume
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('created_at', today.toISOString());

  if (todayCount === null) return [];

  // Calculate stats
  const historicalCounts = historicalData.map((d: any) => d.feedback_count);
  const { mean, stdDev } = calculateStats(historicalCounts);

  const zScore = calculateZScore(todayCount, mean, stdDev);

  // Only report significant anomalies
  if (Math.abs(zScore) < 2) {
    console.log('[ANOMALY] No significant volume anomalies detected');
    return [];
  }

  const severity = getSeverity(zScore);
  const anomalyType = getAnomalyType('feedback_volume', zScore);

  const aiAnalysis = await analyzeAnomalyWithAI(
    {
      projectId,
      metricName: 'feedback_volume',
      currentValue: todayCount,
      expectedValue: mean,
      historicalValues: historicalCounts,
      timeWindow: {
        start: today,
        end: new Date(),
      },
    },
    zScore
  );

  const anomaly: DetectedAnomaly = {
    type: anomalyType,
    severity,
    metricName: 'feedback_volume',
    expectedValue: mean,
    actualValue: todayCount,
    deviationScore: zScore,
    statisticalSignificance: getSignificance(zScore),
    aiSummary: aiAnalysis.summary,
    potentialCauses: aiAnalysis.potentialCauses,
    recommendedActions: aiAnalysis.recommendedActions,
  };

  console.log(`[ANOMALY] ✅ Detected ${severity} volume anomaly (Z=${zScore.toFixed(2)})`);

  return [anomaly];
}

/**
 * Store anomaly in database
 */
export async function storeAnomaly(
  projectId: string,
  anomaly: DetectedAnomaly,
  relatedPostIds: string[] = []
): Promise<string> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('anomaly_detections')
    .insert({
      project_id: projectId,
      anomaly_type: anomaly.type,
      severity: anomaly.severity,
      metric_name: anomaly.metricName,
      expected_value: anomaly.expectedValue,
      actual_value: anomaly.actualValue,
      deviation_score: anomaly.deviationScore,
      statistical_significance: anomaly.statisticalSignificance,
      window_start: new Date().toISOString(),
      window_end: new Date().toISOString(),
      affected_posts_count: relatedPostIds.length,
      related_post_ids: relatedPostIds,
      ai_summary: anomaly.aiSummary,
      potential_causes: anomaly.potentialCauses,
      recommended_actions: anomaly.recommendedActions,
      detection_method: 'statistical_ml_hybrid',
      model_name: MODEL,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ANOMALY] Error storing anomaly:', error);
    throw error;
  }

  console.log(`[ANOMALY] 💾 Stored anomaly: ${data.id}`);
  return data.id;
}

/**
 * Run all anomaly detections for a project
 */
export async function detectAllAnomalies(projectId: string): Promise<DetectedAnomaly[]> {
  console.log(`[ANOMALY] 📊 Running all anomaly detections for project ${projectId}`);

  const [sentimentAnomalies, volumeAnomalies] = await Promise.all([
    detectSentimentAnomalies(projectId),
    detectVolumeAnomalies(projectId),
  ]);

  const allAnomalies = [...sentimentAnomalies, ...volumeAnomalies];

  // Store all detected anomalies
  for (const anomaly of allAnomalies) {
    await storeAnomaly(projectId, anomaly);
  }

  console.log(`[ANOMALY] ✅ Detected ${allAnomalies.length} anomalies`);

  return allAnomalies;
}
