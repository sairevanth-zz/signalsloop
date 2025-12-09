/**
 * Revenue Attribution Service
 * 
 * Calculates how much revenue can be attributed to specific features
 * using direct mentions, temporal correlation, and theme matching.
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { complete } from '@/lib/ai/router';
import type {
    AttributionInput,
    AttributionOutput,
    FeatureRevenueAttribution,
    RevenueEvent,
    ProjectRevenueSummary,
    AttributionConfidence
} from '@/types/revenue-attribution';

const DEFAULT_WINDOW_DAYS = 90;

/**
 * Calculate revenue attribution for a feature
 */
export async function calculateFeatureAttribution(
    input: AttributionInput
): Promise<AttributionOutput> {
    const supabase = getServiceRoleClient();
    if (!supabase) throw new Error('Database unavailable');

    const { projectId, featureId, shippedAt, windowDays = DEFAULT_WINDOW_DAYS } = input;

    const windowEnd = new Date(shippedAt);
    windowEnd.setDate(windowEnd.getDate() + windowDays);

    console.log(`[RevenueAttribution] Calculating for feature ${featureId}`);

    // 1. Get feature details
    const { data: feature } = await supabase
        .from('roadmap_suggestions')
        .select(`
      id, 
      reasoning_text,
      themes(id, theme_name)
    `)
        .eq('id', featureId)
        .single();

    if (!feature) {
        return {
            success: false,
            attribution: null,
            revenueEvents: [],
            reasoning: { summary: 'Feature not found', methodUsed: 'direct_mention', confidenceFactors: [] }
        };
    }

    // 2. Find revenue events in the attribution window
    // Direct mentions: Customer feedback mentioning the theme before expansion
    const { data: directMentions } = await supabase
        .from('posts')
        .select('id, customer_id, title, created_at')
        .eq('project_id', projectId)
        .contains('theme_ids', [feature.themes?.id])
        .gte('created_at', new Date(shippedAt).toISOString())
        .lte('created_at', windowEnd.toISOString());

    // 3. Find expansions/churns from customers who mentioned the theme
    const customerIds = [...new Set((directMentions || []).map(p => p.customer_id).filter(Boolean))];

    // 4. Get revenue events (simulated - would connect to billing API)
    const revenueEvents = await getRevenueEvents(projectId, shippedAt, windowEnd, customerIds);

    // 5. Calculate attribution
    let directRevenue = 0;
    let influencedRevenue = 0;
    let expansionRevenue = 0;
    let retentionRevenue = 0;
    let newSaleRevenue = 0;

    for (const event of revenueEvents) {
        const isDirectlyLinked = customerIds.includes(event.customerId);
        const amount = event.mrr_change * 12; // Convert MRR to ARR

        if (amount > 0) {
            if (isDirectlyLinked) {
                directRevenue += amount;
            } else {
                influencedRevenue += amount * 0.3; // 30% attribution for temporal correlation
            }

            if (event.eventType === 'expansion') {
                expansionRevenue += amount;
            } else if (event.eventType === 'new_customer') {
                newSaleRevenue += amount;
            }
        } else if (event.eventType === 'churn' && isDirectlyLinked) {
            // Anti-churn: customer mentioned theme, churned anyway
            // This reduces confidence but doesn't add to revenue
        }
    }

    // If we prevented churns (customers who mentioned issue but stayed)
    const { data: atRiskCustomers } = await supabase
        .from('user_health_scores')
        .select('user_id, health_score, predicted_churn_risk')
        .eq('project_id', projectId)
        .gt('predicted_churn_risk', 0.5)
        .limit(100);

    const preventedChurnValue = (atRiskCustomers || [])
        .filter(c => customerIds.includes(c.user_id))
        .length * 5000; // Assume $5k average customer value

    retentionRevenue = preventedChurnValue * 0.5; // 50% attribution

    // 6. Calculate totals
    const totalAttributedRevenue = directRevenue + influencedRevenue + retentionRevenue;

    // 7. Determine confidence
    let confidence: AttributionConfidence = 'low';
    const confidenceFactors: string[] = [];

    if (directMentions && directMentions.length >= 5) {
        confidence = 'high';
        confidenceFactors.push(`${directMentions.length} direct customer mentions`);
    } else if (directMentions && directMentions.length >= 2) {
        confidence = 'medium';
        confidenceFactors.push(`${directMentions.length} direct customer mentions`);
    } else {
        confidenceFactors.push('Limited direct mentions - using temporal correlation');
    }

    if (revenueEvents.length >= 10) {
        confidenceFactors.push(`Strong signal: ${revenueEvents.length} revenue events in window`);
    }

    // 8. Generate AI explanation
    const explanation = await generateAttributionExplanation({
        featureName: feature.themes?.theme_name || 'Unknown',
        directMentions: directMentions?.length || 0,
        revenueEvents: revenueEvents.length,
        totalRevenue: totalAttributedRevenue,
        confidence
    });

    const attribution: FeatureRevenueAttribution = {
        id: `attr_${featureId}`,
        projectId,
        featureId,
        featureName: feature.themes?.theme_name || 'Unknown',
        themeId: feature.themes?.id || '',
        themeName: feature.themes?.theme_name || 'Unknown',
        attributionWindowStart: shippedAt,
        attributionWindowEnd: windowEnd,
        directRevenue,
        influencedRevenue,
        totalAttributedRevenue,
        expansionRevenue,
        retentionRevenue,
        newSaleRevenue,
        attributionConfidence: confidence,
        confidenceExplanation: explanation,
        affectedCustomerCount: customerIds.length,
        customerSegments: { enterprise: 0, smb: 0, startup: 0 }, // Would calculate from customer data
        createdAt: new Date(),
        updatedAt: new Date()
    };

    console.log(`[RevenueAttribution] Calculated: $${totalAttributedRevenue.toLocaleString()} attributed`);

    return {
        success: true,
        attribution,
        revenueEvents,
        reasoning: {
            summary: explanation,
            methodUsed: directMentions && directMentions.length > 0 ? 'direct_mention' : 'temporal_correlation',
            confidenceFactors
        }
    };
}

