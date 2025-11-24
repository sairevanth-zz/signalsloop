/**
 * Null Analytics Provider
 *
 * Default provider when no analytics integration is configured.
 * Returns null for all metrics.
 */

import {
  IAnalyticsProvider,
  FeatureAdoptionMetrics,
  ChurnMetrics,
  NPSMetrics,
} from '../types';

export class NullProvider implements IAnalyticsProvider {
  async getFeatureAdoption(
    featureName: string,
    startDate: Date,
    endDate: Date
  ): Promise<FeatureAdoptionMetrics | null> {
    console.log(
      `[Analytics] No provider configured - cannot fetch adoption for: ${featureName}`
    );
    return null;
  }

  async getChurnRate(
    startDate: Date,
    endDate: Date
  ): Promise<ChurnMetrics | null> {
    console.log('[Analytics] No provider configured - cannot fetch churn rate');
    return null;
  }

  async getNPSScore(
    startDate: Date,
    endDate: Date
  ): Promise<NPSMetrics | null> {
    console.log('[Analytics] No provider configured - cannot fetch NPS score');
    return null;
  }

  async testConnection(): Promise<boolean> {
    return false;
  }
}
