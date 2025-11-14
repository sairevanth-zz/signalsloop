/**
 * Theme Detection Types
 * Type definitions for the theme and pattern detection feature
 */

import { SentimentCategory } from './sentiment';

// ============================================================================
// Core Theme Types
// ============================================================================

/**
 * Theme cluster - high-level grouping of related themes
 */
export interface ThemeCluster {
  id: string;
  project_id: string;
  cluster_name: string;
  description?: string;
  theme_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Individual theme detected from feedback
 */
export interface Theme {
  id: string;
  project_id: string;
  cluster_id?: string;
  theme_name: string;
  description: string;
  frequency: number;
  avg_sentiment: number;
  first_seen: string;
  last_seen: string;
  is_emerging: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Theme with additional details (from view)
 */
export interface ThemeWithDetails extends Theme {
  cluster_name?: string;
  actual_feedback_count: number;
  related_categories?: string[];
}

/**
 * Feedback-to-theme mapping
 */
export interface FeedbackTheme {
  feedback_id: string;
  theme_id: string;
  confidence: number;
  created_at: string;
}

// ============================================================================
// AI Detection Types
// ============================================================================

/**
 * Single detected theme from AI analysis
 */
export interface DetectedTheme {
  theme_name: string;
  description: string;
  item_indices: number[];
  confidence: number;
}

/**
 * Result from theme detection AI call
 */
export interface ThemeDetectionAIResult {
  themes: DetectedTheme[];
}

/**
 * Input for theme detection
 */
export interface ThemeDetectionInput {
  feedbackItems: FeedbackItem[];
  projectId: string;
  force?: boolean;
}

/**
 * Feedback item for theme detection
 */
export interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  created_at: string;
  sentiment_score?: number;
  sentiment_category?: SentimentCategory;
}

/**
 * Result from theme detection process
 */
export interface ThemeDetectionResult {
  themes: Theme[];
  newCount: number;
  updatedCount: number;
  processedItems: number;
  message?: string;
}

/**
 * Batch theme detection result
 */
export interface BatchThemeDetectionResult {
  batchNumber: number;
  totalBatches: number;
  themes: DetectedTheme[];
  itemCount: number;
}

// ============================================================================
// Analytics & Trend Types
// ============================================================================

/**
 * Theme statistics
 */
export interface ThemeStatistics {
  total_themes: number;
  emerging_themes: number;
  total_feedback_items: number;
  avg_theme_frequency: number;
}

/**
 * Theme trend data point
 */
export interface ThemeTrendPoint {
  date: string;
  feedback_count: number;
  avg_sentiment: number;
}

/**
 * Theme trend data
 */
export interface ThemeTrend {
  theme_id: string;
  theme_name: string;
  data: ThemeTrendPoint[];
  growth_rate?: number;
  trend_direction?: 'up' | 'down' | 'stable';
}

/**
 * Theme growth metrics
 */
export interface ThemeGrowth {
  theme_id: string;
  current_frequency: number;
  previous_frequency: number;
  growth_percentage: number;
  growth_absolute: number;
  is_new: boolean;
}

/**
 * Emerging theme with context
 */
export interface EmergingTheme extends Theme {
  recent_mentions: number;
  previous_mentions: number;
  growth_rate: number;
  growth_label: string; // e.g., "100% increase", "New theme"
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for ThemeCard component
 */
export interface ThemeCardProps {
  theme: Theme | ThemeWithDetails;
  showTrend?: boolean;
  onClick?: (theme: Theme | ThemeWithDetails) => void;
  className?: string;
}

/**
 * Props for ThemesOverview component
 */
export interface ThemesOverviewProps {
  projectId: string;
  projectSlug: string;
  initialThemes?: Theme[];
  limit?: number;
  className?: string;
}

/**
 * Props for ThemeDetailPage component
 */
export interface ThemeDetailPageProps {
  themeId: string;
  projectId: string;
  projectSlug?: string;
}

/**
 * Props for ThemeTrendChart component
 */
export interface ThemeTrendChartProps {
  themeIds: string[];
  projectId: string;
  timeRange?: 7 | 30 | 90 | 'all';
  className?: string;
}

/**
 * Props for FeedbackListGroupedByThemes component
 */
export interface FeedbackListGroupedByThemesProps {
  projectId: string;
  projectSlug: string;
  themes?: Theme[];
  initialExpanded?: boolean;
  className?: string;
}

/**
 * Props for EmergingThemesAlert component
 */
export interface EmergingThemesAlertProps {
  projectId: string;
  projectSlug: string;
  onInvestigate?: (theme: EmergingTheme) => void;
  onDismiss?: (themeId: string) => void;
  className?: string;
}

/**
 * Props for ThemeClusterView component
 */
export interface ThemeClusterViewProps {
  projectId: string;
  projectSlug: string;
  clusters?: ThemeCluster[];
  themes?: ThemeWithDetails[];
  className?: string;
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

/**
 * Theme filter options
 */
export interface ThemeFilter {
  search?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  minFrequency?: number;
  maxFrequency?: number;
  isEmerging?: boolean;
  clusterId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Sort options for themes
 */
export type ThemeSortOption =
  | 'frequency_desc'
  | 'frequency_asc'
  | 'sentiment_desc'
  | 'sentiment_asc'
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc';

/**
 * Theme list options
 */
export interface ThemeListOptions {
  filter?: ThemeFilter;
  sort?: ThemeSortOption;
  limit?: number;
  offset?: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for detect themes API
 */
export interface DetectThemesRequest {
  projectId: string;
  force?: boolean;
}

/**
 * Response from detect themes API
 */
export interface DetectThemesResponse {
  success: boolean;
  themes: Theme[];
  newCount: number;
  updatedCount: number;
  processedItems: number;
  message?: string;
  error?: string;
}

/**
 * Request for theme details
 */
export interface ThemeDetailsRequest {
  themeId: string;
  includeRelatedFeedback?: boolean;
  includeTrend?: boolean;
  timeRange?: number;
}

/**
 * Response with theme details
 */
export interface ThemeDetailsResponse {
  success: boolean;
  theme: ThemeWithDetails;
  relatedFeedback?: FeedbackItem[];
  trend?: ThemeTrendPoint[];
  relatedThemes?: Theme[];
  error?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Theme color scheme based on sentiment
 */
export interface ThemeColorScheme {
  bg: string;
  text: string;
  border: string;
  borderLeft: string;
}

/**
 * Get theme color scheme based on sentiment
 */
export function getThemeColorScheme(avgSentiment: number): ThemeColorScheme {
  if (avgSentiment >= 0.3) {
    return {
      bg: 'bg-green-50',
      text: 'text-green-900',
      border: 'border-green-200',
      borderLeft: 'border-l-green-500',
    };
  } else if (avgSentiment <= -0.3) {
    return {
      bg: 'bg-red-50',
      text: 'text-red-900',
      border: 'border-red-200',
      borderLeft: 'border-l-red-500',
    };
  } else {
    return {
      bg: 'bg-gray-50',
      text: 'text-gray-900',
      border: 'border-gray-200',
      borderLeft: 'border-l-gray-400',
    };
  }
}

/**
 * Trend indicator type
 */
export type TrendIndicator = 'up' | 'down' | 'stable';

/**
 * Get trend indicator
 */
export function getTrendIndicator(
  current: number,
  previous: number,
): TrendIndicator {
  const threshold = 0.1; // 10% change threshold
  const changeRate = previous > 0 ? (current - previous) / previous : 0;

  if (changeRate > threshold) return 'up';
  if (changeRate < -threshold) return 'down';
  return 'stable';
}

/**
 * Trend indicator display
 */
export interface TrendDisplay {
  icon: string;
  color: string;
  label: string;
}

/**
 * Get trend display properties
 */
export function getTrendDisplay(indicator: TrendIndicator): TrendDisplay {
  switch (indicator) {
    case 'up':
      return {
        icon: '▲',
        color: 'text-green-600',
        label: 'Increasing',
      };
    case 'down':
      return {
        icon: '▼',
        color: 'text-red-600',
        label: 'Decreasing',
      };
    case 'stable':
      return {
        icon: '▬',
        color: 'text-gray-600',
        label: 'Stable',
      };
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum cluster size for theme detection
 */
export const MIN_CLUSTER_SIZE = 3;

/**
 * Default batch size for processing
 */
export const DEFAULT_BATCH_SIZE = 100;

/**
 * Emerging theme threshold (growth percentage)
 */
export const EMERGING_THEME_THRESHOLD = 1.0; // 100% growth

/**
 * Time ranges for analysis
 */
export const TIME_RANGES = {
  WEEK: 7,
  MONTH: 30,
  QUARTER: 90,
  ALL: null,
} as const;

/**
 * Theme detection configuration
 */
export const THEME_DETECTION_CONFIG = {
  minClusterSize: MIN_CLUSTER_SIZE,
  maxBatchSize: DEFAULT_BATCH_SIZE,
  minConfidence: 0.5,
  maxThemesPerBatch: 10,
  minThemesPerBatch: 3,
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Theme detection error
 */
export class ThemeDetectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public projectId?: string,
  ) {
    super(message);
    this.name = 'ThemeDetectionError';
  }
}

/**
 * Theme clustering error
 */
export class ThemeClusteringError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ThemeClusteringError';
  }
}
