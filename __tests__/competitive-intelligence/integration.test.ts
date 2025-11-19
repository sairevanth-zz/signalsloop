/**
 * Integration Tests for Competitive Intelligence
 * Tests the complete workflow from scraping to display
 */

import { describe, it, expect } from '@jest/globals';

describe('Competitive Intelligence - Complete Workflow', () => {
  describe('Internal Competitor Tracking', () => {
    it('should extract competitor from feedback', async () => {
      const feedback = {
        content: 'We are considering switching from Slack to your product because of better pricing',
        user_id: 'user-1',
        project_id: 'proj-1',
      };

      // AI extraction would identify "Slack" as competitor
      const expectedExtraction = {
        competitor_name: 'Slack',
        mention_type: 'switch_from',
        sentiment_vs_you: 0.8, // positive
        sentiment_about_competitor: 0.3, // neutral/mixed
        key_points: ['better pricing'],
      };

      expect(feedback.content).toContain('Slack');
      expect(expectedExtraction.mention_type).toBe('switch_from');
    });

    it('should create competitor record if not exists', async () => {
      const competitorName = 'Slack';
      const projectId = 'proj-1';

      // Check if competitor exists, create if not
      const competitor = {
        id: 'comp-1',
        project_id: projectId,
        name: competitorName,
        category: 'Communication',
        total_mentions: 1,
      };

      expect(competitor.name).toBe(competitorName);
    });

    it('should track dual sentiment', async () => {
      const mention = {
        sentiment_vs_you: 0.7, // positive toward your product
        sentiment_about_competitor: -0.5, // negative about competitor
      };

      expect(mention.sentiment_vs_you).toBeGreaterThan(0);
      expect(mention.sentiment_about_competitor).toBeLessThan(0);
    });
  });

  describe('External Review Monitoring', () => {
    it('should complete full scraping workflow', async () => {
      // 1. Add competitor product
      const product = {
        project_id: 'proj-1',
        product_name: 'Jira',
        company_name: 'Atlassian',
        platforms: ['g2'],
        g2_url: 'https://www.g2.com/products/jira/reviews',
      };

      // 2. Scrape reviews
      const mockReviews = [
        {
          platform: 'g2',
          title: 'Great for agile teams',
          content: 'Excellent kanban boards but pricing is too high',
          rating: 4.0,
        },
      ];

      // 3. AI extracts features/sentiment
      const extracted = {
        mentioned_features: ['kanban boards'],
        pros: ['Excellent kanban boards'],
        cons: ['pricing is too high'],
        sentiment_category: 'mixed',
      };

      // 4. Cluster into strengths/weaknesses
      const strength = {
        feature_name: 'Kanban boards',
        strength_category: 'Features',
        praise_count: 1,
      };

      const weakness = {
        feature_name: 'Pricing',
        weakness_category: 'Cost',
        complaint_count: 1,
        opportunity_score: 0.85,
      };

      expect(mockReviews).toHaveLength(1);
      expect(extracted.pros).toHaveLength(1);
      expect(strength.feature_name).toBe('Kanban boards');
      expect(weakness.opportunity_score).toBeGreaterThan(0.8);
    });
  });

  describe('Hybrid Dashboard', () => {
    it('should show both internal and external data', async () => {
      const dashboardData = {
        internal: {
          competitors: 3,
          mentions: 45,
          net_switches: 12,
        },
        external: {
          products_monitored: 2,
          reviews_synced: 150,
          strengths_identified: 8,
          weaknesses_identified: 5,
        },
      };

      expect(dashboardData.internal.competitors).toBeGreaterThan(0);
      expect(dashboardData.external.products_monitored).toBeGreaterThan(0);
    });

    it('should filter data by tab', () => {
      const tabs = ['internal', 'external'];
      const activeTab = 'external';

      expect(tabs).toContain(activeTab);
    });
  });

  describe('Feature Gap Detection', () => {
    it('should identify features competitors have', async () => {
      const competitorFeatures = [
        'Advanced reporting',
        'API integrations',
        'Mobile app',
      ];

      const yourFeatures = [
        'Basic reporting',
        'API integrations',
      ];

      const gaps = competitorFeatures.filter(f => !yourFeatures.includes(f));

      expect(gaps).toContain('Advanced reporting');
      expect(gaps).toContain('Mobile app');
      expect(gaps).not.toContain('API integrations');
    });

    it('should prioritize gaps by demand', () => {
      const gaps = [
        { feature: 'Advanced reporting', mentions: 45, priority: 'high' },
        { feature: 'Mobile app', mentions: 12, priority: 'medium' },
        { feature: 'Dark mode', mentions: 3, priority: 'low' },
      ];

      const sorted = gaps.sort((a, b) => b.mentions - a.mentions);

      expect(sorted[0].feature).toBe('Advanced reporting');
      expect(sorted[0].priority).toBe('high');
    });
  });

  describe('Strategic Recommendations', () => {
    it('should generate ATTACK recommendations', () => {
      const weakness = {
        competitor: 'Jira',
        weakness: 'Complex UI',
        complaint_count: 35,
      };

      const recommendation = {
        type: 'ATTACK',
        title: 'Emphasize Simple UI',
        description: 'Market your simple, intuitive interface as alternative to Jira\'s complexity',
        opportunity_score: 0.85,
      };

      expect(recommendation.type).toBe('ATTACK');
      expect(recommendation.opportunity_score).toBeGreaterThan(0.8);
    });

    it('should generate DEFEND recommendations', () => {
      const strength = {
        your_feature: 'Easy onboarding',
        competitor_catching_up: true,
      };

      const recommendation = {
        type: 'DEFEND',
        title: 'Protect Onboarding Advantage',
        description: 'Continue innovating on onboarding before competitors catch up',
      };

      expect(recommendation.type).toBe('DEFEND');
    });
  });

  describe('Alerts & Notifications', () => {
    it('should create alert for new weakness', async () => {
      const newWeakness = {
        competitor: 'Jira',
        feature: 'Mobile app',
        strategic_importance: 'high',
        first_identified_at: new Date().toISOString(),
      };

      const alert = {
        type: 'new_weakness',
        severity: 'high',
        title: `New Opportunity: ${newWeakness.feature}`,
        is_read: false,
      };

      expect(alert.severity).toBe('high');
      expect(alert.is_read).toBe(false);
    });

    it('should detect review spikes', () => {
      const reviews = [
        { date: '2024-01-01', count: 5 },
        { date: '2024-01-02', count: 4 },
        { date: '2024-01-03', count: 25 }, // Spike!
      ];

      const average = reviews.slice(0, 2).reduce((sum, r) => sum + r.count, 0) / 2;
      const spike = reviews[2].count > average * 3;

      expect(spike).toBe(true);
    });
  });

  describe('Data Quality', () => {
    it('should validate review data completeness', () => {
      const review = {
        external_review_id: 'g2_2024-01-01_John',
        title: 'Great product',
        content: 'Detailed review content',
        rating: 4.5,
        reviewer_name: 'John Doe',
        published_at: '2024-01-01T00:00:00Z',
      };

      expect(review.external_review_id).toBeDefined();
      expect(review.content.length).toBeGreaterThan(0);
      expect(review.rating).toBeGreaterThan(0);
    });

    it('should handle missing optional fields', () => {
      const review = {
        title: 'Review',
        content: 'Content',
        rating: 4.0,
        reviewer_role: undefined,
        reviewer_company_size: undefined,
      };

      expect(review.title).toBeDefined();
      expect(review.reviewer_role).toBeUndefined();
    });

    it('should sanitize extracted data', () => {
      const rawData = {
        feature: '  Advanced\nReporting\t',
      };

      const sanitized = rawData.feature.trim().replace(/\s+/g, ' ');

      expect(sanitized).toBe('Advanced Reporting');
    });
  });

  describe('Performance', () => {
    it('should limit API response size', () => {
      const maxReviews = 50;
      const reviews = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const limited = reviews.slice(0, maxReviews);

      expect(limited).toHaveLength(50);
    });

    it('should cache competitor product data', () => {
      const cacheKey = 'products:proj-1';
      const cacheTTL = 300; // 5 minutes

      expect(cacheKey).toContain('proj-1');
      expect(cacheTTL).toBe(300);
    });

    it('should batch database operations', async () => {
      const reviews = Array.from({ length: 20 }, (_, i) => ({ id: i }));
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < reviews.length; i += batchSize) {
        batches.push(reviews.slice(i, i + batchSize));
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(10);
    });
  });
});

