/**
 * Integration Tests for Sentiment Analysis Flow
 * Tests the complete flow: analyze → store → display
 */

import { NextRequest } from 'next/server'
import { POST as analyzeSentimentPOST, GET as analyzeSentimentGET } from '@/app/api/analyze-sentiment/route'
import { analyzeSentimentBatch } from '@/lib/openai/sentiment'
import { createMockOpenAIClient } from '../mocks/openai.mock'
import { createMockSupabaseClient } from '../mocks/supabase.mock'
import { mockFetchResponse } from '../utils/test-utils'
import { testFeedbackTexts } from '../utils/fixtures'

// Mock dependencies
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => createMockOpenAIClient()),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}))

jest.mock('@/lib/ai-cache-manager', () => ({
  withCache: (fn: any) => fn,
}))

jest.mock('@/lib/ai-rate-limit', () => ({
  checkAIUsageLimit: jest.fn().mockResolvedValue({
    allowed: true,
    limit: 1000,
    current: 10,
    remaining: 990,
    isPro: false,
  }),
  incrementAIUsage: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/demo-rate-limit', () => ({
  checkDemoRateLimit: jest.fn().mockReturnValue({
    allowed: true,
    limit: 100,
    remaining: 90,
    resetAt: Date.now() + 3600000,
  }),
  incrementDemoUsage: jest.fn(),
  getClientIP: jest.fn(() => '127.0.0.1'),
  getTimeUntilReset: jest.fn(() => '1 hour'),
}))

