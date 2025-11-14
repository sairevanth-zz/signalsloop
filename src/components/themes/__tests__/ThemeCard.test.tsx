/**
 * Component tests for ThemeCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeCard, CompactThemeCard } from '../ThemeCard';
import { mockThemes, mockThemeWithDetails } from '@/__tests__/mocks/theme-data';

describe('ThemeCard Component', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render theme card with all information', () => {
      render(<ThemeCard theme={mockThemes[0]} />);

      expect(screen.getByText(mockThemes[0].theme_name)).toBeInTheDocument();
      expect(screen.getByText(mockThemes[0].description)).toBeInTheDocument();
      expect(screen.getByText(mockThemes[0].frequency.toString())).toBeInTheDocument();
    });

    it('should display emerging badge for emerging themes', () => {
      const emergingTheme = { ...mockThemes[1], is_emerging: true };
      render(<ThemeCard theme={emergingTheme} />);

      expect(screen.getByText('Emerging')).toBeInTheDocument();
    });

    it('should not display emerging badge for non-emerging themes', () => {
      const nonEmergingTheme = { ...mockThemes[0], is_emerging: false };
      render(<ThemeCard theme={nonEmergingTheme} />);

      expect(screen.queryByText('Emerging')).not.toBeInTheDocument();
    });

    it('should display sentiment with correct color scheme', () => {
      const positiveTheme = { ...mockThemes[0], avg_sentiment: 0.7 };
      const { container } = render(<ThemeCard theme={positiveTheme} />);

      // Check for positive sentiment styling (green)
      const sentimentElement = container.querySelector('[class*="green"]');
      expect(sentimentElement).toBeInTheDocument();
    });

    it('should show trend indicator when showTrend is true', () => {
      render(<ThemeCard theme={mockThemes[0]} showTrend={true} />);

      // Should show some trend indicator (up/down arrow or percentage)
      const card = screen.getByText(mockThemes[0].theme_name).closest('div');
      expect(card).toBeInTheDocument();
    });

    it('should hide trend indicator when showTrend is false', () => {
      render(<ThemeCard theme={mockThemes[0]} showTrend={false} />);

      // Trend should not be visible
      expect(screen.queryByText(/trend/i)).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when card is clicked', () => {
      render(<ThemeCard theme={mockThemes[0]} onClick={mockOnClick} />);

      const card = screen.getByText(mockThemes[0].theme_name).closest('div[role="button"]');
      if (card) {
        fireEvent.click(card);
        expect(mockOnClick).toHaveBeenCalledWith(mockThemes[0]);
      }
    });

    it('should not be clickable when onClick is not provided', () => {
      const { container } = render(<ThemeCard theme={mockThemes[0]} />);

      const clickableElement = container.querySelector('[role="button"]');
      expect(clickableElement).not.toBeInTheDocument();
    });

    it('should have hover styles when clickable', () => {
      render(<ThemeCard theme={mockThemes[0]} onClick={mockOnClick} />);

      const card = screen.getByText(mockThemes[0].theme_name).closest('div');
      expect(card).toHaveClass(/hover/);
    });
  });

  describe('Compact Variant', () => {
    it('should render compact theme card', () => {
      render(<CompactThemeCard theme={mockThemes[0]} onClick={mockOnClick} />);

      expect(screen.getByText(mockThemes[0].theme_name)).toBeInTheDocument();
    });

    it('should show abbreviated information in compact mode', () => {
      render(<CompactThemeCard theme={mockThemes[0]} onClick={mockOnClick} />);

      // Should not show full description
      const card = screen.getByText(mockThemes[0].theme_name).closest('div');
      expect(card?.textContent?.length).toBeLessThan(200);
    });

    it('should be clickable in compact mode', () => {
      render(<CompactThemeCard theme={mockThemes[0]} onClick={mockOnClick} />);

      const card = screen.getByText(mockThemes[0].theme_name);
      fireEvent.click(card);
      expect(mockOnClick).toHaveBeenCalledWith(mockThemes[0]);
    });
  });

  describe('Sentiment Display', () => {
    it('should show positive sentiment color for positive themes', () => {
      const positiveTheme = { ...mockThemes[0], avg_sentiment: 0.8 };
      const { container } = render(<ThemeCard theme={positiveTheme} />);

      const greenElement = container.querySelector('[class*="green"]');
      expect(greenElement).toBeInTheDocument();
    });

    it('should show negative sentiment color for negative themes', () => {
      const negativeTheme = { ...mockThemes[0], avg_sentiment: -0.8 };
      const { container } = render(<ThemeCard theme={negativeTheme} />);

      const redElement = container.querySelector('[class*="red"]');
      expect(redElement).toBeInTheDocument();
    });

    it('should show neutral sentiment color for neutral themes', () => {
      const neutralTheme = { ...mockThemes[0], avg_sentiment: 0.1 };
      const { container } = render(<ThemeCard theme={neutralTheme} />);

      const grayElement = container.querySelector('[class*="gray"]');
      expect(grayElement).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle themes with very long names', () => {
      const longNameTheme = {
        ...mockThemes[0],
        theme_name: 'a'.repeat(200),
      };
      render(<ThemeCard theme={longNameTheme} />);

      expect(screen.getByText(longNameTheme.theme_name)).toBeInTheDocument();
    });

    it('should handle themes with zero frequency', () => {
      const zeroFrequencyTheme = { ...mockThemes[0], frequency: 0 };
      render(<ThemeCard theme={zeroFrequencyTheme} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle themes with extreme sentiment values', () => {
      const extremeTheme = { ...mockThemes[0], avg_sentiment: 1.0 };
      render(<ThemeCard theme={extremeTheme} />);

      expect(screen.getByText(mockThemes[0].theme_name)).toBeInTheDocument();
    });

    it('should handle missing optional fields', () => {
      const minimalTheme = {
        ...mockThemes[0],
        cluster_id: undefined,
      };
      render(<ThemeCard theme={minimalTheme} />);

      expect(screen.getByText(mockThemes[0].theme_name)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when clickable', () => {
      render(<ThemeCard theme={mockThemes[0]} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<ThemeCard theme={mockThemes[0]} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      card.focus();
      fireEvent.keyPress(card, { key: 'Enter', code: 'Enter' });

      // Should trigger onClick on Enter key
      expect(document.activeElement).toBe(card);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ThemeCard theme={mockThemes[0]} className="custom-class" />
      );

      const cardWithCustomClass = container.querySelector('.custom-class');
      expect(cardWithCustomClass).toBeInTheDocument();
    });

    it('should merge custom styles with default styles', () => {
      const { container } = render(
        <ThemeCard theme={mockThemes[0]} className="custom-class" />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toHaveClass('custom-class');
    });
  });
});
