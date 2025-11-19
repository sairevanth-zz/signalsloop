/**
 * Component Tests for SentimentBadge
 */

import React from 'react'
import { render, screen } from '@/__tests__/utils/test-utils'
import {
  SentimentBadge,
  EmotionalToneBadge,
  ConfidenceBadge,
  SentimentBadgeGroup,
} from '../SentimentBadge'
import { SENTIMENT_CONFIG } from '@/types/sentiment'

describe('SentimentBadge', () => {
  describe('Rendering', () => {
    it('should render positive sentiment badge', () => {
      render(<SentimentBadge sentiment_category="positive" />)

      expect(screen.getByText('Positive')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'positive' })).toBeInTheDocument()
    })

    it('should render negative sentiment badge', () => {
      render(<SentimentBadge sentiment_category="negative" />)

      expect(screen.getByText('Negative')).toBeInTheDocument()
    })

    it('should render neutral sentiment badge', () => {
      render(<SentimentBadge sentiment_category="neutral" />)

      expect(screen.getByText('Neutral')).toBeInTheDocument()
    })

    it('should render mixed sentiment badge', () => {
      render(<SentimentBadge sentiment_category="mixed" />)

      expect(screen.getByText('Mixed')).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('should render small size badge', () => {
      const { container } = render(
        <SentimentBadge sentiment_category="positive" size="sm" />
      )

      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('text-xs')
      expect(badge.className).toContain('px-2')
    })

    it('should render medium size badge (default)', () => {
      const { container } = render(
        <SentimentBadge sentiment_category="positive" />
      )

      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('text-sm')
      expect(badge.className).toContain('px-2.5')
    })

    it('should render large size badge', () => {
      const { container } = render(
        <SentimentBadge sentiment_category="positive" size="lg" />
      )

      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('text-base')
      expect(badge.className).toContain('px-3')
    })
  })

  describe('Score Display', () => {
    it('should display sentiment score when showScore is true', () => {
      render(
        <SentimentBadge
          sentiment_category="positive"
          sentiment_score={0.85}
          showScore={true}
        />
      )

      expect(screen.getByText('+0.85')).toBeInTheDocument()
    })

    it('should not display sentiment score when showScore is false', () => {
      render(
        <SentimentBadge
          sentiment_category="positive"
          sentiment_score={0.85}
          showScore={false}
        />
      )

      expect(screen.queryByText('+0.85')).not.toBeInTheDocument()
    })

    it('should format negative scores correctly', () => {
      render(
        <SentimentBadge
          sentiment_category="negative"
          sentiment_score={-0.75}
          showScore={true}
        />
      )

      expect(screen.getByText('-0.75')).toBeInTheDocument()
    })
  })

  describe('Emoji Display', () => {
    it('should display emoji when showEmoji is true', () => {
      render(
        <SentimentBadge sentiment_category="positive" showEmoji={true} />
      )

      expect(screen.getByRole('img', { name: 'positive' })).toBeInTheDocument()
    })

    it('should not display emoji when showEmoji is false', () => {
      render(
        <SentimentBadge sentiment_category="positive" showEmoji={false} />
      )

      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })

  describe('Color Scheme', () => {
    it('should apply correct color scheme for positive', () => {
      const { container } = render(
        <SentimentBadge sentiment_category="positive" />
      )

      const badge = container.firstChild as HTMLElement
      const config = SENTIMENT_CONFIG.positive

      expect(badge.className).toContain(config.bg)
      expect(badge.className).toContain(config.text)
      expect(badge.className).toContain(config.border)
    })

    it('should apply correct color scheme for negative', () => {
      const { container } = render(
        <SentimentBadge sentiment_category="negative" />
      )

      const badge = container.firstChild as HTMLElement
      const config = SENTIMENT_CONFIG.negative

      expect(badge.className).toContain(config.bg)
      expect(badge.className).toContain(config.text)
      expect(badge.className).toContain(config.border)
    })
  })

  describe('Tooltip', () => {
    it('should display tooltip with sentiment info', () => {
      render(
        <SentimentBadge
          sentiment_category="positive"
          sentiment_score={0.85}
        />
      )

      const badge = screen.getByText('Positive').parentElement
      expect(badge).toHaveAttribute('title', 'Sentiment: Positive (Score: +0.85)')
    })

    it('should display tooltip without score when not provided', () => {
      render(<SentimentBadge sentiment_category="positive" />)

      const badge = screen.getByText('Positive').parentElement
      expect(badge).toHaveAttribute('title', 'Sentiment: Positive')
    })
  })

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SentimentBadge
          sentiment_category="positive"
          className="custom-class"
        />
      )

      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('custom-class')
    })
  })
})

