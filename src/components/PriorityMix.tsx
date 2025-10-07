'use client';

import React from 'react';
import clsx from 'clsx';

interface PriorityCounts {
  mustHave: number;
  important: number;
  niceToHave: number;
}

const PRIORITY_META = {
  mustHave: {
    label: 'Must Have',
    shortLabel: 'Must',
    emoji: '🔴',
    color: '#EF4444',
    softBg: '#FEE2E2',
    text: '#991B1B',
    border: '#FECACA',
  },
  important: {
    label: 'Important',
    shortLabel: 'Important',
    emoji: '🟡',
    color: '#F59E0B',
    softBg: '#FEF3C7',
    text: '#92400E',
    border: '#FDE68A',
  },
  niceToHave: {
    label: 'Nice to Have',
    shortLabel: 'Nice',
    emoji: '🟢',
    color: '#10B981',
    softBg: '#D1FAE5',
    text: '#065F46',
    border: '#A7F3D0',
  },
} as const;

type PriorityKey = keyof PriorityCounts;

const PRIORITY_ORDER: PriorityKey[] = ['mustHave', 'important', 'niceToHave'];

export const getPriorityTotals = (counts: PriorityCounts) =>
  PRIORITY_ORDER.reduce((sum, key) => sum + (counts[key] || 0), 0);

interface PriorityMixCompactProps extends PriorityCounts {
  className?: string;
  align?: 'start' | 'center' | 'end';
  'data-testid'?: string;
}

export function PriorityMixCompact({
  mustHave,
  important,
  niceToHave,
  className,
  align = 'end',
  ...rest
}: PriorityMixCompactProps) {
  const total = getPriorityTotals({ mustHave, important, niceToHave });
  if (total === 0) return null;

  const ariaLabel = `Priority mix: ${mustHave} must-have votes, ${important} important votes, ${niceToHave} nice-to-have votes`;

  return (
    <span
      className={clsx(
        'flex flex-wrap items-center gap-1 text-xs text-gray-700',
        align === 'start' ? 'justify-start' : align === 'center' ? 'justify-center' : 'justify-end',
        className
      )}
      aria-label={ariaLabel}
      {...rest}
    >
      <span>
        {PRIORITY_META.mustHave.emoji} {mustHave}
      </span>
      <span className="text-gray-400">·</span>
      <span>
        {PRIORITY_META.important.emoji} {important}
      </span>
      <span className="text-gray-400">·</span>
      <span>
        {PRIORITY_META.niceToHave.emoji} {niceToHave}
      </span>
    </span>
  );
}

interface PriorityMixBarProps extends PriorityCounts {
  className?: string;
  size?: 'sm' | 'md';
  showLegend?: boolean;
  layout?: 'side' | 'vertical';
  totalOverride?: number;
}

export function PriorityMixBar({
  mustHave,
  important,
  niceToHave,
  className,
  size = 'md',
  showLegend = true,
  layout = 'vertical',
  totalOverride,
}: PriorityMixBarProps) {
  const counts = { mustHave, important, niceToHave };
  const total = totalOverride ?? getPriorityTotals(counts);
  if (total === 0) return null;

  const segments = PRIORITY_ORDER.map((key) => {
    const count = counts[key];
    const width = total > 0 ? Math.max((count / total) * 100, count > 0 ? 6 : 0) : 0;
    return {
      key,
      count,
      width,
    };
  });

  const barHeight = size === 'sm' ? 'h-2.5' : 'h-3.5';
  const ariaLabel = `Priority mix bar showing ${mustHave} must-have, ${important} important, and ${niceToHave} nice-to-have votes`;

  return (
    <div
      className={clsx(
        'flex w-full flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm',
        className
      )}
      aria-label={ariaLabel}
    >
      <div className={clsx('flex w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100')}>
        {segments.map(({ key, count, width }) => {
          if (count === 0) return null;
          const meta = PRIORITY_META[key];
          return (
            <div
              key={key}
              className={barHeight}
              style={{ width: `${width}%`, backgroundColor: meta.color }}
              role="presentation"
            />
          );
        })}
      </div>

      {showLegend && (
        <div
          className={clsx(
            'flex flex-wrap gap-2 text-xs text-gray-600',
            layout === 'side' ? 'items-center justify-between' : 'flex-col'
          )}
        >
          {segments.map(({ key, count }) => {
            if (count === 0 && total > 0 && count / total < 0.05) {
              // Still show very small segments for clarity
              // but mark as <5%
            }
            const meta = PRIORITY_META[key];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <span
                key={key}
                className="flex min-w-[100px] items-center gap-1 rounded-full border px-2 py-1"
                style={{
                  backgroundColor: meta.softBg,
                  color: meta.text,
                  borderColor: meta.border,
                }}
              >
                <span aria-hidden="true">{meta.emoji}</span>
                <span className="font-medium">{count}</span>
                <span className="text-gray-400">({pct}%)</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { PriorityCounts };
