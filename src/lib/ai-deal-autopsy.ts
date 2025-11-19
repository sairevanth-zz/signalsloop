/**
 * AI Deal Autopsy Utility
 * Generates comprehensive win/loss analysis for closed deals using OpenAI
 */

import OpenAI from 'openai';
import {
  DEAL_AUTOPSY_SYSTEM_PROMPT,
  DEAL_AUTOPSY_USER_PROMPT,
  AI_MODELS,
  AI_TEMPERATURES,
  AI_MAX_TOKENS,
} from '@/config/ai-prompts';

// Types
export interface DealObjection {
  category: 'pricing' | 'features' | 'technical' | 'competition' | 'timing' | 'fit' | 'process' | 'other';
  description: string;
  severity: 'high' | 'medium' | 'low';
  frequency: number;
}

export interface CompetitorSignal {
  competitor_name: string;
  mentioned_features: string[];
  perceived_advantages: string[];
  perceived_disadvantages: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface DealAutopsyResult {
  summary: string;
  primary_reason: 'pricing' | 'features' | 'competitor' | 'timing' | 'budget' | 'fit' | 'process' | 'other';
  primary_reason_detail: string;
  objections: DealObjection[];
  competitor_signals: CompetitorSignal[];
  key_themes: string[];
  recommendations: string;
  action_items: string[];
  confidence: number; // 0-1
}

export interface DealData {
  id: string;
  name: string;
  amount: number;
  stage: string;
  status: 'won' | 'lost' | 'open';
  competitor?: string;
  competitor_product?: string;
  notes?: string;
  close_reason?: string;
  contact_name?: string;
  contact_company?: string;
  closed_at?: Date;
  created_at: Date;
}

// Get OpenAI client
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[AI Deal Autopsy] OPENAI_API_KEY not configured');
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate autopsy for a single deal
 */
export async function generateDealAutopsy(
  deal: DealData
): Promise<DealAutopsyResult | null> {
  const openai = getOpenAIClient();
  if (!openai) {
    console.error('[AI Deal Autopsy] OpenAI client not available');
    return null;
  }

  try {
    console.log('[AI Deal Autopsy] Generating autopsy for deal:', deal.name);

    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: AI_MODELS.DEAL_AUTOPSY,
      messages: [
        {
          role: 'system',
          content: DEAL_AUTOPSY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: DEAL_AUTOPSY_USER_PROMPT(deal),
        },
      ],
      temperature: AI_TEMPERATURES.DEAL_AUTOPSY,
      max_tokens: AI_MAX_TOKENS.DEAL_AUTOPSY,
      response_format: { type: 'json_object' },
    });

    const processingTime = Date.now() - startTime;

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('[AI Deal Autopsy] No content in response');
      return null;
    }

    const result = JSON.parse(content) as DealAutopsyResult;

    // Validate and sanitize the result
    const autopsyResult: DealAutopsyResult = {
      summary: result.summary || 'No summary generated',
      primary_reason: result.primary_reason || 'other',
      primary_reason_detail: result.primary_reason_detail || '',
      objections: Array.isArray(result.objections) ? result.objections : [],
      competitor_signals: Array.isArray(result.competitor_signals) ? result.competitor_signals : [],
      key_themes: Array.isArray(result.key_themes) ? result.key_themes : [],
      recommendations: result.recommendations || '',
      action_items: Array.isArray(result.action_items) ? result.action_items : [],
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
    };

    console.log('[AI Deal Autopsy] Autopsy generated in', processingTime, 'ms');

    return autopsyResult;
  } catch (error) {
    console.error('[AI Deal Autopsy] Error generating autopsy:', error);
    return null;
  }
}

/**
 * Find similar deals based on deal characteristics
 * Returns deal IDs of similar deals
 */
export async function findSimilarDeals(
  dealId: string,
  supabaseClient: any,
  limit: number = 5
): Promise<{ lost: string[]; open: string[] }> {
  try {
    const { data, error } = await supabaseClient.rpc('find_similar_deals', {
      p_deal_id: dealId,
      p_limit: limit,
    });

    if (error) {
      console.error('[AI Deal Autopsy] Error finding similar deals:', error);
      return { lost: [], open: [] };
    }

    const lost = data
      ?.filter((d: any) => d.deal_status === 'lost')
      .map((d: any) => d.similar_deal_id) || [];

    const open = data
      ?.filter((d: any) => d.deal_status === 'open')
      .map((d: any) => d.similar_deal_id) || [];

    return { lost, open };
  } catch (error) {
    console.error('[AI Deal Autopsy] Error finding similar deals:', error);
    return { lost: [], open: [] };
  }
}

/**
 * Update battlecard with new deal insights
 */
