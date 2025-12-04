'use client';

import React, { useState } from 'react';
import { FeedbackListProps } from '@/types/stakeholder';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

export function FeedbackList({ items, limit = 5, showSentiment = true, title }: FeedbackListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Handle undefined or empty items gracefully
  if (!items || items.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title || 'Recent Feedback'}
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No feedback items available for this query.</p>
          <p className="text-sm mt-2">Try adjusting your filters or check back later.</p>
        </div>
      </Card>
    );
  }

  const displayItems = items.slice(0, limit);

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.3) return { label: 'Positive', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    if (sentiment < -0.3) return { label: 'Negative', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    return { label: 'Neutral', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title || 'Recent Feedback'}
        </h3>
        <Badge variant="secondary" className="ml-auto">
          {items.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {displayItems.map((item) => {
          const isExpanded = expandedId === item.id;
          const sentimentInfo = item.sentiment !== undefined ? getSentimentLabel(item.sentiment) : null;

          return (
            <div
              key={item.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.title}
                  </h4>

                  {item.content && isExpanded && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {item.content}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {showSentiment && sentimentInfo && (
                      <Badge className={sentimentInfo.color} variant="secondary">
                        {sentimentInfo.label}
                      </Badge>
                    )}

                    {item.themes && item.themes.length > 0 && (
                      <>
                        {item.themes.slice(0, 3).map((theme, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                        {item.themes.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            +{item.themes.length - 3} more
                          </span>
                        )}
                      </>
                    )}

                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {item.content && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {items.length > limit && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
          Showing {limit} of {items.length} items
        </p>
      )}
    </Card>
  );
}
