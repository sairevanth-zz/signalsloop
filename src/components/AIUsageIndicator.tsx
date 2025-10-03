'use client';

import React from 'react';
import { Sparkles, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AIUsageIndicatorProps {
  current: number;
  limit: number;
  remaining: number;
  isPro: boolean;
  featureName?: string;
  compact?: boolean;
}

export default function AIUsageIndicator({
  current,
  limit,
  remaining,
  isPro,
  featureName = 'AI feature',
  compact = false
}: AIUsageIndicatorProps) {
  // Don't show for Pro users if they have plenty left
  if (isPro && remaining > limit * 0.5) {
    return null;
  }

  // Calculate percentage used
  const percentageUsed = (current / limit) * 100;

  // Determine color based on usage
  const getColorClass = () => {
    if (percentageUsed >= 90) return 'text-red-600 bg-red-50 border-red-200';
    if (percentageUsed >= 75) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (percentageUsed >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getIcon = () => {
    if (percentageUsed >= 90) return <AlertCircle className="w-3 h-3" />;
    if (percentageUsed >= 50) return <Info className="w-3 h-3" />;
    return <Sparkles className="w-3 h-3" />;
  };

  if (compact) {
    return (
      <Badge variant="outline" className={`${getColorClass()} text-xs flex items-center gap-1 px-2 py-0.5`}>
        {getIcon()}
        <span>{remaining} left</span>
      </Badge>
    );
  }

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${getColorClass()} text-xs sm:text-sm`}>
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium truncate">
            {isPro ? 'Pro Usage' : 'Free Usage'}
          </span>
          <span className="font-semibold whitespace-nowrap">
            {remaining}/{limit}
          </span>
        </div>
        <div className="w-full bg-white/50 rounded-full h-1.5 mb-1">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(percentageUsed, 100)}%`,
              backgroundColor: percentageUsed >= 90 ? '#dc2626' : percentageUsed >= 75 ? '#ea580c' : percentageUsed >= 50 ? '#ca8a04' : '#2563eb'
            }}
          />
        </div>
        <p className="text-xs opacity-90">
          {remaining > 0 ? (
            <>You have {remaining} {featureName} uses remaining this month</>
          ) : (
            <>You've reached your monthly limit. {isPro ? 'Limit resets monthly.' : 'Upgrade to Pro for more!'}</>
          )}
        </p>
      </div>
    </div>
  );
}
