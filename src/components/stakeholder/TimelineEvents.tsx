'use client';

import React, { useState } from 'react';
import { TimelineEventsProps, TimelineEvent } from '@/types/stakeholder';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Rocket, TrendingUp, AlertCircle, Target, Bug } from 'lucide-react';

export function TimelineEvents({ events, filterByType, title }: TimelineEventsProps) {
  const [filter, setFilter] = useState<TimelineEvent['type'] | 'all'>('all');

  const eventIcons = {
    feature_launch: Rocket,
    feedback_spike: TrendingUp,
    competitor_move: AlertCircle,
    milestone: Target,
    issue: Bug,
  };

  const eventColors = {
    feature_launch: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    feedback_spike: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    competitor_move: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    milestone: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    issue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const severityColors = {
    critical: 'border-red-500 dark:border-red-600',
    high: 'border-orange-500 dark:border-orange-600',
    medium: 'border-yellow-500 dark:border-yellow-600',
    low: 'border-blue-500 dark:border-blue-600',
  };

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const displayEvents = filterByType
    ? events.filter((e) => filterByType.includes(e.type))
    : filteredEvents;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title || 'Timeline'}
          </h3>
        </div>

        {!filterByType && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            {Object.keys(eventIcons).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={filter === type ? 'default' : 'outline'}
                onClick={() => setFilter(type as TimelineEvent['type'])}
                className="hidden sm:inline-flex"
              >
                {type.replace('_', ' ')}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Events */}
        <div className="space-y-4">
          {displayEvents.map((event) => {
            const Icon = eventIcons[event.type];
            const eventColor = eventColors[event.type];
            const severityBorder = event.severity ? severityColors[event.severity] : '';

            return (
              <div key={event.id} className="relative pl-12">
                {/* Icon */}
                <div
                  className={`absolute left-0 top-1 p-2 rounded-full ${eventColor} shadow-md`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div
                  className={`border-l-4 ${severityBorder || 'border-gray-300 dark:border-gray-600'} pl-4 pb-4`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {event.title}
                    </h4>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {new Date(event.date).toLocaleDateString()}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge className={eventColor} variant="secondary">
                      {event.type.replace('_', ' ')}
                    </Badge>
                    {event.severity && (
                      <Badge variant="outline" className="text-xs">
                        {event.severity}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {displayEvents.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-500 py-8">
          No events found for the selected filter.
        </p>
      )}
    </Card>
  );
}
