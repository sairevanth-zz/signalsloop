# Analytics Integration Guide

This guide explains how to integrate SignalsLoop with analytics platforms to collect feature adoption, churn, and NPS metrics for AI roadmap predictions.

## Overview

SignalsLoop can integrate with various analytics platforms to automatically collect:
- **Feature Adoption Rate**: Percentage of users who adopted a specific feature
- **Churn Rate**: Percentage of customers who churned in a time period
- **NPS Score**: Net Promoter Score from customer surveys

These metrics are used to measure actual feature impact and train the AI roadmap prediction model.

## Supported Platforms

- **Amplitude** - Event tracking and analytics (partially implemented)
- **Mixpanel** - Product analytics (stub - needs implementation)
- **PostHog** - Open-source product analytics (stub - needs implementation)
- **Segment** - Customer data platform (stub - needs implementation)
- **Custom** - Bring your own implementation (stub - needs implementation)

## Quick Start

### 1. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Analytics Configuration
ANALYTICS_PROVIDER=amplitude    # Options: amplitude, mixpanel, posthog, segment, custom, none
ANALYTICS_ENABLED=true          # Set to false to disable analytics integration

# Provider-specific credentials (example for Amplitude)
ANALYTICS_API_KEY=your_api_key_here
ANALYTICS_API_SECRET=your_api_secret_here
ANALYTICS_PROJECT_ID=your_project_id_here  # Optional, depending on provider

# For self-hosted PostHog
# ANALYTICS_SERVER_URL=https://your-posthog-instance.com
```

### 2. Test the Connection

Use the test endpoint to verify your configuration:

```bash
curl http://localhost:3000/api/analytics/test
```

Expected response:
```json
{
  "success": true,
  "provider": "amplitude",
  "connection": "ok"
}
```

### 3. Start Tracking Features

When you launch a feature in the Feature Impact History tab, the system will automatically:
1. Collect pre-launch baseline metrics
2. Wait 30 days
3. Collect post-launch metrics (including adoption rate)
4. Compare actual vs. predicted impact

## Provider-Specific Setup

### Amplitude

**Requirements:**
- Amplitude account
- API Key and Secret Key

**Setup Steps:**
1. Log in to Amplitude: https://analytics.amplitude.com
2. Go to Settings → Projects → [Your Project]
3. Copy your API Key and Secret Key
4. Add to `.env.local`:
   ```bash
   ANALYTICS_PROVIDER=amplitude
   ANALYTICS_ENABLED=true
   ANALYTICS_API_KEY=your_amplitude_api_key
   ANALYTICS_API_SECRET=your_amplitude_secret_key
   ```

**Required Events:**
Track these events in your application:
- `Feature Used` - When a user interacts with a feature
  - Property: `feature_name` (string) - Name of the feature
- `NPS Survey Completed` - When a user completes an NPS survey
  - Property: `score` (number 0-10) - NPS rating

**Implementation Status:**
- ✅ Configuration ready
- ⚠️ API calls need to be implemented (see TODOs in code)
- 📝 See `src/lib/analytics/providers/amplitude.ts`

### Mixpanel

**Status:** Stub implementation - needs development

**Setup Steps:**
1. Get Mixpanel project token
2. Get API secret
3. Add to `.env.local`:
   ```bash
   ANALYTICS_PROVIDER=mixpanel
   ANALYTICS_ENABLED=true
   ANALYTICS_API_KEY=your_mixpanel_token
   ANALYTICS_API_SECRET=your_mixpanel_secret
   ```

**To Implement:**
Create `src/lib/analytics/providers/mixpanel.ts` following the `IAnalyticsProvider` interface.

### PostHog

**Status:** Stub implementation - needs development

**Setup Steps:**
1. Self-hosted or PostHog Cloud
2. Get project API key
3. Add to `.env.local`:
   ```bash
   ANALYTICS_PROVIDER=posthog
   ANALYTICS_ENABLED=true
   ANALYTICS_API_KEY=your_posthog_key
   ANALYTICS_PROJECT_ID=your_project_id
   # For self-hosted:
   ANALYTICS_SERVER_URL=https://your-posthog-instance.com
   ```

**To Implement:**
Create `src/lib/analytics/providers/posthog.ts` following the `IAnalyticsProvider` interface.

### Custom Provider

If you have an internal analytics system, you can create a custom provider.

**Steps:**
1. Create a new file: `src/lib/analytics/providers/custom.ts`
2. Implement the `IAnalyticsProvider` interface:

```typescript
import { IAnalyticsProvider, FeatureAdoptionMetrics, ChurnMetrics, NPSMetrics, AnalyticsConfig } from '../types';

