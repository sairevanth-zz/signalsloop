/**
 * Analytics Providers Index
 *
 * Factory for creating analytics provider instances based on configuration.
 */

import { AnalyticsConfig, AnalyticsProvider, IAnalyticsProvider } from '../types';
import { AmplitudeProvider } from './amplitude';
import { NullProvider } from './null';

/**
 * Get analytics provider instance based on configuration
 */
export function getAnalyticsProvider(config: AnalyticsConfig): IAnalyticsProvider {
  if (!config.enabled || config.provider === AnalyticsProvider.NONE) {
    return new NullProvider();
  }

  switch (config.provider) {
    case AnalyticsProvider.AMPLITUDE:
      return new AmplitudeProvider(config);

    case AnalyticsProvider.MIXPANEL:
      // TODO: Implement Mixpanel provider
      console.warn('[Analytics] Mixpanel provider not yet implemented, using null provider');
      return new NullProvider();

    case AnalyticsProvider.POSTHOG:
      // TODO: Implement PostHog provider
      console.warn('[Analytics] PostHog provider not yet implemented, using null provider');
      return new NullProvider();

    case AnalyticsProvider.SEGMENT:
      // TODO: Implement Segment provider
      console.warn('[Analytics] Segment provider not yet implemented, using null provider');
      return new NullProvider();

    case AnalyticsProvider.CUSTOM:
      // TODO: Load custom provider from user configuration
      console.warn('[Analytics] Custom provider not yet implemented, using null provider');
      return new NullProvider();

    default:
      console.warn(`[Analytics] Unknown provider: ${config.provider}, using null provider`);
      return new NullProvider();
  }
}

/**
 * Get analytics configuration from environment variables
 */
export function getAnalyticsConfigFromEnv(): AnalyticsConfig {
  const provider = (process.env.ANALYTICS_PROVIDER || 'none') as AnalyticsProvider;
  const enabled = process.env.ANALYTICS_ENABLED === 'true';

  return {
    provider,
    enabled,
    apiKey: process.env.ANALYTICS_API_KEY,
    apiSecret: process.env.ANALYTICS_API_SECRET,
    projectId: process.env.ANALYTICS_PROJECT_ID,
    serverUrl: process.env.ANALYTICS_SERVER_URL,
  };
}

export * from './amplitude';
export * from './null';
