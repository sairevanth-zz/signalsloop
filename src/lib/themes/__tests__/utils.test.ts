/**
 * Unit tests for theme utility functions
 */

import {
  getThemeSentimentLabel,
  getThemeSentimentColor,
  getThemeStatusBadge,
  formatThemeDate,
  filterThemesBySentiment,
  sortThemes,
  isEmergingTheme,
  calculateThemeGrowth,
  getRepresentativeFeedback,
  exportThemesToCSV,
  groupThemesByCluster,
  formatThemeGrowth,
  getThemePriority,
  calculateThemeScore,
} from '../utils';
import { mockThemes, mockFeedbackItems, mockThemeClusters } from '@/__tests__/mocks/theme-data';
import type { Theme } from '@/types/themes';

describe('Theme Utility Functions', () => {
  describe('getThemeSentimentLabel', () => {
    it('should return correct labels for sentiment ranges', () => {
      expect(getThemeSentimentLabel(0.8)).toContain('Positive');
      expect(getThemeSentimentLabel(0.3)).toContain('Positive');
      expect(getThemeSentimentLabel(0)).toContain('Neutral');
      expect(getThemeSentimentLabel(-0.5)).toContain('Negative');
    });
  });

  describe('getThemeSentimentColor', () => {
    it('should return appropriate colors for sentiment', () => {
      const positiveColor = getThemeSentimentColor(0.7);
      const negativeColor = getThemeSentimentColor(-0.7);
      const neutralColor = getThemeSentimentColor(0);

      expect(positiveColor).toBeDefined();
      expect(negativeColor).toBeDefined();
      expect(neutralColor).toBeDefined();
    });
  });

  describe('getThemeStatusBadge', () => {
    it('should return emerging badge for emerging themes', () => {
      const emergingTheme: Theme = { ...mockThemes[1], is_emerging: true };
      const badge = getThemeStatusBadge(emergingTheme);
      expect(badge.label).toBe('Emerging');
      expect(badge.color).toBeDefined();
    });

    it('should return appropriate badge for non-emerging themes', () => {
      const normalTheme: Theme = {
        ...mockThemes[0],
        is_emerging: false,
        last_seen: new Date().toISOString(),
      };
      const badge = getThemeStatusBadge(normalTheme);
      expect(badge.label).toBeDefined();
      expect(badge.color).toBeDefined();
    });
  });

  describe('formatThemeDate', () => {
    it('should format dates correctly', () => {
      const today = new Date();
      const result = formatThemeDate(today.toISOString());
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle old dates', () => {
      const oldDate = '2024-01-01T00:00:00Z';
      const result = formatThemeDate(oldDate);
      expect(result).toBeDefined();
    });
  });

  describe('filterThemesBySentiment', () => {
    it('should filter positive themes', () => {
      const filtered = filterThemesBySentiment(mockThemes, 'positive');
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should filter negative themes', () => {
      const filtered = filterThemesBySentiment(mockThemes, 'negative');
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should return all themes when filter is "all"', () => {
      const filtered = filterThemesBySentiment(mockThemes, 'all');
      expect(filtered.length).toBe(mockThemes.length);
    });
  });

  describe('sortThemes', () => {
    it('should sort themes by frequency', () => {
      const sorted = sortThemes([...mockThemes], 'frequency', 'desc');
      expect(sorted.length).toBe(mockThemes.length);
      // Check descending order
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].frequency).toBeGreaterThanOrEqual(sorted[i + 1].frequency);
      }
    });

    it('should sort themes by sentiment', () => {
      const sorted = sortThemes([...mockThemes], 'sentiment', 'desc');
      expect(sorted.length).toBe(mockThemes.length);
    });

    it('should sort themes by date', () => {
      const sorted = sortThemes([...mockThemes], 'date', 'desc');
      expect(sorted.length).toBe(mockThemes.length);
    });

    it('should handle empty array', () => {
      const sorted = sortThemes([], 'frequency', 'desc');
      expect(sorted).toEqual([]);
    });
  });

  describe('isEmergingTheme', () => {
    it('should return is_emerging property value', () => {
      const emergingTheme = { ...mockThemes[0], is_emerging: true };
      const normalTheme = { ...mockThemes[0], is_emerging: false };

      expect(isEmergingTheme(emergingTheme)).toBe(true);
      expect(isEmergingTheme(normalTheme)).toBe(false);
    });
  });

  describe('calculateThemeGrowth', () => {
    it('should calculate growth correctly', () => {
      const currentTheme: Theme = { ...mockThemes[0], frequency: 20 };
      const previousTheme: Theme = { ...mockThemes[0], frequency: 10 };

      const growth = calculateThemeGrowth(currentTheme, previousTheme);
      expect(growth).toBe(100); // 100% growth
    });

    it('should handle null previous period', () => {
      const theme: Theme = { ...mockThemes[0], frequency: 10 };
      const growth = calculateThemeGrowth(theme, null);
      expect(growth).toBe(100);
    });

    it('should handle zero previous frequency', () => {
      const currentTheme: Theme = { ...mockThemes[0], frequency: 10 };
      const previousTheme: Theme = { ...mockThemes[0], frequency: 0 };

      const growth = calculateThemeGrowth(currentTheme, previousTheme);
      expect(growth).toBe(100);
    });
  });

  describe('getRepresentativeFeedback', () => {
    it('should return feedback items', () => {
      const result = getRepresentativeFeedback(mockThemes[0], mockFeedbackItems, 3);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should respect limit parameter', () => {
      const result = getRepresentativeFeedback(mockThemes[0], mockFeedbackItems, 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('exportThemesToCSV', () => {
    it('should generate valid CSV format', () => {
      const csv = exportThemesToCSV(mockThemes);
      expect(csv).toContain('Theme Name');
      expect(csv).toContain(mockThemes[0].theme_name);
    });

    it('should handle empty themes array', () => {
      const csv = exportThemesToCSV([]);
      expect(csv).toContain('Theme Name');
    });

    it('should include all themes', () => {
      const csv = exportThemesToCSV(mockThemes);
      mockThemes.forEach(theme => {
        expect(csv).toContain(theme.theme_name);
      });
    });
  });

  describe('groupThemesByCluster', () => {
    it('should group themes by cluster', () => {
      const grouped = groupThemesByCluster(mockThemes, mockThemeClusters);
      expect(grouped).toBeDefined();
      expect(grouped instanceof Map).toBe(true);
    });

    it('should handle empty arrays', () => {
      const grouped = groupThemesByCluster([], []);
      expect(grouped instanceof Map).toBe(true);
    });
  });

  describe('formatThemeGrowth', () => {
    it('should format positive growth', () => {
      const formatted = formatThemeGrowth(50);
      expect(formatted).toContain('50');
      expect(formatted).toContain('%');
    });

    it('should format negative growth', () => {
      const formatted = formatThemeGrowth(-25);
      expect(formatted).toContain('25');
      expect(formatted).toContain('%');
    });

    it('should handle zero growth', () => {
      const formatted = formatThemeGrowth(0);
      expect(formatted).toBeDefined();
    });
  });

  describe('getThemePriority', () => {
    it('should return priority level', () => {
      const priority = getThemePriority(mockThemes[0]);
      expect(['high', 'medium', 'low']).toContain(priority);
    });

    it('should prioritize high frequency themes', () => {
      const highFreqTheme: Theme = { ...mockThemes[0], frequency: 100 };
      const priority = getThemePriority(highFreqTheme);
      expect(['high', 'medium']).toContain(priority);
    });
  });

  describe('calculateThemeScore', () => {
    it('should calculate a numeric score', () => {
      const score = calculateThemeScore(mockThemes[0]);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should return higher scores for higher frequency', () => {
      const lowFreqTheme: Theme = { ...mockThemes[0], frequency: 5 };
      const highFreqTheme: Theme = { ...mockThemes[0], frequency: 50 };

      const lowScore = calculateThemeScore(lowFreqTheme);
      const highScore = calculateThemeScore(highFreqTheme);

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });
});