/**
 * Get revenue events (mock - would integrate with billing API)
 */
async function getRevenueEvents(
    projectId: string,
    startDate: Date,
    endDate: Date,
    priorityCustomerIds: string[]
): Promise<RevenueEvent[]> {
    // TODO: Integrate with Stripe, ChargeBee, or other billing APIs
    // For now, return empty - would be populated from real billing data
    return [];
}

/**
 * Generate AI explanation for attribution
 */
async function generateAttributionExplanation(data: {
    featureName: string;
    directMentions: number;
    revenueEvents: number;
    totalRevenue: number;
    confidence: string;
}): Promise<string> {
    try {
        const response = await complete({
            type: 'generation',
            messages: [
                {
                    role: 'system',
                    content: 'Generate a one-sentence explanation of feature revenue attribution.'
                },
                {
                    role: 'user',
                    content: `Feature: ${data.featureName}
Direct mentions: ${data.directMentions}
Revenue events: ${data.revenueEvents}
Total revenue: $${data.totalRevenue.toLocaleString()}
Confidence: ${data.confidence}

Explain why this revenue is attributed to this feature.`
                }
            ],
            options: { maxTokens: 100, temperature: 0.3 },
            costSensitive: true
        });

        return response.content || `$${data.totalRevenue.toLocaleString()} attributed based on ${data.directMentions} customer mentions.`;
    } catch (error) {
        return `$${data.totalRevenue.toLocaleString()} attributed based on ${data.directMentions} customer mentions.`;
    }
}

/**
 * Get project revenue summary
 */
export async function getProjectRevenueSummary(
    projectId: string,
    months: number = 6
): Promise<ProjectRevenueSummary> {
    const supabase = getServiceRoleClient();
    if (!supabase) throw new Error('Database unavailable');

    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - months);

    // Get all attributions for the project
    const { data: attributions } = await supabase
        .from('feature_revenue_attributions')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', periodStart.toISOString());

    const data = attributions || [];

    const totalAttributedRevenue = data.reduce((sum, a) => sum + (a.total_attributed_revenue || 0), 0);
    const totalFeaturesClosed = data.length;

    const bySource = {
        expansion: data.reduce((sum, a) => sum + (a.expansion_revenue || 0), 0),
        retention: data.reduce((sum, a) => sum + (a.retention_revenue || 0), 0),
        newSale: data.reduce((sum, a) => sum + (a.new_sale_revenue || 0), 0)
    };

    // Top performers
    const topRevenueFeatures = [...data]
        .sort((a, b) => (b.total_attributed_revenue || 0) - (a.total_attributed_revenue || 0))
        .slice(0, 5)
        .map(a => ({
            featureId: a.feature_id,
            featureName: a.feature_name,
            revenue: a.total_attributed_revenue || 0,
            roi: a.roi || null
        }));

    return {
        projectId,
        totalAttributedRevenue,
        totalFeaturesClosed,
        avgRevenuePerFeature: totalFeaturesClosed > 0 ? totalAttributedRevenue / totalFeaturesClosed : 0,
        bySource,
        topRevenueFeatures,
        monthlyTrend: [], // Would calculate from monthly data
        periodStart,
        periodEnd: new Date()
    };
}

/**
 * Store attribution in database
 */
export async function storeAttribution(
    attribution: FeatureRevenueAttribution
): Promise<void> {
    const supabase = getServiceRoleClient();
    if (!supabase) throw new Error('Database unavailable');

    await supabase
        .from('feature_revenue_attributions')
        .upsert({
            id: attribution.id,
            project_id: attribution.projectId,
            feature_id: attribution.featureId,
            feature_name: attribution.featureName,
            theme_id: attribution.themeId,
            theme_name: attribution.themeName,
            attribution_window_start: attribution.attributionWindowStart,
            attribution_window_end: attribution.attributionWindowEnd,
            direct_revenue: attribution.directRevenue,
            influenced_revenue: attribution.influencedRevenue,
            total_attributed_revenue: attribution.totalAttributedRevenue,
            expansion_revenue: attribution.expansionRevenue,
            retention_revenue: attribution.retentionRevenue,
            new_sale_revenue: attribution.newSaleRevenue,
            attribution_confidence: attribution.attributionConfidence,
            confidence_explanation: attribution.confidenceExplanation,
            affected_customer_count: attribution.affectedCustomerCount,
            customer_segments: attribution.customerSegments,
            roi: attribution.roi,
            created_at: attribution.createdAt,
            updated_at: attribution.updatedAt
        });
}
