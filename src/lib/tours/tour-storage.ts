/**
 * Tour Storage
 * Handles persistence of tour completion state
 */

import { getSupabaseServerClient } from '@/lib/supabase-client';

const LOCAL_STORAGE_KEY = 'signalsloop-tour-progress';

export interface TourProgress {
  tourId: string;
  version: number;
  completedAt?: string;
  skippedAt?: string;
  currentStep?: number;
  lastViewedAt?: string;
}

export interface UserTourProgress {
  [tourId: string]: TourProgress;
}

/**
 * Get tour progress from local storage (client-side)
 */
export function getLocalTourProgress(): UserTourProgress {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save tour progress to local storage (client-side)
 */
export function saveLocalTourProgress(progress: UserTourProgress): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('[Tour] Error saving progress to localStorage:', error);
  }
}

/**
 * Mark tour as completed in local storage
 */
export function markTourCompleted(tourId: string, version: number = 1): void {
  const progress = getLocalTourProgress();
  progress[tourId] = {
    tourId,
    version,
    completedAt: new Date().toISOString(),
    lastViewedAt: new Date().toISOString(),
  };
  saveLocalTourProgress(progress);
}

/**
 * Mark tour as skipped in local storage
 */
export function markTourSkipped(tourId: string, version: number = 1, step?: number): void {
  const progress = getLocalTourProgress();
  progress[tourId] = {
    tourId,
    version,
    skippedAt: new Date().toISOString(),
    currentStep: step,
    lastViewedAt: new Date().toISOString(),
  };
  saveLocalTourProgress(progress);
}

/**
 * Update current step progress
 */
export function updateTourStep(tourId: string, step: number, version: number = 1): void {
  const progress = getLocalTourProgress();
  progress[tourId] = {
    ...progress[tourId],
    tourId,
    version,
    currentStep: step,
    lastViewedAt: new Date().toISOString(),
  };
  saveLocalTourProgress(progress);
}

/**
 * Check if tour should be shown
 */
export function shouldShowTour(tourId: string, version: number = 1): boolean {
  const progress = getLocalTourProgress();
  const tourProgress = progress[tourId];

  if (!tourProgress) {
    return true; // Never seen
  }

  if (tourProgress.version < version) {
    return true; // New version
  }

  if (tourProgress.completedAt) {
    return false; // Already completed
  }

  // Show if started but not completed (allow resume)
  return true;
}

/**
 * Reset tour progress (useful for testing or re-onboarding)
 */
export function resetTourProgress(tourId?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (tourId) {
    const progress = getLocalTourProgress();
    delete progress[tourId];
    saveLocalTourProgress(progress);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

/**
 * Sync tour progress to server (for persistence across devices)
 */
export async function syncTourProgressToServer(
  userId: string,
  progress: UserTourProgress
): Promise<boolean> {
  try {
    const response = await fetch('/api/tours/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Tour] Error syncing progress to server:', error);
    return false;
  }
}

/**
 * Load tour progress from server
 */
export async function loadTourProgressFromServer(
  userId: string
): Promise<UserTourProgress | null> {
  try {
    const response = await fetch('/api/tours/progress');
    if (response.ok) {
      const data = await response.json();
      return data.progress;
    }
    return null;
  } catch (error) {
    console.error('[Tour] Error loading progress from server:', error);
    return null;
  }
}

/**
 * Server-side: Save tour progress to database
 */
export async function saveTourProgressToDatabase(
  userId: string,
  progress: UserTourProgress
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        tour_progress: progress,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

  if (error) {
    console.error('[Tour] Error saving to database:', error);
    return false;
  }

  return true;
}

/**
 * Server-side: Get tour progress from database
 */
export async function getTourProgressFromDatabase(
  userId: string
): Promise<UserTourProgress | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('tour_progress')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.tour_progress as UserTourProgress;
}
