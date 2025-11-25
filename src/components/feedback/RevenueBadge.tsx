/**
 * RevenueBadge Component
 * Displays customer revenue tier and segment for prioritization
 */

'use client';

import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';

interface RevenueBadgeProps {
  segment?: string | null;
  mrr?: number | null;
  planTier?: string | null;
  showMrr?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RevenueBadge({
  segment,
  mrr,
  planTier,
  showMrr = false,
  size = 'sm',
}: RevenueBadgeProps) {
  // If no data, don't render anything
  if (!segment && !planTier && !mrr) {
    return null;
  }

  // Get segment color and label
  const getSegmentStyle = (seg: string) => {
    switch (seg?.toLowerCase()) {
      case 'enterprise':
        return {
          bg: 'bg-purple-950/50',
          border: 'border-purple-700',
          text: 'text-purple-300',
          label: 'Enterprise',
        };
      case 'mid-market':
        return {
          bg: 'bg-blue-950/50',
          border: 'border-blue-700',
          text: 'text-blue-300',
          label: 'Mid-Market',
        };
      case 'smb':
        return {
          bg: 'bg-green-950/50',
          border: 'border-green-700',
          text: 'text-green-300',
          label: 'SMB',
        };
      default:
        return {
          bg: 'bg-slate-950/50',
          border: 'border-slate-700',
          text: 'text-slate-300',
          label: seg,
        };
    }
  };

  // Get plan tier style
  const getPlanTierStyle = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise':
        return {
          bg: 'bg-purple-950/50',
          border: 'border-purple-700',
          text: 'text-purple-300',
          label: 'Enterprise',
        };
      case 'pro':
        return {
          bg: 'bg-blue-950/50',
          border: 'border-blue-700',
          text: 'text-blue-300',
          label: 'Pro',
        };
      case 'starter':
        return {
          bg: 'bg-green-950/50',
          border: 'border-green-700',
          text: 'text-green-300',
          label: 'Starter',
        };
      case 'free':
        return {
          bg: 'bg-slate-950/50',
          border: 'border-slate-700',
          text: 'text-slate-300',
          label: 'Free',
        };
      default:
        return {
          bg: 'bg-slate-950/50',
          border: 'border-slate-700',
          text: 'text-slate-300',
          label: tier,
        };
    }
  };

  // Size-based styling
  const sizeStyles = {
    sm: {
      text: 'text-xs',
      padding: 'px-2 py-0.5',
      icon: 'h-3 w-3',
    },
    md: {
      text: 'text-sm',
      padding: 'px-2.5 py-1',
      icon: 'h-3.5 w-3.5',
    },
    lg: {
      text: 'text-base',
      padding: 'px-3 py-1.5',
      icon: 'h-4 w-4',
    },
  };

  const style = size && sizeStyles[size] ? sizeStyles[size] : sizeStyles.sm;

  // Prioritize segment over plan tier
  const displaySegment = segment || planTier;
  const segmentStyle = segment
    ? getSegmentStyle(segment)
    : planTier
    ? getPlanTierStyle(planTier)
    : null;

  if (!segmentStyle) {
    return null;
  }

  // Format MRR
  const formatMrr = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* Segment Badge */}
      <span
        className={`
          inline-flex items-center gap-1 rounded-full border
          ${segmentStyle.bg} ${segmentStyle.border} ${segmentStyle.text}
          ${style.padding} ${style.text} font-medium
        `}
      >
        <DollarSign className={style.icon} />
        {segmentStyle.label}
      </span>

      {/* MRR Badge (optional) */}
      {showMrr && mrr && mrr > 0 && (
        <span
          className={`
            inline-flex items-center gap-1 rounded-full border
            border-emerald-700 bg-emerald-950/50 text-emerald-300
            ${style.padding} ${style.text} font-medium
          `}
        >
          <TrendingUp className={style.icon} />
          {formatMrr(mrr)}/mo
        </span>
      )}
    </div>
  );
}

/**
 * Compact version for tight spaces (just icon + segment)
 */
export function CompactRevenueBadge({ segment, planTier }: Omit<RevenueBadgeProps, 'showMrr' | 'size'>) {
  const displaySegment = segment || planTier;

  if (!displaySegment) {
    return null;
  }

  // Color based on segment
  const getColor = () => {
    switch (displaySegment.toLowerCase()) {
      case 'enterprise':
        return 'text-purple-400';
      case 'mid-market':
        return 'text-blue-400';
      case 'smb':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <DollarSign
      className={`h-4 w-4 ${getColor()}`}
      title={`${displaySegment} customer`}
    />
  );
}
