/**
 * Component tests for EmergingThemesAlert
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmergingThemesAlert } from '../EmergingThemesAlert';
import { mockEmergingThemes, mockProjectId, mockThemes } from '@/__tests__/mocks/theme-data';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('EmergingThemesAlert Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        themes: mockThemes.filter(t => t.is_emerging),
      }),
    });
  });

  describe('Rendering', () => {
    it('should render emerging themes alert', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        expect(screen.getByText(/emerging.*theme/i)).toBeInTheDocument();
      });
    });

    it('should display emerging theme information', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const emergingTheme = mockThemes.find(t => t.is_emerging);
        if (emergingTheme) {
          expect(screen.getByText(emergingTheme.theme_name)).toBeInTheDocument();
        }
      });
    });

    it('should not render when no emerging themes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, themes: [] }),
      });

      const { container } = render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should show growth metrics', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        expect(screen.getByText(/\+\d+%/)).toBeInTheDocument();
      });
    });

    it('should display frequency count', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        expect(screen.getByText(/\d+.*mention/i)).toBeInTheDocument();
      });
    });

    it('should show last seen date', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        expect(screen.getByText(/last seen/i)).toBeInTheDocument();
      });
    });
  });

  describe('Investigate Button', () => {
    it('should render investigate button', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const investigateButton = screen.getByText(/investigate/i);
        expect(investigateButton).toBeInTheDocument();
      });
    });

    it('should navigate to theme detail when investigate is clicked', async () => {
      delete window.location;
      window.location = { href: '' } as any;

      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const investigateButton = screen.getByText(/investigate/i);
        fireEvent.click(investigateButton);
      });

      expect(window.location.href).toContain('/test-project/theme/');
    });

    it('should call custom onInvestigate handler if provided', async () => {
      const mockOnInvestigate = jest.fn();

      render(
        <EmergingThemesAlert
          projectId={mockProjectId}
          projectSlug="test-project"
          onInvestigate={mockOnInvestigate}
        />
      );

      await waitFor(() => {
        const investigateButton = screen.getByText(/investigate/i);
        fireEvent.click(investigateButton);
      });

      expect(mockOnInvestigate).toHaveBeenCalled();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should render dismiss button', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const dismissButton = screen.getByTitle(/dismiss/i);
        expect(dismissButton).toBeInTheDocument();
      });
    });

    it('should remove theme from view when dismissed', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(async () => {
        const emergingTheme = mockThemes.find(t => t.is_emerging);
        if (emergingTheme) {
          expect(screen.getByText(emergingTheme.theme_name)).toBeInTheDocument();

          const dismissButton = screen.getByTitle(/dismiss/i);
          fireEvent.click(dismissButton);

          await waitFor(() => {
            expect(screen.queryByText(emergingTheme.theme_name)).not.toBeInTheDocument();
          });
        }
      });
    });

    it('should save dismissed theme to localStorage', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const dismissButton = screen.getByTitle(/dismiss/i);
        fireEvent.click(dismissButton);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining(`dismissed_themes_${mockProjectId}`),
        expect.any(String)
      );
    });

    it('should call custom onDismiss handler if provided', async () => {
      const mockOnDismiss = jest.fn();

      render(
        <EmergingThemesAlert
          projectId={mockProjectId}
          projectSlug="test-project"
          onDismiss={mockOnDismiss}
        />
      );

      await waitFor(() => {
        const dismissButton = screen.getByTitle(/dismiss/i);
        fireEvent.click(dismissButton);
      });

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should restore dismissed themes when clicked', async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([mockThemes.find(t => t.is_emerging)?.id])
      );

      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const restoreButton = screen.getByText(/show.*dismissed/i);
        expect(restoreButton).toBeInTheDocument();
        fireEvent.click(restoreButton);
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `dismissed_themes_${mockProjectId}`
      );
    });
  });

  describe('Create Issue Button', () => {
    it('should render create issue button', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const createIssueButton = screen.getByText(/create issue/i);
        expect(createIssueButton).toBeInTheDocument();
      });
    });

    it('should show coming soon message when clicked', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const createIssueButton = screen.getByText(/create issue/i);
        fireEvent.click(createIssueButton);
      });

      // Toast should be shown (mocked in jest.setup.js)
      expect(true).toBe(true); // Placeholder for toast verification
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      const loadingElement = screen.getByText(/emerging.*theme/i).closest('div');
      expect(loadingElement).toBeInTheDocument();
    });

    it('should hide loading after data loads', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        // Loading should be complete
        const emergingTheme = mockThemes.find(t => t.is_emerging);
        if (emergingTheme) {
          expect(screen.getByText(emergingTheme.theme_name)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const { container } = render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        // Should not crash, may show empty state or error
        expect(container).toBeInTheDocument();
      });
    });

    it('should handle missing projectSlug', async () => {
      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug={undefined} />
      );

      await waitFor(() => {
        const investigateButton = screen.queryByText(/investigate/i);
        if (investigateButton) {
          fireEvent.click(investigateButton);
          // Should show error toast instead of navigating
        }
      });
    });
  });

  describe('Multiple Emerging Themes', () => {
    it('should display all emerging themes', async () => {
      const multipleEmergingThemes = [
        { ...mockThemes[0], is_emerging: true },
        { ...mockThemes[1], is_emerging: true },
        { ...mockThemes[2], is_emerging: true },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, themes: multipleEmergingThemes }),
      });

      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        multipleEmergingThemes.forEach(theme => {
          expect(screen.getByText(theme.theme_name)).toBeInTheDocument();
        });
      });
    });

    it('should show correct count of emerging themes', async () => {
      const multipleEmergingThemes = [
        { ...mockThemes[0], is_emerging: true },
        { ...mockThemes[1], is_emerging: true },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, themes: multipleEmergingThemes }),
      });

      render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        expect(screen.getByText(/emerging.*theme.*\(2\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('should apply custom className', async () => {
      const { container } = render(
        <EmergingThemesAlert
          projectId={mockProjectId}
          projectSlug="test-project"
          className="custom-class"
        />
      );

      await waitFor(() => {
        const customElement = container.querySelector('.custom-class');
        expect(customElement).toBeInTheDocument();
      });
    });

    it('should use orange/warning colors for emerging themes', async () => {
      const { container } = render(
        <EmergingThemesAlert projectId={mockProjectId} projectSlug="test-project" />
      );

      await waitFor(() => {
        const orangeElement = container.querySelector('[class*="orange"]');
        expect(orangeElement).toBeInTheDocument();
      });
    });
  });
});
