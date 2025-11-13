/**
 * Mock Supabase client for testing
 */

import { PostWithSentiment, SentimentDistributionWithPercentage, SentimentTrendPoint } from '@/types/sentiment'

export const mockPosts: PostWithSentiment[] = [
  {
    id: 'post-1',
    title: 'Great new feature!',
    description: 'I love this new feature, it works perfectly!',
    status: 'open',
    author_email: 'user1@example.com',
    author_name: 'John Doe',
    vote_count: 10,
    comment_count: 5,
    category: 'Feature Request',
    created_at: '2025-11-10T10:00:00Z',
    sentiment_category: 'positive',
    sentiment_score: 0.85,
    emotional_tone: 'excited',
    confidence_score: 0.92,
    sentiment_analyzed_at: '2025-11-10T10:05:00Z',
  },
  {
    id: 'post-2',
    title: 'Bug in the system',
    description: 'The app crashes when I try to export data',
    status: 'open',
    author_email: 'user2@example.com',
    author_name: 'Jane Smith',
    vote_count: 3,
    comment_count: 2,
    category: 'Bug',
    created_at: '2025-11-11T14:00:00Z',
    sentiment_category: 'negative',
    sentiment_score: -0.75,
    emotional_tone: 'frustrated',
    confidence_score: 0.88,
    sentiment_analyzed_at: '2025-11-11T14:05:00Z',
  },
  {
    id: 'post-3',
    title: 'Question about API',
    description: 'How do I integrate with the API?',
    status: 'open',
    author_email: 'user3@example.com',
    author_name: 'Bob Johnson',
    vote_count: 1,
    comment_count: 0,
    category: 'Documentation',
    created_at: '2025-11-12T09:00:00Z',
    sentiment_category: 'neutral',
    sentiment_score: 0.05,
    emotional_tone: 'neutral',
    confidence_score: 0.78,
    sentiment_analyzed_at: '2025-11-12T09:05:00Z',
  },
]

export const mockDistribution: SentimentDistributionWithPercentage[] = [
  { sentiment_category: 'positive', count: 45, percentage: 45 },
  { sentiment_category: 'neutral', count: 35, percentage: 35 },
  { sentiment_category: 'negative', count: 15, percentage: 15 },
  { sentiment_category: 'mixed', count: 5, percentage: 5 },
]

export const mockTrend: SentimentTrendPoint[] = [
  {
    date: '2025-11-08',
    avg_sentiment_score: 0.65,
    positive_count: 10,
    negative_count: 2,
    neutral_count: 5,
    mixed_count: 1,
  },
  {
    date: '2025-11-09',
    avg_sentiment_score: 0.72,
    positive_count: 12,
    negative_count: 1,
    neutral_count: 4,
    mixed_count: 2,
  },
  {
    date: '2025-11-10',
    avg_sentiment_score: 0.55,
    positive_count: 8,
    negative_count: 3,
    neutral_count: 6,
    mixed_count: 1,
  },
]

export const createMockSupabaseClient = () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    unsubscribe: jest.fn(),
  }

  return {
    from: jest.fn().mockImplementation((table: string) => {
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPosts[0],
          error: null,
        }),
        then: jest.fn((callback) => {
          if (table === 'posts' || table === 'posts_with_sentiment') {
            return callback({ data: mockPosts, error: null })
          }
          return callback({ data: [], error: null })
        }),
      }
    }),
    rpc: jest.fn().mockImplementation((functionName: string) => {
      if (functionName === 'get_sentiment_distribution') {
        return Promise.resolve({ data: mockDistribution, error: null })
      }
      if (functionName === 'get_sentiment_trend') {
        return Promise.resolve({ data: mockTrend, error: null })
      }
      return Promise.resolve({ data: [], error: null })
    }),
    channel: jest.fn().mockReturnValue(mockChannel),
  }
}

export const mockSupabaseError = () => {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((callback) =>
        callback({
          data: null,
          error: { message: 'Database error' },
        })
      ),
    }),
    rpc: jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Function error' },
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    }),
  }
}

// Mock getSupabaseClient
export const mockGetSupabaseClient = jest.fn(() => createMockSupabaseClient())
