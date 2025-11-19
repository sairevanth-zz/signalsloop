/**
 * Support Ticket Analysis Service for SignalsLoop
 * Provides AI-powered analysis of support tickets including theme extraction,
 * sentiment analysis, priority scoring, and clustering
 */

import OpenAI from 'openai';
import { withCache } from '../ai-cache-manager';
import { analyzeSentiment, analyzeSentimentWithRetry } from './sentiment';
import type { SentimentAnalysisInput, SentimentAnalysisOutput } from '@/types/sentiment';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODELS = {
  TICKET_ANALYSIS: process.env.THEME_DETECTION_MODEL || 'gpt-4o',
};

// Configuration constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface SupportTicket {
  id: string;
  external_id?: string;
  subject: string;
  body: string;
  customer?: string;
  plan?: string;
  arr_value?: number;
  created_at: string;
}

export interface TicketAnalysisResult {
  ticket_id: string;
  theme_name: string;
  theme_description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sentiment_score: number;
  sentiment_category: 'positive' | 'negative' | 'neutral' | 'mixed';
  priority_score: number; // 1-10
  arr_risk: number; // Calculated ARR at risk
  recommendation: string; // Short actionable recommendation
  confidence: number; // 0-1
}

export interface ClusteredTheme {
  theme_name: string;
  description: string;
  ticket_ids: string[];
  avg_sentiment: number;
  total_arr_risk: number;
  priority_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

/**
 * System prompt for support ticket analysis
 */
const TICKET_ANALYSIS_SYSTEM_PROMPT = `You are an expert at analyzing customer support tickets for SaaS products and extracting actionable insights.

Your task is to analyze a support ticket and extract:
1. Main theme/topic (what is this ticket about?)
2. Theme description (one sentence summary)
3. Severity level (how serious is this issue?)
4. Priority recommendation (should this be addressed urgently?)
5. Short actionable recommendation

SEVERITY LEVELS:
- critical: System down, data loss, security breach, or blocker for enterprise customer
- high: Major functionality broken, significant revenue at risk, or high-value customer impacted
- medium: Feature not working as expected, moderate impact, or workaround available
- low: Minor issue, cosmetic problem, or nice-to-have feature request

PRIORITY SCORING (1-10):
Consider these factors:
- Severity of the issue (critical = 8-10, high = 6-8, medium = 4-6, low = 1-4)
- Customer value/plan (enterprise customers should weigh higher)
- ARR at risk (if plan info indicates high value)
- Sentiment (very negative sentiment adds urgency)
- Specificity (detailed issues are more actionable)

THEME EXTRACTION:
- Be specific and actionable
- ✓ GOOD: "Mobile app crashes on Android 12 devices"
- ✗ BAD: "App problems"

RECOMMENDATIONS:
- Keep it short (1-2 sentences max)
- Focus on the action to take
- ✓ GOOD: "Investigate Android 12 compatibility. May need to release hotfix."
- ✗ BAD: "User is having issues with the mobile app"

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "theme_name": "Concise theme name (2-5 words)",
  "theme_description": "One sentence description of the issue/request",
  "severity": "critical|high|medium|low",
  "priority_score": 1-10,
  "recommendation": "Short actionable recommendation",
  "confidence": 0.0-1.0
}`;

/**
 * Analyze a single support ticket
 */
async function analyzeTicketInternal(
  ticket: SupportTicket,
): Promise<TicketAnalysisResult> {
  // Build comprehensive context for AI
  let userPrompt = `Analyze this support ticket:

TICKET ID: ${ticket.external_id || ticket.id}
SUBJECT: ${ticket.subject}
BODY: ${ticket.body}`;

  if (ticket.customer) {
    userPrompt += `\nCUSTOMER: ${ticket.customer}`;
  }

  if (ticket.plan) {
    userPrompt += `\nPLAN: ${ticket.plan}`;
  }

  if (ticket.arr_value) {
    userPrompt += `\nARR VALUE: $${ticket.arr_value.toLocaleString()}/year`;
  }

  userPrompt += `\nCREATED: ${new Date(ticket.created_at).toLocaleDateString()}`;

  try {
    // Analyze theme and priority
    const themeResponse = await openai.chat.completions.create({
      model: MODELS.TICKET_ANALYSIS,
      messages: [
        { role: 'system', content: TICKET_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const themeContent = themeResponse.choices[0]?.message?.content;
    if (!themeContent) {
      throw new Error('No response from AI for theme analysis');
    }

    const themeResult = JSON.parse(themeContent);

    // Analyze sentiment separately using existing service
    const sentimentInput: SentimentAnalysisInput = {
      postId: ticket.id,
      text: ticket.body,
      metadata: {
        title: ticket.subject,
        category: 'support',
      },
    };

    const sentimentResult = await analyzeSentimentWithRetry(sentimentInput);

    // Calculate ARR at risk (for negative sentiment tickets)
    let arrRisk = 0;
    if (sentimentResult.sentiment_score < -0.3 && ticket.arr_value) {
      // Risk calculation: more negative sentiment = higher risk percentage
      const riskPercentage = Math.abs(sentimentResult.sentiment_score) * 0.5; // Max 50% risk
      arrRisk = ticket.arr_value * riskPercentage;
    }

    // Adjust priority score based on sentiment
    let adjustedPriority = themeResult.priority_score;
    if (sentimentResult.sentiment_score < -0.5) {
      adjustedPriority = Math.min(10, adjustedPriority + 1);
    }
    if (ticket.arr_value && ticket.arr_value > 50000) {
      adjustedPriority = Math.min(10, adjustedPriority + 1);
    }

    return {
      ticket_id: ticket.id,
      theme_name: themeResult.theme_name,
      theme_description: themeResult.theme_description,
      severity: themeResult.severity,
      sentiment_score: sentimentResult.sentiment_score,
      sentiment_category: sentimentResult.sentiment_category,
      priority_score: Math.round(adjustedPriority),
      arr_risk: arrRisk,
      recommendation: themeResult.recommendation,
      confidence: themeResult.confidence || 0.7,
    };

  } catch (error) {
    console.error('[TICKET ANALYSIS] Error analyzing ticket:', error);
    throw error;
  }
}

/**
 * Analyze ticket with caching
 */
export const analyzeTicket = withCache(
  analyzeTicketInternal,
  'support-ticket',
  (ticket: SupportTicket) => {
    // Use ticket subject + first 100 chars of body as cache key
    return `${ticket.subject}-${ticket.body.slice(0, 100)}`;
  },
);

/**
 * Analyze ticket with retry logic
 */
export async function analyzeTicketWithRetry(
  ticket: SupportTicket,
  maxRetries: number = MAX_RETRIES,
): Promise<TicketAnalysisResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await analyzeTicket(ticket);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(
        `[TICKET ANALYSIS] Attempt ${attempt + 1}/${maxRetries} failed:`,
        lastError.message,
      );

      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Analyze multiple tickets in batches
 */
export async function analyzeTicketsBatch(
  tickets: SupportTicket[],
  batchSize: number = 10,
): Promise<TicketAnalysisResult[]> {
  const results: TicketAnalysisResult[] = [];
  const totalBatches = Math.ceil(tickets.length / batchSize);

  for (let i = 0; i < tickets.length; i += batchSize) {
    const batch = tickets.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(
      `[TICKET ANALYSIS] Processing batch ${batchNumber}/${totalBatches} (${batch.length} tickets)`,
    );

    // Process tickets in parallel within batch
    const batchPromises = batch.map((ticket) =>
      analyzeTicketWithRetry(ticket).catch((error) => {
        console.error(`[TICKET ANALYSIS] Failed for ticket ${ticket.id}:`, error);
        // Return fallback analysis on error
        return {
          ticket_id: ticket.id,
          theme_name: 'Unclassified Issue',
          theme_description: ticket.subject,
          severity: 'medium' as const,
          sentiment_score: 0,
          sentiment_category: 'neutral' as const,
          priority_score: 5,
          arr_risk: 0,
          recommendation: 'Manual review required',
          confidence: 0.1,
        };
      }),
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Delay between batches to avoid rate limits
    if (batchNumber < totalBatches) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Cluster analyzed tickets into themes
 */
export function clusterTicketsByTheme(
  analyses: TicketAnalysisResult[],
): ClusteredTheme[] {
  const themeMap = new Map<string, {
    ticket_ids: string[];
    sentiments: number[];
    arr_risks: number[];
    priorities: number[];
    severities: string[];
    descriptions: Set<string>;
    recommendations: Set<string>;
  }>();

  // Group tickets by theme name (case-insensitive)
  for (const analysis of analyses) {
    const normalizedTheme = analysis.theme_name.toLowerCase().trim();

    if (!themeMap.has(normalizedTheme)) {
      themeMap.set(normalizedTheme, {
        ticket_ids: [],
        sentiments: [],
        arr_risks: [],
        priorities: [],
        severities: [],
        descriptions: new Set(),
        recommendations: new Set(),
      });
    }

    const theme = themeMap.get(normalizedTheme)!;
    theme.ticket_ids.push(analysis.ticket_id);
    theme.sentiments.push(analysis.sentiment_score);
    theme.arr_risks.push(analysis.arr_risk);
    theme.priorities.push(analysis.priority_score);
    theme.severities.push(analysis.severity);
    theme.descriptions.add(analysis.theme_description);
    theme.recommendations.add(analysis.recommendation);
  }

  // Convert to clustered themes
  const clusteredThemes: ClusteredTheme[] = [];

  for (const [themeName, data] of themeMap.entries()) {
    // Calculate averages
    const avgSentiment = data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length;
    const totalArrRisk = data.arr_risks.reduce((a, b) => a + b, 0);
    const avgPriority = data.priorities.reduce((a, b) => a + b, 0) / data.priorities.length;

    // Determine overall severity (use highest severity in cluster)
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const maxSeverity = data.severities.reduce((max, sev) => {
      return severityOrder[sev as keyof typeof severityOrder] > severityOrder[max as keyof typeof severityOrder] ? sev : max;
    }, 'low');

    // Use the first analysis's theme_name (with original casing) and most common description
    const originalThemeName = analyses.find(
      a => a.theme_name.toLowerCase().trim() === themeName
    )?.theme_name || themeName;

    const mostCommonDescription = Array.from(data.descriptions)[0];
    const mostCommonRecommendation = Array.from(data.recommendations)[0];

    clusteredThemes.push({
      theme_name: originalThemeName,
      description: mostCommonDescription,
      ticket_ids: data.ticket_ids,
      avg_sentiment: avgSentiment,
      total_arr_risk: totalArrRisk,
      priority_score: Math.round(avgPriority),
      severity: maxSeverity as 'low' | 'medium' | 'high' | 'critical',
      recommendation: mostCommonRecommendation,
    });
  }

  // Sort by priority score (descending)
  return clusteredThemes.sort((a, b) => b.priority_score - a.priority_score);
}

/**
 * Filter themes to identify top gaps
 * Top gaps are themes with:
 * - High frequency (multiple tickets)
 * - Negative sentiment
 * - High ARR at risk or high priority
 */
export function identifyTopGaps(
  clusteredThemes: ClusteredTheme[],
  limit: number = 5,
): ClusteredTheme[] {
  return clusteredThemes
    .filter(theme =>
      theme.ticket_ids.length >= 3 && // At least 3 tickets
      (theme.avg_sentiment < 0 || theme.severity === 'critical' || theme.severity === 'high')
    )
    .sort((a, b) => {
      // Composite score: frequency + sentiment weight + ARR risk
      const scoreA = (
        a.ticket_ids.length * 2 +
        Math.abs(a.avg_sentiment) * 10 +
        a.total_arr_risk / 10000 +
        a.priority_score
      );
      const scoreB = (
        b.ticket_ids.length * 2 +
        Math.abs(b.avg_sentiment) * 10 +
        b.total_arr_risk / 10000 +
        b.priority_score
      );
      return scoreB - scoreA;
    })
    .slice(0, limit);
}
