/**
 * AI Feedback Hunter Types
 * Type definitions for the autonomous feedback discovery and analysis feature
 */

// ============================================================================
// Core Hunter Types
// ============================================================================

/**
 * Platform types supported by the hunter
 */
export type PlatformType =
  | 'reddit'
  | 'twitter'
  | 'hackernews'
  | 'g2'
  | 'producthunt'
  | 'appstore'
  | 'playstore';

/**
 * Integration status
 */
export type IntegrationStatus = 'active' | 'paused' | 'error' | 'setup';

/**
 * Feedback classification types
 */
export type FeedbackClassification =
  | 'bug'
  | 'feature_request'
  | 'praise'
  | 'complaint'
  | 'churn_risk'
  | 'question'
  | 'other';

/**
 * Action priority levels
 */
export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Action recommendation status
 */
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';

/**
 * Scan types
 */
export type ScanType = 'scheduled' | 'manual' | 'test';

/**
 * Sentiment trend
 */
export type SentimentTrend = 'improving' | 'declining' | 'stable';

// ============================================================================
// Database Models
// ============================================================================

/**
 * Hunter configuration database record
 */
export interface HunterConfig {
  id: string;
  project_id: string;
  company_name: string;
  name_variations: string[];
  competitors: string[];
  industry?: string;
  keywords: string[];
  excluded_keywords: string[];
  auto_classify: boolean;
  auto_sentiment_analysis: boolean;
  auto_theme_detection: boolean;
  theme_detection_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Platform integration configuration
 */
export interface PlatformIntegration {
  id: string;
  project_id: string;
  platform_type: PlatformType;
  config: PlatformConfig;
  status: IntegrationStatus;
  last_scan_at?: string;
  next_scan_at?: string;
  scan_frequency_minutes: number;
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  total_items_found: number;
  last_error?: string;
  error_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Platform-specific configuration (stored as JSONB)
 */
export interface PlatformConfig {
  // Reddit
  reddit_client_id?: string;
  reddit_client_secret?: string;
  reddit_refresh_token?: string;
  subreddits?: string[];

  // Twitter
  twitter_bearer_token?: string;
  twitter_search_terms?: string[];
  twitter_usernames?: string[];

  // Hacker News
  hn_keywords?: string[];

  // G2
  g2_product_url?: string;
  g2_scrape_interval_minutes?: number;

  // ProductHunt
  producthunt_product_slug?: string;
  producthunt_api_key?: string;

  // App Store
  appstore_app_id?: string;
  appstore_country?: string;

  // Play Store
  playstore_package_name?: string;
  playstore_country?: string;
}

/**
 * Engagement metrics (stored as JSONB)
 */
export interface EngagementMetrics {
  likes?: number;
  dislikes?: number;
  shares?: number;
  retweets?: number;
  comments?: number;
  replies?: number;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  rating?: number;
}

/**
 * Author metadata (stored as JSONB)
 */
export interface AuthorMetadata {
  follower_count?: number;
  account_age_days?: number;
  verified?: boolean;
  karma?: number;
  is_influencer?: boolean;
  profile_image_url?: string;
}

/**
 * Discovered feedback item
 */
export interface DiscoveredFeedback {
  id: string;
  project_id: string;
  platform: PlatformType;
  platform_id: string;
  platform_url: string;
  author_username?: string;
  author_profile_url?: string;
  author_metadata: AuthorMetadata;

  // Content
  title?: string;
  content: string;
  content_html?: string;
  content_preview: string;

  // Classification
  classification?: FeedbackClassification;
  classification_confidence?: number;
  classification_reason?: string;
  urgency_score?: number;
  urgency_reason?: string;

  // Sentiment
  sentiment_score?: number;
  sentiment_category?: string;
  sentiment_analysis_id?: string;

  // Metadata
  engagement_score: number;
  engagement_metrics: EngagementMetrics;
  tags: string[];
  auto_tagged: boolean;

  // Processing status
  discovered_at: string;
  processed_at?: string;
  theme_analyzed_at?: string;
  responded_at?: string;
  response_content?: string;
  response_url?: string;

