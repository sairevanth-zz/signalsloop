/**
 * Dimension Scoring Service
 * AI-powered scoring for Go/No-Go dimensions
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type {
    LaunchDimension,
    DimensionType,
    AIInsight,
    CustomerQuote,
    PredictionData,
} from '@/types/launch';

// ============================================================================
// Main AI Population Function
// ============================================================================

export async function populateAllDimensions(
    boardId: string,
    projectId: string,
    featureTitle: string
): Promise<LaunchDimension[]> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return [];

    // Fetch all dimensions for this board
    const { data: dimensions } = await supabase
        .from('launch_dimensions')
        .select('*')
        .eq('board_id', boardId);

    if (!dimensions) return [];

    // Fetch project context for AI analysis
    const context = await gatherProjectContext(projectId, featureTitle);

    // Populate each dimension
    const updatedDimensions: LaunchDimension[] = [];

    for (const dimension of dimensions) {
        const updated = await populateDimension(
            dimension,
            context,
            featureTitle
        );
        if (updated) {
            updatedDimensions.push(updated);
        }
    }

    // Recalculate overall score
    await recalculateOverallScore(boardId);

    return updatedDimensions;
}

// ============================================================================
// Context Gathering
// ============================================================================

interface ProjectContext {
    recentFeedback: Array<{
        title: string;
        description: string;
        sentiment_score: number | null;
        author_email: string | null;
        created_at: string;
    }>;
    topThemes: Array<{
        theme_name: string;
        mention_count: number;
        avg_sentiment: number;
    }>;
    featureOutcomes: Array<{
        theme_name: string;
        outcome_classification: string | null;
        sentiment_delta: number | null;
    }>;
    competitorMentions: Array<{
        competitor_name: string;
        mention_count: number;
    }>;
}

async function gatherProjectContext(
    projectId: string,
    featureTitle: string
): Promise<ProjectContext> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
        return {
            recentFeedback: [],
            topThemes: [],
            featureOutcomes: [],
            competitorMentions: [],
        };
    }

    // Get recent feedback mentioning the feature
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: feedback } = await supabase
        .from('posts')
        .select('title, description, sentiment_score, author_email, created_at')
        .eq('project_id', projectId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

    // Get top themes
    const { data: themes } = await supabase
        .from('ai_priorities')
        .select('theme_name, mention_count, avg_sentiment')
        .eq('project_id', projectId)
        .order('mention_count', { ascending: false })
        .limit(10);

    // Get recent feature outcomes
    const { data: outcomes } = await supabase
        .from('feature_outcomes')
        .select(`
      ai_priorities!inner(theme_name),
      outcome_classification,
      sentiment_delta
    `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

    return {
        recentFeedback: feedback || [],
        topThemes: themes || [],
        featureOutcomes: (outcomes || []).map((o: { ai_priorities: { theme_name: string }; outcome_classification: string | null; sentiment_delta: number | null }) => ({
            theme_name: o.ai_priorities?.theme_name || '',
            outcome_classification: o.outcome_classification,
            sentiment_delta: o.sentiment_delta,
        })),
        competitorMentions: [], // TODO: Add competitor tracking
    };
}

// ============================================================================
// Dimension-Specific Population
// ============================================================================

async function populateDimension(
    dimension: LaunchDimension,
    context: ProjectContext,
    featureTitle: string
): Promise<LaunchDimension | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    let result: {
        score: number;
        insights: AIInsight[];
        quotes?: CustomerQuote[];
        predictionData?: PredictionData;
    };

    switch (dimension.dimension_type) {
        case 'customer_readiness':
            result = await scoreCustomerReadiness(context, featureTitle);
            break;
        case 'risk_assessment':
            result = await scoreRiskAssessment(context, featureTitle);
            break;
        case 'competitive_timing':
            result = await scoreCompetitiveTiming(context, featureTitle);
            break;
        case 'success_prediction':
            result = await scoreSuccessPrediction(context, featureTitle);
            break;
        default:
            return null;
    }

    // Update dimension in database
    const updateData: Partial<LaunchDimension> = {
        ai_score: result.score,
        ai_insights: result.insights,
    };

    if (result.quotes) {
        updateData.customer_quotes = result.quotes;
    }

    if (result.predictionData) {
        updateData.prediction_data = result.predictionData;
    }

    const { data, error } = await supabase
        .from('launch_dimensions')
        .update(updateData)
        .eq('id', dimension.id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating ${dimension.dimension_type}:`, error);
        return null;
    }

    return data;
}

// ============================================================================
// Customer Readiness Scoring
// ============================================================================

async function scoreCustomerReadiness(
    context: ProjectContext,
    featureTitle: string
): Promise<{
    score: number;
    insights: AIInsight[];
    quotes: CustomerQuote[];
}> {
    const feedbackCount = context.recentFeedback.length;
    const avgSentiment = context.recentFeedback.length > 0
        ? context.recentFeedback.reduce((sum, f) => sum + (f.sentiment_score || 0), 0) / context.recentFeedback.length
        : 0;

    // Find relevant theme
    const relevantTheme = context.topThemes.find(t =>
        t.theme_name.toLowerCase().includes(featureTitle.toLowerCase().split(' ')[0])
    );

    const insights: AIInsight[] = [];

    if (feedbackCount > 0) {
        insights.push({
            text: `${feedbackCount} feedback mentions in last 30 days`,
            source: 'Feedback Hunter',
            positive: feedbackCount > 10,
        });
    }

    if (relevantTheme) {
        const intensity = Math.min(relevantTheme.mention_count / 50, 1);
        insights.push({
            text: `Theme intensity: ${intensity.toFixed(2)} (${intensity > 0.5 ? 'high' : 'moderate'} demand)`,
            source: 'Theme Detection',
            positive: intensity > 0.3,
        });
    }

    if (avgSentiment !== 0) {
        insights.push({
            text: `Average sentiment: ${avgSentiment > 0 ? '+' : ''}${avgSentiment.toFixed(2)}`,
            source: 'Sentiment Analysis',
            positive: avgSentiment > 0,
        });
    }

    // Extract potential customer quotes from feedback
    const quotes: CustomerQuote[] = context.recentFeedback
        .filter(f => f.description && f.description.length > 20)
        .slice(0, 3)
        .map(f => ({
            text: f.description.substring(0, 150) + (f.description.length > 150 ? '...' : ''),
            customer: f.author_email?.split('@')[0] || 'Anonymous',
            mrr: 'N/A',
        }));

    // Calculate score
    let score = 50; // Base score
    score += Math.min(feedbackCount, 20) * 1.5; // Up to 30 points for feedback count
    score += avgSentiment * 20; // Up to 20 points for sentiment
    if (relevantTheme) {
        score += Math.min(relevantTheme.mention_count, 20); // Up to 20 points for theme strength
    }

    return {
        score: Math.min(Math.max(Math.round(score), 0), 100),
        insights,
        quotes,
    };
}

// ============================================================================
// Risk Assessment Scoring
// ============================================================================

async function scoreRiskAssessment(
    context: ProjectContext,
    featureTitle: string
): Promise<{
    score: number;
    insights: AIInsight[];
}> {
    const insights: AIInsight[] = [];
    let riskScore = 0; // Lower is better for risks

    // Check past feature outcomes
    const failedOutcomes = context.featureOutcomes.filter(
        o => o.outcome_classification === 'no_impact' || o.outcome_classification === 'negative_impact'
    );

    if (failedOutcomes.length > 0) {
        const failRate = (failedOutcomes.length / context.featureOutcomes.length) * 100;
        insights.push({
            text: `Similar features had ${Math.round(failRate)}% underperformance rate`,
            source: 'Outcome Attribution',
            positive: failRate < 20,
        });
        riskScore += failRate * 0.5;
    } else if (context.featureOutcomes.length > 0) {
        insights.push({
            text: 'No critical issues in recent feature launches',
            source: 'QA Pipeline',
            positive: true,
        });
    }

    // Check for negative sentiment trends
    const negativeFeedback = context.recentFeedback.filter(f => (f.sentiment_score || 0) < -0.3);
    if (negativeFeedback.length > 5) {
        insights.push({
            text: `${negativeFeedback.length} negative feedback items detected`,
            source: "Devil's Advocate",
            positive: false,
        });
        riskScore += negativeFeedback.length * 2;
    }

    // Calculate score (higher is better, so invert risk score)
    const score = Math.max(100 - riskScore, 20);

    return {
        score: Math.round(score),
        insights,
    };
}

// ============================================================================
// Competitive Timing Scoring
// ============================================================================

async function scoreCompetitiveTiming(
    context: ProjectContext,
    featureTitle: string
): Promise<{
    score: number;
    insights: AIInsight[];
}> {
    const insights: AIInsight[] = [];
    let score = 70; // Default neutral score

    // Check for competitor mentions in feedback
    if (context.competitorMentions.length > 0) {
        const topCompetitor = context.competitorMentions[0];
        insights.push({
            text: `${topCompetitor.competitor_name} mentioned ${topCompetitor.mention_count} times`,
            source: 'Competitive Intel',
            positive: false,
        });
        score -= Math.min(topCompetitor.mention_count, 20);
    }

    // Add market timing insight
    const month = new Date().getMonth();
    if (month === 11 || month === 0) { // December or January
        insights.push({
            text: 'End of year budget cycles favor launches',
            source: 'Market Analysis',
            positive: true,
        });
        score += 10;
    } else if (month >= 6 && month <= 8) { // Summer
        insights.push({
            text: 'Summer period may have slower adoption',
            source: 'Market Analysis',
            positive: false,
        });
        score -= 5;
    }

    return {
        score: Math.min(Math.max(Math.round(score), 0), 100),
        insights,
    };
}

// ============================================================================
// Success Prediction Scoring
// ============================================================================

async function scoreSuccessPrediction(
    context: ProjectContext,
    featureTitle: string
): Promise<{
    score: number;
    insights: AIInsight[];
    predictionData: PredictionData;
}> {
    const insights: AIInsight[] = [];

    // Calculate predicted adoption based on theme demand
    const relevantTheme = context.topThemes[0];
    const predictedAdoption = relevantTheme
        ? Math.min(50 + relevantTheme.mention_count, 85)
        : 55;

    // Calculate predicted sentiment lift
    const currentSentiment = context.recentFeedback.length > 0
        ? context.recentFeedback.reduce((sum, f) => sum + (f.sentiment_score || 0), 0) / context.recentFeedback.length
        : 0;
    const predictedSentimentLift = Math.min(Math.max((1 - currentSentiment) * 0.3, 0.05), 0.25);

    // Estimate revenue impact
    const predictedRevenue = relevantTheme
        ? relevantTheme.mention_count * 1000 // Rough estimate
        : 10000;

    insights.push({
        text: `Predicted adoption rate: ${predictedAdoption}% ±8%`,
        source: 'Prediction Engine',
        positive: predictedAdoption > 50,
    });

    insights.push({
        text: `Expected sentiment lift: +${predictedSentimentLift.toFixed(2)} points`,
        source: 'Prediction Engine',
        positive: true,
    });

    insights.push({
        text: `Revenue impact: $${(predictedRevenue / 1000).toFixed(0)}K ARR potential`,
        source: 'Revenue Model',
        positive: predictedRevenue > 5000,
    });

    // Score based on predictions
    const score = Math.round(
        (predictedAdoption * 0.4) +
        (predictedSentimentLift * 100) +
        (Math.min(predictedRevenue / 1000, 30))
    );

    return {
        score: Math.min(Math.max(score, 0), 100),
        insights,
        predictionData: {
            adoption: predictedAdoption,
            sentiment: predictedSentimentLift,
            revenue: predictedRevenue,
        },
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function recalculateOverallScore(boardId: string): Promise<void> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return;

    const { data: dimensions } = await supabase
        .from('launch_dimensions')
        .select('ai_score')
        .eq('board_id', boardId);

    if (dimensions && dimensions.length > 0) {
        const overallScore = Math.round(
            dimensions.reduce((sum, d) => sum + (d.ai_score || 0), 0) / dimensions.length
        );

        await supabase
            .from('launch_boards')
            .update({ overall_score: overallScore })
            .eq('id', boardId);
    }
}
