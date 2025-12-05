/**
 * Churn Radar Module
 */

export {
  HealthCalculator,
  healthCalculator,
  DEFAULT_WEIGHTS,
  type HealthSignal,
  type HealthWeights,
  type CustomerData,
  type HealthCalculationResult,
} from './health-calculator';

export {
  ChurnRadarService,
  churnRadarService,
  type CustomerHealth,
  type ChurnAlert,
  type ChurnRadarSummary,
} from './churn-radar-service';