  // Tracking
  is_duplicate: boolean;
  duplicate_of?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hunter scan log
 */
export interface HunterLog {
  id: string;
  project_id?: string;
  platform: PlatformType;
  integration_id?: string;
  scan_type: ScanType;
  items_found: number;
  items_stored: number;
  items_duplicates: number;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
  error_stack?: string;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Suggested action item
 */
export interface SuggestedAction {
  type: 'create_ticket' | 'respond' | 'escalate' | 'monitor' | 'contact_user';
  description: string;
  priority: ActionPriority;
  estimated_effort?: string;
  tools?: string[];
}

/**
 * Action recommendation
 */
export interface ActionRecommendation {
  id: string;
  project_id: string;
  feedback_ids: string[];

  // Recommendation details
  issue_summary: string;
  issue_category?: string;
  mention_count: number;
  avg_sentiment?: number;
  sentiment_trend?: SentimentTrend;

  // Impact
  revenue_at_risk_estimate?: number;
  affected_users_estimate?: number;
  business_impact?: string;

  // Priority
  priority: ActionPriority;
  priority_score?: number;
  priority_reason?: string;

  // Actions
  suggested_actions: SuggestedAction[];
  draft_response?: string;
  draft_response_tone: string;

  // Status
  status: ActionStatus;
  assigned_to?: string;

  // Tracking
  viewed_at?: string;
  started_at?: string;
  completed_at?: string;
  dismissed_at?: string;
  dismissal_reason?: string;