describe('Sentiment Analysis Flow - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Analysis Flow', () => {
    it('should analyze, store, and retrieve sentiment', async () => {
      // Step 1: Analyze sentiment
      const posts = [
        {
          id: 'post-1',
          title: 'Great feature',
          description: testFeedbackTexts.positive,
        },
        {
          id: 'post-2',
          title: 'Bug report',
          description: testFeedbackTexts.negative,
        },
      ]

      const mockSupabase = createMockSupabaseClient()
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnValue(
          Promise.resolve({
            data: posts,
            error: null,
          })
        ),
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }))

      // Step 2: Call API to analyze
      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: ['post-1', 'post-2'],
          projectId: 'project-123',
        }),
      })

      const response = await analyzeSentimentPOST(request)
      const data = await response.json()

      // Step 3: Verify results
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results).toHaveLength(2)
      expect(data.processed).toBe(2)
      expect(data.failed).toBe(0)

      // Step 4: Verify positive sentiment was detected
      const positiveResult = data.results.find((r: any) => r.postId === 'post-1')
      expect(positiveResult.sentiment_category).toBe('positive')
      expect(positiveResult.sentiment_score).toBeGreaterThan(0)

      // Step 5: Verify negative sentiment was detected
      const negativeResult = data.results.find((r: any) => r.postId === 'post-2')
      expect(negativeResult.sentiment_category).toBe('negative')
      expect(negativeResult.sentiment_score).toBeLessThan(0)
    })

    it('should handle large batch analysis', async () => {
      const posts = Array(150)
        .fill(null)
        .map((_, i) => ({
          id: `post-${i}`,
          title: `Feedback ${i}`,
          description: testFeedbackTexts.positive,
        }))

      const mockSupabase = createMockSupabaseClient()
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: posts,
          error: null,
        }),
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }))

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: posts.map((p) => p.id),
          projectId: 'project-123',
        }),
      })

      const response = await analyzeSentimentPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(150)
    })
  })

  describe('API Endpoint Integration', () => {
    it('should handle POST request with valid data', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'post-1',
              title: 'Test',
              description: testFeedbackTexts.positive,
            },
          ],
          error: null,
        }),
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }))

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: ['post-1'],
          projectId: 'project-123',
        }),
      })

      const response = await analyzeSentimentPOST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should handle POST with missing postIds', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-123',
        }),
      })

      const response = await analyzeSentimentPOST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('postIds is required')
    })

    it('should handle POST with too many items', async () => {
      const postIds = Array(1500)
        .fill(null)
        .map((_, i) => `post-${i}`)

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds,
          projectId: 'project-123',
        }),
      })

      const response = await analyzeSentimentPOST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Maximum')
    })

    it('should handle GET request for distribution', async () => {
      const mockSupabase = createMockSupabaseClient()

      const request = new NextRequest(
        'http://localhost:3000/api/analyze-sentiment?projectId=project-123&days=30'
      )

      const response = await analyzeSentimentGET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.distribution).toBeDefined()
      expect(data.trend).toBeDefined()
    })

    it('should handle GET request without projectId', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment?days=30')

      const response = await analyzeSentimentGET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
    })
  })

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits', async () => {
      const { checkAIUsageLimit } = require('@/lib/ai-rate-limit')
      checkAIUsageLimit.mockResolvedValueOnce({
        allowed: false,
        limit: 1000,
        current: 1000,
        remaining: 0,
        isPro: false,
      })

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: ['post-1'],
          projectId: 'project-123',
        }),
      })

      const response = await analyzeSentimentPOST(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should enforce demo rate limits', async () => {
      const { checkDemoRateLimit } = require('@/lib/demo-rate-limit')
      checkDemoRateLimit.mockReturnValueOnce({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetAt: Date.now() + 3600000,
      })

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: ['post-1'],
        }),
      })

      const response = await analyzeSentimentPOST(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Demo rate limit exceeded')
    })

    it('should increment usage counter after successful analysis', async () => {
      const { incrementAIUsage } = require('@/lib/ai-rate-limit')

      const mockSupabase = createMockSupabaseClient()
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'post-1',
              title: 'Test',
              description: testFeedbackTexts.positive,
            },
          ],
          error: null,
        }),
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }))

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: ['post-1'],
          projectId: 'project-123',
        }),
      })

      await analyzeSentimentPOST(request)

      expect(incrementAIUsage).toHaveBeenCalledWith('project-123', 'sentiment')
    })
  })

  describe('Database Integration', () => {
    it('should store sentiment analysis results', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockUpsert = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'post-1',
              title: 'Test',
              description: testFeedbackTexts.positive,
            },
          ],
          error: null,
        }),
        upsert: mockUpsert,
      }))

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: ['post-1'],
          projectId: 'project-123',
        }),
      })

      await analyzeSentimentPOST(request)

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            post_id: 'post-1',
            sentiment_category: expect.any(String),
            sentiment_score: expect.any(Number),
            emotional_tone: expect.any(String),
            confidence_score: expect.any(Number),
          }),
        ]),
        expect.any(Object)
      )
    })

    it('should handle database errors gracefully', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }))

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: ['post-1'],
          projectId: 'project-123',
        }),
      })

      const response = await analyzeSentimentPOST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to fetch posts')
    })

    it('should query sentiment distribution from database', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockRpc = jest.fn().mockResolvedValue({
        data: [
          { sentiment_category: 'positive', count: 45, percentage: 45 },
          { sentiment_category: 'neutral', count: 35, percentage: 35 },
        ],
        error: null,
      })

      mockSupabase.rpc = mockRpc

      const request = new NextRequest(
        'http://localhost:3000/api/analyze-sentiment?projectId=project-123&days=30'
      )

      await analyzeSentimentGET(request)

      expect(mockRpc).toHaveBeenCalledWith('get_sentiment_distribution', {
        p_project_id: 'project-123',
        p_days_ago: 30,
      })
    })
  })

  describe('Error Recovery', () => {
    it('should continue processing after individual failures', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'post-1',
              title: 'Test 1',
              description: testFeedbackTexts.positive,
            },
            {
              id: 'post-2',
              title: 'Test 2',
              description: testFeedbackTexts.negative,
            },
          ],
          error: null,
        }),
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }))

      const request = new NextRequest('http://localhost:3000/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          postIds: ['post-1', 'post-2'],
          projectId: 'project-123',
        }),
      })

      const response = await analyzeSentimentPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed + data.failed).toBe(2)
    })
  })
})
