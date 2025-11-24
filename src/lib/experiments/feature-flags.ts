/**
 * Feature Flag Integration Helpers
 * Supports LaunchDarkly and Optimizely
 */

export type FeatureFlagProvider = 'launchdarkly' | 'optimizely';

export interface ExperimentVariant {
  key: string;
  name: string;
  allocation?: number; // Percentage allocation (0-100)
}

export interface FeatureFlagConfig {
  key: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  targeting?: {
    rules?: any[];
    defaultVariation?: string;
  };
}

export interface FeatureFlagResult {
  variation: string;
  userId: string;
  timestamp: string;
}

export interface MetricResult {
  variant: string;
  sampleSize: number;
  mean?: number;
  stdDev?: number;
  conversionRate?: number;
  pValue?: number;
  isSignificant: boolean;
  credibleInterval?: { lower: number; upper: number };
}

export interface VariantMetrics {
  name: string;
  users: number;
  conversions: Record<string, {
    count: number;
    conversionRate: number;
    mean?: number;
    stdDev?: number;
  }>;
}

export interface ExperimentMetrics {
  variants: VariantMetrics[];
  metrics: Record<string, MetricResult[]>;
  lastUpdated: string;
  experimentStatus?: string;
}

export interface FlagStatus {
  key: string;
  name: string;
  isOn: boolean;
  variations: any[];
  createdAt: number;
  modifiedAt: number;
}

/**
 * LaunchDarkly Integration
 */
export class LaunchDarklyIntegration {
  private apiKey: string;
  private projectKey: string;
  private environmentKey: string;

  constructor(
    apiKey: string,
    projectKey: string = 'default',
    environmentKey: string = 'production'
  ) {
    this.apiKey = apiKey;
    this.projectKey = projectKey;
    this.environmentKey = environmentKey;
  }

