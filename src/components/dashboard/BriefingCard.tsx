/**
 * BriefingCard - Main hero card displaying the AI-generated daily briefing
 */

'use client';

import React from 'react';
import { BentoCard } from './BentoCard';
import { Sparkles, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyBriefingContent } from '@/lib/ai/mission-control';

interface BriefingCardProps {
  briefing: DailyBriefingContent;
  userName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function BriefingCard({ briefing, userName, onRefresh, isRefreshing }: BriefingCardProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const actionIcons = {
    draft_spec: '📝',
    view_competitor: '🔍',
    review_feedback: '💬',
    update_roadmap: '🗺️',
    review_auto_spec: '🤖', // Auto-generated spec
  } as const;

  return (
    <BentoCard colSpan={2} rowSpan={2} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {getGreeting()}{userName ? `, ${userName}` : ''}
            </h2>
            <p className="text-sm text-slate-400">Daily Intelligence Briefing</p>
          </div>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
            title="Regenerate briefing"
          >
            <RefreshCw className={cn('h-5 w-5', isRefreshing && 'animate-spin')} />
          </button>
        )}
      </div>

      {/* Briefing Text */}
      <div className="text-base leading-relaxed text-slate-200">
        {briefing.briefing_text}
      </div>

      {/* Critical Alerts */}
      {briefing.critical_alerts.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>Critical Alerts</span>
          </div>
          <ul className="space-y-2">
            {briefing.critical_alerts.map((alert, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-2 text-sm text-red-200"
              >
                <span className="mt-0.5">🔴</span>
                <span>{alert}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      {briefing.recommended_actions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-400">
            <Zap className="h-4 w-4" />
            <span>Recommended Actions</span>
          </div>
          <div className="grid gap-2">
            {briefing.recommended_actions.slice(0, 3).map((action, index) => {
              const Component = action.link ? 'a' : 'button';
              const linkProps = action.link ? { href: action.link } : {};

              return (
                <Component
                  key={index}
                  {...linkProps}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-all cursor-pointer',
                    action.priority === 'high'
                      ? 'border-green-800 bg-green-950/30 hover:bg-green-950/50 hover:border-green-700'
                      : action.priority === 'medium'
                      ? 'border-blue-800 bg-blue-950/30 hover:bg-blue-950/50 hover:border-blue-700'
                      : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{actionIcons[action.action as keyof typeof actionIcons] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white flex items-center gap-2">
                        <span className="truncate">{action.label}</span>
                        {action.badge && (
                          <span
                            className={cn(
                              'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold flex-shrink-0',
                              action.badge === 'NEW' && 'bg-purple-600 text-white',
                              action.badge === 'HOT' && 'bg-orange-600 text-white',
                              action.badge === 'URGENT' && 'bg-red-600 text-white animate-pulse'
                            )}
                          >
                            {action.badge}
                          </span>
                        )}
                      </div>
                      {action.context && (
                        <div className="text-xs text-slate-400 truncate">{action.context}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        action.priority === 'high'
                          ? 'bg-green-900/50 text-green-300'
                          : action.priority === 'medium'
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-slate-800 text-slate-300'
                      )}
                    >
                      {action.priority}
                    </span>
                  </div>
                </Component>
              );
            })}
          </div>
        </div>
      )}
    </BentoCard>
  );
}