export async function updateBattlecardWithDeal(
  projectId: string,
  dealId: string,
  autopsy: DealAutopsyResult,
  supabaseClient: any
): Promise<void> {
  try {
    // Get the deal to extract competitor info
    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .select('competitor, competitor_product, status')
      .eq('id', dealId)
      .single();

    if (dealError || !deal || !deal.competitor) {
      return; // No competitor to update battlecard for
    }

    // Get existing battlecard
    const { data: existingBattlecard } = await supabaseClient
      .from('deal_battlecards')
      .select('*')
      .eq('project_id', projectId)
      .eq('competitor_name', deal.competitor)
      .single();

    // Extract objections
    const objections = autopsy.objections.map(o => o.description);

    // Determine if win or loss
    const isWin = deal.status === 'won';
    const isLoss = deal.status === 'lost';

    // Build updated arrays
    let commonObjections = existingBattlecard?.common_objections || [];
    let commonWinFactors = existingBattlecard?.common_win_factors || [];
    let commonLossFactors = existingBattlecard?.common_loss_factors || [];

    // Add new objections
    objections.forEach(objection => {
      if (!commonObjections.includes(objection)) {
        commonObjections.push(objection);
      }
    });

    // Extract win/loss factors from autopsy
    if (isWin && autopsy.primary_reason_detail) {
      if (!commonWinFactors.includes(autopsy.primary_reason_detail)) {
        commonWinFactors.push(autopsy.primary_reason_detail);
      }
    }

    if (isLoss && autopsy.primary_reason_detail) {
      if (!commonLossFactors.includes(autopsy.primary_reason_detail)) {
        commonLossFactors.push(autopsy.primary_reason_detail);
      }
    }

    // Extract strengths/weaknesses from competitor signals
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    autopsy.competitor_signals.forEach(signal => {
      signal.perceived_advantages.forEach(adv => {
        if (!strengths.includes(adv)) {
          strengths.push(adv);
        }
      });
      signal.perceived_disadvantages.forEach(dis => {
        if (!weaknesses.includes(dis)) {
          weaknesses.push(dis);
        }
      });
    });

    // Generate positioning recommendation
    const positioningPrompt = `Based on these competitive insights, provide a brief positioning recommendation (2-3 sentences):

Competitor: ${deal.competitor}
Their Strengths: ${strengths.join(', ') || 'Unknown'}
Their Weaknesses: ${weaknesses.join(', ') || 'Unknown'}
Our Win Factors: ${commonWinFactors.join(', ') || 'Unknown'}
Our Loss Factors: ${commonLossFactors.join(', ') || 'Unknown'}

How should we position against this competitor?`;

    const openai = getOpenAIClient();
    let recommendedPositioning = existingBattlecard?.recommended_positioning || '';

    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a competitive positioning expert. Provide brief, actionable positioning advice.',
            },
            {
              role: 'user',
              content: positioningPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 200,
        });

        recommendedPositioning = response.choices[0]?.message?.content || recommendedPositioning;
      } catch (error) {
        console.error('[AI Deal Autopsy] Error generating positioning:', error);
      }
    }

    // Update or insert battlecard
    const { error: upsertError } = await supabaseClient
      .from('deal_battlecards')
      .upsert({
        project_id: projectId,
        competitor_name: deal.competitor,
        competitor_product: deal.competitor_product,
        common_objections: commonObjections.slice(0, 10), // Keep top 10
        common_win_factors: commonWinFactors.slice(0, 10),
        common_loss_factors: commonLossFactors.slice(0, 10),
        strengths: strengths.slice(0, 10),
        weaknesses: weaknesses.slice(0, 10),
        recommended_positioning: recommendedPositioning,
        last_analyzed_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,competitor_name',
      });

    if (upsertError) {
      console.error('[AI Deal Autopsy] Error updating battlecard:', upsertError);
    } else {
      console.log('[AI Deal Autopsy] Battlecard updated for', deal.competitor);
    }
  } catch (error) {
    console.error('[AI Deal Autopsy] Error updating battlecard:', error);
  }
}

/**
 * Generate batch autopsies for multiple deals
 * Processes deals one at a time to avoid rate limits
 */
export async function generateBatchAutopsies(
  deals: DealData[],
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, DealAutopsyResult>> {
  const results = new Map<string, DealAutopsyResult>();

  for (let i = 0; i < deals.length; i++) {
    const deal = deals[i];

    try {
      const autopsy = await generateDealAutopsy(deal);

      if (autopsy) {
        results.set(deal.id, autopsy);
      }

      if (onProgress) {
        onProgress(i + 1, deals.length);
      }

      // Rate limiting: wait 1 second between calls to avoid OpenAI rate limits
      if (i < deals.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[AI Deal Autopsy] Error generating autopsy for deal ${deal.id}:`, error);
      // Continue with next deal even if one fails
    }
  }

  return results;
}

/**
 * Extract common patterns from multiple autopsies
 */
export function extractLossPatterns(
  autopsies: DealAutopsyResult[]
): {
  topReasons: Map<string, number>;
  topObjections: Map<string, number>;
  commonThemes: Map<string, number>;
} {
  const reasonFrequency = new Map<string, number>();
  const objectionFrequency = new Map<string, number>();
  const themeFrequency = new Map<string, number>();

  autopsies.forEach((autopsy) => {
    // Count reasons
    const reason = autopsy.primary_reason;
    reasonFrequency.set(reason, (reasonFrequency.get(reason) || 0) + 1);

    // Count objections
    autopsy.objections.forEach((objection) => {
      const key = objection.description.toLowerCase().trim();
      objectionFrequency.set(key, (objectionFrequency.get(key) || 0) + 1);
    });

    // Count themes
    autopsy.key_themes.forEach((theme) => {
      const normalizedTheme = theme.toLowerCase().trim();
      themeFrequency.set(normalizedTheme, (themeFrequency.get(normalizedTheme) || 0) + 1);
    });
  });

  // Sort by frequency
  return {
    topReasons: new Map(
      Array.from(reasonFrequency.entries()).sort((a, b) => b[1] - a[1])
    ),
    topObjections: new Map(
      Array.from(objectionFrequency.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
    ),
    commonThemes: new Map(
      Array.from(themeFrequency.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
    ),
  };
}
