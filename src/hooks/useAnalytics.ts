import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics';

export const useAnalytics = () => {
  const pathname = usePathname();

  // Track page views automatically on route changes
  useEffect(() => {
    analytics.page(pathname);
  }, [pathname]);

  // Return analytics object for manual tracking
  return analytics;
};

// Hook for tracking specific events
export const useEventTracking = () => {
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    analytics.page(eventName, properties);
  }, []);

  return { trackEvent };
};
