export interface FeedbackItem {
    text: string;
    source: string;
    date?: string;
}

export interface Theme {
    name: string;
    category: 'feature_request' | 'bug' | 'ux_issue' | 'performance' | 'pricing' | 'onboarding' | 'integration' | 'support' | 'praise' | 'comparison';
    mention_count: number;
    percentage: string;
    sentiment: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    trend?: 'growing' | 'stable' | 'declining';
    summary: string;
    sample_quotes: { quote: string; source: string }[];
    actionable_insight: string;
}

export interface TopFeatureRequest {
    feature: string;
    mentions: number;
    user_quote: string;
    effort_guess: 'low' | 'medium' | 'high';
    impact_guess: 'low' | 'medium' | 'high';
}

export interface CriticalIssue {
    issue: string;
    severity: 'critical' | 'high';
    mentions: number;
    user_impact: string;
    sample_quote: string;
}

export interface UserLove {
    strength: string;
    mentions: number;
    sample_quote: string;
    leverage_opportunity: string;
}

export interface CompetitorMention {
    competitor: string;
    context: 'switching_from' | 'switching_to' | 'comparison';
    mentions: number;
    summary: string;
}

export interface RecommendedPriority {
    rank: number;
    action: string;
    rationale: string;
    theme_reference: string;
}

export interface ProductSummary {
    overall_sentiment: number;
    sentiment_label: 'Very Negative' | 'Negative' | 'Mixed' | 'Positive' | 'Very Positive';
    total_feedback_analyzed: number;
    one_liner: string;
    sources_breakdown: Record<string, { count: number; sentiment: number }>;
}

export interface ClusteringResult {
    product_summary: ProductSummary;
    themes: Theme[];
    top_feature_requests: TopFeatureRequest[];
    critical_issues: CriticalIssue[];
    what_users_love: UserLove[];
    competitor_mentions: CompetitorMention[];
    recommended_priorities: RecommendedPriority[];
}
