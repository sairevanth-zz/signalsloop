/**
 * Component Tests for SentimentTrendChart
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils'
import { SentimentTrendChart } from '../SentimentTrendChart'
import { mockApiResponses } from '@/__tests__/utils/fixtures'
import { mockFetchResponse, mockFetchError } from '@/__tests__/utils/test-utils'

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: any, formatStr: string) => 'Nov 10'),
  parseISO: jest.fn((date: string) => new Date(date)),
}))

describe('SentimentTrendChart', () => {
  const mockProjectId = 'project-123'

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('Rendering', () => {
    it('should render chart with title', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      expect(screen.getByText('Sentiment Trend')).toBeInTheDocument()
    })

    it('should display loading state initially', () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('should render line chart after loading', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })
    })
  })

  describe('Time Range Selector', () => {
    it('should render time range buttons', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('7d')).toBeInTheDocument()
        expect(screen.getByText('30d')).toBeInTheDocument()
        expect(screen.getByText('90d')).toBeInTheDocument()
      })
    })

    it('should fetch new data when time range changes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('7d')).toBeInTheDocument()
      })

      const button7d = screen.getByText('7d')
      fireEvent.click(button7d)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('days=7')
        )
      })
    })
  })

  describe('Average Sentiment Display', () => {
    it('should display average sentiment score', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Average score:/i)).toBeInTheDocument()
      })
    })
  })

  describe('Trend Direction', () => {
    it('should show improving trend indicator', async () => {
      const improvingTrend = {
        ...mockApiResponses.getTrend,
        trend: [
          {
            date: '2025-11-08',
            avg_sentiment_score: 0.3,
            positive_count: 5,
            negative_count: 5,
            neutral_count: 5,
            mixed_count: 1,
          },
          {
            date: '2025-11-10',
            avg_sentiment_score: 0.7,
            positive_count: 10,
            negative_count: 2,
            neutral_count: 3,
            mixed_count: 1,
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(improvingTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Improving')).toBeInTheDocument()
      })
    })

    it('should show declining trend indicator', async () => {
      const decliningTrend = {
        ...mockApiResponses.getTrend,
        trend: [
          {
            date: '2025-11-08',
            avg_sentiment_score: 0.7,
            positive_count: 10,
            negative_count: 2,
            neutral_count: 3,
            mixed_count: 1,
          },
          {
            date: '2025-11-10',
            avg_sentiment_score: 0.3,
            positive_count: 5,
            negative_count: 5,
            neutral_count: 5,
            mixed_count: 1,
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(decliningTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Declining')).toBeInTheDocument()
      })
    })

    it('should show stable trend indicator', async () => {
      const stableTrend = {
        ...mockApiResponses.getTrend,
        trend: [
          {
            date: '2025-11-08',
            avg_sentiment_score: 0.5,
            positive_count: 7,
            negative_count: 3,
            neutral_count: 5,
            mixed_count: 1,
          },
          {
            date: '2025-11-10',
            avg_sentiment_score: 0.52,
            positive_count: 7,
            negative_count: 3,
            neutral_count: 5,
            mixed_count: 1,
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(stableTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Stable')).toBeInTheDocument()
      })
    })
  })

  describe('Summary Statistics', () => {
    it('should display sentiment category totals', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Positive')).toBeInTheDocument()
        expect(screen.getByText('Negative')).toBeInTheDocument()
        expect(screen.getByText('Neutral')).toBeInTheDocument()
        expect(screen.getByText('Mixed')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(mockFetchError())

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Error loading data/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(mockFetchError())

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no data', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({
          success: true,
          distribution: [],
          trend: [],
          days: 30,
        })
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/No trend data/i)).toBeInTheDocument()
        expect(
          screen.getByText(/Not enough data to show trends/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('API Integration', () => {
    it('should call API with correct project ID', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getTrend)
      )

      render(<SentimentTrendChart projectId={mockProjectId} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`projectId=${mockProjectId}`)
        )
      })
    })
  })
})
