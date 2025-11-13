/**
 * Sentiment Analysis Components
 * Export all sentiment-related components for easy importing
 */

// Badge Components
export {
  SentimentBadge,
  EmotionalToneBadge,
  ConfidenceBadge,
  SentimentBadgeGroup,
} from './SentimentBadge';

// Dashboard Widgets
export { SentimentWidget } from './SentimentWidget';
export { SentimentTrendChart } from './SentimentTrendChart';

// List Components
export { FeedbackListWithSentiment } from './FeedbackListWithSentiment';

// Re-export types for convenience
export type {
  SentimentBadgeProps,
  SentimentWidgetProps,
  SentimentTrendChartProps,
  FeedbackListWithSentimentProps,
} from '@/types/sentiment';
