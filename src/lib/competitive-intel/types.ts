export type ReviewSource =
    | 'reddit'
    | 'app_store'
    | 'play_store'
    | 'hacker_news'
    | 'pasted'
    | 'csv_upload';

export interface Review {
    text: string;
    rating: number | null; // 1.0 to 5.0
    date: Date | null;
    author: string | null;
    source: ReviewSource;
    source_url: string | null;

    // Enriched data
    sentiment?: number; // -1.0 to 1.0
    themes?: string[];
}

export interface ScraperResult {
    productName: string;
    normalizedProductName: string;
    source: ReviewSource;
    reviews: Review[];
    error?: string;
}

export interface CollectionResult {
    reviews: Review[];
    failedSources: string[];
}

export interface CompetitiveAnalysis {
    executive_summary: string;
    sentiment_comparison: Record<string, {
        product: string;
        overall_score: number;
        positive_pct: number;
        negative_pct: number;
        neutral_pct: number;
        review_count: number;
        data_quality: 'high' | 'medium' | 'low';
    }>;
    top_complaints_by_competitor: Record<string, {
        complaint: string;
        frequency: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        sample_quotes: string[];
        opportunity: string;
    }[]>;
    competitor_strengths: Record<string, {
        strength: string;
        frequency: string;
        threat_level: 'high' | 'medium' | 'low';
        response: string;
    }[]>;
    feature_gaps: {
        feature: string;
        competitors_lacking: string[];
        demand_evidence: string;
        opportunity_size: 'high' | 'medium' | 'low';
    }[];
    strategic_recommendations: {
        action: 'ATTACK' | 'DEFEND' | 'DIFFERENTIATE' | 'IGNORE';
        target: string;
        recommendation: string;
        rationale: string;
        effort: 'low' | 'medium' | 'high';
        impact: 'low' | 'medium' | 'high';
    }[];
    data_limitations: string[];
}
