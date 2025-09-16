'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { analytics } from '@/lib/analytics';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  // Vote, 
  CreditCard, 
  Upload,
  Globe,
  Target,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function PostHogDemoPage() {
  const [trackedEvents, setTrackedEvents] = useState<string[]>([]);

  const trackEvent = (eventName: string, eventFunction: () => void) => {
    eventFunction();
    setTrackedEvents(prev => [...prev, `${eventName} - ${new Date().toLocaleTimeString()}`]);
  };

  const eventCategories = [
    {
      title: 'User Lifecycle',
      icon: <Users className="w-5 h-5" />,
      events: [
        {
          name: 'Signup',
          description: 'Track user registrations',
          action: () => analytics.signup({ source: 'demo', plan: 'free' })
        },
        {
          name: 'Create Project',
          description: 'Track project creation',
          action: () => analytics.createProject('demo-project-123', { plan: 'pro' })
        }
      ]
    },
    {
      title: 'Engagement',
      icon: <MessageSquare className="w-5 h-5" />,
      events: [
        {
          name: 'View Board',
          description: 'Track board page views',
          action: () => analytics.viewBoard('demo-project', 'board-123', { source: 'direct' })
        },
        {
          name: 'Submit Post',
          description: 'Track feedback submissions',
          action: () => analytics.submitPost('post-456', 'demo-project', 'web', { category: 'feature_request' })
        },
        {
          name: 'Vote',
          description: 'Track user votes',
          action: () => analytics.vote('post-456', 'demo-project', { vote_type: 'upvote' })
        },
        {
          name: 'Add Comment',
          description: 'Track comment creation',
          action: () => analytics.addComment('post-456', 'comment-789', { comment_length: 150 })
        }
      ]
    },
    {
      title: 'Admin Actions',
      icon: <Activity className="w-5 h-5" />,
      events: [
        {
          name: 'Status Change',
          description: 'Track post status updates',
          action: () => analytics.statusChange('post-456', 'open', 'in_progress', { admin_user: 'demo-admin' })
        },
        {
          name: 'Post Moderated',
          description: 'Track moderation actions',
          action: () => analytics.postModerated('post-456', 'approved', { reason: 'spam_filter' })
        }
      ]
    },
    {
      title: 'Widget Events',
      icon: <Globe className="w-5 h-5" />,
      events: [
        {
          name: 'Widget Open',
          description: 'Track widget interactions',
          action: () => analytics.widgetOpen('demo-project', 'example.com', { widget_version: 'v2' })
        },
        {
          name: 'Widget Submit',
          description: 'Track widget submissions',
          action: () => analytics.widgetSubmit('post-789', 'demo-project', 'example.com', { submission_time: 'fast' })
        }
      ]
    },
    {
      title: 'Business Events',
      icon: <CreditCard className="w-5 h-5" />,
      events: [
        {
          name: 'Start Checkout',
          description: 'Track checkout initiation',
          action: () => analytics.startCheckout('demo-project', 'pro', { source: 'upgrade_prompt' })
        },
        {
          name: 'Purchase',
          description: 'Track successful purchases',
          action: () => analytics.purchase('demo-project', 'pro', 29.99, { payment_method: 'stripe' })
        }
      ]
    },
    {
      title: 'Data Import',
      icon: <Upload className="w-5 h-5" />,
      events: [
        {
          name: 'Data Imported',
          description: 'Track CSV import results',
          action: () => analytics.dataImported('demo-project', 100, 95, { import_type: 'csv', source: 'admin' })
        },
        {
          name: 'Domain Added',
          description: 'Track custom domain setup',
          action: () => analytics.domainAdded('demo-project', 'feedback.example.com', { ssl_enabled: true })
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              PostHog Analytics Demo
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Test and demonstrate PostHog event tracking integration. Click the buttons below to simulate various user actions and events.
          </p>
        </div>

        {/* Configuration Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              PostHog Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {process.env.NEXT_PUBLIC_POSTHOG_KEY ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                <span className="text-sm">
                  PostHog Key: {process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'Configured' : 'Not Set'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={typeof window !== 'undefined' ? 'default' : 'secondary'}>
                  {typeof window !== 'undefined' ? 'Client Side Ready' : 'Server Side'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Tracking Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {eventCategories.map((category, categoryIndex) => (
            <Card key={categoryIndex}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category.icon}
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.events.map((event, eventIndex) => (
                    <div key={eventIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{event.name}</h4>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => trackEvent(event.name, event.action)}
                        className="ml-4"
                      >
                        Track
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tracked Events Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Tracked Events Log
              <Badge variant="outline">{trackedEvents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trackedEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No events tracked yet. Click the "Track" buttons above to start tracking events.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {trackedEvents.map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-900">{event}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integration Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Integration Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">1. Environment Setup</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`# Add to your .env.local
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_key
POSTHOG_PERSONAL_API_KEY=your_posthog_personal_api_key`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">2. Initialize PostHog</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`// In your root layout or _app.tsx
import { PostHogProvider } from '@/components/analytics/PostHogProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">3. Track Events</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`// In your components
import { analytics } from '@/lib/analytics';

// Track user actions
const handleSubmitPost = () => {
  analytics.submitPost(postId, projectId, 'web', {
    category: 'feature_request',
    word_count: description.length
  });
};`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">4. Use Analytics Hook</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`// For automatic page tracking
import { useAnalytics } from '@/hooks/useAnalytics';

export function MyComponent() {
  const analytics = useAnalytics();
  
  // analytics is automatically available for tracking
  return <div>My Component</div>;
}`}</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
