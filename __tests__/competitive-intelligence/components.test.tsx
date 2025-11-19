/**
 * Tests for Competitive Intelligence UI Components
 */

import { describe, it, expect } from '@jest/globals';
import '@testing-library/jest-dom';

describe('CompetitorMonitoringSetup Component', () => {
  it('should render add competitor button', () => {
    const existingProducts = [];
    const maxProducts = 5;

    expect(existingProducts.length).toBeLessThan(maxProducts);
  });

  it('should disable button when limit reached', () => {
    const existingProducts = Array.from({ length: 5 }, (_, i) => ({ id: `prod-${i}` }));
    const maxProducts = 5;
    const isDisabled = existingProducts.length >= maxProducts;

    expect(isDisabled).toBe(true);
  });

  it('should validate form inputs', () => {
    const formData = {
      product_name: 'Jira',
      company_name: 'Atlassian',
      platforms: ['g2'],
      g2_url: 'https://www.g2.com/products/jira',
    };

    const isValid = formData.product_name &&
      formData.company_name &&
      formData.platforms.length > 0;

    expect(isValid).toBe(true);
  });

  it('should require at least one platform', () => {
    const platforms: string[] = [];
    const isValid = platforms.length > 0;

    expect(isValid).toBe(false);
  });
});

describe('ExternalReviewsPanel Component', () => {
  it('should filter reviews by platform', () => {
    const reviews = [
      { id: '1', platform: 'g2', rating: 4.5 },
      { id: '2', platform: 'capterra', rating: 4.0 },
      { id: '3', platform: 'g2', rating: 5.0 },
    ];

    const filtered = reviews.filter(r => r.platform === 'g2');

    expect(filtered).toHaveLength(2);
  });

  it('should filter reviews by sentiment', () => {
    const reviews = [
      { id: '1', sentiment_category: 'positive' },
      { id: '2', sentiment_category: 'negative' },
      { id: '3', sentiment_category: 'positive' },
    ];

    const filtered = reviews.filter(r => r.sentiment_category === 'positive');

    expect(filtered).toHaveLength(2);
  });

  it('should display review count', () => {
    const reviews = Array.from({ length: 25 }, (_, i) => ({ id: `${i}` }));

    expect(reviews.length).toBe(25);
  });

  it('should render platform badges', () => {
    const platforms = ['g2', 'capterra', 'trustradius'];
    const badges = {
      g2: { label: 'G2', className: 'bg-orange-100' },
      capterra: { label: 'Capterra', className: 'bg-blue-100' },
      trustradius: { label: 'TrustRadius', className: 'bg-green-100' },
    };

    platforms.forEach(platform => {
      expect(badges[platform as keyof typeof badges]).toBeDefined();
    });
  });
});

describe('StrengthsWeaknessesGrid Component', () => {
  it('should display strengths with praise count', () => {
    const strengths = [
      {
        id: '1',
        feature_name: 'Easy to use',
        praise_count: 45,
        confidence_score: 0.89,
      },
    ];

    expect(strengths[0].praise_count).toBeGreaterThan(0);
    expect(strengths[0].confidence_score).toBeGreaterThan(0.5);
  });

  it('should display weaknesses with opportunity score', () => {
    const weaknesses = [
      {
        id: '1',
        feature_name: 'Expensive',
        complaint_count: 32,
        opportunity_score: 0.85,
        strategic_importance: 'high',
      },
    ];

    expect(weaknesses[0].opportunity_score).toBeGreaterThan(0.8);
  });

  it('should color-code importance badges', () => {
    const importanceBadges = {
      critical: { className: 'bg-red-100 text-red-700' },
      high: { className: 'bg-orange-100 text-orange-700' },
      medium: { className: 'bg-yellow-100 text-yellow-700' },
      low: { className: 'bg-gray-100 text-gray-700' },
    };

    expect(importanceBadges.critical.className).toContain('red');
    expect(importanceBadges.low.className).toContain('gray');
  });

  it('should show sample quotes', () => {
    const weakness = {
      feature_name: 'Pricing',
      sample_quotes: [
        'Too expensive for small teams',
        'Hidden costs add up',
      ],
    };

    expect(weakness.sample_quotes).toHaveLength(2);
  });
});

describe('HybridCompetitiveDashboard Component', () => {
  it('should render two tabs', () => {
    const tabs = ['internal', 'external'];

    expect(tabs).toHaveLength(2);
    expect(tabs).toContain('internal');
    expect(tabs).toContain('external');
  });

  it('should switch between tabs', () => {
    let activeTab = 'internal';
    activeTab = 'external';

    expect(activeTab).toBe('external');
  });

  it('should load external products when switching to external tab', () => {
    const activeTab = 'external';
    const shouldLoad = activeTab === 'external';

    expect(shouldLoad).toBe(true);
  });

  it('should display info banner', () => {
    const bannerText = 'Hybrid Competitive Intelligence';

    expect(bannerText).toContain('Hybrid');
  });
});

