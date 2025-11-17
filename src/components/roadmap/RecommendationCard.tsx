'use client';

/**
 * Recommendation Card Component
 *
 * Displays a single roadmap suggestion with:
 * - Priority badge and score
 * - Theme name and metrics
 * - Scoring breakdown visualization
 * - AI reasoning (expandable)
 * - Manual override controls
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Pin,
  MoreVertical,
  Sparkles,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface RecommendationCardProps {
  suggestion: any;
  projectId: string;
  onUpdate: () => void;
}

export function RecommendationCard({
  suggestion,
  projectId,
  onUpdate
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const priorityColors = {
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/10',
      border: 'border-red-200 dark:border-red-800',
      badge: 'bg-red-500 text-white',
      text: 'text-red-700 dark:text-red-300'
    },
    high: {
      bg: 'bg-orange-50 dark:bg-orange-900/10',
      border: 'border-orange-200 dark:border-orange-800',
      badge: 'bg-orange-500 text-white',
      text: 'text-orange-700 dark:text-orange-300'
    },
    medium: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
      border: 'border-yellow-200 dark:border-yellow-800',
      badge: 'bg-yellow-500 text-white',
      text: 'text-yellow-700 dark:text-yellow-300'
    },
    low: {
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-500 text-white',
      text: 'text-blue-700 dark:text-blue-300'
    }
  };

  const colors = priorityColors[suggestion.priority_level as keyof typeof priorityColors];

  const handlePinToggle = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/roadmap/${suggestion.id}/override`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pinned: !suggestion.pinned
        })
      });

      if (response.ok) {
        toast.success(suggestion.pinned ? 'Unpinned' : 'Pinned to top');
        onUpdate();
      }
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const scoreToPercent = (score: number) => Math.round(Number(score) * 100);

  return (
    <div
      id={`suggestion-${suggestion.id}`}
      className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-6 transition-all hover:shadow-md`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {suggestion.pinned && (
              <Pin className="w-4 h-4 text-gray-600 fill-current" />
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colors.badge}`}>
              {suggestion.priority_level.toUpperCase()} - {Math.round(suggestion.priority_score)}/100
            </span>
            <span className="text-sm text-gray-500">
              {suggestion.themes?.frequency || 0} mentions
            </span>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {suggestion.themes?.theme_name || 'Unknown Theme'}
          </h3>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Sentiment: {Number(suggestion.themes?.avg_sentiment || 0).toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              First seen: {new Date(suggestion.themes?.first_seen).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePinToggle}
            disabled={loading}
            title={suggestion.pinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className={`w-4 h-4 ${suggestion.pinned ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Scoring Breakdown */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Scoring Breakdown:
        </h4>

        {[
          { label: 'Frequency', score: suggestion.frequency_score, icon: Users },
          { label: 'Sentiment', score: suggestion.sentiment_score, icon: TrendingUp },
          { label: 'Business Impact', score: suggestion.business_impact_score, icon: Zap },
          { label: 'Effort', score: suggestion.effort_score, icon: Sparkles },
          { label: 'Competitive', score: suggestion.competitive_score, icon: TrendingUp }
        ].map(({ label, score, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-gray-500" />
            <span className="text-sm w-32 text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${scoreToPercent(score)}%` }}
              />
            </div>
            <span className="text-sm font-medium w-12 text-right text-gray-700 dark:text-gray-300">
              {scoreToPercent(score)}%
            </span>
          </div>
        ))}
      </div>

      {/* AI Reasoning (Expandable) */}
      {suggestion.reasoning_text && (
        <div className="border-t pt-4 mt-4">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Strategic Analysis
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {expanded && (
            <div className="mt-4 space-y-4 text-sm">
              {suggestion.why_matters && (
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Why This Matters Now:
                  </h5>
                  <p className="text-gray-700 dark:text-gray-300">{suggestion.why_matters}</p>
                </div>
              )}

              {suggestion.business_impact_text && (
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Business Impact:
                  </h5>
                  <p className="text-gray-700 dark:text-gray-300">
                    {suggestion.business_impact_text}
                  </p>
                </div>
              )}

              {suggestion.implementation_strategy && (
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Implementation Strategy:
                  </h5>
                  <p className="text-gray-700 dark:text-gray-300">
                    {suggestion.implementation_strategy}
                  </p>
                </div>
              )}

              {suggestion.recommendation_text && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Recommendation:
                  </h5>
                  <p className="text-blue-800 dark:text-blue-200">
                    {suggestion.recommendation_text}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
