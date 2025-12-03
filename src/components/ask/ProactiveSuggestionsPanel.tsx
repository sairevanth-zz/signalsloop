/**
 * Proactive Suggestions Panel Component
 * Displays AI-generated proactive suggestions
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  X,
  ChevronRight,
} from 'lucide-react';
import type { ProactiveSuggestion, SuggestionType, SuggestionPriority } from '@/types/ask';

interface ProactiveSuggestionsPanelProps {
  projectId: string;
  onQueryClick?: (query: string) => void;
  className?: string;
}

export function ProactiveSuggestionsPanel({
  projectId,
  onQueryClick,
  className = '',
}: ProactiveSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, [projectId]);

  async function loadSuggestions() {
    try {
      setLoading(true);
      const response = await fetch(`/api/ask/suggestions?projectId=${projectId}&status=active`);
      const data = await response.json();

      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function dismissSuggestion(suggestionId: string) {
    try {
      const response = await fetch(`/api/ask/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
      }
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  }

  function handleQueryClick(suggestion: ProactiveSuggestion) {
    onQueryClick?.(suggestion.query_suggestion);

    // Mark as acted upon
    fetch(`/api/ask/suggestions/${suggestion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'acted_upon' }),
    }).catch(console.error);
  }

  function getIcon(type: SuggestionType) {
    switch (type) {
      case 'sentiment_drop':
        return TrendingDown;
      case 'theme_spike':
        return TrendingUp;
      case 'churn_risk':
        return AlertTriangle;
      case 'opportunity':
        return Target;
      case 'competitor_move':
        return Users;
      default:
        return Lightbulb;
    }
  }

  function getColor(priority: SuggestionPriority) {
    switch (priority) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'blue';
      default:
        return 'slate';
    }
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-slate-400">Loading suggestions...</div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-8 border border-slate-700 rounded-lg bg-slate-800/30">
          <Lightbulb className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No suggestions right now</p>
          <p className="text-xs text-slate-500 mt-1">
            We'll notify you when we detect patterns in your feedback
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <h2 className="text-lg font-semibold text-white">Proactive Insights</h2>
        <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full">
          {suggestions.length}
        </span>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {suggestions.map((suggestion) => {
          const Icon = getIcon(suggestion.suggestion_type);
          const colorClass = getColor(suggestion.priority);

          return (
            <div
              key={suggestion.id}
              className={`border rounded-lg p-4 bg-gradient-to-r transition-all hover:scale-[1.02] ${
                colorClass === 'red'
                  ? 'border-red-500/30 from-red-500/5 to-transparent'
                  : colorClass === 'orange'
                  ? 'border-orange-500/30 from-orange-500/5 to-transparent'
                  : colorClass === 'yellow'
                  ? 'border-yellow-500/30 from-yellow-500/5 to-transparent'
                  : 'border-blue-500/30 from-blue-500/5 to-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      colorClass === 'red'
                        ? 'bg-red-500/10'
                        : colorClass === 'orange'
                        ? 'bg-orange-500/10'
                        : colorClass === 'yellow'
                        ? 'bg-yellow-500/10'
                        : 'bg-blue-500/10'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        colorClass === 'red'
                          ? 'text-red-500'
                          : colorClass === 'orange'
                          ? 'text-orange-500'
                          : colorClass === 'yellow'
                          ? 'text-yellow-500'
                          : 'text-blue-500'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">{suggestion.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          colorClass === 'red'
                            ? 'bg-red-500/20 text-red-400'
                            : colorClass === 'orange'
                            ? 'bg-orange-500/20 text-orange-400'
                            : colorClass === 'yellow'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {suggestion.priority}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 mb-3">{suggestion.description}</p>

                    {/* Action Button */}
                    <button
                      onClick={() => handleQueryClick(suggestion)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        colorClass === 'red'
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                          : colorClass === 'orange'
                          ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400'
                          : colorClass === 'yellow'
                          ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {suggestion.query_suggestion}
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Context Data */}
                    {suggestion.context_data && (
                      <div className="mt-2 text-xs text-slate-500">
                        {Object.entries(suggestion.context_data).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: {typeof value === 'number' ? value.toFixed(1) : String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => dismissSuggestion(suggestion.id)}
                  className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
