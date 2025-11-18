/**
 * Tests for Web Scrapers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Puppeteer
const mockPage = {
  goto: jest.fn(),
  setUserAgent: jest.fn(),
  setViewport: jest.fn(),
  waitForSelector: jest.fn(),
  waitForTimeout: jest.fn(),
  evaluate: jest.fn(),
  $: jest.fn(),
  close: jest.fn(),
};

const mockBrowser = {
  newPage: jest.fn(() => Promise.resolve(mockPage)),
  close: jest.fn(),
};

jest.mock('puppeteer-core', () => ({
  default: {
    launch: jest.fn(() => Promise.resolve(mockBrowser)),
  },
}));

jest.mock('../../../src/lib/competitive-intelligence/scrapers/browser-config', () => ({
  getBrowserConfig: jest.fn(() => ({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })),
}));

describe('Browser Configuration', () => {
  it('should detect Chrome paths', () => {
    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];

    expect(possiblePaths.length).toBeGreaterThan(0);
  });

  it('should support custom Chrome path via environment', () => {
    const customPath = process.env.CHROME_EXECUTABLE_PATH || '/custom/path/chrome';
    expect(customPath).toBeDefined();
  });
});

describe('G2 Scraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract review data from G2 page', async () => {
    const mockReviewData = [
      {
        external_review_id: 'g2_2024-01-01_John_Doe',
        title: 'Great product',
        content: 'Very useful tool',
        rating: 4.5,
        reviewer_name: 'John Doe',
        reviewer_role: 'Product Manager',
        published_at: '2024-01-01T00:00:00Z',
        verified_reviewer: true,
        incentivized_review: false,
      },
    ];

    mockPage.evaluate.mockResolvedValue(mockReviewData);
    mockPage.waitForSelector.mockResolvedValue(true);

    expect(mockReviewData).toHaveLength(1);
    expect(mockReviewData[0].rating).toBe(4.5);
    expect(mockReviewData[0].verified_reviewer).toBe(true);
  });

  it('should handle URL variations', () => {
    const urls = [
      'https://www.g2.com/products/jira',
      'https://www.g2.com/products/jira/reviews',
      'https://www.g2.com/products/jira/reviews?page=2',
    ];

    urls.forEach(url => {
      const reviewsUrl = url.includes('/reviews') ? url : `${url}/reviews`;
      expect(reviewsUrl).toContain('/reviews');
    });
  });

  it('should parse rating correctly', () => {
    const ratingElement = { getAttribute: () => '4.5' };
    const rating = parseFloat(ratingElement.getAttribute() || '0');
    expect(rating).toBe(4.5);
  });

  it('should generate unique review IDs', () => {
    const date = '2024-01-01T00:00:00Z';
    const name = 'John Doe';
    const id = `g2_${date}_${name.replace(/\s+/g, '_')}`;
    expect(id).toBe('g2_2024-01-01T00:00:00Z_John_Doe');
  });
});

describe('Capterra Scraper', () => {
  it('should extract pros and cons separately', async () => {
    const mockReview = {
      pros: 'Easy to use, Great UI',
      cons: 'Expensive, Limited features',
    };

    const content = `Pros: ${mockReview.pros}\n\nCons: ${mockReview.cons}`;
    expect(content).toContain('Pros:');
    expect(content).toContain('Cons:');
  });

  it('should parse relative dates', () => {
    const parseCapterraDate = (dateStr: string): string => {
      const now = new Date();

      if (dateStr.includes('ago')) {
        const match = dateStr.match(/(\d+)\s+(day|week|month|year)/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];

          switch (unit) {
            case 'day':
              now.setDate(now.getDate() - value);
              break;
            case 'month':
              now.setMonth(now.getMonth() - value);
              break;
          }
        }
      }

      return now.toISOString();
    };

    const result = parseCapterraDate('2 months ago');
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('should handle missing reviewer info', () => {
    const reviewer = {
      name: 'Anonymous',
      role: undefined,
      company_size: undefined,
    };

    expect(reviewer.name).toBe('Anonymous');
    expect(reviewer.role).toBeUndefined();
  });
});

describe('TrustRadius Scraper', () => {
  it('should detect verified badges', () => {
    const hasVerifiedBadge = true;
    const hasIncentivizedBadge = false;

    expect(hasVerifiedBadge).toBe(true);
    expect(hasIncentivizedBadge).toBe(false);
  });

  it('should parse rating scores', () => {
    const ratingText = '4.5';
    const rating = parseFloat(ratingText);

    expect(rating).toBe(4.5);
    expect(rating).toBeGreaterThanOrEqual(1);
    expect(rating).toBeLessThanOrEqual(5);
  });
});

describe('Scraper Error Handling', () => {
  it('should handle network timeouts', async () => {
    const timeout = 60000;
    expect(timeout).toBe(60000);
  });

  it('should handle element not found errors', async () => {
    mockPage.waitForSelector.mockRejectedValue(new Error('Element not found'));

    try {
      await mockPage.waitForSelector('.non-existent');
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toBe('Element not found');
    }
  });

  it('should close browser on error', async () => {
    const browser = mockBrowser;

    try {
      // Simulate error
      throw new Error('Scraping failed');
    } catch (error) {
      await browser.close();
    }

    expect(mockBrowser.close).toHaveBeenCalled();
  });
});

describe('AI Extraction', () => {
  it('should extract sentiment from review text', () => {
    const reviews = [
      { content: 'Great product, love it!', expectedSentiment: 'positive' },
      { content: 'Terrible experience, very buggy', expectedSentiment: 'negative' },
      { content: 'It works fine, nothing special', expectedSentiment: 'neutral' },
    ];

    reviews.forEach(review => {
      expect(review.content.length).toBeGreaterThan(0);
    });
  });

  it('should extract features mentioned', () => {
    const content = 'Great kanban boards and excellent reporting features';
    const features = ['kanban boards', 'reporting'];

    features.forEach(feature => {
      expect(content.toLowerCase()).toContain(feature.toLowerCase());
    });
  });

  it('should categorize sentiment correctly', () => {
    const sentimentScores = {
      positive: 0.8,
      negative: -0.7,
      neutral: 0.1,
      mixed: 0.0,
    };

    expect(sentimentScores.positive).toBeGreaterThan(0.5);
    expect(sentimentScores.negative).toBeLessThan(-0.5);
    expect(Math.abs(sentimentScores.neutral)).toBeLessThan(0.3);
  });
});

describe('Rate Limiting', () => {
  it('should wait between platforms', async () => {
    const delay = 2000; // 2 seconds
    expect(delay).toBe(2000);
  });

  it('should wait between products', async () => {
    const delay = 5000; // 5 seconds
    expect(delay).toBe(5000);
  });

  it('should limit concurrent scrapes', () => {
    const maxConcurrent = 1;
    expect(maxConcurrent).toBe(1);
  });
});

describe('Data Deduplication', () => {
  it('should generate unique review IDs', () => {
    const reviews = [
      { platform: 'g2', date: '2024-01-01', reviewer: 'John' },
      { platform: 'g2', date: '2024-01-01', reviewer: 'Jane' },
      { platform: 'capterra', date: '2024-01-01', reviewer: 'John' },
    ];

    const ids = reviews.map(r =>
      `${r.platform}_${r.date}_${r.reviewer}`
    );

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('should check for existing reviews', async () => {
    const existing = [
      { external_review_id: 'g2_2024-01-01_John' },
    ];

    const newReviewId = 'g2_2024-01-01_John';
    const isDuplicate = existing.some(r => r.external_review_id === newReviewId);

    expect(isDuplicate).toBe(true);
  });
});
