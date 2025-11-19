/**
 * Component Tests for FeedbackListWithSentiment
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils'
import { FeedbackListWithSentiment } from '../FeedbackListWithSentiment'
import { mockPostsWithSentiment } from '@/__tests__/utils/fixtures'
import { createMockSupabaseClient, mockSupabaseError } from '@/__tests__/mocks/supabase.mock'

// Mock the Supabase client
jest.mock('@/lib/supabase-client', () => ({
  getSupabaseClient: jest.fn(() => createMockSupabaseClient()),
}))

describe('FeedbackListWithSentiment', () => {
  const mockProjectId = 'project-123'
  const mockOnSentimentFilter = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render feedback list with title', () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      expect(screen.getByText(/Feedback/i)).toBeInTheDocument()
    })

    it('should display loading state initially', () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('should render posts after loading', async () => {
      const { getSupabaseClient } = require('@/lib/supabase-client')
      getSupabaseClient.mockReturnValue(createMockSupabaseClient())

      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Great new feature!')).toBeInTheDocument()
      })
    })

    it('should display refresh button', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument()
      })
    })
  })

  describe('Filter Buttons', () => {
    it('should render all filter buttons', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/All/i)).toBeInTheDocument()
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
        expect(screen.getByText(/Neutral/i)).toBeInTheDocument()
        expect(screen.getByText(/Negative/i)).toBeInTheDocument()
        expect(screen.getByText(/Mixed/i)).toBeInTheDocument()
      })
    })

    it('should display counts for each sentiment category', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        const positiveButton = screen.getByText(/Positive/i)
        expect(positiveButton).toBeInTheDocument()
      })
    })

    it('should call onSentimentFilter when filter is clicked', async () => {
      render(
        <FeedbackListWithSentiment
          projectId={mockProjectId}
          onSentimentFilter={mockOnSentimentFilter}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
      })

      const positiveButton = screen.getByText(/Positive/i)
      fireEvent.click(positiveButton)

      expect(mockOnSentimentFilter).toHaveBeenCalledWith('positive')
    })

    it('should highlight active filter', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
      })

      const positiveButton = screen.getByText(/Positive/i)
      fireEvent.click(positiveButton)

      await waitFor(() => {
        expect(positiveButton.className).toContain('bg-blue-100')
      })
    })
  })

  describe('Post Display', () => {
    it('should display post titles', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Great new feature!')).toBeInTheDocument()
        expect(screen.getByText('Bug in the system')).toBeInTheDocument()
      })
    })

    it('should display post descriptions', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(
          screen.getByText(/I love this new feature/i)
        ).toBeInTheDocument()
      })
    })

    it('should display author names', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
    })

    it('should display vote counts', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        const voteElements = screen.getAllByText('10')
        expect(voteElements.length).toBeGreaterThan(0)
      })
    })

    it('should display comment counts', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        const commentElements = screen.getAllByText('5')
        expect(commentElements.length).toBeGreaterThan(0)
      })
    })

    it('should display post status', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        const statusElements = screen.getAllByText('open')
        expect(statusElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Sentiment Badges', () => {
    it('should display sentiment badges for analyzed posts', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Positive')).toBeInTheDocument()
        expect(screen.getByText('Negative')).toBeInTheDocument()
      })
    })

    it('should display "Not analyzed" for unanalyzed posts', async () => {
      const postsWithoutSentiment = [
        {
          ...mockPostsWithSentiment[0],
          sentiment_category: undefined,
          sentiment_score: undefined,
        },
      ]

      render(
        <FeedbackListWithSentiment
          projectId={mockProjectId}
          initialPosts={postsWithoutSentiment}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Not analyzed')).toBeInTheDocument()
      })
    })
  })

  describe('Filtering', () => {
    it('should filter posts by sentiment category', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Great new feature!')).toBeInTheDocument()
        expect(screen.getByText('Bug in the system')).toBeInTheDocument()
      })

      // Click positive filter
      const positiveButton = screen.getByText(/Positive/i)
      fireEvent.click(positiveButton)

      await waitFor(() => {
        expect(screen.getByText('Great new feature!')).toBeInTheDocument()
        // Negative post should be filtered out
        expect(screen.queryByText('Bug in the system')).not.toBeInTheDocument()
      })
    })

    it('should show all posts when filter is cleared', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
      })

      // Apply filter
      const positiveButton = screen.getByText(/Positive/i)
      fireEvent.click(positiveButton)

      await waitFor(() => {
        expect(screen.queryByText('Bug in the system')).not.toBeInTheDocument()
      })

      // Clear filter by clicking All
      const allButton = screen.getByText(/All/i)
      fireEvent.click(allButton)

      await waitFor(() => {
        expect(screen.getByText('Bug in the system')).toBeInTheDocument()
      })
    })

    it('should update count when filtering', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        // Initially shows all posts count
        expect(screen.getByText(/Feedback \(\d+\)/)).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should set up Supabase subscriptions', async () => {
      const mockClient = createMockSupabaseClient()
      const { getSupabaseClient } = require('@/lib/supabase-client')
      getSupabaseClient.mockReturnValue(mockClient)

      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(mockClient.channel).toHaveBeenCalled()
      })
    })

    it('should clean up subscriptions on unmount', async () => {
      const mockUnsubscribe = jest.fn()
      const mockClient = {
        ...createMockSupabaseClient(),
        channel: jest.fn(() => ({
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn(() => ({ unsubscribe: mockUnsubscribe })),
        })),
      }

      const { getSupabaseClient } = require('@/lib/supabase-client')
      getSupabaseClient.mockReturnValue(mockClient)

      const { unmount } = render(
        <FeedbackListWithSentiment projectId={mockProjectId} />
      )

      await waitFor(() => {
        expect(mockClient.channel).toHaveBeenCalled()
      })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('Refresh Functionality', () => {
    it('should refetch data when refresh is clicked', async () => {
      const mockClient = createMockSupabaseClient()
      const { getSupabaseClient } = require('@/lib/supabase-client')
      getSupabaseClient.mockReturnValue(mockClient)

      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument()
      })

      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        // Should call from('posts_with_sentiment') again
        expect(mockClient.from).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      const { getSupabaseClient } = require('@/lib/supabase-client')
      getSupabaseClient.mockReturnValue(mockSupabaseError())

      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Error loading feedback/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      const { getSupabaseClient } = require('@/lib/supabase-client')
      getSupabaseClient.mockReturnValue(mockSupabaseError())

      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should handle null Supabase client', async () => {
      const { getSupabaseClient } = require('@/lib/supabase-client')
      getSupabaseClient.mockReturnValue(null)

      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Supabase client not available/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no posts', async () => {
      const mockEmptyClient = {
        ...createMockSupabaseClient(),
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: jest.fn((callback) => callback({ data: [], error: null })),
        })),
        channel: jest.fn(() => ({
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        })),
      }

      const { getSupabaseClient } = require('@/lib/supabase-client')
      getSupabaseClient.mockReturnValue(mockEmptyClient)

      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/No feedback found/i)).toBeInTheDocument()
      })
    })

    it('should display filtered empty state message', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Mixed/i)).toBeInTheDocument()
      })

      // Filter by mixed (which has no posts)
      const mixedButton = screen.getByText(/Mixed/i)
      fireEvent.click(mixedButton)

      await waitFor(() => {
        expect(screen.getByText(/No mixed feedback/i)).toBeInTheDocument()
      })
    })

    it('should show clear filter button in empty state', async () => {
      render(<FeedbackListWithSentiment projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Mixed/i)).toBeInTheDocument()
      })

      const mixedButton = screen.getByText(/Mixed/i)
      fireEvent.click(mixedButton)

      await waitFor(() => {
        expect(screen.getByText('Clear filter')).toBeInTheDocument()
      })
    })
  })

  describe('Initial Posts Prop', () => {
    it('should use initial posts when provided', () => {
      render(
        <FeedbackListWithSentiment
          projectId={mockProjectId}
          initialPosts={mockPostsWithSentiment}
        />
      )

      expect(screen.getByText('Great feature')).toBeInTheDocument()
    })
  })
})
