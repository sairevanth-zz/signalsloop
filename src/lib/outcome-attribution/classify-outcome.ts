/**
 * Classify Outcome
 *
 * Uses GPT-4o to classify feature outcomes after the monitoring period ends.
 * Analyzes pre/post metrics and related feedback to determine success.
 */

import OpenAI from 'openai';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import {
  FeatureOutcome,
  OutcomeClassification,
  ClassificationReasoning,
  ClassificationResult,
  ClassificationJobResult,
  SampleFeedback,
} from '@/types/outcome-attribution';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

/**
 * System prompt for outcome classification
 */
const CLASSIFICATION_SYSTEM_PROMPT = `You are a product analytics expert. Analyze feature launch outcomes based on data.

Given the metrics below, classify this feature launch and explain why.

CLASSIFICATION OPTIONS:
- success: Sentiment improved AND/OR theme volume decreased significantly (users stopped complaining about the problem)
- partial_success: Minor improvements or mixed signals
- no_impact: No meaningful change in metrics
- negative_impact: Metrics worsened after launch

Consider these factors:
1. Sentiment change: Positive delta = improvement (users happier)
2. Theme volume change: Negative delta = improvement (fewer complaints)
3. Sample feedback tone and content
4. Confidence based on data volume

Respond with JSON only:
{
  "classification": "success|partial_success|no_impact|negative_impact",
  "confidence": 0.0-1.0,
  "reasoning": "2-3 sentence explanation of the classification",
  "key_factors": [
    {
      "factor": "description of factor",
      "impact": "positive|negative|neutral",
      "weight": 0.0-1.0,
      "evidence": "specific data point or quote"
    }
  ],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}`;

/**
 * Build the user prompt with metrics data
 */
function buildClassificationPrompt(outcome: FeatureOutcome, themeName: string): string {
  const preShipMetrics = {
    sentiment: outcome.pre_ship_sentiment ?? 'N/A',
    themeVolume: outcome.pre_ship_theme_volume ?? 'N/A',
    churnRisk: outcome.pre_ship_churn_risk ?? 'N/A',
  };

  const postShipMetrics = {
    sentiment: outcome.post_ship_sentiment ?? 'N/A',
    themeVolume: outcome.post_ship_theme_volume ?? 'N/A',
    churnRisk: outcome.post_ship_churn_risk ?? 'N/A',
  };

  const deltas = {
    sentiment: outcome.sentiment_delta ?? 'N/A',
    themeVolume: outcome.theme_volume_delta ?? 'N/A',
  };

  // Format sample feedback
  const feedbackSamples = (outcome.sample_feedback || [])
    .slice(0, 5)
    .map((f: SampleFeedback) => `- "${f.title}" (sentiment: ${f.sentiment_score ?? 'unknown'})`)
    .join('\n');

  return `FEATURE: ${themeName}
SHIPPED: ${new Date(outcome.shipped_at).toLocaleDateString()}
MONITORING PERIOD: 30 days

PRE-SHIP METRICS (30 days before):
- Average Sentiment: ${preShipMetrics.sentiment} (scale: -1 to 1)
- Related Theme Mentions: ${preShipMetrics.themeVolume}
- Churn Risk: ${preShipMetrics.churnRisk}

POST-SHIP METRICS (30 days after):
- Average Sentiment: ${postShipMetrics.sentiment}
- Related Theme Mentions: ${postShipMetrics.themeVolume}
- Churn Risk: ${postShipMetrics.churnRisk}

DELTAS:
- Sentiment Change: ${deltas.sentiment} (positive = improvement)
- Volume Change: ${deltas.themeVolume} (negative = improvement, fewer complaints)

SAMPLE POST-SHIP FEEDBACK:
${feedbackSamples || 'No feedback samples available'}

Analyze and classify this feature launch outcome.`;
}

/**
 * Parse the GPT response into a ClassificationResult
 */
function parseClassificationResponse(
  response: string
): ClassificationResult {
  try {
    const parsed = JSON.parse(response);

    // Validate classification
    const validClassifications: OutcomeClassification[] = [
      'success',
      'partial_success',
      'no_impact',
      'negative_impact',
    ];

    if (!validClassifications.includes(parsed.classification)) {
      throw new Error(`Invalid classification: ${parsed.classification}`);
    }

    // Build reasoning object
    const reasoning: ClassificationReasoning = {
      summary: parsed.reasoning || 'No reasoning provided',
      key_factors: (parsed.key_factors || []).map((f: { factor: string; impact: string; weight: number; evidence: string }) => ({
        factor: f.factor,
        impact: f.impact as 'positive' | 'negative' | 'neutral',
        weight: f.weight,
        evidence: f.evidence,
      })),
      recommendations: parsed.recommendations || [],
      confidence_explanation: `Classification confidence: ${(parsed.confidence * 100).toFixed(0)}%`,
    };

    return {
      classification: parsed.classification as OutcomeClassification,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      reasoning,
    };
  } catch (error) {
    console.error('[ClassifyOutcome] Failed to parse GPT response:', error);
    throw new Error('Failed to parse classification response');
  }
}

