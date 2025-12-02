/**
 * Outcome Attribution Loop
 *
 * Automatically connects the dots: Feedback → Feature → Ship → Outcome → Learning
 * The system gets smarter with every launch by tracking what actually happened after shipping.
 *
 * @module outcome-attribution
 */

export { createOutcomeMonitor } from './create-monitor';
export { updateOutcomeMetrics, updateAllActiveMonitors } from './update-metrics';
export { classifyOutcome, classifyAllPendingOutcomes } from './classify-outcome';
export { generateOutcomeReport } from './generate-report';

export type {
  FeatureOutcome,
  FeatureOutcomeDetailed,
  OutcomeClassification,
  OutcomeMonitorStatus,
  ClassificationReasoning,
  PreShipMetrics,
  PostShipMetrics,
  ClassificationResult,
  OutcomeReport,
} from '@/types/outcome-attribution';
