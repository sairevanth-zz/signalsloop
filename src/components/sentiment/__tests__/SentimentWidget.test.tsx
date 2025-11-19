/**
 * Component Tests for SentimentWidget
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils'
import { SentimentWidget } from '../SentimentWidget'
import { mockApiResponses } from '@/__tests__/utils/fixtures'
import { mockFetchResponse, mockFetchError } from '@/__tests__/utils/test-utils'

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

describe('SentimentWidget', () => {
  const mockProjectId = 'project-123'
  const mockOnFilterChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render widget with title', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument()
    })

    it('should display loading state initially', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('should render pie chart after loading', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      })
    })

    it('should display total feedback count', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/100 feedback items analyzed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Time Range Selector', () => {
    it('should render time range buttons', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('7d')).toBeInTheDocument()
        expect(screen.getByText('30d')).toBeInTheDocument()
        expect(screen.getByText('90d')).toBeInTheDocument()
      })
    })

    it('should highlight default time range', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} defaultTimeRange={30} />)

      await waitFor(() => {
        const button30d = screen.getByText('30d')
        expect(button30d.className).toContain('bg-blue-100')
      })
    })

    it('should fetch new data when time range changes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

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

    it('should update active button when clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('90d')).toBeInTheDocument()
      })

      const button90d = screen.getByText('90d')
      fireEvent.click(button90d)

      await waitFor(() => {
        expect(button90d.className).toContain('bg-blue-100')
      })
    })
  })

  describe('Distribution Display', () => {
    it('should display all sentiment categories', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/😊 Positive/i)).toBeInTheDocument()
        expect(screen.getByText(/😐 Neutral/i)).toBeInTheDocument()
        expect(screen.getByText(/😞 Negative/i)).toBeInTheDocument()
        expect(screen.getByText(/🤔 Mixed/i)).toBeInTheDocument()
      })
    })

    it('should display counts and percentages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument() // positive count
        expect(screen.getByText('45.0%')).toBeInTheDocument()
      })
    })
  })

  describe('Filter Functionality', () => {
    it('should call onFilterChange when category is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(
        <SentimentWidget
          projectId={mockProjectId}
          onFilterChange={mockOnFilterChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
      })

      const positiveButton = screen.getByText(/😊 Positive/i).closest('button')
      fireEvent.click(positiveButton!)

      expect(mockOnFilterChange).toHaveBeenCalledWith('positive')
    })

    it('should toggle filter on/off when clicked twice', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(
        <SentimentWidget
          projectId={mockProjectId}
          onFilterChange={mockOnFilterChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
      })

      const positiveButton = screen.getByText(/😊 Positive/i).closest('button')

      // First click - select
      fireEvent.click(positiveButton!)
      expect(mockOnFilterChange).toHaveBeenCalledWith('positive')

      // Second click - deselect
      fireEvent.click(positiveButton!)
      expect(mockOnFilterChange).toHaveBeenCalledWith(null)
    })

    it('should highlight selected filter', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
      })

      const positiveButton = screen.getByText(/😊 Positive/i).closest('button')
      fireEvent.click(positiveButton!)

      await waitFor(() => {
        expect(positiveButton?.className).toContain('border-blue-500')
      })
    })

    it('should show filter active message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
      })

      const positiveButton = screen.getByText(/😊 Positive/i).closest('button')
      fireEvent.click(positiveButton!)

      await waitFor(() => {
        expect(screen.getByText(/Filter active.*positive/i)).toBeInTheDocument()
      })
    })

    it('should clear filter when clear button is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Positive/i)).toBeInTheDocument()
      })

      // Select filter
      const positiveButton = screen.getByText(/😊 Positive/i).closest('button')
      fireEvent.click(positiveButton!)

      await waitFor(() => {
        expect(screen.getByText('Clear filter')).toBeInTheDocument()
      })

      // Clear filter
      const clearButton = screen.getByText('Clear filter')
      fireEvent.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByText('Clear filter')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(mockFetchError())

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/Error loading data/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(mockFetchError())

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should retry fetch when retry button is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockFetchError())

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Mock successful response for retry
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
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

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(screen.getByText(/No sentiment data/i)).toBeInTheDocument()
        expect(
          screen.getByText(/No feedback has been analyzed yet/i)
        ).toBeInTheDocument()
      })
    })

    it('should show empty state icon', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({
          success: true,
          distribution: [],
          trend: [],
          days: 30,
        })
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        const svg = screen.getByText(/No sentiment data/i).previousSibling
        expect(svg?.nodeName).toBe('svg')
      })
    })
  })

  describe('API Integration', () => {
    it('should call API with correct project ID', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`projectId=${mockProjectId}`)
        )
      })
    })

    it('should call API with default time range', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      render(<SentimentWidget projectId={mockProjectId} defaultTimeRange={30} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('days=30')
        )
      })
    })
  })

  describe('Custom ClassName', () => {
    it('should apply custom className', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(mockApiResponses.getDistribution)
      )

      const { container } = render(
        <SentimentWidget projectId={mockProjectId} className="custom-widget" />
      )

      await waitFor(() => {
        const widget = container.firstChild as HTMLElement
        expect(widget.className).toContain('custom-widget')
      })
    })
  })
})
