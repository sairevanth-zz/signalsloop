/**
 * AI Population Service for Retrospective
 * Generates AI cards from project outcomes and data
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type { RetroCard, RetroColumn, RetroPeriod, RetroMetric } from '@/types/retro';
import { PERIOD_CONFIGS } from '@/types/retro';
import { addCard } from './retro-board-service';

// ============================================================================
// AI Population for Retrospective
// ============================================================================

export async function populateRetroFromOutcomes(
    boardId: string,
    projectId: string,
    periodType: RetroPeriod,
    startDate: string,
    endDate: string
): Promise<{ cards: RetroCard[]; metrics: RetroMetric[] }> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return { cards: [], metrics: [] };

    // Get columns for this board
    const { data: columns } = await supabase
        .from('retro_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('sort_order');

    if (!columns || columns.length === 0) {
        return { cards: [], metrics: [] };
    }

    // Gather data from the period
    const context = await gatherPeriodData(projectId, startDate, endDate);

    // Generate cards based on period type
    const generatedCards: RetroCard[] = [];

    for (const column of columns) {
        const cards = await generateCardsForColumn(column, context, periodType);
        for (const card of cards) {
            const savedCard = await addCard({
                column_id: column.id,
                content: card.content,
                is_ai: true,
                source: card.source,
                data_badge: card.data_badge,
                is_success: card.is_success,
                is_alert: card.is_alert,
            });
            if (savedCard) {
                generatedCards.push(savedCard);
            }
        }
    }

    // Calculate metrics
    const metrics = calculatePeriodMetrics(context, periodType);

    return { cards: generatedCards, metrics };
}

// ============================================================================
// Data Gathering
// ============================================================================

interface PeriodContext {
    outcomes: Array<{
        theme_name: string;
        outcome_classification: string | null;
        adoption_rate: number;
        predicted_adoption: number;
        sentiment_delta: number;
        shipped_at: string;
    }>;
    feedback: Array<{
        title: string;
        description: string;
        sentiment_score: number;
        created_at: string;
    }>;
    themes: Array<{
        theme_name: string;
        mention_count: number;
        avg_sentiment: number;
        priority_level: string;
    }>;
    totalShipped: number;
    averageSentiment: number;
}

async function gatherPeriodData(
    projectId: string,
    startDate: string,
    endDate: string
): Promise<PeriodContext> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
        return {
            outcomes: [],
            feedback: [],
            themes: [],
            totalShipped: 0,
            averageSentiment: 0,
        };
    }

    // Get feature outcomes in period
    const { data: outcomes } = await supabase
        .from('feature_outcomes')
        .select(`
      ai_priorities!inner(theme_name),
      outcome_classification,
      post_ship_sentiment,
      pre_ship_sentiment,
      shipped_at
    `)
        .eq('project_id', projectId)
        .gte('shipped_at', startDate)
        .lte('shipped_at', endDate);

    // Get feedback in period
    const { data: feedback } = await supabase
        .from('posts')
        .select('title, description, sentiment_score, created_at')
        .eq('project_id', projectId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('sentiment_score', { ascending: false })
        .limit(50);

    // Get themes
    const { data: themes } = await supabase
        .from('ai_priorities')
        .select('theme_name, mention_count, avg_sentiment, priority_level')
        .eq('project_id', projectId)
        .order('mention_count', { ascending: false })
        .limit(20);

    const processedOutcomes = (outcomes || []).map((o: { ai_priorities: { theme_name: string }; outcome_classification: string | null; post_ship_sentiment: number | null; pre_ship_sentiment: number | null; shipped_at: string }) => ({
        theme_name: o.ai_priorities?.theme_name || '',
        outcome_classification: o.outcome_classification,
        adoption_rate: 0, // Would need additional data
        predicted_adoption: 0,
        sentiment_delta: (o.post_ship_sentiment || 0) - (o.pre_ship_sentiment || 0),
        shipped_at: o.shipped_at,
    }));

    const avgSentiment = feedback && feedback.length > 0
        ? feedback.reduce((sum, f) => sum + (f.sentiment_score || 0), 0) / feedback.length
        : 0;

    return {
        outcomes: processedOutcomes,
        feedback: feedback || [],
        themes: themes || [],
        totalShipped: processedOutcomes.length,
        averageSentiment: avgSentiment,
    };
}

// ============================================================================
// Card Generation
// ============================================================================

interface GeneratedCard {
    content: string;
    source: string;
    data_badge?: string;
    is_success?: boolean;
    is_alert?: boolean;
}

async function generateCardsForColumn(
    column: RetroColumn,
    context: PeriodContext,
    periodType: RetroPeriod
): Promise<GeneratedCard[]> {
    const cards: GeneratedCard[] = [];
    const columnKey = column.column_key;

    // Strategic Wins / Achieved / Start - positive outcomes
    if (['wins', 'achieved', 'start'].includes(columnKey)) {
        // Add successful outcomes
        const successfulOutcomes = context.outcomes.filter(
            o => o.outcome_classification === 'success' || o.outcome_classification === 'partial_success'
        );

        for (const outcome of successfulOutcomes.slice(0, 3)) {
            cards.push({
                content: `${outcome.theme_name} shipped - ${outcome.sentiment_delta >= 0 ? '+' : ''}${outcome.sentiment_delta.toFixed(2)} sentiment`,
                source: 'Outcome Attribution',
                data_badge: `${outcome.sentiment_delta >= 0 ? '+' : ''}${outcome.sentiment_delta.toFixed(2)} sentiment`,
                is_success: true,
            });
        }

        // Add growing themes
        const growingThemes = context.themes.filter(t => t.mention_count > 20 && t.avg_sentiment > 0);
        for (const theme of growingThemes.slice(0, 2)) {
            cards.push({
                content: `${theme.theme_name} - strong customer demand (${theme.mention_count} mentions)`,
                source: 'Theme Detection',
                data_badge: `${theme.mention_count} mentions`,
                is_success: true,
            });
        }
    }

    // Misses / Challenges / Stop - negative outcomes
    if (['misses', 'challenges', 'stop'].includes(columnKey)) {
        const failedOutcomes = context.outcomes.filter(
            o => o.outcome_classification === 'no_impact' || o.outcome_classification === 'negative_impact'
        );

        for (const outcome of failedOutcomes.slice(0, 3)) {
            cards.push({
                content: `${outcome.theme_name}: ${outcome.outcome_classification === 'negative_impact' ? 'Negative impact detected' : 'No measurable impact'}`,
                source: 'Outcome Attribution',
                data_badge: outcome.outcome_classification === 'negative_impact' ? '⚠️ Negative' : 'No Impact',
                is_alert: true,
            });
        }

        // Add declining themes
        const decliningThemes = context.themes.filter(t => t.avg_sentiment < -0.2);
        for (const theme of decliningThemes.slice(0, 2)) {
            cards.push({
                content: `${theme.theme_name} - negative sentiment trend`,
                source: 'Sentiment Analysis',
                data_badge: `Sentiment: ${theme.avg_sentiment.toFixed(2)}`,
                is_alert: true,
            });
        }
    }

    // Insights / Learned
    if (['insights', 'learned'].includes(columnKey)) {
        // Add insight about prediction accuracy
        const successCount = context.outcomes.filter(
            o => o.outcome_classification === 'success'
        ).length;
        const totalCount = context.outcomes.length;

        if (totalCount > 0) {
            const successRate = Math.round((successCount / totalCount) * 100);
            cards.push({
                content: `${successRate}% of features met success criteria this period`,
                source: 'Feature Analytics',
                data_badge: `${successRate}% success rate`,
                is_success: successRate > 60,
                is_alert: successRate < 40,
            });
        }

        // Add sentiment insight
        if (context.averageSentiment !== 0) {
            cards.push({
                content: `Average customer sentiment: ${context.averageSentiment >= 0 ? '+' : ''}${context.averageSentiment.toFixed(2)} this period`,
                source: 'Sentiment Analysis',
                data_badge: `Avg: ${context.averageSentiment >= 0 ? '+' : ''}${context.averageSentiment.toFixed(2)}`,
                is_success: context.averageSentiment > 0.1,
            });
        }
    }

    // Next Focus / Continue
    if (['next', 'continue'].includes(columnKey)) {
        // Add high-priority themes to focus on
        const priorityThemes = context.themes.filter(
            t => t.priority_level === 'high' || t.priority_level === 'critical'
        );

        for (const theme of priorityThemes.slice(0, 2)) {
            cards.push({
                content: `Focus on ${theme.theme_name} - ${theme.priority_level} priority, ${theme.mention_count} mentions`,
                source: 'Priority Engine',
                data_badge: `${theme.mention_count} mentions`,
            });
        }
    }

    return cards;
}

// ============================================================================
// Metrics Calculation
// ============================================================================

function calculatePeriodMetrics(
    context: PeriodContext,
    periodType: RetroPeriod
): RetroMetric[] {
    const config = PERIOD_CONFIGS[periodType];
    const metrics: RetroMetric[] = [];

    for (const label of config.defaultMetricLabels) {
        let value = '0';
        let trend: 'up' | 'down' | null = null;

        switch (label.toLowerCase()) {
            case 'shipped':
                value = context.totalShipped.toString();
                break;
            case 'sentiment':
                value = context.averageSentiment >= 0
                    ? `+${context.averageSentiment.toFixed(2)}`
                    : context.averageSentiment.toFixed(2);
                trend = context.averageSentiment > 0 ? 'up' : context.averageSentiment < 0 ? 'down' : null;
                break;
            case 'themes addressed':
                value = context.outcomes.filter(o => o.outcome_classification === 'success').length.toString();
                break;
            case 'themes':
                value = context.themes.length.toString();
                break;
            case 'velocity':
                const successRate = context.outcomes.length > 0
                    ? Math.round((context.outcomes.filter(o => o.outcome_classification === 'success').length / context.outcomes.length) * 100)
                    : 0;
                value = `${successRate}%`;
                trend = successRate > 70 ? 'up' : successRate < 50 ? 'down' : null;
                break;
            case 'mrr impact':
            case 'arr growth':
                value = 'N/A'; // Would need revenue data
                break;
            case 'churn prevented':
                value = '0'; // Would need churn data
                break;
            case 'prediction accuracy':
                const totalWithOutcome = context.outcomes.filter(o => o.outcome_classification).length;
                const successful = context.outcomes.filter(o => o.outcome_classification === 'success').length;
                value = totalWithOutcome > 0 ? `${Math.round((successful / totalWithOutcome) * 100)}%` : 'N/A';
                break;
            case 'team growth':
                value = 'N/A'; // Would need team data
                break;
            default:
                value = 'N/A';
        }

        metrics.push({ label, value, trend });
    }

    return metrics;
}

// ============================================================================
// AI Summary Generation
// ============================================================================

export async function generateAISummary(
    board: { title: string; period_type: RetroPeriod; start_date: string; end_date: string },
    columns: Array<{ title: string; cards: Array<{ content: string; is_success?: boolean; is_alert?: boolean }> }>,
    metrics: RetroMetric[]
): Promise<string> {
    // Generate a text summary based on the data
    const winCards = columns.find(c => ['wins', 'achieved'].includes(c.title.toLowerCase()))?.cards || [];
    const missCards = columns.find(c => ['misses', 'challenges'].includes(c.title.toLowerCase()))?.cards || [];
    const insightCards = columns.find(c => ['insights', 'learned'].includes(c.title.toLowerCase()))?.cards || [];

    const shippedMetric = metrics.find(m => m.label.toLowerCase() === 'shipped');
    const sentimentMetric = metrics.find(m => m.label.toLowerCase() === 'sentiment');

    let summary = `**${board.title} Summary:**\n\n`;

    if (shippedMetric) {
        summary += `Shipped ${shippedMetric.value} features. `;
    }

    if (sentimentMetric) {
        summary += `Customer sentiment: ${sentimentMetric.value}. `;
    }

    if (winCards.length > 0) {
        summary += `\n\n**Key Wins:** ${winCards.slice(0, 3).map(c => c.content).join('; ')}`;
    }

    if (missCards.length > 0) {
        summary += `\n\n**Areas to Address:** ${missCards.slice(0, 2).map(c => c.content).join('; ')}`;
    }

    if (insightCards.length > 0) {
        summary += `\n\n**Key Insights:** ${insightCards.slice(0, 2).map(c => c.content).join('; ')}`;
    }

    return summary;
}