export class CustomProvider implements IAnalyticsProvider {
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  async getFeatureAdoption(
    featureName: string,
    startDate: Date,
    endDate: Date
  ): Promise<FeatureAdoptionMetrics | null> {
    // Your implementation here
    // Query your analytics system for feature usage
    return {
      totalUsers: 1000,
      activeUsers: 250,
      adoptionRate: 0.25,
      featureName,
      timeRange: { start: startDate, end: endDate },
    };
  }

  async getChurnRate(
    startDate: Date,
    endDate: Date
  ): Promise<ChurnMetrics | null> {
    // Your implementation here
    return null;
  }

  async getNPSScore(
    startDate: Date,
    endDate: Date
  ): Promise<NPSMetrics | null> {
    // Your implementation here
    return null;
  }

  async testConnection(): Promise<boolean> {
    // Test your analytics system connection
    return true;
  }
}
```

3. Register your provider in `src/lib/analytics/providers/index.ts`:

```typescript
case AnalyticsProvider.CUSTOM:
  return new CustomProvider(config);
```

4. Configure:
```bash
ANALYTICS_PROVIDER=custom
ANALYTICS_ENABLED=true
ANALYTICS_API_KEY=your_custom_key
```

## API Reference

### Main Functions

```typescript
import { getFeatureAdoptionRate, getChurnRate, getNPS } from '@/lib/analytics';

// Get feature adoption rate (0-1)
const adoptionRate = await getFeatureAdoptionRate('Dark Mode', startDate, endDate);
// Returns: 0.35 (35% of users adopted the feature)

// Get churn rate (0-1)
const churnRate = await getChurnRate(startDate, endDate);
// Returns: 0.05 (5% churn rate)

// Get NPS score (-100 to 100)
const nps = await getNPS(startDate, endDate);
// Returns: 45 (NPS score of 45)
```

### Advanced Usage

```typescript
import {
  getFeatureAdoptionMetrics,
  getChurnMetrics,
  getNPSMetrics
} from '@/lib/analytics';

// Get detailed feature adoption metrics
const metrics = await getFeatureAdoptionMetrics('Dark Mode', startDate, endDate);
console.log(metrics);
// {
//   totalUsers: 1000,
//   activeUsers: 350,
//   adoptionRate: 0.35,
//   featureName: 'Dark Mode',
//   timeRange: { start: Date, end: Date }
// }

// Get detailed churn metrics
const churnMetrics = await getChurnMetrics(startDate, endDate);
// {
//   totalCustomers: 500,
//   churnedCustomers: 25,
//   churnRate: 0.05,
//   timeRange: { start: Date, end: Date }
// }

// Get detailed NPS metrics
const npsMetrics = await getNPSMetrics(startDate, endDate);
// {
//   score: 45,
//   promoters: 120,
//   passives: 60,
//   detractors: 20,
//   totalResponses: 200,
//   timeRange: { start: Date, end: Date }
// }
```

## Troubleshooting

### Analytics not working?

1. **Check environment variables:**
   ```bash
   echo $ANALYTICS_PROVIDER
   echo $ANALYTICS_ENABLED
   echo $ANALYTICS_API_KEY
   ```

2. **Test connection:**
   ```bash
   curl http://localhost:3000/api/analytics/test
   ```

3. **Check logs:**
   Look for `[Analytics]` prefix in server logs

4. **Verify provider implementation:**
   Some providers are stubs - check if your provider is fully implemented

### Metrics returning null?

This is normal when:
- Analytics provider is set to `none`
- `ANALYTICS_ENABLED=false`
- Provider is not fully implemented yet (shows warning in logs)
- API credentials are invalid
- No data available for the time period

The system will gracefully fall back to `null` and continue working.

## Production Deployment

### Environment Variables

Make sure these are set in your production environment (Vercel, Railway, etc.):

```bash
ANALYTICS_PROVIDER=amplitude
ANALYTICS_ENABLED=true
ANALYTICS_API_KEY=prod_api_key
ANALYTICS_API_SECRET=prod_api_secret
```

### Security

- **Never commit API keys** to version control
- Use environment variables for all sensitive credentials
- Rotate API keys periodically
- Use read-only API keys when possible

## Contributing

Want to add support for a new analytics platform?

1. Create a new provider file in `src/lib/analytics/providers/[platform].ts`
2. Implement the `IAnalyticsProvider` interface
3. Add provider to the factory in `providers/index.ts`
4. Add documentation to this file
5. Submit a pull request

## Support

For issues or questions:
- GitHub Issues: [SignalsLoop Issues](https://github.com/anthropics/signalsloop/issues)
- Documentation: See code comments in `src/lib/analytics/`

## License

Same as main SignalsLoop project license.
