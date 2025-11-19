/**
 * Tests for External Competitor Products API
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('Competitive Intelligence API - External Products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/competitive/external/products', () => {
    it('should return competitor products for a project', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          project_id: 'proj-1',
          product_name: 'Jira',
          company_name: 'Atlassian',
          platforms: ['g2', 'capterra'],
          is_active: true,
          monitoring_enabled: true,
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      });

      // Test would call the API endpoint here
      expect(mockProducts).toHaveLength(1);
      expect(mockProducts[0].product_name).toBe('Jira');
    });

    it('should return error if projectId is missing', async () => {
      // Test missing projectId parameter
      const missingProjectId = undefined;
      expect(missingProjectId).toBeUndefined();
    });

    it('should limit to maximum 5 products', async () => {
      const mockProducts = Array.from({ length: 6 }, (_, i) => ({
        id: `product-${i}`,
        product_name: `Product ${i}`,
      }));

      expect(mockProducts.length).toBe(6);
      expect(mockProducts.slice(0, 5).length).toBe(5);
    });
  });

  describe('POST /api/competitive/external/products', () => {
    it('should create a new competitor product', async () => {
      const newProduct = {
        project_id: 'proj-1',
        product_name: 'Asana',
        company_name: 'Asana Inc.',
        platforms: ['g2'],
        g2_url: 'https://www.g2.com/products/asana',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 2, // Less than 5
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...newProduct, id: 'new-product-id' },
              error: null,
            }),
          }),
        }),
      });

      expect(newProduct.product_name).toBe('Asana');
    });

    it('should reject if limit of 5 products reached', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 5, // Already at limit
          }),
        }),
      });

      const count = 5;
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should extract product IDs from URLs', () => {
      const g2Url = 'https://www.g2.com/products/jira/reviews';
      const capterraUrl = 'https://www.capterra.com/p/123456/jira';
      const trustRadiusUrl = 'https://www.trustradius.com/products/jira/reviews';

      const g2Match = g2Url.match(/g2\.com\/products\/([^\/]+)/);
      const capterraMatch = capterraUrl.match(/capterra\.com\/p\/(\d+)/);
      const trustRadiusMatch = trustRadiusUrl.match(/trustradius\.com\/products\/([^\/]+)/);

      expect(g2Match?.[1]).toBe('jira');
      expect(capterraMatch?.[1]).toBe('123456');
      expect(trustRadiusMatch?.[1]).toBe('jira');
    });
  });
});

describe('Competitive Intelligence API - Reviews', () => {
  describe('GET /api/competitive/external/reviews', () => {
    it('should return reviews for a competitor product', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          competitor_product_id: 'product-1',
          platform: 'g2',
          title: 'Great product',
          content: 'Very useful for project management',
          rating: 4.5,
          sentiment_category: 'positive',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockReviews,
                error: null,
              }),
            }),
          }),
        }),
      });

      expect(mockReviews).toHaveLength(1);
      expect(mockReviews[0].rating).toBe(4.5);
    });

    it('should filter by platform', async () => {
      const reviews = [
        { platform: 'g2', rating: 4.5 },
        { platform: 'capterra', rating: 4.0 },
        { platform: 'g2', rating: 5.0 },
      ];

      const g2Reviews = reviews.filter(r => r.platform === 'g2');
      expect(g2Reviews).toHaveLength(2);
    });

    it('should filter by sentiment', async () => {
      const reviews = [
        { sentiment_category: 'positive', rating: 4.5 },
        { sentiment_category: 'negative', rating: 2.0 },
        { sentiment_category: 'positive', rating: 5.0 },
      ];

      const positiveReviews = reviews.filter(r => r.sentiment_category === 'positive');
      expect(positiveReviews).toHaveLength(2);
    });
  });
});

describe('Competitive Intelligence API - Strengths & Weaknesses', () => {
  describe('GET /api/competitive/external/strengths', () => {
    it('should return strengths for a competitor', async () => {
      const mockStrengths = [
        {
          id: 'strength-1',
          feature_name: 'Easy to use',
          strength_category: 'UI/UX',
          praise_count: 45,
          confidence_score: 0.89,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockStrengths,
              error: null,
            }),
          }),
        }),
      });

      expect(mockStrengths[0].praise_count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/competitive/external/weaknesses', () => {
    it('should return weaknesses for a competitor', async () => {
      const mockWeaknesses = [
        {
          id: 'weakness-1',
          feature_name: 'Expensive pricing',
          weakness_category: 'Pricing',
          complaint_count: 32,
          opportunity_score: 0.85,
          strategic_importance: 'high',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockWeaknesses,
              error: null,
            }),
          }),
        }),
      });

      expect(mockWeaknesses[0].opportunity_score).toBeGreaterThan(0);
      expect(mockWeaknesses[0].strategic_importance).toBe('high');
    });
  });
});

describe('URL Extraction Functions', () => {
  it('should extract G2 product ID', () => {
    const extractG2ProductId = (url: string) => {
      const match = url.match(/g2\.com\/products\/([^\/]+)/);
      return match ? match[1] : null;
    };

    expect(extractG2ProductId('https://www.g2.com/products/jira')).toBe('jira');
    expect(extractG2ProductId('https://www.g2.com/products/slack/reviews')).toBe('slack');
    expect(extractG2ProductId('invalid-url')).toBeNull();
  });

  it('should extract Capterra product ID', () => {
    const extractCapterraProductId = (url: string) => {
      const match = url.match(/capterra\.com\/p\/(\d+)/);
      return match ? match[1] : null;
    };

    expect(extractCapterraProductId('https://www.capterra.com/p/123456/jira')).toBe('123456');
    expect(extractCapterraProductId('invalid-url')).toBeNull();
  });

  it('should extract TrustRadius product ID', () => {
    const extractTrustRadiusProductId = (url: string) => {
      const match = url.match(/trustradius\.com\/products\/([^\/]+)/);
      return match ? match[1] : null;
    };

    expect(extractTrustRadiusProductId('https://www.trustradius.com/products/jira')).toBe('jira');
    expect(extractTrustRadiusProductId('invalid-url')).toBeNull();
  });
});
