/**
 * Unit tests for theme clustering logic
 */

import { mergeAndRankThemes, areThemesSimilar, assignToCluster } from '../clustering';
import {
  mockDetectedThemes,
  mockThemes,
  mockFeedbackItems,
  mockProjectId,
  mockThemeClusters,
} from '@/__tests__/mocks/theme-data';
import type { DetectedTheme, Theme } from '@/types/themes';

describe('Theme Clustering Functions', () => {
  describe('areThemesSimilar', () => {
    it('should identify similar themes by name', () => {
      const theme1: DetectedTheme = {
        theme_name: 'Dark Mode Support',
        description: 'Users want dark mode',
        item_indices: [0],
        confidence: 0.9,
      };
      const theme2: Theme = {
        id: '1',
        project_id: mockProjectId,
        theme_name: 'Dark Mode / Theme Support',
        description: 'Dark theme requests',
        frequency: 5,
        avg_sentiment: 0.5,
        first_seen: '2025-01-01T00:00:00Z',
        last_seen: '2025-01-10T00:00:00Z',
        is_emerging: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-10T00:00:00Z',
      };

      expect(areThemesSimilar(theme1, theme2)).toBe(true);
    });

    it('should identify similar themes by description', () => {
      const theme1: DetectedTheme = {
        theme_name: 'Performance',
        description: 'Slow loading and sluggish performance',
        item_indices: [0],
        confidence: 0.9,
      };
      const theme2: Theme = {
        ...mockThemes[1],
        theme_name: 'Speed Issues',
        description: 'Reports of slow loading times',
      };

      expect(areThemesSimilar(theme1, theme2)).toBe(true);
    });

    it('should not identify dissimilar themes as similar', () => {
      const theme1: DetectedTheme = {
        theme_name: 'Dark Mode',
        description: 'Theme customization',
        item_indices: [0],
        confidence: 0.9,
      };
      const theme2: Theme = {
        ...mockThemes[1],
        theme_name: 'Export Features',
        description: 'CSV and Excel export',
      };

      expect(areThemesSimilar(theme1, theme2)).toBe(false);
    });

    it('should handle empty strings', () => {
      const theme1: DetectedTheme = {
        theme_name: '',
        description: '',
        item_indices: [0],
        confidence: 0.9,
      };
      const theme2: Theme = {
        ...mockThemes[0],
        theme_name: '',
        description: '',
      };

      expect(areThemesSimilar(theme1, theme2)).toBe(false);
    });
  });

  describe('assignToCluster', () => {
    it('should assign feature request themes to Feature Requests cluster', () => {
      const theme: Theme = {
        ...mockThemes[0],
        theme_name: 'New Feature Request',
        description: 'Users want a new feature added',
      };

      const clusterId = assignToCluster(theme, mockThemeClusters);
      const cluster = mockThemeClusters.find(c => c.id === clusterId);
      expect(cluster?.cluster_name).toContain('Feature');
    });

    it('should assign bug themes to Bug Reports cluster', () => {
      const theme: Theme = {
        ...mockThemes[1],
        theme_name: 'Critical Bug',
        description: 'App crashes on startup',
      };

      const clusterId = assignToCluster(theme, mockThemeClusters);
      const cluster = mockThemeClusters.find(c => c.id === clusterId);
      expect(cluster?.cluster_name).toContain('Bug');
    });

    it('should handle themes that do not match any cluster', () => {
      const theme: Theme = {
        ...mockThemes[0],
        theme_name: 'Random Feedback',
        description: 'Just some general thoughts',
      };

      const clusterId = assignToCluster(theme, mockThemeClusters);
      // Should return first cluster as fallback or undefined
      expect(clusterId).toBeDefined();
    });

    it('should handle empty cluster list', () => {
      const theme: Theme = mockThemes[0];
      const clusterId = assignToCluster(theme, []);
      expect(clusterId).toBeUndefined();
    });
  });

  describe('mergeAndRankThemes', () => {
    it('should merge detected themes with existing themes', () => {
      const result = mergeAndRankThemes(
        mockDetectedThemes,
        mockThemes,
        mockFeedbackItems,
        mockProjectId
      );

      expect(result.newThemes).toBeDefined();
      expect(result.updatedThemes).toBeDefined();
      expect(result.newThemes.length + result.updatedThemes.length).toBeGreaterThan(0);
    });

    it('should create new themes for novel detected themes', () => {
      const novelTheme: DetectedTheme = {
        theme_name: 'Completely New Theme',
        description: 'This theme has never been seen before',
        item_indices: [0],
        confidence: 0.9,
      };

      const result = mergeAndRankThemes(
        [novelTheme],
        mockThemes,
        mockFeedbackItems,
        mockProjectId
      );

      expect(result.newThemes.length).toBeGreaterThan(0);
      expect(result.newThemes[0].theme_name).toBe(novelTheme.theme_name);
    });

    it('should update existing themes when similar themes detected', () => {
      const similarTheme: DetectedTheme = {
        theme_name: 'Dark Mode Support',
        description: 'Users requesting dark mode',
        item_indices: [0, 1],
        confidence: 0.95,
      };

      const existingTheme: Theme = {
        ...mockThemes[0],
        theme_name: 'Dark Mode / Theme Support',
        frequency: 10,
      };

      const result = mergeAndRankThemes(
        [similarTheme],
        [existingTheme],
        mockFeedbackItems,
        mockProjectId
      );

      expect(result.updatedThemes.length).toBeGreaterThan(0);
      const updated = result.updatedThemes.find(t =>
        t.theme_name?.includes('Dark Mode')
      );
      expect(updated).toBeDefined();
      expect(updated!.frequency).toBeGreaterThan(existingTheme.frequency);
    });

    it('should calculate sentiment from feedback items', () => {
      const result = mergeAndRankThemes(
        mockDetectedThemes,
        [],
        mockFeedbackItems,
        mockProjectId
      );

      const themesWithSentiment = result.newThemes.filter(
        t => t.avg_sentiment !== undefined
      );
      expect(themesWithSentiment.length).toBeGreaterThan(0);
    });

    it('should deduplicate similar detected themes', () => {
      const duplicateThemes: DetectedTheme[] = [
        {
          theme_name: 'Dark Mode',
          description: 'Dark theme support',
          item_indices: [0],
          confidence: 0.9,
        },
        {
          theme_name: 'Dark Theme',
          description: 'Support for dark mode',
          item_indices: [1],
          confidence: 0.85,
        },
      ];

      const result = mergeAndRankThemes(
        duplicateThemes,
        [],
        mockFeedbackItems,
        mockProjectId
      );

      // Should merge duplicates into one theme
      expect(result.newThemes.length).toBe(1);
      expect(result.newThemes[0].frequency).toBe(2); // Combined frequency
    });

    it('should handle empty detected themes', () => {
      const result = mergeAndRankThemes(
        [],
        mockThemes,
        mockFeedbackItems,
        mockProjectId
      );

      expect(result.newThemes).toEqual([]);
      expect(result.updatedThemes).toEqual([]);
    });

    it('should handle empty existing themes', () => {
      const result = mergeAndRankThemes(
        mockDetectedThemes,
        [],
        mockFeedbackItems,
        mockProjectId
      );

      expect(result.newThemes.length).toBe(mockDetectedThemes.length);
      expect(result.updatedThemes).toEqual([]);
    });

    it('should rank themes by frequency', () => {
      const result = mergeAndRankThemes(
        mockDetectedThemes,
        [],
        mockFeedbackItems,
        mockProjectId
      );

      const allThemes = [...result.newThemes, ...result.updatedThemes];
      for (let i = 0; i < allThemes.length - 1; i++) {
        expect(allThemes[i].frequency! >= allThemes[i + 1].frequency!).toBe(true);
      }
    });

    it('should set first_seen and last_seen dates correctly', () => {
      const result = mergeAndRankThemes(
        mockDetectedThemes,
        [],
        mockFeedbackItems,
        mockProjectId
      );

      result.newThemes.forEach(theme => {
        expect(theme.first_seen).toBeDefined();
        expect(theme.last_seen).toBeDefined();
        expect(new Date(theme.last_seen!).getTime()).toBeGreaterThanOrEqual(
          new Date(theme.first_seen!).getTime()
        );
      });
    });

    it('should preserve existing cluster assignments', () => {
      const existingThemeWithCluster: Theme = {
        ...mockThemes[0],
        cluster_id: 'existing-cluster-id',
      };

      const result = mergeAndRankThemes(
        [mockDetectedThemes[0]],
        [existingThemeWithCluster],
        mockFeedbackItems,
        mockProjectId
      );

      if (result.updatedThemes.length > 0) {
        expect(result.updatedThemes[0].cluster_id).toBe('existing-cluster-id');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle themes with very high confidence', () => {
      const highConfidenceTheme: DetectedTheme = {
        ...mockDetectedThemes[0],
        confidence: 0.99,
      };

      const result = mergeAndRankThemes(
        [highConfidenceTheme],
        [],
        mockFeedbackItems,
        mockProjectId
      );

      expect(result.newThemes.length).toBeGreaterThan(0);
    });

    it('should handle themes with low confidence', () => {
      const lowConfidenceTheme: DetectedTheme = {
        ...mockDetectedThemes[0],
        confidence: 0.5,
      };

      const result = mergeAndRankThemes(
        [lowConfidenceTheme],
        [],
        mockFeedbackItems,
        mockProjectId
      );

      // Low confidence themes should still be processed
      expect(result.newThemes.length).toBeGreaterThan(0);
    });

    it('should handle themes with many feedback items', () => {
      const manyItemsTheme: DetectedTheme = {
        theme_name: 'Popular Theme',
        description: 'Very popular theme',
        item_indices: Array.from({ length: 50 }, (_, i) => i),
        confidence: 0.9,
      };

      const largeFeedback = Array.from({ length: 50 }, (_, i) => ({
        ...mockFeedbackItems[0],
        id: `f${i}`,
      }));

      const result = mergeAndRankThemes(
        [manyItemsTheme],
        [],
        largeFeedback,
        mockProjectId
      );

      expect(result.newThemes[0].frequency).toBe(50);
    });
  });
});
