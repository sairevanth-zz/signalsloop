/**
 * AI Call Analysis Utility
 * Analyzes customer call transcripts using OpenAI
 */

import OpenAI from 'openai';
import {
  CALL_ANALYSIS_SYSTEM_PROMPT,
  CALL_ANALYSIS_USER_PROMPT,
  CALL_SUMMARY_PROMPT,
  AI_MODELS,
  AI_TEMPERATURES,
  AI_MAX_TOKENS,
} from '@/config/ai-prompts';

// Types
export interface FeatureRequest {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  arr_impact?: number;
  timestamp_hint?: string;
}

export interface Objection {
  type: 'pricing' | 'features' | 'technical' | 'competition' | 'timing' | 'other';
  description: string;
  severity: 'high' | 'medium' | 'low';
  context: string;
}

export interface Competitor {
  name: string;
  context: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ExpansionSignals {
  score: number; // 0-100
  indicators: string[];
  reasoning: string;
}

export interface ChurnSignals {
  score: number; // 0-100
  indicators: string[];
  reasoning: string;
}

export interface CallAnalysisResult {
  highlight_summary: string;
  sentiment: number; // -1 to 1
  priority_score: number; // 1-100
  feature_requests: FeatureRequest[];
  objections: Objection[];
  competitors: Competitor[];
  expansion_signals: ExpansionSignals;
  churn_signals: ChurnSignals;
  key_themes: string[];
}

export interface CallRecord {
  id: string;
  transcript: string;
  customer?: string;
  amount?: number;
  stage?: string;
}

// Get OpenAI client
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[AI Call Analysis] OPENAI_API_KEY not configured');
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Analyze a single call transcript
 */
export async function analyzeCall(
  transcript: string,
  customer?: string,
  amount?: number,
  stage?: string
): Promise<CallAnalysisResult | null> {
  const openai = getOpenAIClient();
  if (!openai) {
    console.error('[AI Call Analysis] OpenAI client not available');
    return null;
  }

  try {
    console.log('[AI Call Analysis] Analyzing call...', {
      customer,
      transcriptLength: transcript.length,
    });

    const response = await openai.chat.completions.create({
      model: AI_MODELS.CALL_ANALYSIS,
      messages: [
        {
          role: 'system',
          content: CALL_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: CALL_ANALYSIS_USER_PROMPT(transcript, customer, amount, stage),
        },
      ],
      temperature: AI_TEMPERATURES.CALL_ANALYSIS,
      max_tokens: AI_MAX_TOKENS.CALL_ANALYSIS,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('[AI Call Analysis] No content in response');
      return null;
    }

    const result = JSON.parse(content) as CallAnalysisResult;

    // Validate and sanitize the result
    return {
      highlight_summary: result.highlight_summary || '',
      sentiment: Math.max(-1, Math.min(1, result.sentiment || 0)),
      priority_score: Math.max(1, Math.min(100, result.priority_score || 50)),
      feature_requests: Array.isArray(result.feature_requests) ? result.feature_requests : [],
      objections: Array.isArray(result.objections) ? result.objections : [],
      competitors: Array.isArray(result.competitors) ? result.competitors : [],
      expansion_signals: result.expansion_signals || { score: 0, indicators: [], reasoning: '' },
      churn_signals: result.churn_signals || { score: 0, indicators: [], reasoning: '' },
      key_themes: Array.isArray(result.key_themes) ? result.key_themes : [],
    };
  } catch (error) {
    console.error('[AI Call Analysis] Error analyzing call:', error);
    return null;
  }
}

/**
 * Analyze multiple calls in batch
 * Processes calls one at a time to avoid rate limits
 */
export async function analyzeCalls(
  calls: CallRecord[],
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, CallAnalysisResult>> {
  const results = new Map<string, CallAnalysisResult>();

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];

    try {
      const analysis = await analyzeCall(
        call.transcript,
        call.customer,
        call.amount,
        call.stage
      );

      if (analysis) {
        results.set(call.id, analysis);
      }

      if (onProgress) {
        onProgress(i + 1, calls.length);
      }

      // Rate limiting: wait 1 second between calls to avoid OpenAI rate limits
      if (i < calls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[AI Call Analysis] Error analyzing call ${call.id}:`, error);
      // Continue with next call even if one fails
    }
  }

  return results;
}

/**
 * Generate executive summary from multiple call highlights
 */
export async function generateExecutiveSummary(
  highlights: string[]
): Promise<string | null> {
  const openai = getOpenAIClient();
  if (!openai) {
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.CALL_ANALYSIS,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at summarizing customer insights and creating actionable executive summaries.',
        },
        {
          role: 'user',
          content: CALL_SUMMARY_PROMPT(highlights),
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('[AI Call Analysis] Error generating summary:', error);
    return null;
  }
}

/**
 * Extract themes from call analysis results
 * Groups similar themes across multiple calls
 */
export function extractThemes(analyses: CallAnalysisResult[]): Map<string, number> {
  const themeFrequency = new Map<string, number>();

  analyses.forEach((analysis) => {
    analysis.key_themes.forEach((theme) => {
      const normalizedTheme = theme.toLowerCase().trim();
      themeFrequency.set(
        normalizedTheme,
        (themeFrequency.get(normalizedTheme) || 0) + 1
      );
    });
  });

  // Sort by frequency
  return new Map(
    Array.from(themeFrequency.entries()).sort((a, b) => b[1] - a[1])
  );
}

/**
 * Detect duplicate feature requests across calls
 * Returns groups of similar requests
 */
export async function deduplicateFeatureRequests(
  requests: Array<{ callId: string; request: FeatureRequest }>
): Promise<Map<string, string[]>> {
  // Simple keyword-based deduplication
  // For more sophisticated deduplication, use embeddings
  const groups = new Map<string, string[]>();

  requests.forEach(({ callId, request }) => {
    const key = request.title.toLowerCase().trim();

    // Find similar existing key (basic similarity)
    let matchingKey: string | null = null;
    for (const existingKey of groups.keys()) {
      if (
        key.includes(existingKey) ||
        existingKey.includes(key) ||
        similarity(key, existingKey) > 0.7
      ) {
        matchingKey = existingKey;
        break;
      }
    }

    if (matchingKey) {
      groups.get(matchingKey)!.push(callId);
    } else {
      groups.set(key, [callId]);
    }
  });

  return groups;
}

/**
 * Simple string similarity using Levenshtein distance
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }

  return costs[s2.length];
}
