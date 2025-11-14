/**
 * Unit tests for theme utility functions
 */

import {
  getThemeColorScheme,
  getThemeSentimentLabel,
  getThemeSentimentColor,
  getThemeStatusBadge,
  formatThemeDate,
  filterThemesBySentiment,
  sortThemesByFrequency,
  sortThemesByRecency,
  sortThemesBySentiment,
  isEmergingTheme,
  calculateThemeGrowth,
  getRepresentativeFeedback,
  exportThemesToCSV,
  groupThemesByCluster,
} from '../utils';
import { mockThemes, mockFeedbackItems, mockThemeClusters } from '@/__tests__/mocks/theme-data';
import type { Theme } from '@/types/themes';

describe('Theme Utility Functions', () => {
  describe('getThemeColorScheme', () => {
    it('should return green scheme for positive sentiment', () => {
      const scheme = getThemeColorScheme(0.7);
      expect(scheme.bg).toContain('green');
      expect(scheme.border).toContain('green');
      expect(scheme.text).toContain('green');
    });

    it('should return red scheme for negative sentiment', () => {
      const scheme = getThemeColorScheme(-0.7);
      expect(scheme.bg).toContain('red');
      expect(scheme.border).toContain('red');
      expect(scheme.text).toContain('red');
    });

    it('should return gray scheme for neutral sentiment', () => {
      const scheme = getThemeColorScheme(0.1);
      expect(scheme.bg).toContain('gray');
      expect(scheme.border).toContain('gray');
      expect(scheme.text).toContain('gray');
    });

    it('should handle edge cases', () => {
      expect(getThemeColorScheme(0.3)).toBeDefined();
      expect(getThemeColorScheme(-0.3)).toBeDefined();
      expect(getThemeColorScheme(0)).toBeDefined();
    });
  });

  describe('getThemeSentimentLabel', () => {
    it('should return correct labels for sentiment ranges', () => {
      expect(getThemeSentimentLabel(0.8)).toBe('Very Positive');
      expect(getThemeSentimentLabel(0.5)).toBe('Positive');
      expect(getThemeSentimentLabel(0.1)).toBe('Neutral');
      expect(getThemeSentimentLabel(-0.5)).toBe('Negative');
      expect(getThemeSentimentLabel(-0.8)).toBe('Very Negative');
    });

    it('should handle boundary values', () => {
      expect(getThemeSentimentLabel(0.7)).toBe('Very Positive');
      expect(getThemeSentimentLabel(-0.7)).toBe('Very Negative');
      expect(getThemeSentimentLabel(0.3)).toBe('Positive');
      expect(getThemeSentimentLabel(-0.3)).toBe('Negative');
    });
  });

  describe('getThemeStatusBadge', () => {
    it('should return emerging badge for emerging themes', () => {
      const emergingTheme: Theme = { ...mockThemes[1], is_emerging: true };
      const badge = getThemeStatusBadge(emergingTheme);
      expect(badge.label).toBe('Emerging');
      expect(badge.color).toContain('orange');
    });

    it('should return active badge for recent themes', () => {
      const recentTheme: Theme = {
        ...mockThemes[0],
        is_emerging: false,
        last_seen: new Date().toISOString(),
      };
      const badge = getThemeStatusBadge(recentTheme);
      expect(badge.label).toBe('Active');
      expect(badge.color).toContain('green');
    });

    it('should return declining badge for old themes', () => {
      const oldTheme: Theme = {
        ...mockThemes[0],
        is_emerging: false,
        last_seen: '2024-01-01T00:00:00Z',
      };
      const badge = getThemeStatusBadge(oldTheme);
      expect(badge.label).toBe('Declining');
      expect(badge.color).toContain('gray');
    });
  });

  describe('formatThemeDate', () => {
    it('should format dates as relative time for recent dates', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      expect(formatThemeDate(today.toISOString())).toBe('Today');
      expect(formatThemeDate(yesterday.toISOString())).toContain('day');
    });

    it('should format old dates as absolute dates', () => {
      const oldDate = '2024-01-01T00:00:00Z';
      const formatted = formatThemeDate(oldDate);
      expect(formatted).toContain('2024');
    });
  });

  describe('filterThemesBySentiment', () => {
    it('should filter positive themes', () => {
      const filtered = filterThemesBySentiment(mockThemes, 'positive');
      expect(filtered.every(t => t.avg_sentiment > 0.3)).toBe(true);
    });

    it('should filter negative themes', () => {
      const filtered = filterThemesBySentiment(mockThemes, 'negative');
      expect(filtered.every(t => t.avg_sentiment < -0.3)).toBe(true);
    });

    it('should filter neutral themes', () => {
      const filtered = filterThemesBySentiment(mockThemes, 'neutral');
      expect(filtered.every(t => t.avg_sentiment >= -0.3 && t.avg_sentiment <= 0.3)).toBe(true);
    });

    it('should return all themes when filter is "all"', () => {
      const filtered = filterThemesBySentiment(mockThemes, 'all');
      expect(filtered).toEqual(mockThemes);
    });
  });

  describe('sortThemesByFrequency', () => {
    it('should sort themes by frequency descending', () => {
      const sorted = sortThemesByFrequency([...mockThemes]);
      expect(sorted[0].frequency).toBeGreaterThanOrEqual(sorted[1].frequency);
      expect(sorted[1].frequency).toBeGreaterThanOrEqual(sorted[2].frequency);
    });

    it('should handle empty array', () => {
      expect(sortThemesByFrequency([])).toEqual([]);
    });

    it('should handle single theme', () => {
      expect(sortThemesByFrequency([mockThemes[0]])).toEqual([mockThemes[0]]);
    });
  });

  describe('sortThemesByRecency', () => {
    it('should sort themes by last_seen date descending', () => {
      const sorted = sortThemesByRecency([...mockThemes]);
      const dates = sorted.map(t => new Date(t.last_seen).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
      expect(dates[1]).toBeGreaterThanOrEqual(dates[2]);
    });
  });

  describe('sortThemesBySentiment', () => {
    it('should sort themes by sentiment descending', () => {
      const sorted = sortThemesBySentiment([...mockThemes]);
      expect(sorted[0].avg_sentiment).toBeGreaterThanOrEqual(sorted[1].avg_sentiment);
      expect(sorted[1].avg_sentiment).toBeGreaterThanOrEqual(sorted[2].avg_sentiment);
    });
  });

  describe('isEmergingTheme', () => {
    it('should identify emerging themes with high growth', () => {
      const theme: Theme = {
        ...mockThemes[0],
        frequency: 20,
        first_seen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      };
      const previousCount = 5; // 300% growth
      expect(isEmergingTheme(theme, previousCount)).toBe(true);
    });

    it('should not identify slow-growing themes as emerging', () => {
      const theme: Theme = {
        ...mockThemes[0],
        frequency: 11,
        first_seen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const previousCount = 10; // 10% growth
      expect(isEmergingTheme(theme, previousCount)).toBe(false);
    });

    it('should not identify old themes as emerging', () => {
      const theme: Theme = {
        ...mockThemes[0],
        frequency: 20,
        first_seen: '2023-01-01T00:00:00Z',
      };
      const previousCount = 5;
      expect(isEmergingTheme(theme, previousCount)).toBe(false);
    });
  });

  describe('calculateThemeGrowth', () => {
    it('should calculate growth rate correctly', () => {
      const theme: Theme = { ...mockThemes[0], frequency: 20 };
      const growth = calculateThemeGrowth(theme, 10);
      expect(growth.rate).toBe(1.0); // 100% growth
      expect(growth.label).toContain('100%');
    });

    it('should handle new themes (no previous count)', () => {
      const theme: Theme = { ...mockThemes[0], frequency: 10 };
      const growth = calculateThemeGrowth(theme, 0);
      expect(growth.rate).toBeGreaterThan(0);
      expect(growth.label).toContain('New');
    });

    it('should handle negative growth', () => {
      const theme: Theme = { ...mockThemes[0], frequency: 5 };
      const growth = calculateThemeGrowth(theme, 10);
      expect(growth.rate).toBe(-0.5); // -50% growth
      expect(growth.label).toContain('-50%');
    });
  });

  describe('getRepresentativeFeedback', () => {
    it('should return feedback items for a theme', () => {
      const representative = getRepresentativeFeedback(
        mockThemes[0],
        mockFeedbackItems,
        [0, 1] // item indices
      );
      expect(representative).toHaveLength(2);
      expect(representative[0]).toEqual(mockFeedbackItems[0]);
      expect(representative[1]).toEqual(mockFeedbackItems[1]);
    });

    it('should handle invalid indices', () => {
      const representative = getRepresentativeFeedback(
        mockThemes[0],
        mockFeedbackItems,
        [999] // out of bounds
      );
      expect(representative).toHaveLength(0);
    });

    it('should limit results', () => {
      const representative = getRepresentativeFeedback(
        mockThemes[0],
        mockFeedbackItems,
        [0, 1, 2, 3, 4, 5, 6],
        3
      );
      expect(representative).toHaveLength(3);
    });
  });

  describe('exportThemesToCSV', () => {
    it('should generate valid CSV format', () => {
      const csv = exportThemesToCSV(mockThemes);
      expect(csv).toContain('Theme Name,Description,Frequency');
      expect(csv).toContain(mockThemes[0].theme_name);
      expect(csv).toContain(mockThemes[0].frequency.toString());
    });

    it('should handle empty themes array', () => {
      const csv = exportThemesToCSV([]);
      expect(csv).toContain('Theme Name,Description,Frequency');
      expect(csv.split('\n')).toHaveLength(2); // Header + empty line
    });

    it('should escape commas in descriptions', () => {
      const themeWithComma: Theme = {
        ...mockThemes[0],
        description: 'Test, with, commas',
      };
      const csv = exportThemesToCSV([themeWithComma]);
      expect(csv).toContain('"Test, with, commas"');
    });
  });

  describe('groupThemesByCluster', () => {
    it('should group themes by cluster', () => {
      const grouped = groupThemesByCluster(mockThemes, mockThemeClusters);
      expect(grouped.size).toBeGreaterThan(0);

      // Check that themes are properly grouped
      const clusterThemes = grouped.get(mockThemes[0].cluster_id!);
      expect(clusterThemes).toBeDefined();
      expect(clusterThemes!.some(t => t.id === mockThemes[0].id)).toBe(true);
    });

    it('should handle themes without clusters', () => {
      const themesWithoutCluster = mockThemes.map(t => ({ ...t, cluster_id: undefined }));
      const grouped = groupThemesByCluster(themesWithoutCluster, mockThemeClusters);
      expect(grouped.has('uncategorized')).toBe(true);
    });

    it('should handle empty arrays', () => {
      const grouped = groupThemesByCluster([], []);
      expect(grouped.size).toBe(0);
    });
  });
});