/**
 * Classify a single outcome using GPT-4o
 *
 * @param outcomeId - The outcome ID to classify
 * @returns Classification result
 */
export async function classifyOutcome(
  outcomeId: string
): Promise<ClassificationResult> {
  const supabase = getSupabaseServiceRoleClient();
  const openai = getOpenAIClient();

  console.log(`[ClassifyOutcome] Classifying outcome: ${outcomeId}`);

  // 1. Fetch the outcome with related data
  const { data: outcome, error: fetchError } = await supabase
    .from('feature_outcomes')
    .select(`
      *,
      roadmap_suggestions (
        id,
        themes (
          theme_name
        )
      ),
      posts (
        title
      )
    `)
    .eq('id', outcomeId)
    .single();

  if (fetchError || !outcome) {
    throw new Error(`Outcome not found: ${fetchError?.message || 'No data'}`);
  }

  // 2. Verify metrics are available
  if (outcome.post_ship_sentiment === null && outcome.post_ship_theme_volume === null) {
    console.warn(`[ClassifyOutcome] No post-ship metrics for outcome ${outcomeId}`);
  }

  // 3. Build prompt and call GPT-4o
  const themeName = outcome.roadmap_suggestions?.themes?.theme_name || outcome.posts?.title || 'Unknown Feature';
  const userPrompt = buildClassificationPrompt(outcome as FeatureOutcome, themeName);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3, // Lower temperature for more consistent classifications
    max_tokens: 1000,
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error('Empty response from GPT-4o');
  }

  // 4. Parse the response
  const classificationResult = parseClassificationResponse(responseContent);

  // 5. Update the outcome record
  const { error: updateError } = await supabase
    .from('feature_outcomes')
    .update({
      outcome_classification: classificationResult.classification,
      classification_confidence: classificationResult.confidence,
      classification_reasoning: classificationResult.reasoning,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', outcomeId);

  if (updateError) {
    console.error('[ClassifyOutcome] Failed to update outcome:', updateError);
    throw new Error(`Failed to save classification: ${updateError.message}`);
  }

  console.log(`[ClassifyOutcome] Classified outcome ${outcomeId}:`, {
    classification: classificationResult.classification,
    confidence: classificationResult.confidence,
  });

  return classificationResult;
}

/**
 * Classify all pending outcomes whose monitoring period has ended
 *
 * This is called by the T+30 classification cron job.
 *
 * @returns Summary of the classification operation
 */
export async function classifyAllPendingOutcomes(): Promise<ClassificationJobResult> {
  const supabase = getSupabaseServiceRoleClient();

  console.log('[ClassifyOutcome] Starting classification for pending outcomes');

  // 1. Find outcomes ready for classification
  // (monitoring period ended, still in 'monitoring' status or 'pending' classification)
  const { data: pendingOutcomes, error: fetchError } = await supabase
    .from('feature_outcomes')
    .select('id')
    .eq('status', 'monitoring')
    .lte('monitor_end', new Date().toISOString());

  if (fetchError) {
    console.error('[ClassifyOutcome] Failed to fetch pending outcomes:', fetchError);
    return {
      success: false,
      classified: 0,
      failed: 0,
      results: [],
    };
  }

  const outcomes = pendingOutcomes || [];
  console.log(`[ClassifyOutcome] Found ${outcomes.length} outcomes ready for classification`);

  const results: ClassificationJobResult['results'] = [];
  let classified = 0;
  let failed = 0;

  // 2. Classify each outcome
  for (const outcome of outcomes) {
    try {
      const result = await classifyOutcome(outcome.id);
      results.push({
        outcomeId: outcome.id,
        classification: result.classification,
        success: true,
      });
      classified++;
    } catch (error) {
      console.error(`[ClassifyOutcome] Failed to classify outcome ${outcome.id}:`, error);
      results.push({
        outcomeId: outcome.id,
        classification: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  console.log(`[ClassifyOutcome] Completed: ${classified} classified, ${failed} failed`);

  return {
    success: failed === 0,
    classified,
    failed,
    results,
  };
}
