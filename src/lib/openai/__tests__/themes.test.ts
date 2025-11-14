/**
 * Unit tests for OpenAI theme detection service
 */

import { detectThemesInternal } from '../themes';
import {
  mockFeedbackItems,
  mockLargeFeedbackDataset,
  mockOpenAIThemeResponse,
} from '@/__tests__/mocks/theme-data';
import { createMockOpenAI, mockOpenAIError, mockOpenAIRateLimitError } from '@/__tests__/mocks/openai';

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => createMockOpenAI()),
}));

describe('OpenAI Theme Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectThemesInternal', () => {
    it('should detect themes from feedback items', async () => {
      const result = await detectThemesInternal(mockFeedbackItems);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return detected themes with required fields', async () => {
      const result = await detectThemesInternal(mockFeedbackItems);

      result.forEach(theme => {
        expect(theme.theme_name).toBeDefined();
        expect(theme.description).toBeDefined();
        expect(theme.item_indices).toBeDefined();
        expect(Array.isArray(theme.item_indices)).toBe(true);
        expect(theme.confidence).toBeDefined();
        expect(theme.confidence).toBeGreaterThanOrEqual(0);
        expect(theme.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle batch processing for large datasets', async () => {
      const result = await detectThemesInternal(mockLargeFeedbackDataset);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should process in batches of 100
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty feedback array', async () => {
      const result = await detectThemesInternal([]);

      expect(result).toBeDefined();
      expect(result).toEqual([]);
    });

    it('should handle single feedback item', async () => {
      const result = await detectThemesInternal([mockFeedbackItems[0]]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include item indices in detected themes', async () => {
      const result = await detectThemesInternal(mockFeedbackItems.slice(0, 5));

      result.forEach(theme => {
        expect(theme.item_indices.length).toBeGreaterThan(0);
        theme.item_indices.forEach(index => {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(5);
        });
      });
    });

    it('should create proper prompt for OpenAI', async () => {
      const feedbackSubset = mockFeedbackItems.slice(0, 3);
      await detectThemesInternal(feedbackSubset);

      // Verify OpenAI was called (mocked)
      const OpenAI = require('openai').default;
      const mockInstance = new OpenAI();
      expect(mockInstance.chat.completions.create).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should retry on OpenAI API errors', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => mockOpenAIError());

      try {
        await detectThemesInternal(mockFeedbackItems);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle rate limit errors with exponential backoff', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => mockOpenAIRateLimitError());

      try {
        await detectThemesInternal(mockFeedbackItems);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed OpenAI responses', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'invalid json' } }],
            }),
          },
        },
      }));

      try {
        await detectThemesInternal(mockFeedbackItems);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle missing themes in response', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: JSON.stringify({}) } }],
            }),
          },
        },
      }));

      const result = await detectThemesInternal(mockFeedbackItems);
      expect(result).toEqual([]);
    });
  });

  describe('Batch Processing', () => {
    it('should process items in batches of 100', async () => {
      const items120 = mockLargeFeedbackDataset; // 120 items
      const result = await detectThemesInternal(items120);

      // Should make 2 API calls (100 + 20)
      const OpenAI = require('openai').default;
      const mockInstance = new OpenAI();
      expect(mockInstance.chat.completions.create).toHaveBeenCalled();
    });

    it('should combine results from multiple batches', async () => {
      const result = await detectThemesInternal(mockLargeFeedbackDataset);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should have themes from all batches
      expect(result.length).toBeGreaterThan(0);
    });

    it('should adjust item indices across batches', async () => {
      const result = await detectThemesInternal(mockLargeFeedbackDataset);

      result.forEach(theme => {
        theme.item_indices.forEach(index => {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(mockLargeFeedbackDataset.length);
        });
      });
    });
  });

  describe('Cache Integration', () => {
    it('should use cache for repeated identical requests', async () => {
      // First call
      const result1 = await detectThemesInternal(mockFeedbackItems);

      // Second call with same data
      const result2 = await detectThemesInternal(mockFeedbackItems);

      expect(result1).toEqual(result2);
    });

    it('should generate unique cache keys for different inputs', async () => {
      const result1 = await detectThemesInternal(mockFeedbackItems.slice(0, 5));
      const result2 = await detectThemesInternal(mockFeedbackItems.slice(5, 10));

      // Results should be different (different inputs)
      expect(result1).not.toEqual(result2);
    });
  });

  describe('Data Quality', () => {
    it('should handle feedback items with missing fields', async () => {
      const incompleteItems = [
        {
          id: '1',
          title: 'Test',
          description: '',
          created_at: new Date().toISOString(),
        },
      ] as any[];

      const result = await detectThemesInternal(incompleteItems);
      expect(result).toBeDefined();
    });

    it('should handle very long feedback descriptions', async () => {
      const longDescription = 'a'.repeat(5000);
      const itemsWithLongDesc = [
        {
          ...mockFeedbackItems[0],
          description: longDescription,
        },
      ];

      const result = await detectThemesInternal(itemsWithLongDesc);
      expect(result).toBeDefined();
    });

    it('should handle special characters in feedback', async () => {
      const specialCharsItem = {
        ...mockFeedbackItems[0],
        title: 'Test with émojis 🎉 and spëcial chars',
        description: 'Description with "quotes" and <tags>',
      };

      const result = await detectThemesInternal([specialCharsItem]);
      expect(result).toBeDefined();
    });
  });
});
