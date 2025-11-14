/**
 * Mock OpenAI client for testing
 */

import { mockOpenAIThemeResponse } from './theme-data';

export const createMockOpenAI = () => ({
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockOpenAIThemeResponse),
            },
          },
        ],
      }),
    },
  },
});

export const mockOpenAIError = () => ({
  chat: {
    completions: {
      create: jest.fn().mockRejectedValue(new Error('OpenAI API Error')),
    },
  },
});

export const mockOpenAIRateLimitError = () => ({
  chat: {
    completions: {
      create: jest.fn().mockRejectedValue({
        status: 429,
        message: 'Rate limit exceeded',
      }),
    },
  },
});
