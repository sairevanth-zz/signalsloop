/**
 * TourTrigger - Button component to manually start a tour
 */

'use client';

import React from 'react';
import { HelpCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTour } from './TourProvider';
import { getTourById } from '@/lib/tours/tour-definitions';

interface TourTriggerProps {
  tourId: string;
  variant?: 'icon' | 'button' | 'text';
  className?: string;
  children?: React.ReactNode;
}

export function TourTrigger({
  tourId,
  variant = 'icon',
  className,
  children,
}: TourTriggerProps) {
  const { startTour, isActive } = useTour();
  const tour = getTourById(tourId);

  if (!tour) {
    return null;
  }

  const handleClick = () => {
    if (!isActive) {
      startTour(tourId);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isActive}
        className={cn(
          'p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50',
          className
        )}
        title={`Start ${tour.name} tour`}
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        disabled={isActive}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors',
          className
        )}
      >
        <PlayCircle className="w-4 h-4" />
        {children || `Start ${tour.name}`}
      </button>
    );
  }

  // Text variant
  return (
    <button
      onClick={handleClick}
      disabled={isActive}
      className={cn(
        'text-sm text-purple-400 hover:text-purple-300 underline transition-colors disabled:opacity-50',
        className
      )}
    >
      {children || `Take the ${tour.name} tour`}
    </button>
  );
}

/**
 * TourList - Display all available tours
 */
interface TourListProps {
  category?: 'onboarding' | 'feature' | 'update';
  className?: string;
}

export function TourList({ category, className }: TourListProps) {
  const { startTour, isActive } = useTour();

  const tours = category
    ? Object.values(require('@/lib/tours/tour-definitions').TOURS).filter(
        (t: any) => t.category === category
      )
    : Object.values(require('@/lib/tours/tour-definitions').TOURS);

  return (
    <div className={cn('space-y-2', className)}>
      {tours.map((tour: any) => (
        <button
          key={tour.id}
          onClick={() => startTour(tour.id)}
          disabled={isActive}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50"
        >
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <PlayCircle className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-white">{tour.name}</p>
            <p className="text-sm text-slate-400">{tour.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
