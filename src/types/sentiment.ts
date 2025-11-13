/**
 * Sentiment Analysis Types
 * Type definitions for the sentiment analysis feature
 */

// ============================================================================
// Core Sentiment Types
// ============================================================================

/**
 * Sentiment categories
 */
export type SentimentCategory = 'positive' | 'negative' | 'neutral' | 'mixed';

/**
 * Emotional tone types commonly detected in feedback
 */
export type EmotionalTone =
  | 'excited'
  | 'satisfied'
  | 'frustrated'
  | 'angry'
  | 'confused'
  | 'concerned'
  | 'disappointed'
  | 'hopeful'
  | 'neutral'
  | 'urgent';

/**
 * Sentiment score range: -1 (very negative) to 1 (very positive)
 */
export type SentimentScore = number;

/**
 * Confidence score range: 0 (not confident) to 1 (very confident)
 */
export type ConfidenceScore = number;

// ============================================================================
// Database Models
// ============================================================================

/**
 * Sentiment analysis database record
 */
export interface SentimentAnalysis {
  id: string;
  post_id: string;
  sentiment_category: SentimentCategory;
  sentiment_score: SentimentScore;
  emotional_tone: string;
  confidence_score: ConfidenceScore;
  analyzed_at: string; // ISO timestamp
  created_at: string;  // ISO timestamp
}

/**
 * Post with sentiment data (from posts_with_sentiment view)
 */
export interface PostWithSentiment {
  id: string;
  title: string;
  description: string;
  status: string;
  author_email: string;
  author_name: string;
  vote_count: number;
  comment_count: number;
  category?: string;
  created_at: string;
  // Sentiment fields
  sentiment_category?: SentimentCategory;
  sentiment_score?: SentimentScore;
  emotional_tone?: string;
  confidence_score?: ConfidenceScore;
  sentiment_analyzed_at?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for sentiment analysis API
 */
export interface AnalyzeSentimentRequest {
  postIds: string[];
  projectId?: string;
}

/**
 * Single sentiment analysis result
 */
export interface SentimentAnalysisResult {
  postId: string;
  sentiment_category: SentimentCategory;
  sentiment_score: SentimentScore;
  emotional_tone: string;
  confidence_score: ConfidenceScore;
  success: boolean;
  error?: string;
}

/**
 * Response from sentiment analysis API
 */
export interface AnalyzeSentimentResponse {
  success: boolean;
  results: SentimentAnalysisResult[];
  processed: number;
  failed: number;
  message?: string;
}

/**
 * Batch processing result
 */
export interface BatchSentimentResult {
  results: SentimentAnalysisResult[];
  batchNumber: number;
  totalBatches: number;
}

// ============================================================================
// OpenAI Service Types
// ============================================================================

/**
 * Input for sentiment analysis
 */
export interface SentimentAnalysisInput {
  text: string;
  postId?: string;
  metadata?: {
    title?: string;
    category?: string;
    authorName?: string;
  };
}

/**
 * Output from OpenAI sentiment analysis
 */
export interface SentimentAnalysisOutput {
  sentiment_category: SentimentCategory;
  sentiment_score: SentimentScore;
  emotional_tone: string;
  confidence_score: ConfidenceScore;
  reasoning?: string; // Optional explanation of the analysis
}

/**
 * Batch sentiment analysis input
 */
export interface BatchSentimentInput {
  items: SentimentAnalysisInput[];
  maxBatchSize?: number;
}

// ============================================================================
// Analytics & Distribution Types
// ============================================================================

/**
 * Sentiment distribution data
 */
export interface SentimentDistribution {
  positive: number;
  negative: number;
  neutral: number;
  mixed: number;
}

/**
 * Sentiment distribution with percentages
 */
export interface SentimentDistributionWithPercentage {
  sentiment_category: SentimentCategory;
  count: number;
  percentage: number;
}

/**
 * Sentiment trend data point
 */
export interface SentimentTrendPoint {
  date: string;
  avg_sentiment_score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  mixed_count: number;
}

/**
 * Time range for sentiment analysis
 */
export type TimeRange = 7 | 30 | 90;

/**
 * Sentiment statistics
 */
export interface SentimentStats {
  total: number;
  distribution: SentimentDistribution;
  averageScore: number;
  averageConfidence: number;
  mostCommonTone: string;
  trend: 'improving' | 'declining' | 'stable';
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for SentimentBadge component
 */
export interface SentimentBadgeProps {
  sentiment_category: SentimentCategory;
  sentiment_score?: SentimentScore;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showEmoji?: boolean;
  className?: string;
}

/**
 * Props for SentimentWidget component
 */
export interface SentimentWidgetProps {
  projectId: string;
  defaultTimeRange?: TimeRange;
  onFilterChange?: (category: SentimentCategory | null) => void;
  className?: string;
}

/**
 * Props for SentimentTrendChart component
 */
export interface SentimentTrendChartProps {
  projectId: string;
  defaultTimeRange?: TimeRange;
  className?: string;
}

/**
 * Props for FeedbackListWithSentiment component
 */
export interface FeedbackListWithSentimentProps {
  projectId: string;
  initialPosts?: PostWithSentiment[];
  filterBySentiment?: SentimentCategory | null;
  onSentimentFilter?: (category: SentimentCategory | null) => void;
  className?: string;
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

/**
 * Sentiment filter options
 */
export interface SentimentFilter {
  categories?: SentimentCategory[];
  minScore?: number;
  maxScore?: number;
  minConfidence?: number;
  tones?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Sort options for sentiment data
 */
export type SentimentSortOption =
  | 'score_desc'
  | 'score_asc'
  | 'confidence_desc'
  | 'confidence_asc'
  | 'date_desc'
  | 'date_asc';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Sentiment color scheme
 */
export interface SentimentColorScheme {
  bg: string;
  text: string;
  border: string;
  emoji: string;
}

/**
 * Sentiment configuration
 */
export const SENTIMENT_CONFIG: Record<SentimentCategory, SentimentColorScheme> = {
  positive: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    emoji: '😊',
  },
  negative: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    emoji: '😞',
  },
  neutral: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
    emoji: '😐',
  },
  mixed: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    emoji: '🤔',
  },
};

/**
 * Emotional tone emoji mapping
 */
export const EMOTIONAL_TONE_EMOJI: Record<string, string> = {
  excited: '🎉',
  satisfied: '😊',
  frustrated: '😤',
  angry: '😠',
  confused: '😕',
  concerned: '😟',
  disappointed: '😞',
  hopeful: '🌟',
  neutral: '😐',
  urgent: '🚨',
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Sentiment analysis error
 */
export class SentimentAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public postId?: string,
  ) {
    super(message);
    this.name = 'SentimentAnalysisError';
  }
}
