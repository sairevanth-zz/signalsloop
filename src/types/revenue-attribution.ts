/**
 * Revenue Attribution Types
 * 
 * Types for linking features to revenue impact through
 * expansion, churn prevention, and new sales.
 */

export type RevenueSource = 'expansion' | 'retention' | 'new_sale' | 'upsell';
export type AttributionConfidence = 'high' | 'medium' | 'low';

/**
 * Revenue event from billing system
 */
export interface RevenueEvent {
    id: string;
    projectId: string;
    customerId: string;
    customerName?: string;

    // Event details
    eventType: 'expansion' | 'churn' | 'new_customer' | 'renewal';
    eventDate: Date;

    // Revenue impact
    mrr_change: number; // Monthly Recurring Revenue change (can be negative)
    arr_change: number; // Annual Recurring Revenue change

    // Attribution link
    linkedThemeIds?: string[]; // Themes that might have influenced this
    linkedFeatureIds?: string[]; // Features that might have influenced this

    // Metadata
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

/**
 * Feature-to-Revenue attribution record
 */
export interface FeatureRevenueAttribution {
    id: string;
    projectId: string;
    featureId: string; // roadmap_suggestion or feature_outcome id
    featureName: string;
    themeId: string;
    themeName: string;

    // Attribution window
    attributionWindowStart: Date;
    attributionWindowEnd: Date;

    // Revenue metrics
    directRevenue: number; // Directly attributable (e.g., customer mentioned feature)
    influencedRevenue: number; // Indirectly attributable (shipped before expansion)
    totalAttributedRevenue: number;

    // Breakdown by source
    expansionRevenue: number;
    retentionRevenue: number; // Churn prevented * average customer value
    newSaleRevenue: number;

    // Confidence
    attributionConfidence: AttributionConfidence;
    confidenceExplanation: string;

    // Customer details
    affectedCustomerCount: number;
    customerSegments: {
        enterprise: number;
        smb: number;
        startup: number;
    };

    // ROI calculation
    estimatedDevelopmentCost?: number;
    roi?: number; // (revenue - cost) / cost
    paybackPeriodMonths?: number;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Attribution calculation input
 */
export interface AttributionInput {
    projectId: string;
    featureId: string;
    shippedAt: Date;
    windowDays?: number; // Default 90 days
}

/**
 * Attribution calculation output
 */
export interface AttributionOutput {
    success: boolean;
    attribution: FeatureRevenueAttribution | null;
    revenueEvents: RevenueEvent[];
    reasoning: {
        summary: string;
        methodUsed: 'direct_mention' | 'temporal_correlation' | 'theme_matching';
        confidenceFactors: string[];
    };
}

/**
 * Project revenue summary
 */
export interface ProjectRevenueSummary {
    projectId: string;

    // Totals
    totalAttributedRevenue: number;
    totalFeaturesClosed: number;
    avgRevenuePerFeature: number;

    // By source
    bySource: {
        expansion: number;
        retention: number;
        newSale: number;
    };

    // Top performers
    topRevenueFeatures: {
        featureId: string;
        featureName: string;
        revenue: number;
        roi: number | null;
    }[];

    // Trends
    monthlyTrend: {
        month: string;
        revenue: number;
        featuresShipped: number;
    }[];

    // Period
    periodStart: Date;
    periodEnd: Date;
}

/**
 * API Responses
 */
export interface GetAttributionResponse {
    success: boolean;
    attribution: FeatureRevenueAttribution | null;
    error?: string;
}

export interface GetRevenueSummaryResponse {
    success: boolean;
    summary: ProjectRevenueSummary | null;
    error?: string;
}
