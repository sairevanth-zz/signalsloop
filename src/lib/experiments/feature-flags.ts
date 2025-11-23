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