  /**
   * Create a feature flag for an experiment
   */
  async createFeatureFlag(config: FeatureFlagConfig): Promise<string> {
    const url = `https://app.launchdarkly.com/api/v2/flags/${this.projectKey}`;

    const body = {
      key: config.key,
      name: config.name,
      description: config.description,
      variations: config.variants.map((v, idx) => ({
        _id: v.key,
        value: v.key,
        name: v.name,
        description: v.name,
      })),
      temporary: true, // Experiment flags are temporary
      tags: ['experiment', 'ab-test'],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create LaunchDarkly flag: ${error}`);
    }

    const data = await response.json();
    return data.key;
  }

  /**
   * Update feature flag targeting rules
   */
  async updateTargeting(
    flagKey: string,
    controlAllocation: number = 50
  ): Promise<void> {
    const url = `https://app.launchdarkly.com/api/v2/flags/${this.projectKey}/${flagKey}`;

    const patch = [
      {
        op: 'replace',
        path: `/environments/${this.environmentKey}/on`,
        value: true,
      },
      {
        op: 'replace',
        path: `/environments/${this.environmentKey}/fallthrough`,
        value: {
          rollout: {
            variations: [
              { variation: 0, weight: controlAllocation * 1000 }, // Control
              { variation: 1, weight: (100 - controlAllocation) * 1000 }, // Treatment
            ],
          },
        },
      },
    ];

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ patch }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update LaunchDarkly targeting: ${error}`);
    }
  }

  /**
   * Archive feature flag after experiment completes
   */
  async archiveFlag(flagKey: string): Promise<void> {
    const url = `https://app.launchdarkly.com/api/v2/flags/${this.projectKey}/${flagKey}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patch: [{ op: 'replace', path: '/archived', value: true }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to archive LaunchDarkly flag: ${error}`);
    }
  }

  /**
   * Get dashboard URL for feature flag
   */
  getDashboardUrl(flagKey: string): string {
    return `https://app.launchdarkly.com/${this.projectKey}/${this.environmentKey}/features/${flagKey}`;
  }

  /**
   * Fetch live experiment metrics from LaunchDarkly
   * Uses the Experimentation API to get conversion metrics
   */
  async fetchExperimentMetrics(
    flagKey: string,
    metricKeys: string[]
  ): Promise<ExperimentMetrics> {
    // LaunchDarkly Experimentation API endpoint
    const url = `https://app.launchdarkly.com/api/v2/flags/${this.projectKey}/${flagKey}/experiments/${this.environmentKey}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No experiment data yet
          return {
            variants: [],
            metrics: {},
            lastUpdated: new Date().toISOString(),
          };
        }
        throw new Error(`Failed to fetch LaunchDarkly metrics: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse LaunchDarkly response into our standard format
      const variants: VariantMetrics[] = [];
      const metrics: Record<string, MetricResult[]> = {};

      // Extract variant data
      if (data.results && data.results.variations) {
        for (const variation of data.results.variations) {
          const variantData: VariantMetrics = {
            name: variation.name || variation._id,
            users: variation.count || 0,
            conversions: {},
          };

          // Extract metric data for this variant
          if (data.results.metrics) {
            for (const metric of data.results.metrics) {
              const metricData = variation.metrics?.[metric.key];
              if (metricData) {
                variantData.conversions[metric.key] = {
                  count: metricData.count || 0,
                  conversionRate: metricData.conversionRate || 0,
                  mean: metricData.mean,
                  stdDev: metricData.stdDev,
                };

                // Add to metrics map
                if (!metrics[metric.key]) {
                  metrics[metric.key] = [];
                }

                metrics[metric.key].push({
                  variant: variantData.name,
                  sampleSize: variantData.users,
                  mean: metricData.mean,
                  stdDev: metricData.stdDev,
                  conversionRate: metricData.conversionRate,
                  pValue: metricData.pValue,
                  isSignificant: metricData.pValue ? metricData.pValue < 0.05 : false,
                  credibleInterval: metricData.credibleInterval,
                });
              }
            }
          }

          variants.push(variantData);
        }
      }

      return {
        variants,
        metrics,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        experimentStatus: data.status,
      };
    } catch (error) {
      console.error('Error fetching LaunchDarkly metrics:', error);
      throw error;
    }
  }

  /**
   * Fetch flag status and metadata
   */
  async getFlagStatus(flagKey: string): Promise<FlagStatus> {
    const url = `https://app.launchdarkly.com/api/v2/flags/${this.projectKey}/${flagKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch flag status: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      key: data.key,
      name: data.name,
      isOn: data.environments?.[this.environmentKey]?.on || false,
      variations: data.variations || [],
      createdAt: data.creationDate,
      modifiedAt: data._lastModified,
    };
  }
}

/**
 * Optimizely Integration
 */
export class OptimizelyIntegration {
  private apiKey: string;
  private projectId: string;

  constructor(apiKey: string, projectId: string) {
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  /**
   * Create an experiment in Optimizely
   */
  async createExperiment(config: FeatureFlagConfig): Promise<string> {
    const url = `https://api.optimizely.com/v2/experiments`;

    const body = {
      project_id: this.projectId,
      key: config.key,
      description: config.description,
      variations: config.variants.map((v) => ({
        key: v.key,
        name: v.name,
        weight: v.allocation || 5000, // Default 50/50 split
      })),
      metrics: [],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Optimizely experiment: ${error}`);
    }

    const data = await response.json();
    return data.key;
  }

  /**
   * Start the experiment
   */
  async startExperiment(experimentKey: string): Promise<void> {
    const url = `https://api.optimizely.com/v2/experiments/${experimentKey}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'running' }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start Optimizely experiment: ${error}`);
    }
  }

  /**
   * Pause the experiment
   */
  async pauseExperiment(experimentKey: string): Promise<void> {
    const url = `https://api.optimizely.com/v2/experiments/${experimentKey}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'paused' }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to pause Optimizely experiment: ${error}`);
    }
  }

  /**
   * Get dashboard URL for experiment
   */
  getDashboardUrl(experimentKey: string): string {
    return `https://app.optimizely.com/v2/projects/${this.projectId}/experiments/${experimentKey}`;
  }

  /**
   * Fetch live experiment metrics from Optimizely
   * Uses the Stats Engine API to get experiment results
   */
  async fetchExperimentMetrics(
    experimentId: string
  ): Promise<ExperimentMetrics> {
    // Optimizely Stats Engine API
    const url = `https://api.optimizely.com/v2/experiments/${experimentId}/results`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            variants: [],
            metrics: {},
            lastUpdated: new Date().toISOString(),
          };
        }
        throw new Error(`Failed to fetch Optimizely metrics: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse Optimizely response
      const variants: VariantMetrics[] = [];
      const metrics: Record<string, MetricResult[]> = {};

      // Extract variant data
      if (data.variations) {
        for (const variation of data.variations) {
          const variantData: VariantMetrics = {
            name: variation.name || variation.variation_key,
            users: variation.visitors || 0,
            conversions: {},
          };

          // Extract metrics for this variant
          if (data.metrics) {
            for (const metric of data.metrics) {
              const metricKey = metric.event_key;
              const variationMetric = metric.results.find(
                (r: any) => r.variation_id === variation.variation_id
              );

              if (variationMetric) {
                variantData.conversions[metricKey] = {
                  count: variationMetric.conversion_count || 0,
                  conversionRate: variationMetric.conversion_rate || 0,
                  mean: variationMetric.value_per_visitor,
                  stdDev: variationMetric.standard_error,
                };

                // Add to metrics map
                if (!metrics[metricKey]) {
                  metrics[metricKey] = [];
                }

                metrics[metricKey].push({
                  variant: variantData.name,
                  sampleSize: variantData.users,
                  mean: variationMetric.value_per_visitor,
                  stdDev: variationMetric.standard_error,
                  conversionRate: variationMetric.conversion_rate,
                  pValue: variationMetric.p_value,
                  isSignificant: variationMetric.is_significant || false,
                  credibleInterval: variationMetric.confidence_interval
                    ? {
                        lower: variationMetric.confidence_interval[0],
                        upper: variationMetric.confidence_interval[1],
                      }
                    : undefined,
                });
              }
            }
          }

          variants.push(variantData);
        }
      }

      return {
        variants,
        metrics,
        lastUpdated: data.last_modified || new Date().toISOString(),
        experimentStatus: data.status,
      };
    } catch (error) {
      console.error('Error fetching Optimizely metrics:', error);
      throw error;
    }
  }

  /**
   * Get experiment status
   */
  async getExperimentStatus(experimentId: string): Promise<FlagStatus> {
    const url = `https://api.optimizely.com/v2/experiments/${experimentId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch experiment status: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      key: data.key,
      name: data.name || data.description,
      isOn: data.status === 'running',
      variations: data.variations || [],
      createdAt: new Date(data.created).getTime(),
      modifiedAt: new Date(data.last_modified).getTime(),
    };
  }
}