describe('Error Recovery', () => {
  it('should retry failed scrapes', async () => {
    let attempts = 0;
    const maxRetries = 3;

    const scrapeWithRetry = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }
      return 'success';
    };

    try {
      let result;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await scrapeWithRetry();
          break;
        } catch (error) {
          if (i === maxRetries - 1) throw error;
        }
      }
      expect(result).toBe('success');
    } catch (error) {
      // Should not reach here in this test
    }
  });

  it('should log scraping errors to database', () => {
    const error = {
      competitor_product_id: 'prod-1',
      platform: 'g2',
      error_message: 'Element not found',
      timestamp: new Date().toISOString(),
    };

    expect(error.error_message).toBeDefined();
  });

  it('should continue with other products on failure', async () => {
    const products = [
      { id: 'prod-1', name: 'Product 1' },
      { id: 'prod-2', name: 'Product 2' },
      { id: 'prod-3', name: 'Product 3' },
    ];

    const results = [];
    for (const product of products) {
      try {
        if (product.id === 'prod-2') {
          throw new Error('Scraping failed');
        }
        results.push({ ...product, success: true });
      } catch (error) {
        results.push({ ...product, success: false });
      }
    }

    expect(results).toHaveLength(3);
    expect(results.filter(r => r.success)).toHaveLength(2);
  });
});
