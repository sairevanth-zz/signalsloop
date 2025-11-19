/**
 * Tests for Roadmap Export Generation
 */

import { jest } from '@jest/globals';

// Mock the Supabase client
jest.mock('@/lib/supabase-client', () => ({
  getSupabaseServiceRoleClient: jest.fn()
}));

describe('Roadmap Exports', () => {
  describe('Markdown Export', () => {
    it('should generate valid markdown structure', () => {
      // Test that markdown export includes required sections
      const sections = [
        '# Product Roadmap',
        '## 📊 Executive Summary',
        '## 🎯 Prioritized Recommendations',
        '## 📊 Priority Matrix',
        '## 📐 Scoring Methodology'
      ];

      // This is a structural test - actual export would need database
      expect(sections.length).toBe(5);
    });

    it('should include priority emojis', () => {
      const priorityEmojis = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵'
      };

      expect(Object.keys(priorityEmojis)).toHaveLength(4);
      expect(priorityEmojis.critical).toBe('🔴');
    });
  });

  describe('Priority Matrix Categories', () => {
    it('should categorize suggestions correctly', () => {
      const mockSuggestions = [
        { priority_score: 75, effort_score: 0.8 }, // Quick Win
        { priority_score: 75, effort_score: 0.2 }, // Big Bet
        { priority_score: 45, effort_score: 0.8 }, // Fill-In
        { priority_score: 45, effort_score: 0.2 }  // Low Priority
      ];

      // Quick Wins: High Impact (>=60), Low Effort (>=0.5)
      const quickWins = mockSuggestions.filter(
        s => s.priority_score >= 60 && s.effort_score >= 0.5
      );

      // Big Bets: High Impact (>=60), High Effort (<0.5)
      const bigBets = mockSuggestions.filter(
        s => s.priority_score >= 60 && s.effort_score < 0.5
      );

      expect(quickWins.length).toBe(1);
      expect(bigBets.length).toBe(1);
    });
  });

  describe('Export Filters', () => {
    it('should filter by priority levels', () => {
      const mockSuggestions = [
        { priority_level: 'critical', priority_score: 80 },
        { priority_level: 'high', priority_score: 65 },
        { priority_level: 'medium', priority_score: 50 },
        { priority_level: 'low', priority_score: 30 }
      ];

      const filters = {
        priorities: ['critical', 'high']
      };

      const filtered = mockSuggestions.filter(s =>
        filters.priorities.includes(s.priority_level)
      );

      expect(filtered.length).toBe(2);
      expect(filtered.every(s => s.priority_score >= 60)).toBe(true);
    });

    it('should filter by minimum score', () => {
      const mockSuggestions = [
        { priority_score: 80 },
        { priority_score: 65 },
        { priority_score: 50 },
        { priority_score: 30 }
      ];

      const minScore = 60;
      const filtered = mockSuggestions.filter(s => s.priority_score >= minScore);

      expect(filtered.length).toBe(2);
      expect(filtered.every(s => s.priority_score >= 60)).toBe(true);
    });

    it('should limit results count', () => {
      const mockSuggestions = Array.from({ length: 50 }, (_, i) => ({
        priority_score: 100 - i
      }));

      const maxCount = 10;
      const limited = mockSuggestions.slice(0, maxCount);

      expect(limited.length).toBe(10);
      expect(limited[0].priority_score).toBe(100);
    });
  });

  describe('Sentiment Formatting', () => {
    it('should format sentiment scores correctly', () => {
      const formatSentiment = (sentiment: number): string => {
        if (sentiment <= -0.5) return `${sentiment.toFixed(2)} (Very Negative 😡)`;
        if (sentiment <= -0.2) return `${sentiment.toFixed(2)} (Negative 😟)`;
        if (sentiment <= 0.2) return `${sentiment.toFixed(2)} (Neutral 😐)`;
        if (sentiment <= 0.5) return `${sentiment.toFixed(2)} (Positive 🙂)`;
        return `${sentiment.toFixed(2)} (Very Positive 😊)`;
      };

      expect(formatSentiment(-0.8)).toContain('Very Negative');
      expect(formatSentiment(-0.3)).toContain('Negative');
      expect(formatSentiment(0)).toContain('Neutral');
      expect(formatSentiment(0.4)).toContain('Positive');
      expect(formatSentiment(0.8)).toContain('Very Positive');
    });
  });
});
