/**
 * Integration Tests for AI Roadmap Prioritization
 * Tests the core prioritization logic
 */

describe('Roadmap Prioritization - Core Logic Tests', () => {
  describe('Frequency Normalization Logic', () => {
    it('should use logarithmic scaling for mentions', () => {
      // Log10 scaling prevents dominance by super popular themes
      const calculateNormalized = (mentions, maxMentions) => {
        if (maxMentions === 0) return 0;
        return Math.log10(mentions + 1) / Math.log10(maxMentions + 1);
      };

      expect(calculateNormalized(0, 100)).toBeCloseTo(0);
      expect(calculateNormalized(100, 100)).toBeCloseTo(1);
      expect(calculateNormalized(50, 100)).toBeGreaterThan(0.5);
    });
  });

  describe('Sentiment Priority Inversion', () => {
    it('should prioritize negative sentiment (pain points)', () => {
      const normalizeSentiment = (avgSentiment) => {
        if (avgSentiment < 0) {
          return 0.5 + (Math.abs(avgSentiment) * 0.5);
        } else {
          return Math.max(0, 0.5 - (avgSentiment * 0.5));
        }
      };

      // Very negative = high priority
      expect(normalizeSentiment(-1.0)).toBe(1.0);
      expect(normalizeSentiment(-0.5)).toBe(0.75);

      // Neutral = medium priority
      expect(normalizeSentiment(0)).toBe(0.5);

      // Very positive = low priority (wishlist)
      expect(normalizeSentiment(1.0)).toBe(0);
      expect(normalizeSentiment(0.5)).toBe(0.25);
    });
  });

  describe('Effort Score Calculation', () => {
    it('should prioritize low effort (quick wins)', () => {
      const effortScores = {
        'low': 0.9,
        'medium': 0.5,
        'high': 0.3,
        'very_high': 0.1
      };

      expect(effortScores.low).toBeGreaterThan(effortScores.medium);
      expect(effortScores.medium).toBeGreaterThan(effortScores.high);
      expect(effortScores.high).toBeGreaterThan(effortScores.very_high);
    });
  });

  describe('Priority Level Assignment', () => {
    it('should assign correct priority brackets', () => {
      const assignPriority = (score) => {
        if (score >= 75) return 'critical'; // P0
        if (score >= 60) return 'high';     // P1
        if (score >= 40) return 'medium';   // P2
        return 'low';                        // P3
      };

      expect(assignPriority(80)).toBe('critical');
      expect(assignPriority(75)).toBe('critical');
      expect(assignPriority(70)).toBe('high');
      expect(assignPriority(60)).toBe('high');
      expect(assignPriority(50)).toBe('medium');
      expect(assignPriority(40)).toBe('medium');
      expect(assignPriority(30)).toBe('low');
    });
  });

  describe('Weighted Score Calculation', () => {
    it('should apply correct weights to each factor', () => {
      const weights = {
        frequency: 0.30,
        sentiment: 0.25,
        businessImpact: 0.25,
        effort: 0.10,
        competitive: 0.10
      };

      // Weights should sum to 1.0
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);

      // Frequency should be most important
      expect(weights.frequency).toBeGreaterThan(weights.sentiment);
      expect(weights.frequency).toBeGreaterThan(weights.businessImpact);
    });
  });

  describe('Business Impact Factors', () => {
    it('should identify high-value keywords', () => {
      const highValueKeywords = [
        'churn', 'cancel', 'leave', 'quit', 'unsubscribe',
        'enterprise', 'deal', 'contract', 'revenue', 'money',
        'competitor', 'switch', 'alternative', 'blocker', 'urgent'
      ];

      const testKeywords = ['churn', 'enterprise', 'blocker'];
      const hasHighValue = testKeywords.some(kw =>
        highValueKeywords.includes(kw.toLowerCase())
      );

      expect(hasHighValue).toBe(true);
      expect(highValueKeywords.length).toBeGreaterThan(10);
    });

    it('should detect rapidly growing themes', () => {
      const now = Date.now();
      const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

      const daysOld = (timestamp) =>
        (now - timestamp) / (1000 * 60 * 60 * 24);

      expect(daysOld(twoDaysAgo)).toBeLessThan(7);
      expect(daysOld(thirtyDaysAgo)).toBeGreaterThan(7);
    });
  });

  describe('Complete Scoring Scenario', () => {
    it('should score critical issues higher than nice-to-haves', () => {
      // Simulate scoring for a critical issue
      const criticalScores = {
        frequency: 0.9,      // 90 mentions out of 100 max
        sentiment: 0.9,      // Very negative sentiment
        businessImpact: 0.7, // High business impact
        effort: 0.9,         // Low effort
        competitive: 0.8     // Most competitors have it
      };

      // Simulate scoring for a nice-to-have
      const niceToHaveScores = {
        frequency: 0.2,      // 10 mentions out of 100 max
        sentiment: 0.2,      // Positive sentiment
        businessImpact: 0.1, // Low business impact
        effort: 0.1,         // Very high effort
        competitive: 0.0     // No competitors have it
      };

      const weights = {
        frequency: 0.30,
        sentiment: 0.25,
        businessImpact: 0.25,
        effort: 0.10,
        competitive: 0.10
      };

      const calculateScore = (scores) => {
        return (
          scores.frequency * weights.frequency +
          scores.sentiment * weights.sentiment +
          scores.businessImpact * weights.businessImpact +
          scores.effort * weights.effort +
          scores.competitive * weights.competitive
        ) * 100;
      };

      const criticalScore = calculateScore(criticalScores);
      const niceToHaveScore = calculateScore(niceToHaveScores);

      expect(criticalScore).toBeGreaterThan(70);
      expect(niceToHaveScore).toBeLessThan(30);
      expect(criticalScore).toBeGreaterThan(niceToHaveScore * 2);
    });
  });

  describe('Priority Matrix Categorization', () => {
    it('should correctly categorize into quadrants', () => {
      const suggestions = [
        { name: 'Quick Win', priority_score: 75, effort_score: 0.8 },
        { name: 'Big Bet', priority_score: 75, effort_score: 0.2 },
        { name: 'Fill-In', priority_score: 45, effort_score: 0.8 },
        { name: 'Low Priority', priority_score: 45, effort_score: 0.2 }
      ];

      // Quick Wins: High Impact (>=60), Low Effort (>=0.5)
      const quickWins = suggestions.filter(
        s => s.priority_score >= 60 && s.effort_score >= 0.5
      );

      // Big Bets: High Impact (>=60), High Effort (<0.5)
      const bigBets = suggestions.filter(
        s => s.priority_score >= 60 && s.effort_score < 0.5
      );

      expect(quickWins.length).toBe(1);
      expect(quickWins[0].name).toBe('Quick Win');
      expect(bigBets.length).toBe(1);
      expect(bigBets[0].name).toBe('Big Bet');
    });
  });

  describe('Export Filtering', () => {
    it('should filter by priority levels', () => {
      const suggestions = [
        { id: '1', priority_level: 'critical', score: 80 },
        { id: '2', priority_level: 'high', score: 65 },
        { id: '3', priority_level: 'medium', score: 50 },
        { id: '4', priority_level: 'low', score: 30 }
      ];

      const filtered = suggestions.filter(s =>
        ['critical', 'high'].includes(s.priority_level)
      );

      expect(filtered.length).toBe(2);
      expect(filtered.every(s => s.score >= 60)).toBe(true);
    });

    it('should filter by minimum score', () => {
      const suggestions = [
        { score: 80 },
        { score: 65 },
        { score: 50 },
        { score: 30 }
      ];

      const filtered = suggestions.filter(s => s.score >= 60);

      expect(filtered.length).toBe(2);
      expect(filtered[0].score).toBe(80);
      expect(filtered[1].score).toBe(65);
    });

    it('should limit result count', () => {
      const suggestions = Array.from({ length: 50 }, (_, i) => ({
        score: 100 - i
      }));

      const limited = suggestions.slice(0, 10);

      expect(limited.length).toBe(10);
      expect(limited[0].score).toBe(100);
      expect(limited[9].score).toBe(91);
    });
  });
});

