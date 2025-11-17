/**
 * AI Roadmap Suggestions Module
 *
 * Main exports for the roadmap feature
 */

// Prioritization
export {
  generateRoadmapSuggestions,
  regenerateSuggestionForTheme,
  calculatePriorityScore,
  assignPriorityLevel,
  normalizeFrequency,
  normalizeSentiment,
  calculateBusinessImpact,
  calculateEffortScore,
  calculateCompetitiveScore,
  type ThemeData,
  type PriorityContext,
  type ScoringBreakdown,
  type PriorityScore,
  type PriorityLevel
} from './prioritization';

// AI Reasoning
export {
  generateAIReasoning,
  generateAllReasoning,
  regenerateReasoningForSuggestion,
  type ReasoningInput
} from './ai-reasoning';

// Exports
export {
  generateMarkdownExport,
  generatePDFExport,
  saveExportMetadata,
  incrementDownloadCount,
  type ExportFilters
} from './exports';
