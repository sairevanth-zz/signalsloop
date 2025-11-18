/**
 * Tests for AI Roadmap Prioritization Algorithm
 */

import {
  normalizeFrequency,
  normalizeSentiment,
  calculateBusinessImpact,
  calculateEffortScore,
  calculateCompetitiveScore,
  calculatePriorityScore,
  assignPriorityLevel
} from '@/lib/roadmap/prioritization';

import type { ThemeData, PriorityContext } from '@/lib/roadmap/prioritization';

describe('Roadmap Prioritization Algorithm', () => {
  describe('normalizeFrequency', () => {
    it('should return 0 when maxMentions is 0', () => {
      expect(normalizeFrequency(10, 0)).toBe(0);
    });

    it('should return 1 when mentions equal maxMentions', () => {
      const result = normalizeFrequency(100, 100);
      expect(result).toBe(1);
    });

    it('should use logarithmic scaling', () => {
      const result = normalizeFrequency(50, 100);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThan(1);
    });

    it('should handle low mention counts', () => {
      const result = normalizeFrequency(1, 100);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.5);
    });
  });

  describe('normalizeSentiment', () => {
    it('should prioritize negative sentiment (pain points)', () => {
      const negative = normalizeSentiment(-0.8);
      const positive = normalizeSentiment(0.8);
      expect(negative).toBeGreaterThan(positive);
    });

    it('should return 1.0 for very negative sentiment', () => {
      const result = normalizeSentiment(-1.0);
      expect(result).toBe(1.0);
    });

    it('should return 0.5 for neutral sentiment', () => {
      const result = normalizeSentiment(0);
      expect(result).toBe(0.5);
    });

    it('should return low score for very positive sentiment', () => {
      const result = normalizeSentiment(1.0);
      expect(result).toBe(0);
    });

    it('should handle partial negative sentiment', () => {
      const result = normalizeSentiment(-0.5);
      expect(result).toBe(0.75);
    });
  });

  describe('calculateBusinessImpact', () => {
    it('should score high for churn-related keywords', () => {
      const theme: ThemeData = {
        theme_id: 'test-1',
        theme_name: 'Test Theme',
        mention_count: 50,
        avg_sentiment: -0.5,
        first_detected_at: new Date().toISOString(),
        business_impact_keywords: ['churn', 'cancel'],
        urgency_scores: [4, 5, 5],
        competitor_count: 2,
        estimated_effort: 'medium'
      };

      const score = calculateBusinessImpact(theme);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should score high for urgent themes', () => {
      const theme: ThemeData = {
        theme_id: 'test-2',
        theme_name: 'Urgent Feature',
        mention_count: 30,
        avg_sentiment: -0.3,
        first_detected_at: new Date().toISOString(),
        business_impact_keywords: [],
        urgency_scores: [5, 5, 4, 5],
        competitor_count: 1,
        estimated_effort: 'low'
      };

      const score = calculateBusinessImpact(theme);
      expect(score).toBeGreaterThan(0);
    });

    it('should boost score for rapidly growing themes', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      const theme: ThemeData = {
        theme_id: 'test-3',
        theme_name: 'Hot New Theme',
        mention_count: 25,
        avg_sentiment: -0.2,
        first_detected_at: twoDaysAgo,
        business_impact_keywords: [],
        urgency_scores: [],
        competitor_count: 0,
        estimated_effort: 'medium'
      };

      const score = calculateBusinessImpact(theme);
      expect(score).toBeGreaterThan(0);
    });

    it('should cap score at 1.0', () => {
      const theme: ThemeData = {
        theme_id: 'test-4',
        theme_name: 'Super High Impact',
        mention_count: 100,
        avg_sentiment: -1.0,
        first_detected_at: new Date().toISOString(),
        business_impact_keywords: ['churn', 'enterprise', 'revenue'],
        urgency_scores: [5, 5, 5, 5],
        competitor_count: 5,
        estimated_effort: 'low'
      };

      const score = calculateBusinessImpact(theme);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('calculateEffortScore', () => {
    it('should score low effort highest', () => {
      expect(calculateEffortScore('low')).toBe(0.9);
    });

    it('should score medium effort moderately', () => {
      expect(calculateEffortScore('medium')).toBe(0.5);
    });

    it('should score high effort lower', () => {
      expect(calculateEffortScore('high')).toBe(0.3);
    });

    it('should score very high effort lowest', () => {
      expect(calculateEffortScore('very_high')).toBe(0.1);
    });

    it('should default to medium for unknown effort', () => {
      expect(calculateEffortScore('unknown' as any)).toBe(0.5);
    });
  });

  describe('calculateCompetitiveScore', () => {
    it('should return 1.0 when all competitors have the feature', () => {
      expect(calculateCompetitiveScore(5, 5)).toBe(1.0);
    });

    it('should return 0 when no competitors have the feature', () => {
      expect(calculateCompetitiveScore(0, 5)).toBe(0);
    });

    it('should return proportional score', () => {
      expect(calculateCompetitiveScore(3, 5)).toBe(0.6);
    });

    it('should handle zero total competitors', () => {
      expect(calculateCompetitiveScore(0, 0)).toBe(0.5);
    });
  });

  describe('calculatePriorityScore', () => {
    const context: PriorityContext = {
      maxMentions: 100,
      totalCompetitors: 5
    };

    it('should calculate correct total score', () => {
      const theme: ThemeData = {
        theme_id: 'test-5',
        theme_name: 'Balanced Theme',
        mention_count: 50,
        avg_sentiment: -0.5,
        first_detected_at: new Date().toISOString(),
        business_impact_keywords: ['churn'],
        urgency_scores: [4, 4],
        competitor_count: 2,
        estimated_effort: 'medium'
      };

      const result = calculatePriorityScore(theme, context);

      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.breakdown.frequency).toBeDefined();
      expect(result.breakdown.sentiment).toBeDefined();
      expect(result.breakdown.businessImpact).toBeDefined();
      expect(result.breakdown.effort).toBeDefined();
      expect(result.breakdown.competitive).toBeDefined();
    });

    it('should prioritize high-frequency, negative sentiment themes', () => {
      const highPriorityTheme: ThemeData = {
        theme_id: 'test-6',
        theme_name: 'Critical Issue',
        mention_count: 90,
        avg_sentiment: -0.9,
        first_detected_at: new Date().toISOString(),
        business_impact_keywords: ['churn', 'cancel', 'blocker'],
        urgency_scores: [5, 5, 5],
        competitor_count: 4,
        estimated_effort: 'low'
      };

      const lowPriorityTheme: ThemeData = {
        theme_id: 'test-7',
        theme_name: 'Nice to Have',
        mention_count: 10,
        avg_sentiment: 0.8,
        first_detected_at: new Date().toISOString(),
        business_impact_keywords: [],
        urgency_scores: [2],
        competitor_count: 0,
        estimated_effort: 'very_high'
      };

      const highResult = calculatePriorityScore(highPriorityTheme, context);
      const lowResult = calculatePriorityScore(lowPriorityTheme, context);

      expect(highResult.totalScore).toBeGreaterThan(lowResult.totalScore);
      expect(highResult.totalScore).toBeGreaterThan(70);
      expect(lowResult.totalScore).toBeLessThan(40);
    });

    it('should round score to 2 decimals', () => {
      const theme: ThemeData = {
        theme_id: 'test-8',
        theme_name: 'Test Rounding',
        mention_count: 33,
        avg_sentiment: -0.33,
        first_detected_at: new Date().toISOString(),
        business_impact_keywords: [],
        urgency_scores: [],
        competitor_count: 1,
        estimated_effort: 'medium'
      };

      const result = calculatePriorityScore(theme, context);
      const decimals = (result.totalScore.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  describe('assignPriorityLevel', () => {
    it('should assign critical for score >= 75', () => {
      expect(assignPriorityLevel(75)).toBe('critical');
      expect(assignPriorityLevel(85)).toBe('critical');
      expect(assignPriorityLevel(100)).toBe('critical');
    });

    it('should assign high for score 60-74', () => {
      expect(assignPriorityLevel(60)).toBe('high');
      expect(assignPriorityLevel(70)).toBe('high');
      expect(assignPriorityLevel(74)).toBe('high');
    });

    it('should assign medium for score 40-59', () => {
      expect(assignPriorityLevel(40)).toBe('medium');
      expect(assignPriorityLevel(50)).toBe('medium');
      expect(assignPriorityLevel(59)).toBe('medium');
    });

    it('should assign low for score < 40', () => {
      expect(assignPriorityLevel(0)).toBe('low');
      expect(assignPriorityLevel(20)).toBe('low');
      expect(assignPriorityLevel(39)).toBe('low');
    });
  });

  describe('Integration: Full Scoring Workflow', () => {
    it('should correctly score a complete realistic scenario', () => {
      const context: PriorityContext = {
        maxMentions: 150,
        totalCompetitors: 5
      };

      // Scenario: Users are churning due to missing SSO feature
      const ssoTheme: ThemeData = {
        theme_id: 'sso-feature',
        theme_name: 'SSO Authentication',
        mention_count: 120,
        avg_sentiment: -0.7,
        first_detected_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        business_impact_keywords: ['churn', 'enterprise', 'blocker', 'deal'],
        urgency_scores: [5, 5, 4, 5, 5],
        competitor_count: 4,
        estimated_effort: 'medium'
      };

      const result = calculatePriorityScore(ssoTheme, context);
      const level = assignPriorityLevel(result.totalScore);

      // Should be high priority (likely critical)
      expect(result.totalScore).toBeGreaterThan(65);
      expect(['critical', 'high']).toContain(level);

      // Frequency should be very high (near max)
      expect(result.breakdown.frequency).toBeGreaterThan(0.9);

      // Sentiment should be high (negative = pain)
      expect(result.breakdown.sentiment).toBeGreaterThan(0.6);

      // Business impact should be high
      expect(result.breakdown.businessImpact).toBeGreaterThan(0.4);

      // Competitive pressure should be high
      expect(result.breakdown.competitive).toBeGreaterThan(0.7);
    });

    it('should correctly score a low-priority wishlist item', () => {
      const context: PriorityContext = {
        maxMentions: 150,
        totalCompetitors: 5
      };

      // Scenario: Nice UI enhancement, few requests
      const uiTheme: ThemeData = {
        theme_id: 'dark-mode',
        theme_name: 'Dark Mode',
        mention_count: 15,
        avg_sentiment: 0.6,
        first_detected_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        business_impact_keywords: [],
        urgency_scores: [2, 3, 2],
        competitor_count: 1,
        estimated_effort: 'high'
      };

      const result = calculatePriorityScore(uiTheme, context);
      const level = assignPriorityLevel(result.totalScore);

      // Should be low priority
      expect(result.totalScore).toBeLessThan(50);
      expect(['low', 'medium']).toContain(level);

      // All factors should be relatively low
      expect(result.breakdown.frequency).toBeLessThan(0.5);
      expect(result.breakdown.sentiment).toBeLessThan(0.5);
      expect(result.breakdown.effort).toBeLessThan(0.5);
    });
  });
});
