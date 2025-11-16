/**
 * Competitive Intelligence Module
 * Main exports for the competitive intelligence feature
 */

// Competitor Extractor
export {
  extractCompetitorMentions,
  extractCompetitorMentionsBatch,
  getPendingFeedbackForExtraction,
  type CompetitorMention,
  type ExtractionResult,
  type Competitor,
} from './competitor-extractor';

// Feature Gap Detector
export {
  detectFeatureGaps,
  getTopFeatureGaps,
  updateFeatureGapStatus,
  refreshFeatureGaps,
  getFeatureGapDetails,
  type FeatureGap,
  type CompetitiveMentionWithContext,
} from './feature-gap-detector';

// Strategic Analyzer
export {
  generateStrategicRecommendations,
  getStrategicRecommendations,
  updateRecommendationStatus,
  refreshStrategicRecommendations,
  getRecommendationDetails,
  type StrategicRecommendation,
  type CompetitiveIntelligenceSummary,
} from './strategic-analyzer';
