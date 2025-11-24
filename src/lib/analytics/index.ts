/**
 * Analytics Integration Module
 *
 * Main entry point for analytics integrations.
 * Provides functions to fetch feature adoption, churn, and NPS metrics
 * from configured analytics platforms.
 *
 * Usage:
 * ```typescript
 * import { getFeatureAdoptionRate, getChurnRate, getNPS } from '@/lib/analytics';
 *
 * const adoption = await getFeatureAdoptionRate('Dark Mode', startDate, endDate);
 * const churn = await getChurnRate(startDate, endDate);
 * const nps = await getNPS(startDate, endDate);
 * ```
 *
 * Configuration:
 * Set environment variables in .env.local:
 * - ANALYTICS_PROVIDER=amplitude|mixpanel|posthog|segment|custom|none
 * - ANALYTICS_ENABLED=true
 * - ANALYTICS_API_KEY=your_api_key
 * - ANALYTICS_API_SECRET=your_api_secret (if required)
 * - ANALYTICS_PROJECT_ID=your_project_id (if required)
 */

import { getAnalyticsProvider, getAnalyticsConfigFromEnv } from './providers';
import type { FeatureAdoptionMetrics, ChurnMetrics, NPSMetrics } from './types';

// Singleton instance
let providerInstance: ReturnType<typeof getAnalyticsProvider> | null = null;

/**
 * Get or create analytics provider instance
 */
function getProvider() {
  if (!providerInstance) {
    const config = getAnalyticsConfigFromEnv();
    providerInstance = getAnalyticsProvider(config);
  }
  return providerInstance;
}

/**
 * Get feature adoption rate for a specific feature
 *
 * @param featureName - Name of the feature to track
 * @param startDate - Start of measurement period
 * @param endDate - End of measurement period
 * @returns Adoption metrics or null if unavailable
 */
export async function getFeatureAdoptionRate(
  featureName: string,
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  const provider = getProvider();
  const metrics = await provider.getFeatureAdoption(featureName, startDate, endDate);

  return metrics?.adoptionRate ?? null;
}

/**
 * Get detailed feature adoption metrics
 *
 * @param featureName - Name of the feature to track
 * @param startDate - Start of measurement period
 * @param endDate - End of measurement period
 * @returns Full adoption metrics or null if unavailable
 */
export async function getFeatureAdoptionMetrics(
  featureName: string,
  startDate: Date,
  endDate: Date
): Promise<FeatureAdoptionMetrics | null> {
  const provider = getProvider();
  return await provider.getFeatureAdoption(featureName, startDate, endDate);
}

/**
 * Get churn rate for a time period
 *
 * @param startDate - Start of measurement period
 * @param endDate - End of measurement period
 * @returns Churn rate (0-1) or null if unavailable
 */
export async function getChurnRate(
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  const provider = getProvider();
  const metrics = await provider.getChurnRate(startDate, endDate);

  return metrics?.churnRate ?? null;
}

/**
 * Get detailed churn metrics
 *
 * @param startDate - Start of measurement period
 * @param endDate - End of measurement period
 * @returns Full churn metrics or null if unavailable
 */
export async function getChurnMetrics(
  startDate: Date,
  endDate: Date
): Promise<ChurnMetrics | null> {
  const provider = getProvider();
  return await provider.getChurnRate(startDate, endDate);
}

/**
 * Get NPS (Net Promoter Score) for a time period
 *
 * @param startDate - Start of measurement period
 * @param endDate - End of measurement period
 * @returns NPS score (-100 to 100) or null if unavailable
 */
export async function getNPS(
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  const provider = getProvider();
  const metrics = await provider.getNPSScore(startDate, endDate);

  return metrics?.score ?? null;
}

/**
 * Get detailed NPS metrics
 *
 * @param startDate - Start of measurement period
 * @param endDate - End of measurement period
 * @returns Full NPS metrics or null if unavailable
 */
export async function getNPSMetrics(
  startDate: Date,
  endDate: Date
): Promise<NPSMetrics | null> {
  const provider = getProvider();
  return await provider.getNPSScore(startDate, endDate);
}

/**
 * Test analytics provider connection
 *
 * @returns true if connection successful, false otherwise
 */
export async function testAnalyticsConnection(): Promise<boolean> {
  const provider = getProvider();
  return await provider.testConnection();
}

/**
 * Reset provider instance (useful for testing)
 */
export function resetProvider() {
  providerInstance = null;
}

// Export types for consumers
export * from './types';
