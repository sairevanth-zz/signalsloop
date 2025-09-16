'use client';

import React from 'react';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, TrendingUp, Target } from 'lucide-react';

export default function AnalyticsDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analytics Dashboard Demo
          </h1>
          <p className="text-gray-600">
            Comprehensive analytics for your feedback board with PostHog integration
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Real-time Metrics</h3>
                  <p className="text-sm text-gray-600">Live tracking of key performance indicators</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">User Analytics</h3>
                  <p className="text-sm text-gray-600">Detailed user behavior and engagement data</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Growth Tracking</h3>
                  <p className="text-sm text-gray-600">Monitor growth trends and patterns</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Conversion Funnel</h3>
                  <p className="text-sm text-gray-600">Track user journey and conversion rates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-white rounded-lg shadow-sm border">
          <AnalyticsDashboard projectId="demo-project" />
        </div>

        {/* Integration Info */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                PostHog Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Event Tracking</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Page views and user sessions</li>
                    <li>• Post submissions and interactions</li>
                    <li>• Voting behavior and patterns</li>
                    <li>• Widget usage and engagement</li>
                    <li>• Conversion events and funnels</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Custom Properties</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• User segments and cohorts</li>
                    <li>• Project and board identification</li>
                    <li>• Feature usage and adoption</li>
                    <li>• Device and browser analytics</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Key Metrics Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Traffic Metrics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Page views and unique visitors</li>
                    <li>• Traffic sources and referrals</li>
                    <li>• Geographic distribution</li>
                    <li>• Device and browser breakdown</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Engagement Metrics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Post creation and interaction rates</li>
                    <li>• Voting patterns and frequency</li>
                    <li>• Comment engagement</li>
                    <li>• Time spent on platform</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Business Metrics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Conversion rates and funnels</li>
                    <li>• Revenue and subscription metrics</li>
                    <li>• Customer lifetime value</li>
                    <li>• Churn and retention rates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Implementation Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Implementation Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">1. PostHog Setup</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Install PostHog and configure your project key in environment variables.
                </p>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`npm install posthog-js

// Add to your .env.local
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">2. Analytics Integration</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Integrate PostHog tracking throughout your application to capture user events.
                </p>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`// Track custom events
posthog.capture('feedback_submitted', {
  project_id: projectId,
  post_category: category,
  user_type: 'anonymous'
});

// Track page views
posthog.capture('$pageview', {
  page_title: 'Feedback Board',
  project_id: projectId
});`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">3. Dashboard Integration</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Connect the analytics dashboard to your PostHog data or custom analytics API.
                </p>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`// Replace mock data with real API calls
const fetchAnalytics = async () => {
  const response = await fetch(\`/api/analytics/\${projectId}?range=\${timeRange}\`);
  const data = await response.json();
  setMetrics(data.metrics);
  setChartData(data.charts);
};`}</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
