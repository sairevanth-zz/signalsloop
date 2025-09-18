'use client';

import { useEffect, useState } from 'react';
import { initializePostHog, analytics } from '@/lib/analytics';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Initialize PostHog only on client side
    if (typeof window !== 'undefined') {
      initializePostHog();
    }
  }, []);

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