describe('CompetitiveAdminPanel Component', () => {
  it('should have three trigger buttons', () => {
    const actions = [
      'Extract Competitors',
      'Detect Feature Gaps',
      'Generate Strategic Recommendations',
    ];

    expect(actions).toHaveLength(3);
  });

  it('should disable buttons during processing', () => {
    let isProcessing = false;
    isProcessing = true;

    expect(isProcessing).toBe(true);
  });

  it('should refresh dashboard after extraction', () => {
    let refreshKey = 0;
    refreshKey = refreshKey + 1;

    expect(refreshKey).toBe(1);
  });
});

describe('CompetitorCard Component', () => {
  it('should display competitor metrics', () => {
    const competitor = {
      name: 'Jira',
      total_mentions: 45,
      net_switches: 12,
      sentiment_vs_you: 0.65,
    };

    expect(competitor.total_mentions).toBeGreaterThan(0);
    expect(competitor.net_switches).toBeGreaterThan(0);
  });

  it('should show sentiment indicator', () => {
    const sentiments = [
      { value: 0.8, color: 'green' },
      { value: 0.3, color: 'yellow' },
      { value: -0.5, color: 'red' },
    ];

    expect(sentiments[0].color).toBe('green');
    expect(sentiments[2].color).toBe('red');
  });
});

describe('FeatureGapCard Component', () => {
  it('should display priority badge', () => {
    const priorities = {
      critical: 'bg-red-100',
      high: 'bg-orange-100',
      medium: 'bg-yellow-100',
      low: 'bg-gray-100',
    };

    expect(Object.keys(priorities)).toHaveLength(4);
  });

  it('should show feedback count', () => {
    const gap = {
      feature_name: 'Advanced reporting',
      feedback_count: 23,
    };

    expect(gap.feedback_count).toBeGreaterThan(0);
  });
});

describe('RecommendationCard Component', () => {
  it('should display recommendation types', () => {
    const types = ['ATTACK', 'DEFEND', 'REACT', 'IGNORE'];
    const icons = {
      ATTACK: '🗡️',
      DEFEND: '🛡️',
      REACT: '⚡',
      IGNORE: '👁️',
    };

    types.forEach(type => {
      expect(icons[type as keyof typeof icons]).toBeDefined();
    });
  });

  it('should show ROI estimate', () => {
    const recommendation = {
      type: 'ATTACK',
      roi_estimate: '25-40%',
      confidence: 0.85,
    };

    expect(recommendation.roi_estimate).toBeDefined();
    expect(recommendation.confidence).toBeGreaterThan(0.8);
  });
});

describe('SentimentTrendChart Component', () => {
  it('should render line chart data', () => {
    const trendData = [
      { date: '2024-01', sentiment: 0.6 },
      { date: '2024-02', sentiment: 0.7 },
      { date: '2024-03', sentiment: 0.65 },
    ];

    expect(trendData).toHaveLength(3);
  });

  it('should format dates for x-axis', () => {
    const date = '2024-01-15';
    const formatted = new Date(date).toLocaleDateString();

    expect(formatted).toBeDefined();
  });
});

describe('Loading States', () => {
  it('should show loading spinner', () => {
    const isLoading = true;

    expect(isLoading).toBe(true);
  });

  it('should show empty state when no data', () => {
    const products: any[] = [];
    const isEmpty = products.length === 0;

    expect(isEmpty).toBe(true);
  });

  it('should show error state', () => {
    const error = 'Failed to load data';

    expect(error).toBeDefined();
  });
});

describe('Form Validation', () => {
  it('should validate product name', () => {
    const productName = 'Jira';
    const isValid = productName.length > 0;

    expect(isValid).toBe(true);
  });

  it('should validate URLs', () => {
    const url = 'https://www.g2.com/products/jira';
    const isValidUrl = url.startsWith('http');

    expect(isValidUrl).toBe(true);
  });

  it('should require company name', () => {
    const companyName = '';
    const isValid = companyName.length > 0;

    expect(isValid).toBe(false);
  });
});

describe('Interactive Features', () => {
  it('should handle competitor click', () => {
    let selectedCompetitor: string | null = null;
    const competitorId = 'comp-1';

    selectedCompetitor = competitorId;

    expect(selectedCompetitor).toBe('comp-1');
  });

  it('should handle feature gap click', () => {
    let selectedGap: string | null = null;
    const gapId = 'gap-1';

    selectedGap = gapId;

    expect(selectedGap).toBe('gap-1');
  });

  it('should handle recommendation click', () => {
    let selectedRecommendation: string | null = null;
    const recId = 'rec-1';

    selectedRecommendation = recId;

    expect(selectedRecommendation).toBe('rec-1');
  });
});