  // Results
  actual_actions_taken: ActualAction[];
  outcome_notes?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Actual action taken
 */
export interface ActualAction {
  type: string;
  description: string;
  completed_at: string;
  result?: string;
  url?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for hunter setup
 */
export interface HunterSetupRequest {
  projectId: string;
  companyName: string;
  nameVariations?: string[];
  competitors?: string[];
  industry?: string;
  keywords?: string[];
  platforms: PlatformType[];
}

/**
 * Response from hunter setup
 */
export interface HunterSetupResponse {
  success: boolean;
  configId: string;
  message?: string;
}

/**
 * Request to add platform integration
 */
export interface AddPlatformRequest {
  projectId: string;
  platformType: PlatformType;
  config: PlatformConfig;
  scanFrequencyMinutes?: number;
}

/**
 * Request to update platform integration
 */
export interface UpdatePlatformRequest {
  integrationId: string;
  config?: Partial<PlatformConfig>;
  status?: IntegrationStatus;
  scanFrequencyMinutes?: number;
}

/**
 * Request to trigger manual scan
 */
export interface TriggerScanRequest {
  projectId: string;
  platformType?: PlatformType;
  integrationId?: string;
}

/**
 * Response from trigger scan
 */
export interface TriggerScanResponse {
  success: boolean;
  jobId?: string;
  message: string;
}

/**
 * Request for feedback feed
 */
export interface FeedbackFeedRequest {
  projectId: string;
  platform?: PlatformType;
  classification?: FeedbackClassification;
  urgency?: number;
  sentimentMin?: number;
  sentimentMax?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Response from feedback feed
 */
export interface FeedbackFeedResponse {
  success: boolean;
  items: DiscoveredFeedback[];
  total: number;
  hasMore: boolean;
}

/**
 * Request to generate action recommendations
 */
export interface GenerateRecommendationsRequest {
  projectId: string;
  minMentions?: number;
  lookbackDays?: number;
}

/**
 * Response from generate recommendations
 */
export interface GenerateRecommendationsResponse {
  success: boolean;
  recommendations: ActionRecommendation[];
  message?: string;
}

/**
 * Request to generate AI response
 */
export interface GenerateResponseRequest {
  feedbackId: string;
  tone?: 'professional' | 'friendly' | 'apologetic' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
  includeActions?: boolean;
}

/**
 * Response from generate AI response
 */
export interface GenerateResponseResponse {
  success: boolean;
  responses: {
    tone: string;
    content: string;
    wordCount: number;
  }[];
  suggestedActions?: string[];
}

// ============================================================================
// Hunter Service Types
// ============================================================================

/**
 * Raw feedback before classification
 */
export interface RawFeedback {
  content: string;
  title?: string;
  platform: PlatformType;
  platform_id: string;
  platform_url: string;
  author_username?: string;
  author_profile_url?: string;
  author_metadata?: AuthorMetadata;
  discovered_at: Date;
  engagement_metrics?: EngagementMetrics;
}

/**
 * Classified feedback ready for storage
 */
export interface ClassifiedFeedback extends RawFeedback {
  classification: FeedbackClassification;
  classification_confidence: number;
  classification_reason: string;
  urgency_score: number;
  urgency_reason: string;
  sentiment_score: number;
  sentiment_category: string;
  tags: string[];
  engagement_score: number;
}

/**
 * Hunter scan result
 */
export interface HunterScanResult {
  platform: PlatformType;
  itemsFound: number;
  itemsStored: number;
  itemsDuplicates: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * OpenAI classification input
 */
export interface ClassificationInput {
  content: string;
  title?: string;
  platform: PlatformType;
  authorMetadata?: AuthorMetadata;
  engagementMetrics?: EngagementMetrics;
}

/**
 * OpenAI classification output
 */
export interface ClassificationOutput {
  classification: FeedbackClassification;
  confidence: number;
  reasoning: string;
  urgency_score: number;
  urgency_reason: string;
  sentiment_score: number;
  sentiment_category: string;
  tags: string[];
}

// ============================================================================
// Analytics & Statistics Types
// ============================================================================

/**
 * Hunter dashboard statistics
 */
export interface HunterDashboardStats {
  project_id: string;
  total_feedback: number;
  feedback_last_24h: number;
  feedback_last_7d: number;
  active_platforms: number;
  avg_sentiment: number;
  urgent_items: number;
  churn_risks: number;
  bugs: number;
  feature_requests: number;
  responded_count: number;
  last_discovery?: string;
}

/**
 * Platform health statistics
 */
export interface PlatformHealthStats {
  project_id: string;
  platform_type: PlatformType;
  status: IntegrationStatus;
  last_scan_at?: string;
  next_scan_at?: string;
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  total_items_found: number;
  success_rate: number;
  error_count: number;
  last_error?: string;
}

/**
 * Classification distribution
 */
export interface ClassificationDistribution {
  classification: FeedbackClassification;
  count: number;
  percentage: number;
}

/**
 * Platform distribution
 */
export interface PlatformDistribution {
  platform: PlatformType;
  count: number;
  percentage: number;
  avg_sentiment: number;
}

/**
 * Urgency distribution
 */
export interface UrgencyDistribution {
  urgency_score: number;
  count: number;
  percentage: number;
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  date: string;
  count: number;
  avg_sentiment: number;
  urgent_count: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for HunterSetup component
 */
export interface HunterSetupProps {
  projectId: string;
  onComplete?: () => void;
  className?: string;
}

/**
 * Props for FeedbackFeed component
 */
export interface FeedbackFeedProps {
  projectId: string;
  initialFeedback?: DiscoveredFeedback[];
  enableFilters?: boolean;
  enableRealtime?: boolean;
  onFeedbackClick?: (feedback: DiscoveredFeedback) => void;
  className?: string;
}

/**
 * Props for PlatformsDashboard component
 */
export interface PlatformsDashboardProps {
  projectId: string;
  onAddPlatform?: () => void;
  className?: string;
}

/**
 * Props for ClassificationOverview component
 */
export interface ClassificationOverviewProps {
  projectId: string;
  timeRange?: number;
  className?: string;
}

/**
 * Props for ActionRecommendations component
 */
export interface ActionRecommendationsProps {
  projectId: string;
  filterByPriority?: ActionPriority;
  filterByStatus?: ActionStatus;
  onActionClick?: (action: ActionRecommendation) => void;
  className?: string;
}

/**
 * Props for ResponseGenerator component
 */
export interface ResponseGeneratorProps {
  feedbackId: string;
  feedback: DiscoveredFeedback;
  onPublish?: (response: string) => void;
  className?: string;
}

/**
 * Props for HunterHealth component
 */
export interface HunterHealthProps {
  projectId: string;
  className?: string;
}

/**
 * Props for PlatformBadge component
 */
export interface PlatformBadgeProps {
  platform: PlatformType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Props for ClassificationBadge component
 */
export interface ClassificationBadgeProps {
  classification: FeedbackClassification;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Props for UrgencyBadge component
 */
export interface UrgencyBadgeProps {
  urgencyScore: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

// ============================================================================
// Configuration & Constants
// ============================================================================

/**
 * Platform metadata
 */
export interface PlatformMeta {
  name: string;
  icon: string;
  color: string;
  description: string;
  requiresAuth: boolean;
  rateLimitPerHour: number;
  costTier: 'free' | 'paid' | 'enterprise';
}

/**
 * Platform configuration map
 */
export const PLATFORM_META: Record<PlatformType, PlatformMeta> = {
  reddit: {
    name: 'Reddit',
    icon: '🔴',
    color: '#FF4500',
    description: 'Discover feedback from Reddit communities',
    requiresAuth: true,
    rateLimitPerHour: 60,
    costTier: 'free',
  },
  twitter: {
    name: 'Twitter/X',
    icon: '𝕏',
    color: '#1DA1F2',
    description: 'Monitor Twitter mentions and hashtags',
    requiresAuth: true,
    rateLimitPerHour: 100,
    costTier: 'paid',
  },
  hackernews: {
    name: 'Hacker News',
    icon: '🧡',
    color: '#FF6600',
    description: 'Track discussions on Hacker News',
    requiresAuth: false,
    rateLimitPerHour: 300,
    costTier: 'free',
  },
  g2: {
    name: 'G2',
    icon: '⭐',
    color: '#FF6D42',
    description: 'Collect reviews from G2',
    requiresAuth: false,
    rateLimitPerHour: 12,
    costTier: 'free',
  },
  producthunt: {
    name: 'Product Hunt',
    icon: '🚀',
    color: '#DA552F',
    description: 'Monitor Product Hunt comments',
    requiresAuth: true,
    rateLimitPerHour: 60,
    costTier: 'free',
  },
  appstore: {
    name: 'App Store',
    icon: '🍎',
    color: '#007AFF',
    description: 'Scrape App Store reviews',
    requiresAuth: false,
    rateLimitPerHour: 30,
    costTier: 'free',
  },
  playstore: {
    name: 'Play Store',
    icon: '🤖',
    color: '#34A853',
    description: 'Scrape Play Store reviews',
    requiresAuth: false,
    rateLimitPerHour: 30,
    costTier: 'free',
  },
};

/**
 * Classification metadata
 */
export const CLASSIFICATION_META: Record<
  FeedbackClassification,
  { label: string; color: string; emoji: string }
> = {
  bug: { label: 'Bug Report', color: 'red', emoji: '🐛' },
  feature_request: { label: 'Feature Request', color: 'blue', emoji: '✨' },
  praise: { label: 'Praise', color: 'green', emoji: '👏' },
  complaint: { label: 'Complaint', color: 'orange', emoji: '😤' },
  churn_risk: { label: 'Churn Risk', color: 'purple', emoji: '⚠️' },
  question: { label: 'Question', color: 'yellow', emoji: '❓' },
  other: { label: 'Other', color: 'gray', emoji: '📝' },
};

/**
 * Priority metadata
 */
export const PRIORITY_META: Record<
  ActionPriority,
  { label: string; color: string; emoji: string }
> = {
  urgent: { label: 'Urgent', color: 'red', emoji: '🚨' },
  high: { label: 'High', color: 'orange', emoji: '🔥' },
  medium: { label: 'Medium', color: 'yellow', emoji: '⚡' },
  low: { label: 'Low', color: 'blue', emoji: '📌' },
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Hunter error
 */
export class HunterError extends Error {
  constructor(
    message: string,
    public code: string,
    public platform?: PlatformType,
    public details?: any
  ) {
    super(message);
    this.name = 'HunterError';
  }
}

/**
 * Platform integration error
 */
export class PlatformIntegrationError extends HunterError {
  constructor(message: string, platform: PlatformType, details?: any) {
    super(message, 'PLATFORM_INTEGRATION_ERROR', platform, details);
    this.name = 'PlatformIntegrationError';
  }
}

/**
 * Classification error
 */
export class ClassificationError extends HunterError {
  constructor(message: string, details?: any) {
    super(message, 'CLASSIFICATION_ERROR', undefined, details);
    this.name = 'ClassificationError';
  }
}
