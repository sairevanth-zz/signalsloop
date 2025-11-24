/**
 * Analytics Integration Types
 *
 * Defines interfaces for integrating with various analytics platforms
 * (Amplitude, Mixpanel, PostHog, etc.) to collect feature adoption,
 * churn, and NPS data.
 */

/**
 * Supported analytics providers
 */
export enum AnalyticsProvider {
  AMPLITUDE = 'amplitude',
  MIXPANEL = 'mixpanel',
  POSTHOG = 'posthog',
  SEGMENT = 'segment',
  CUSTOM = 'custom',
  NONE = 'none',
}

/**
 * Configuration for analytics integration
 */
export interface AnalyticsConfig {
  provider: AnalyticsProvider;
  apiKey?: string;
  apiSecret?: string;
  projectId?: string;
  serverUrl?: string; // For self-hosted PostHog
  enabled: boolean;
}

/**
 * Feature adoption metrics
 */
export interface FeatureAdoptionMetrics {
  totalUsers: number;           // Total active users in period
  activeUsers: number;           // Users who used the feature
  adoptionRate: number;          // Percentage (0-1)
  featureName: string;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Churn metrics
 */
export interface ChurnMetrics {
  totalCustomers: number;        // Total customers at period start
  churnedCustomers: number;      // Customers who churned
  churnRate: number;             // Percentage (0-1)
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * NPS (Net Promoter Score) metrics
 */
export interface NPSMetrics {
  score: number;                 // NPS score (-100 to 100)
  promoters: number;             // Count of promoters (9-10)
  passives: number;              // Count of passives (7-8)
  detractors: number;            // Count of detractors (0-6)
  totalResponses: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Analytics provider interface
 * All analytics integrations must implement this interface
 */
export interface IAnalyticsProvider {
  /**
   * Get feature adoption rate for a specific feature
   */
  getFeatureAdoption(
    featureName: string,
    startDate: Date,
    endDate: Date
  ): Promise<FeatureAdoptionMetrics | null>;

  /**
   * Get churn rate for a time period
   */
  getChurnRate(
    startDate: Date,
    endDate: Date
  ): Promise<ChurnMetrics | null>;

  /**
   * Get NPS score for a time period
   */
  getNPSScore(
    startDate: Date,
    endDate: Date
  ): Promise<NPSMetrics | null>;

  /**
   * Test the connection to the analytics provider
   */
  testConnection(): Promise<boolean>;
}
