'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { initializePostHog, analytics } from '@/lib/analytics';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize PostHog
    initializePostHog();
  }, []);

  useEffect(() => {
    // Identify user when they log in
    if (user?.id) {
      analytics.identify(user.id, {
        email: user.email,
        plan: (user as any).plan || 'free',
        created_at: user.created_at,
      });
    }
  }, [user]);

  return <>{children}</>;
}