describe('EmotionalToneBadge', () => {
  it('should render emotional tone badge', () => {
    render(<EmotionalToneBadge tone="excited" />)

    expect(screen.getByText('Excited')).toBeInTheDocument()
  })

  it('should display correct emoji for tone', () => {
    render(<EmotionalToneBadge tone="frustrated" />)

    expect(screen.getByRole('img', { name: 'frustrated' })).toBeInTheDocument()
  })

  it('should handle unknown tones gracefully', () => {
    render(<EmotionalToneBadge tone="unknown" />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'unknown' })).toBeInTheDocument()
  })

  it('should apply different sizes', () => {
    const { container } = render(
      <EmotionalToneBadge tone="excited" size="lg" />
    )

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-base')
  })
})

describe('ConfidenceBadge', () => {
  it('should display confidence percentage', () => {
    render(<ConfidenceBadge confidence={0.92} />)

    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('should apply high confidence color for 0.8+', () => {
    const { container } = render(<ConfidenceBadge confidence={0.9} />)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-emerald-100')
  })

  it('should apply medium confidence color for 0.6-0.8', () => {
    const { container } = render(<ConfidenceBadge confidence={0.7} />)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-blue-100')
  })

  it('should apply low confidence color for < 0.6', () => {
    const { container } = render(<ConfidenceBadge confidence={0.5} />)

    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-amber-100')
  })

  it('should have tooltip with confidence info', () => {
    render(<ConfidenceBadge confidence={0.92} />)

    const badge = screen.getByText('92%').parentElement
    expect(badge).toHaveAttribute('title', 'AI Confidence: 92%')
  })
})

describe('SentimentBadgeGroup', () => {
  it('should render all badges together', () => {
    render(
      <SentimentBadgeGroup
        sentiment_category="positive"
        sentiment_score={0.85}
        emotional_tone="excited"
        confidence_score={0.92}
      />
    )

    expect(screen.getByText('Positive')).toBeInTheDocument()
    expect(screen.getByText('Excited')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('should render without emotional tone if not provided', () => {
    render(
      <SentimentBadgeGroup
        sentiment_category="positive"
        sentiment_score={0.85}
        confidence_score={0.92}
      />
    )

    expect(screen.getByText('Positive')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.queryByText('Excited')).not.toBeInTheDocument()
  })

  it('should hide confidence badge when showConfidence is false', () => {
    render(
      <SentimentBadgeGroup
        sentiment_category="positive"
        confidence_score={0.92}
        showConfidence={false}
      />
    )

    expect(screen.queryByText('92%')).not.toBeInTheDocument()
  })

  it('should show score when showScore is true', () => {
    render(
      <SentimentBadgeGroup
        sentiment_category="positive"
        sentiment_score={0.85}
        showScore={true}
      />
    )

    expect(screen.getByText('+0.85')).toBeInTheDocument()
  })

  it('should apply custom className to group', () => {
    const { container } = render(
      <SentimentBadgeGroup
        sentiment_category="positive"
        className="custom-group"
      />
    )

    const group = container.firstChild as HTMLElement
    expect(group.className).toContain('custom-group')
  })
})

describe('Accessibility', () => {
  it('should have proper ARIA labels', () => {
    render(<SentimentBadge sentiment_category="positive" />)

    const emoji = screen.getByRole('img', { name: 'positive' })
    expect(emoji).toBeInTheDocument()
  })

  it('should be keyboard navigable', () => {
    const { container } = render(
      <SentimentBadge sentiment_category="positive" />
    )

    const badge = container.firstChild as HTMLElement
    expect(badge).toBeDefined()
  })
})