/**
 * Factory function to get the appropriate feature flag integration
 */
export function getFeatureFlagIntegration(
  provider: FeatureFlagProvider
): LaunchDarklyIntegration | OptimizelyIntegration {
  if (provider === 'launchdarkly') {
    const apiKey = process.env.LAUNCHDARKLY_API_KEY;
    const projectKey = process.env.LAUNCHDARKLY_PROJECT_KEY || 'default';
    const environmentKey = process.env.LAUNCHDARKLY_ENVIRONMENT_KEY || 'production';

    if (!apiKey) {
      throw new Error('LAUNCHDARKLY_API_KEY is not configured');
    }

    return new LaunchDarklyIntegration(apiKey, projectKey, environmentKey);
  } else if (provider === 'optimizely') {
    const apiKey = process.env.OPTIMIZELY_API_KEY;
    const projectId = process.env.OPTIMIZELY_PROJECT_ID;

    if (!apiKey || !projectId) {
      throw new Error('OPTIMIZELY_API_KEY or OPTIMIZELY_PROJECT_ID is not configured');
    }

    return new OptimizelyIntegration(apiKey, projectId);
  }

  throw new Error(`Unsupported feature flag provider: ${provider}`);
}

/**
 * Helper to create feature flag for experiment
 */
export async function createExperimentFeatureFlag(
  experimentName: string,
  experimentDescription: string,
  provider: FeatureFlagProvider = 'launchdarkly'
): Promise<string> {
  const integration = getFeatureFlagIntegration(provider);

  const config: FeatureFlagConfig = {
    key: experimentName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    name: experimentName,
    description: experimentDescription,
    variants: [
      { key: 'control', name: 'Control (A)' },
      { key: 'treatment', name: 'Treatment (B)' },
    ],
  };

  if (integration instanceof LaunchDarklyIntegration) {
    const flagKey = await integration.createFeatureFlag(config);
    await integration.updateTargeting(flagKey, 50); // 50/50 split
    return flagKey;
  } else if (integration instanceof OptimizelyIntegration) {
    return await integration.createExperiment(config);
  }

  throw new Error('Unsupported integration type');
}

/**
 * Helper to get dashboard URL
 */
export function getFeatureFlagDashboardUrl(
  flagKey: string,
  provider: FeatureFlagProvider = 'launchdarkly'
): string {
  const integration = getFeatureFlagIntegration(provider);
  return integration.getDashboardUrl(flagKey);
}
