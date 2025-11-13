/**
 * Test fixtures for sentiment analysis tests
 */

import {
  SentimentAnalysisInput,
  SentimentAnalysisOutput,
  SentimentAnalysisResult,
  PostWithSentiment,
} from '@/types/sentiment'

export const testFeedbackTexts = {
  positive: 'I absolutely love this feature! It works perfectly and has saved me so much time. Great job!',
  negative: 'This is terrible. The app crashes constantly and I cannot get any work done. Very frustrated.',
  neutral: 'The API documentation can be found at docs.example.com. It includes setup instructions.',
  mixed: 'I love the new design, but the performance is really slow. Hope you can fix the speed issues.',
  empty: '',
  veryLong: 'A'.repeat(10000),
}

export const mockSentimentInputs: SentimentAnalysisInput[] = [
  {
    text: testFeedbackTexts.positive,
    postId: 'post-1',
    metadata: {
      title: 'Great feature',
      category: 'Feature Request',
      authorName: 'John Doe',
    },
  },
  {
    text: testFeedbackTexts.negative,
    postId: 'post-2',
    metadata: {
      title: 'Bug report',
      category: 'Bug',
      authorName: 'Jane Smith',
    },
  },
]

export const mockSentimentOutputs: SentimentAnalysisOutput[] = [
  {
    sentiment_category: 'positive',
    sentiment_score: 0.85,
    emotional_tone: 'excited',
    confidence_score: 0.92,
    reasoning: 'User expresses enthusiasm',
  },
  {
    sentiment_category: 'negative',
    sentiment_score: -0.75,
    emotional_tone: 'frustrated',
    confidence_score: 0.88,
    reasoning: 'User experiencing issues',
  },
]

export const mockSentimentResults: SentimentAnalysisResult[] = [
  {
    postId: 'post-1',
    sentiment_category: 'positive',
    sentiment_score: 0.85,
    emotional_tone: 'excited',
    confidence_score: 0.92,
    success: true,
  },
  {
    postId: 'post-2',
    sentiment_category: 'negative',
    sentiment_score: -0.75,
    emotional_tone: 'frustrated',
    confidence_score: 0.88,
    success: true,
  },
]

export const mockPostsWithSentiment: PostWithSentiment[] = [
  {
    id: 'post-1',
    title: 'Great feature',
    description: testFeedbackTexts.positive,
    status: 'open',
    author_email: 'john@example.com',
    author_name: 'John Doe',
    vote_count: 10,
    comment_count: 3,
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
    title: 'Bug report',
    description: testFeedbackTexts.negative,
    status: 'open',
    author_email: 'jane@example.com',
    author_name: 'Jane Smith',
    vote_count: 5,
    comment_count: 1,
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
    title: 'Neutral feedback',
    description: testFeedbackTexts.neutral,
    status: 'open',
    author_email: 'bob@example.com',
    author_name: 'Bob Johnson',
    vote_count: 2,
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

export const mockApiResponses = {
  analyzeSuccess: {
    success: true,
    results: mockSentimentResults,
    processed: 2,
    failed: 0,
    message: 'Successfully analyzed 2 out of 2 posts',
  },
  analyzeError: {
    success: false,
    error: 'Internal server error',
    message: 'Failed to analyze sentiment',
  },
  getDistribution: {
    success: true,
    distribution: [
      { sentiment_category: 'positive', count: 45, percentage: 45 },
      { sentiment_category: 'neutral', count: 35, percentage: 35 },
      { sentiment_category: 'negative', count: 15, percentage: 15 },
      { sentiment_category: 'mixed', count: 5, percentage: 5 },
    ],
    trend: [],
    days: 30,
  },
  getTrend: {
    success: true,
    distribution: [],
    trend: [
      {
        date: '2025-11-10',
        avg_sentiment_score: 0.65,
        positive_count: 10,
        negative_count: 2,
        neutral_count: 5,
        mixed_count: 1,
      },
    ],
    days: 7,
  },
}

// Edge case test data
export const edgeCaseInputs = {
  null: null,
  undefined: undefined,
  emptyString: '',
  whitespace: '   ',
  specialChars: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/',
  unicodeEmoji: '🎉😊👍✨🚀',
  veryLongText: 'A'.repeat(50000),
  htmlTags: '<script>alert("xss")</script>',
  sqlInjection: "'; DROP TABLE sentiment_analysis; --",
}
