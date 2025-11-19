/**
 * Mock OpenAI API for testing sentiment analysis
 */

export const mockOpenAIResponse = {
  positive: {
    sentiment_category: 'positive',
    sentiment_score: 0.85,
    emotional_tone: 'excited',
    confidence_score: 0.92,
    reasoning: 'User expresses enthusiasm and satisfaction with the feature',
  },
  negative: {
    sentiment_category: 'negative',
    sentiment_score: -0.75,
    emotional_tone: 'frustrated',
    confidence_score: 0.88,
    reasoning: 'User is experiencing issues and expresses frustration',
  },
  neutral: {
    sentiment_category: 'neutral',
    sentiment_score: 0.05,
    emotional_tone: 'neutral',
    confidence_score: 0.78,
    reasoning: 'User provides factual information without strong emotion',
  },
  mixed: {
    sentiment_category: 'mixed',
    sentiment_score: 0.15,
    emotional_tone: 'hopeful',
    confidence_score: 0.85,
    reasoning: 'User has both positive and negative feedback',
  },
}

export const createMockOpenAIClient = () => {
  return {
    chat: {
      completions: {
        create: jest.fn().mockImplementation(({ messages }) => {
          // Parse the user prompt to determine sentiment
          const userMessage = messages.find((m: any) => m.role === 'user')
          const text = userMessage?.content?.toLowerCase() || ''

          let response = mockOpenAIResponse.neutral

          // Determine sentiment based on keywords
          if (text.includes('love') || text.includes('great') || text.includes('amazing')) {
            response = mockOpenAIResponse.positive
          } else if (text.includes('bug') || text.includes('broken') || text.includes('terrible')) {
            response = mockOpenAIResponse.negative
          } else if (text.includes('but') && (text.includes('love') || text.includes('hate'))) {
            response = mockOpenAIResponse.mixed
          }

          return Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify(response),
                },
              },
            ],
          })
        }),
      },
    },
  }
}

export const mockOpenAIError = () => {
  return {
    chat: {
      completions: {
        create: jest.fn().mockRejectedValue(new Error('OpenAI API Error')),
      },
    },
  }
}

export const mockOpenAIRateLimitError = () => {
  return {
    chat: {
      completions: {
        create: jest.fn().mockRejectedValue({
          message: 'Rate limit exceeded',
          status: 429,
        }),
      },
    },
  }
}
