import posthog from 'posthog-js';

// Initialize PostHog (call this in your _app.tsx)
export const initializePostHog = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      // Enable in production only
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug();
      },
      // Capture pageviews automatically
      capture_pageview: true,
      // Respect user privacy
      respect_dnt: true,
    });
  }
};

// Event tracking functions
export const analytics = {
  // User lifecycle events
  signup: (properties?: Record<string, unknown>) => {
    posthog.capture('signup', {
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  createProject: (projectId: string, properties?: Record<string, unknown>) => {
    posthog.capture('create_project', {
      project_id: projectId,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // Engagement events
  viewBoard: (projectSlug: string, boardId: string, properties?: Record<string, unknown>) => {
    posthog.capture('view_board', {
      project_slug: projectSlug,
      board_id: boardId,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  submitPost: (postId: string, projectId: string, source: 'web' | 'widget', properties?: Record<string, unknown>) => {
    posthog.capture('submit_post', {
      post_id: postId,
      project_id: projectId,
      source,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  vote: (postId: string, projectId: string, properties?: Record<string, unknown>) => {
    posthog.capture('vote', {
      post_id: postId,
      project_id: projectId,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  voteOnBehalf: (postId: string, projectId: string, priority: string, properties?: Record<string, unknown>) => {
    posthog.capture('vote_on_behalf', {
      post_id: postId,
      project_id: projectId,
      priority,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  addComment: (postId: string, commentId: string, properties?: Record<string, unknown>) => {
    posthog.capture('add_comment', {
      post_id: postId,
      comment_id: commentId,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // Admin events
  statusChange: (postId: string, oldStatus: string, newStatus: string, properties?: Record<string, unknown>) => {
    posthog.capture('status_change', {
      post_id: postId,
      old_status: oldStatus,
      new_status: newStatus,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  postModerated: (postId: string, action: string, properties?: Record<string, unknown>) => {
    posthog.capture('post_moderated', {
      post_id: postId,
      action,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // Widget events
  widgetOpen: (projectId: string, domain: string, properties?: Record<string, unknown>) => {
    posthog.capture('widget_open', {
      project_id: projectId,
      domain,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  widgetSubmit: (postId: string, projectId: string, domain: string, properties?: Record<string, unknown>) => {
    posthog.capture('widget_submit', {
      post_id: postId,
      project_id: projectId,
      domain,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // Business events
  startCheckout: (projectId: string, plan: string, properties?: Record<string, unknown>) => {
    posthog.capture('start_checkout', {
      project_id: projectId,
      plan,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  purchase: (projectId: string, plan: string, amount: number, properties?: Record<string, unknown>) => {
    posthog.capture('purchase', {
      project_id: projectId,
      plan,
      amount,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // Custom domain events
  domainAdded: (projectId: string, domain: string, properties?: Record<string, unknown>) => {
    posthog.capture('domain_added', {
      project_id: projectId,
      domain,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // Import events
  dataImported: (projectId: string, rowCount: number, successCount: number, properties?: Record<string, unknown>) => {
    posthog.capture('data_imported', {
      project_id: projectId,
      row_count: rowCount,
      success_count: successCount,
      error_count: rowCount - successCount,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // User identification
  identify: (userId: string, properties?: Record<string, unknown>) => {
    posthog.identify(userId, {
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // Page tracking
  page: (pageName: string, properties?: Record<string, unknown>) => {
    posthog.capture('$pageview', {
      page_name: pageName,
      timestamp: new Date().toISOString(),
      ...properties
    });
  }
};

// React hook for tracking events
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export const useAnalytics = () => {
  const pathname = usePathname();

  // Track page views automatically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      analytics.page(pathname);
    }
  }, [pathname]);

  // Return analytics object for manual tracking
  return analytics;
};

// HOC to wrap components with analytics
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  eventName?: string
) {
  return function AnalyticsWrapper(props: P) {
    useEffect(() => {
      if (eventName) {
        posthog.capture(eventName, {
          component: Component.name,
          timestamp: new Date().toISOString()
        });
      }
    }, []);

    return <Component {...props} />;
  };
}
