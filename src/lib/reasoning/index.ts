/**
 * AI Reasoning Layer
 * Feature F: Gen 3
 * 
 * Main exports for the reasoning capture system
 */

export {
  captureReasoning,
  extractReasoningFromOutput,
  storeReasoningTrace,
  getReasoningForEntity,
  getProjectReasoningTraces,
  getReasoningTraceById,
  createReasoningTrace,
  cleanupOldTraces,
} from './capture-reasoning';

export type {
  ReasoningTrace,
  ReasoningStep,
  Alternative,
  ReasoningFeature,
  ReasoningInputs,
  ReasoningOutputs,
  ReasoningMetadata,
  CaptureReasoningOptions,
  ReasoningCaptureResult,
  ReasoningExtractionResult,
  DataSource,
  ReasoningStats,
  WhyButtonProps,
  ReasoningDrawerProps,
} from '@/types/reasoning';
