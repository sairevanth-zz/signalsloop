'use client';

import React from 'react';
import { SummaryTextProps } from '@/types/stakeholder';
import { Card } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

export function SummaryText({ content, sources }: SummaryTextProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {sources && sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Sources:
          </p>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, idx) => (
              <a
                key={idx}
                href={`/feedback/${source.id}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded-md border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                title={source.preview}
              >
                <span className="capitalize">{source.type}</span>
                {source.title && (
                  <span className="text-gray-600 dark:text-gray-400">
                    • {source.title.substring(0, 30)}
                    {source.title.length > 30 ? '...' : ''}
                  </span>
                )}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
