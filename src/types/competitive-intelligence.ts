/**
 * TypeScript Type Definitions for Competitive Intelligence Feature
 */

// Enums
export type CompetitorStatus = 'active' | 'monitoring' | 'dismissed';
export type MentionType = 'comparison' | 'switch_to' | 'switch_from' | 'feature_comparison' | 'general';
export type FeatureGapPriority = 'critical' | 'high' | 'medium' | 'low';
export type FeatureGapStatus = 'identified' | 'planned' | 'building' | 'shipped' | 'dismissed';
export type CompetitiveEventType = 'feature_launch' | 'pricing_change' | 'funding' | 'negative_press' | 'acquisition' | 'layoffs' | 'executive_change' | 'other';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type RecommendationType = 'attack' | 'defend' | 'react' | 'ignore';
export type RecommendationStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'dismissed';

// Database Models
export interface Competitor {
  id: string;
  project_id: string;
  name: string;
  category: string | null;
  website: string | null;
  description: string | null;
  auto_detected: boolean;
  status: CompetitorStatus;
  total_mentions: number;
  first_mentioned_at: string | null;
  last_mentioned_at: string | null;
  avg_sentiment_vs_you: number;
  avg_sentiment_about_them: number;
  switches_to_you: number;
  switches_from_you: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompetitiveMention {
  id: string;
  feedback_id: string;
  competitor_id: string;
  mention_type: MentionType;
  context_snippet: string | null;
  sentiment_vs_you: number | null;
  sentiment_about_competitor: number | null;
  key_points: string[];
  extracted_at: string;
  created_at: string;
}

export interface FeatureGap {
  id: string;
  project_id: string;
  feature_name: string;
  description: string;
  mention_count: number;
  competitor_ids: string[];
  avg_sentiment: number;
  urgency_score: number;
  estimated_revenue_impact: string | null;
  priority: FeatureGapPriority;
  status: FeatureGapStatus;
  user_quotes: string[];
  feedback_ids: string[];
  first_detected_at: string;
  last_updated_at: string;
  assigned_to: string | null;
  roadmap_item_id: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitiveEvent {
  id: string;
  competitor_id: string;
  event_type: CompetitiveEventType;
  title: string;
  description: string | null;
  event_date: string;
  mention_count: number;
  avg_sentiment: number | null;
  impact_level: ImpactLevel;
  feedback_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StrategicRecommendation {
  id: string;
  project_id: string;
  recommendation_type: RecommendationType;
  title: string;
  description: string;
  reasoning: string;
  estimated_impact: string | null;
  estimated_cost: string | null;
  roi_estimate: string | null;
  priority: FeatureGapPriority;
  status: RecommendationStatus;
  related_competitor_ids: string[];
  related_feature_gap_ids: string[];
  related_feedback_ids: string[];
  assigned_to: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  dismissal_reason: string | null;
  outcome_notes: string | null;
  actual_impact: string | null;
  created_at: string;
  updated_at: string;
}

// View Models
export interface CompetitiveDashboardOverview {
  project_id: string;
  competitor_id: string;
  competitor_name: string;
  category: string | null;
  status: CompetitorStatus;
  total_mentions: number;
  avg_sentiment_vs_you: number;
  avg_sentiment_about_them: number;
  switches_to_you: number;
  switches_from_you: number;
  net_switches: number;
  last_mentioned_at: string | null;
  mentions_last_7d: number;
  mentions_last_30d: number;
  comparison_count: number;
  feature_comparison_count: number;
}

export interface FeatureGapWithCompetitors extends FeatureGap {
  competitor_names: string[];
  actual_feedback_count: number;
}

export interface RecentCompetitiveActivity {
  activity_type: 'mention' | 'event';
  id: string;
  project_id: string;
  competitor_name: string;
  activity_subtype: string;
  description: string | null;
  sentiment: number | null;
  created_at: string;
}

// API Response Types
export interface CompetitiveOverviewResponse {
  success: boolean;
  overview: {
    total_competitors: number;
    active_competitors: number;
    total_mentions: number;
    mentions_last_7d: number;
    mentions_last_30d: number;
    avg_sentiment_vs_competitors: number;
    total_switches_to_you: number;
    total_switches_from_you: number;
    net_switches: number;
  } | null;
  competitors: CompetitiveDashboardOverview[];
  topFeatureGaps: FeatureGap[];
  pendingRecommendations: StrategicRecommendation[];
  recentActivity: RecentCompetitiveActivity[];
  sentimentTrend: Array<{
    date: string;
    avg_sentiment: number;
    mention_count: number;
  }>;
}

export interface CompetitorProfileResponse {
  success: boolean;
  competitor: Competitor;
  mentionBreakdown: Array<{
    mention_type: MentionType;
    count: number;
  }>;
  sentimentTrend: Array<{
    date: string;
    avg_sentiment_vs_you: number;
    mention_count: number;
  }>;
  topMentions: Array<{
    id: string;
    feedback_id: string;
    mention_type: MentionType;
    context_snippet: string;
    sentiment_vs_you: number;
    key_points: string[];
    created_at: string;
  }>;
}

export interface CompetitorsListResponse {
  success: boolean;
  competitors: CompetitiveDashboardOverview[];
  total: number;
}

export interface FeatureGapsListResponse {
  success: boolean;
  featureGaps: FeatureGapWithCompetitors[];
  total: number;
}

export interface FeatureGapDetailsResponse {
  success: boolean;
  gap: FeatureGap | null;
  relatedFeedback: Array<{
    id: string;
    content: string;
    platform: string;
    discovered_at: string;
  }>;
  competitors: Array<{
    id: string;
    name: string;
  }>;
}

export interface RecommendationsListResponse {
  success: boolean;
  recommendations: StrategicRecommendation[];
  total: number;
}

export interface RecommendationDetailsResponse {
  success: boolean;
  recommendation: StrategicRecommendation | null;
  relatedCompetitors: Array<{
    id: string;
    name: string;
  }>;
  relatedFeatureGaps: Array<{
    id: string;
    feature_name: string;
    priority: FeatureGapPriority;
  }>;
}

// Component Props Types
export interface CompetitiveOverviewProps {
  projectId: string;
  className?: string;
}

export interface CompetitorProfileProps {
  competitorId: string;
  projectId: string;
  onBack?: () => void;
}

export interface FeatureGapAnalysisProps {
  projectId: string;
  onGapClick?: (gapId: string) => void;
}

export interface StrategicRecommendationsProps {
  projectId: string;
  onRecommendationClick?: (recommendationId: string) => void;
}

export interface HeadToHeadComparisonProps {
  projectId: string;
  competitorId: string;
}

export interface CompetitiveBadgeProps {
  mentionCount: number;
  competitorNames: string[];
  size?: 'sm' | 'md' | 'lg';
}

// Utility Types
export interface CompetitorMentionExtraction {
  competitor_name: string;
  mention_type: MentionType;
  context: string;
  sentiment_vs_us: number;
  sentiment_about_competitor: number;
  key_points: string[];
}

export interface ExtractionResult {
  mentions: CompetitorMentionExtraction[];
  hasCompetitors: boolean;
  extractedAt: string;
}

export interface BatchExtractionResult {
  processed: number;
  successful: number;
  failed: number;
  totalMentions: number;
}
