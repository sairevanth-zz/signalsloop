/**
 * Unit Tests for Sentiment Analysis Service
 */

import {
  analyzeSentiment,
  analyzeSentimentWithRetry,
  analyzeSentimentBatch,
  detectSentimentQuick,
  getFallbackSentiment,
} from '@/lib/openai/sentiment'
import { createMockOpenAIClient, mockOpenAIError, mockOpenAIRateLimitError } from './mocks/openai.mock'
import { testFeedbackTexts, mockSentimentInputs, edgeCaseInputs } from './utils/fixtures'
import { SentimentAnalysisError } from '@/types/sentiment'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn(() => createMockOpenAIClient()),
  }
})

// Mock the cache manager
jest.mock('@/lib/ai-cache-manager', () => ({
  withCache: (fn: any) => fn,
}))

describe('Sentiment Analysis Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment correctly', async () => {
      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-1',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(result.sentiment_category).toBe('positive')
      expect(result.sentiment_score).toBeGreaterThan(0)
      expect(result.sentiment_score).toBeLessThanOrEqual(1)
      expect(result.confidence_score).toBeGreaterThan(0)
      expect(result.confidence_score).toBeLessThanOrEqual(1)
      expect(result.emotional_tone).toBeDefined()
    })

    it('should analyze negative sentiment correctly', async () => {
      const input = {
        text: testFeedbackTexts.negative,
        postId: 'post-2',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(result.sentiment_category).toBe('negative')
      expect(result.sentiment_score).toBeLessThan(0)
      expect(result.sentiment_score).toBeGreaterThanOrEqual(-1)
    })

    it('should analyze neutral sentiment correctly', async () => {
      const input = {
        text: testFeedbackTexts.neutral,
        postId: 'post-3',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(result.sentiment_category).toBe('neutral')
      expect(Math.abs(result.sentiment_score)).toBeLessThan(0.5)
    })

    it('should analyze mixed sentiment correctly', async () => {
      const input = {
        text: testFeedbackTexts.mixed,
        postId: 'post-4',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(result.sentiment_category).toBe('mixed')
    })

    it('should include metadata in analysis', async () => {
      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-1',
        metadata: {
          title: 'Great feature',
          category: 'Feature Request',
          authorName: 'John Doe',
        },
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(result.sentiment_category).toBe('positive')
    })

    it('should validate sentiment score is within range', async () => {
      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-1',
      }

      const result = await analyzeSentiment(input)

      expect(result.sentiment_score).toBeGreaterThanOrEqual(-1)
      expect(result.sentiment_score).toBeLessThanOrEqual(1)
    })

    it('should validate confidence score is within range', async () => {
      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-1',
      }

      const result = await analyzeSentiment(input)

      expect(result.confidence_score).toBeGreaterThanOrEqual(0)
      expect(result.confidence_score).toBeLessThanOrEqual(1)
    })

    it('should handle empty text', async () => {
      const input = {
        text: '',
        postId: 'post-empty',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(result.sentiment_category).toBe('neutral')
    })

    it('should handle very long text', async () => {
      const input = {
        text: testFeedbackTexts.veryLong,
        postId: 'post-long',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(['positive', 'negative', 'neutral', 'mixed']).toContain(
        result.sentiment_category
      )
    })
  })

  describe('analyzeSentimentWithRetry', () => {
    it('should retry on failure and eventually succeed', async () => {
      const OpenAI = require('openai').default
      let attempts = 0

      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => {
              attempts++
              if (attempts < 2) {
                return Promise.reject(new Error('Temporary error'))
              }
              return Promise.resolve({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        sentiment_category: 'positive',
                        sentiment_score: 0.8,
                        emotional_tone: 'satisfied',
                        confidence_score: 0.9,
                      }),
                    },
                  },
                ],
              })
            }),
          },
        },
      }))

      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-retry',
      }

      const result = await analyzeSentimentWithRetry(input, 3)

      expect(result).toBeDefined()
      expect(result.sentiment_category).toBe('positive')
      expect(attempts).toBeGreaterThan(1)
    })

    it('should throw error after max retries', async () => {
      const OpenAI = require('openai').default
      OpenAI.mockImplementation(() => mockOpenAIError())

      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-fail',
      }

      await expect(analyzeSentimentWithRetry(input, 2)).rejects.toThrow()
    })
  })

  describe('analyzeSentimentBatch', () => {
    it('should process multiple items in batches', async () => {
      const inputs = mockSentimentInputs

      const results = await analyzeSentimentBatch({
        items: inputs,
        maxBatchSize: 10,
      })

      expect(results).toHaveLength(1)
      expect(results[0].results).toHaveLength(inputs.length)
      expect(results[0].batchNumber).toBe(1)
      expect(results[0].totalBatches).toBe(1)
    })

    it('should split large batches correctly', async () => {
      const inputs = Array(250)
        .fill(null)
        .map((_, i) => ({
          text: testFeedbackTexts.positive,
          postId: `post-${i}`,
        }))

      const results = await analyzeSentimentBatch({
        items: inputs,
        maxBatchSize: 100,
      })

      expect(results).toHaveLength(3)
      expect(results[0].batchNumber).toBe(1)
      expect(results[1].batchNumber).toBe(2)
      expect(results[2].batchNumber).toBe(3)
      expect(results[0].results).toHaveLength(100)
      expect(results[1].results).toHaveLength(100)
      expect(results[2].results).toHaveLength(50)
    })

    it('should handle empty batch', async () => {
      const results = await analyzeSentimentBatch({
        items: [],
        maxBatchSize: 100,
      })

      expect(results).toHaveLength(0)
    })

    it('should mark failed items as unsuccessful', async () => {
      const OpenAI = require('openai').default
      let callCount = 0

      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => {
              callCount++
              // Fail every other call
              if (callCount % 2 === 0) {
                return Promise.reject(new Error('API Error'))
              }
              return Promise.resolve({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        sentiment_category: 'positive',
                        sentiment_score: 0.8,
                        emotional_tone: 'satisfied',
                        confidence_score: 0.9,
                      }),
                    },
                  },
                ],
              })
            }),
          },
        },
      }))

      const inputs = Array(4)
        .fill(null)
        .map((_, i) => ({
          text: testFeedbackTexts.positive,
          postId: `post-${i}`,
        }))

      const results = await analyzeSentimentBatch({
        items: inputs,
        maxBatchSize: 10,
      })

      const flatResults = results.flatMap((r) => r.results)
      const successful = flatResults.filter((r) => r.success)
      const failed = flatResults.filter((r) => !r.success)

      expect(successful.length).toBeGreaterThan(0)
      expect(failed.length).toBeGreaterThan(0)
      expect(successful.length + failed.length).toBe(4)
    })
  })

  describe('detectSentimentQuick', () => {
    it('should detect positive keywords', () => {
      const result = detectSentimentQuick('I love this amazing feature!')

      expect(result.category).toBe('positive')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should detect negative keywords', () => {
      const result = detectSentimentQuick('This is broken and terrible')

      expect(result.category).toBe('negative')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should return neutral for neutral text', () => {
      const result = detectSentimentQuick('The API is documented')

      expect(result.category).toBe('neutral')
    })

    it('should handle empty string', () => {
      const result = detectSentimentQuick('')

      expect(result.category).toBe('neutral')
      expect(result.confidence).toBe(0.5)
    })
  })

  describe('getFallbackSentiment', () => {
    it('should return neutral sentiment', () => {
      const result = getFallbackSentiment()

      expect(result.sentiment_category).toBe('neutral')
      expect(result.sentiment_score).toBe(0)
      expect(result.emotional_tone).toBe('neutral')
      expect(result.confidence_score).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters', async () => {
      const input = {
        text: edgeCaseInputs.specialChars,
        postId: 'post-special',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(['positive', 'negative', 'neutral', 'mixed']).toContain(
        result.sentiment_category
      )
    })

    it('should handle unicode and emoji', async () => {
      const input = {
        text: edgeCaseInputs.unicodeEmoji,
        postId: 'post-emoji',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
    })

    it('should handle whitespace-only text', async () => {
      const input = {
        text: edgeCaseInputs.whitespace,
        postId: 'post-whitespace',
      }

      const result = await analyzeSentiment(input)

      expect(result).toBeDefined()
      expect(result.sentiment_category).toBe('neutral')
    })
  })

  describe('Error Handling', () => {
    it('should throw SentimentAnalysisError on API failure', async () => {
      const OpenAI = require('openai').default
      OpenAI.mockImplementation(() => mockOpenAIError())

      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-error',
      }

      await expect(analyzeSentiment(input)).rejects.toThrow()
    })

    it('should handle rate limit errors gracefully', async () => {
      const OpenAI = require('openai').default
      OpenAI.mockImplementation(() => mockOpenAIRateLimitError())

      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-rate-limit',
      }

      await expect(analyzeSentiment(input)).rejects.toThrow()
    })
  })

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const input = {
        text: testFeedbackTexts.positive,
        postId: 'post-perf',
      }

      const startTime = Date.now()
      await analyzeSentiment(input)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle batch processing efficiently', async () => {
      const inputs = Array(50)
        .fill(null)
        .map((_, i) => ({
          text: testFeedbackTexts.positive,
          postId: `post-${i}`,
        }))

      const startTime = Date.now()
      await analyzeSentimentBatch({ items: inputs, maxBatchSize: 10 })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(15000) // Reasonable time for 50 items
    })
  })
})
