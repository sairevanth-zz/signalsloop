'use client';

import React from 'react';
import {
  SentimentBadgeProps,
  SENTIMENT_CONFIG,
  EMOTIONAL_TONE_EMOJI,
} from '@/types/sentiment';

/**
 * SentimentBadge Component
 * Displays a color-coded badge showing the sentiment of feedback
 *
 * @example
 * <SentimentBadge
 *   sentiment_category="positive"
 *   sentiment_score={0.8}
 *   size="md"
 *   showScore
 *   showEmoji
 * />
 */
export function SentimentBadge({
  sentiment_category,
  sentiment_score,
  size = 'md',
  showScore = false,
  showEmoji = true,
  className = '',
}: SentimentBadgeProps) {
  const config = SENTIMENT_CONFIG[sentiment_category];

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Format sentiment label
  const label = sentiment_category.charAt(0).toUpperCase() + sentiment_category.slice(1);

  // Format score for display
  const scoreDisplay = sentiment_score !== undefined
    ? `${sentiment_score > 0 ? '+' : ''}${sentiment_score.toFixed(2)}`
    : '';

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${config.bg} ${config.text} ${config.border}
        ${sizeClasses[size]}
        ${className}
      `}
      title={
        sentiment_score !== undefined
          ? `Sentiment: ${label} (Score: ${scoreDisplay})`
          : `Sentiment: ${label}`
      }
    >
      {showEmoji && (
        <span className="leading-none" role="img" aria-label={sentiment_category}>
          {config.emoji}
        </span>
      )}
      <span>{label}</span>
      {showScore && sentiment_score !== undefined && (
        <span className="font-mono text-xs opacity-75">
          {scoreDisplay}
        </span>
      )}
    </div>
  );
}

/**
 * EmotionalToneBadge Component
 * Displays a badge showing the emotional tone
 */
export function EmotionalToneBadge({
  tone,
  size = 'sm',
  className = '',
}: {
  tone: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const emoji = EMOTIONAL_TONE_EMOJI[tone.toLowerCase()] || '💭';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const label = tone.charAt(0).toUpperCase() + tone.slice(1);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full
        bg-slate-100 text-slate-700 border border-slate-300
        ${sizeClasses[size]}
        ${className}
      `}
      title={`Emotional tone: ${label}`}
    >
      <span className="leading-none" role="img" aria-label={tone}>
        {emoji}
      </span>
      <span>{label}</span>
    </div>
  );
}

/**
 * ConfidenceBadge Component
 * Displays the AI's confidence in the sentiment analysis
 */
export function ConfidenceBadge({
  confidence,
  size = 'sm',
  className = '',
}: {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Determine color based on confidence
  let colorClasses = 'bg-gray-100 text-gray-700 border-gray-300';
  if (confidence >= 0.8) {
    colorClasses = 'bg-emerald-100 text-emerald-700 border-emerald-300';
  } else if (confidence >= 0.6) {
    colorClasses = 'bg-blue-100 text-blue-700 border-blue-300';
  } else if (confidence >= 0.4) {
    colorClasses = 'bg-amber-100 text-amber-700 border-amber-300';
  }

  const percentage = (confidence * 100).toFixed(0);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border
        ${colorClasses}
        ${sizeClasses[size]}
        ${className}
      `}
      title={`AI Confidence: ${percentage}%`}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="font-mono">{percentage}%</span>
    </div>
  );
}

/**
 * SentimentBadgeGroup Component
 * Displays all sentiment-related badges together
 */
export function SentimentBadgeGroup({
  sentiment_category,
  sentiment_score,
  emotional_tone,
  confidence_score,
  size = 'md',
  showScore = false,
  showConfidence = true,
  className = '',
}: {
  sentiment_category: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentiment_score?: number;
  emotional_tone?: string;
  confidence_score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showConfidence?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <SentimentBadge
        sentiment_category={sentiment_category}
        sentiment_score={sentiment_score}
        size={size}
        showScore={showScore}
      />
      {emotional_tone && (
        <EmotionalToneBadge tone={emotional_tone} size={size} />
      )}
      {showConfidence && confidence_score !== undefined && (
        <ConfidenceBadge confidence={confidence_score} size={size} />
      )}
    </div>
  );
}