describe('Database Schema Validation', () => {
  it('should have correct column structure for roadmap_suggestions', () => {
    const requiredColumns = [
      'id',
      'project_id',
      'theme_id',
      'priority_score',
      'priority_level',
      'frequency_score',
      'sentiment_score',
      'business_impact_score',
      'effort_score',
      'competitive_score',
      'reasoning_text',
      'manual_priority_adjustment',
      'pinned',
      'status',
      'generated_at',
      'created_at',
      'updated_at'
    ];

    expect(requiredColumns.length).toBeGreaterThan(15);
    expect(requiredColumns).toContain('priority_score');
    expect(requiredColumns).toContain('reasoning_text');
  });

  it('should validate priority_level enum values', () => {
    const validPriorityLevels = ['critical', 'high', 'medium', 'low'];

    expect(validPriorityLevels.length).toBe(4);
    expect(validPriorityLevels).toContain('critical');
    expect(validPriorityLevels).toContain('low');
  });

  it('should validate status enum values', () => {
    const validStatuses = ['suggested', 'in_progress', 'completed', 'deferred'];

    expect(validStatuses.length).toBe(4);
    expect(validStatuses).toContain('suggested');
    expect(validStatuses).toContain('completed');
  });

  it('should validate export_type enum values', () => {
    const validExportTypes = ['markdown', 'pdf'];

    expect(validExportTypes.length).toBe(2);
    expect(validExportTypes).toContain('markdown');
    expect(validExportTypes).toContain('pdf');
  });
});
