/**
 * Amplitude Analytics Integration
 *
 * Integrates with Amplitude Analytics API to fetch feature adoption,
 * churn, and engagement metrics.
 *
 * Setup Instructions:
 * 1. Get API Key and Secret from Amplitude: https://analytics.amplitude.com/settings
 * 2. Add to environment variables:
 *    - AMPLITUDE_API_KEY=your_api_key
 *    - AMPLITUDE_API_SECRET=your_api_secret
 * 3. Set ANALYTICS_PROVIDER=amplitude in .env
 */

import {
  IAnalyticsProvider,
  FeatureAdoptionMetrics,
  ChurnMetrics,
  NPSMetrics,
  AnalyticsConfig,
} from '../types';

export class AmplitudeProvider implements IAnalyticsProvider {
  private config: AnalyticsConfig;
  private baseUrl = 'https://amplitude.com/api/2';

  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  async getFeatureAdoption(
    featureName: string,
    startDate: Date,
    endDate: Date
  ): Promise<FeatureAdoptionMetrics | null> {
    if (!this.config.enabled || !this.config.apiKey) {
      return null;
    }

    try {
      // Query for "Feature Used" event with specific feature name
      const response = await fetch(`${this.baseUrl}/events/segmentation`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          e: {
            event_type: 'Feature Used',
            filters: [
              {
                subprop_type: 'event',
                subprop_key: 'feature_name',
                subprop_op: 'is',
                subprop_value: [featureName],
              },
            ],
          },
          m: 'uniques',
        }),
      });

      if (!response.ok) {
        console.error(`[Amplitude] API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const activeUsers = data.data?.xValues?.[0] || 0;

      // Get total active users for the period
      const totalUsers = await this.getTotalActiveUsers(startDate, endDate);

      return {
        totalUsers: totalUsers || 0,
        activeUsers,
        adoptionRate: totalUsers > 0 ? activeUsers / totalUsers : 0,
        featureName,
        timeRange: { start: startDate, end: endDate },
      };
    } catch (error) {
      console.error('[Amplitude] Error fetching feature adoption:', error);
      return null;
    }
  }

  private async getTotalActiveUsers(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/events/segmentation`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          e: {
            event_type: '_active',
          },
          m: 'uniques',
        }),
      });

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.data?.xValues?.[0] || 0;
    } catch (error) {
      console.error('[Amplitude] Error fetching total active users:', error);
      return 0;
    }
  }

  async getChurnRate(
    startDate: Date,
    endDate: Date
  ): Promise<ChurnMetrics | null> {
    if (!this.config.enabled || !this.config.apiKey) {
      return null;
    }

    try {
      // Use Amplitude's Retention Analysis API to calculate churn
      // Churn = users who were active at start but not retained
      const response = await fetch(`${this.baseUrl}/retention`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          rm: 'retention_first_time', // First-time retention
          rb: 'day_0', // Start from day 0
          ra: ['day_30'], // Check retention at 30 days
        }),
      });

      if (!response.ok) {
        console.error(`[Amplitude] Retention API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      // Extract retention data
      // Amplitude returns retention as percentage of users who came back
      const retentionRate = data.data?.values?.[0]?.[1] || 0; // 30-day retention rate
      const churnRate = 1 - (retentionRate / 100);
      const totalCustomers = data.data?.values?.[0]?.[0] || 0;
      const churnedCustomers = Math.round(totalCustomers * churnRate);

      return {
        totalCustomers,
        churnedCustomers,
        churnRate,
        timeRange: { start: startDate, end: endDate },
      };
    } catch (error) {
      console.error('[Amplitude] Error fetching churn rate:', error);
      return null;
    }
  }

  async getNPSScore(
    startDate: Date,
    endDate: Date
  ): Promise<NPSMetrics | null> {
    if (!this.config.enabled || !this.config.apiKey) {
      return null;
    }

    try {
      // Query for NPS Survey Completed events with score breakdown
      const response = await fetch(`${this.baseUrl}/events/segmentation`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          e: {
            event_type: 'NPS Survey Completed',
          },
          s: [
            {
              prop: 'gp:score',
              op: 'is',
              values: [],
            },
          ],
          m: 'uniques',
        }),
      });

      if (!response.ok) {
        console.error(`[Amplitude] NPS API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      // Extract scores from segmentation data
      const scoreData = data.data?.seriesLabels || [];
      const scoreCounts = data.data?.series?.[0] || [];

      let promoters = 0;
      let passives = 0;
      let detractors = 0;
      let totalResponses = 0;

      // Categorize scores
      scoreData.forEach((score: string, index: number) => {
        const scoreNum = parseInt(score, 10);
        const count = scoreCounts[index] || 0;

        totalResponses += count;

        if (scoreNum >= 9) {
          promoters += count;
        } else if (scoreNum >= 7) {
          passives += count;
        } else {
          detractors += count;
        }
      });

      // Calculate NPS: (% Promoters - % Detractors)
      const promoterPercentage = totalResponses > 0 ? (promoters / totalResponses) * 100 : 0;
      const detractorPercentage = totalResponses > 0 ? (detractors / totalResponses) * 100 : 0;
      const npsScore = promoterPercentage - detractorPercentage;

      return {
        score: Math.round(npsScore),
        promoters,
        passives,
        detractors,
        totalResponses,
        timeRange: { start: startDate, end: endDate },
      };
    } catch (error) {
      console.error('[Amplitude] Error fetching NPS score:', error);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.enabled || !this.config.apiKey) {
      return false;
    }

    try {
      // Test with a simple API call
      const response = await fetch(`${this.baseUrl}/usermap`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[Amplitude] Connection test failed:', error);
      return false;
    }
  }
}
