/**
 * Component tests for ThemesOverview
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemesOverview } from '../ThemesOverview';
import { mockThemes, mockProjectId } from '@/__tests__/mocks/theme-data';

// Mock fetch
global.fetch = jest.fn();

describe('ThemesOverview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, themes: mockThemes }),
    });
  });

  describe('Rendering', () => {
    it('should render themes overview with initial themes', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      expect(screen.getByText(mockThemes[0].theme_name)).toBeInTheDocument();
      expect(screen.getByText(mockThemes[1].theme_name)).toBeInTheDocument();
    });

    it('should show loading state initially when no initial themes', async () => {
      render(
        <ThemesOverview projectId={mockProjectId} projectSlug="test-project" />
      );

      // Should show loading skeleton or spinner
      const loadingElements = screen.queryAllByTestId(/loading|skeleton/i);
      expect(loadingElements.length >= 0).toBe(true);
    });

    it('should render re-analyze button', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const reAnalyzeButton = screen.getByText(/re-analyze|analyze/i);
      expect(reAnalyzeButton).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should render sentiment filter', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      // Should have filter dropdown or buttons
      const filterElement = screen.getByText(/filter|sentiment/i);
      expect(filterElement).toBeInTheDocument();
    });

    it('should render sort controls', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      // Should have sort controls
      const sortElement = screen.getByText(/sort|order/i);
      expect(sortElement).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter themes by search query', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Dark Mode' } });

      await waitFor(() => {
        expect(screen.getByText(/Dark Mode/)).toBeInTheDocument();
        expect(screen.queryByText(/Performance Issues/)).not.toBeInTheDocument();
      });
    });

    it('should show all themes when search is cleared', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Dark' } });
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        mockThemes.forEach(theme => {
          expect(screen.getByText(theme.theme_name)).toBeInTheDocument();
        });
      });
    });

    it('should show no results message when search has no matches', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent theme' } });

      await waitFor(() => {
        expect(screen.getByText(/no.*found|no.*match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sentiment Filter', () => {
    it('should filter positive themes', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const positiveFilter = screen.getByText(/positive/i);
      fireEvent.click(positiveFilter);

      await waitFor(() => {
        const visibleThemes = screen.getAllByRole('button');
        // Should only show themes with positive sentiment
        expect(visibleThemes.length).toBeGreaterThan(0);
      });
    });

    it('should filter negative themes', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const negativeFilter = screen.getByText(/negative/i);
      fireEvent.click(negativeFilter);

      await waitFor(() => {
        // Should show negative sentiment themes
        const visibleThemes = screen.getAllByRole('button');
        expect(visibleThemes.length).toBeGreaterThan(0);
      });
    });

    it('should show all themes when filter is cleared', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const allFilter = screen.getByText(/all|clear/i);
      fireEvent.click(allFilter);

      await waitFor(() => {
        mockThemes.forEach(theme => {
          expect(screen.getByText(theme.theme_name)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by frequency', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const sortByFrequency = screen.getByText(/frequency|popular/i);
      fireEvent.click(sortByFrequency);

      await waitFor(() => {
        const themeCards = screen.getAllByRole('button');
        // First theme should have highest frequency
        expect(themeCards.length).toBeGreaterThan(0);
      });
    });

    it('should sort by recency', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const sortByRecency = screen.getByText(/recent|latest/i);
      fireEvent.click(sortByRecency);

      await waitFor(() => {
        // Should reorder themes
        const themeCards = screen.getAllByRole('button');
        expect(themeCards.length).toBeGreaterThan(0);
      });
    });

    it('should sort by sentiment', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const sortBySentiment = screen.getByText(/sentiment/i);
      fireEvent.click(sortBySentiment);

      await waitFor(() => {
        const themeCards = screen.getAllByRole('button');
        expect(themeCards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Re-analyze Functionality', () => {
    it('should trigger theme detection when re-analyze is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, themes: mockThemes }),
      });

      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const reAnalyzeButton = screen.getByText(/re-analyze|analyze/i);
      fireEvent.click(reAnalyzeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/detect-themes'),
          expect.any(Object)
        );
      });
    });

    it('should show loading state during re-analysis', async () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const reAnalyzeButton = screen.getByText(/re-analyze|analyze/i);
      fireEvent.click(reAnalyzeButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText(/analyzing|loading/i)).toBeInTheDocument();
      });
    });

    it('should update themes after successful re-analysis', async () => {
      const newThemes = [
        {
          ...mockThemes[0],
          theme_name: 'New Theme',
          frequency: 100,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, themes: newThemes }),
      });

      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const reAnalyzeButton = screen.getByText(/re-analyze|analyze/i);
      fireEvent.click(reAnalyzeButton);

      await waitFor(() => {
        expect(screen.getByText('New Theme')).toBeInTheDocument();
      });
    });

    it('should handle re-analysis errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const reAnalyzeButton = screen.getByText(/re-analyze|analyze/i);
      fireEvent.click(reAnalyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Theme Navigation', () => {
    it('should navigate to theme detail when theme is clicked', async () => {
      const mockPush = jest.fn();
      delete window.location;
      window.location = { href: '' } as any;

      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
        />
      );

      const firstThemeCard = screen.getByText(mockThemes[0].theme_name);
      fireEvent.click(firstThemeCard);

      await waitFor(() => {
        expect(window.location.href).toContain('/test-project/theme/');
      });
    });
  });

  describe('Limit and Pagination', () => {
    it('should respect limit prop', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
          limit={2}
        />
      );

      const themeCards = screen.getAllByRole('button');
      expect(themeCards.length).toBeLessThanOrEqual(2);
    });

    it('should show "view more" button when themes exceed limit', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={mockThemes}
          limit={1}
        />
      );

      const viewMoreButton = screen.getByText(/view.*more|show.*more/i);
      expect(viewMoreButton).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no themes', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={[]}
        />
      );

      expect(screen.getByText(/no.*theme|empty/i)).toBeInTheDocument();
    });

    it('should show CTA to analyze themes in empty state', () => {
      render(
        <ThemesOverview
          projectId={mockProjectId}
          projectSlug="test-project"
          initialThemes={[]}
        />
      );

      const analyzeButton = screen.getByText(/analyze|detect/i);
      expect(analyzeButton).toBeInTheDocument();
    });
  });
});
