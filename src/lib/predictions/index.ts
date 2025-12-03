/**
 * Feature Success Prediction Module
 *
 * Main entry point for feature prediction functionality
 */

export { extractFeaturesFromSpec } from './extract-features';
export { predictFeatureSuccess } from './predict-success';

export type {
  PredictionInput,
  PredictionOutput,
  FeaturePrediction,
  SimilarFeature,
  ExplanationFactor,
  GeneratePredictionRequest,
  GeneratePredictionResponse,
  PredictionAccuracyStats,
} from '@/types/prediction';
