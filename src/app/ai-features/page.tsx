/**
 * AI Features Hub Page
 * Central hub for accessing all AI-powered features
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  TrendingUp,
  Search,
  Sparkles,
  BarChart3,
  Zap,
  Target,
  Users,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI Features | SignalsLoop',
  description: 'Explore AI-powered feedback analysis features',
};

const aiFeatures = [
  {
    id: 'hunter',
    title: 'AI Feedback Hunter',
    description: 'Autonomously discover and analyze customer feedback across Reddit, Twitter, Hacker News, G2, and Product Hunt',
    icon: Search,
    href: '/hunter',
    setupHref: '/hunter/setup',
    color: 'from-blue-500 to-purple-600',
    badge: 'New',
    features: [
      'Multi-platform monitoring (Reddit, Twitter, HN, G2, ProductHunt)',
      'Automatic classification (bugs, features, praise, complaints)',
      'AI-powered urgency scoring',
      'Revenue impact estimates',
      'Action recommendations',
    ],
  },
  {
    id: 'sentiment',
    title: 'Sentiment Analysis',
    description: 'Understand customer emotions with AI-powered sentiment analysis',
    icon: TrendingUp,
    href: '#',
    color: 'from-green-500 to-teal-600',
    badge: 'Active',
    features: [
      'Automatic sentiment scoring',
      'Emotional tone detection',
      'Trend analysis',
      'Real-time insights',
    ],
  },
  {
    id: 'themes',
    title: 'Theme Detection',
    description: 'Identify recurring themes and patterns in customer feedback',
    icon: BarChart3,
    href: '#',
    color: 'from-orange-500 to-red-600',
    badge: 'Active',
    features: [
      'Pattern recognition',
      'Emerging theme detection',
      'Frequency tracking',
      'Priority ranking',
    ],
  },
  {
    id: 'priority',
    title: 'Smart Priority Scoring',
    description: 'AI-driven priority scoring for feedback items',
    icon: Target,
    href: '#',
    color: 'from-pink-500 to-purple-600',
    badge: 'Active',
    features: [
      'Intelligent prioritization',
      'Impact assessment',
      'Urgency detection',
      'Resource allocation',
    ],
  },
  {
    id: 'categorization',
    title: 'Auto-Categorization',
    description: 'Automatically categorize feedback into relevant buckets',
    icon: Zap,
    href: '#',
    color: 'from-yellow-500 to-orange-600',
    badge: 'Active',
    features: [
      'Smart categorization',
      'Custom categories',
      'Bulk processing',
      'High accuracy',
    ],
  },
  {
    id: 'insights',
    title: 'User Intelligence',
    description: 'Enrich user profiles with AI-generated insights',
    icon: Users,
    href: '#',
    color: 'from-indigo-500 to-blue-600',
    badge: 'Active',
    features: [
      'User profiling',
      'Behavior analysis',
      'Engagement tracking',
      'Churn prediction',
    ],
  },
];

export default async function AIFeaturesPage({
  searchParams,
}: {
  searchParams: { projectId?: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get project ID
  let projectId = searchParams.projectId;

  if (!projectId) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single();

    if (projects) {
      projectId = projects.id;
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full mb-4">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold">AI-Powered Features</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Supercharge Your Feedback Analysis
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Leverage cutting-edge AI to automatically discover, analyze, and act on customer feedback
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {aiFeatures.map((feature) => {
          const Icon = feature.icon;
          const href = feature.href === '#'
            ? feature.href
            : projectId
              ? `${feature.href}?projectId=${projectId}`
              : feature.href;
          const setupHref = feature.setupHref && projectId
            ? `${feature.setupHref}?projectId=${projectId}`
            : undefined;

          return (
            <Card key={feature.id} className="p-6 hover:shadow-xl transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                {feature.badge && (
                  <Badge
                    variant={feature.badge === 'New' ? 'default' : 'secondary'}
                    className={feature.badge === 'New' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : ''}
                  >
                    {feature.badge}
                  </Badge>
                )}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{feature.description}</p>

              {/* Features List */}
              <ul className="space-y-2 mb-6">
                {feature.features.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="flex gap-2">
                {feature.href !== '#' ? (
                  <>
                    <Link href={href} className="flex-1">
                      <Button className="w-full" size="sm">
                        <Brain className="h-4 w-4 mr-2" />
                        Launch
                      </Button>
                    </Link>
                    {setupHref && (
                      <Link href={setupHref}>
                        <Button variant="outline" size="sm">
                          Setup
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Coming Soon
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto mt-16 text-center">
        <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">Need Help Getting Started?</h2>
          <p className="text-gray-600 mb-6">
            Our AI features are designed to work seamlessly together. Start with the Hunter to
            automatically discover feedback, then use Sentiment Analysis and Theme Detection to
            understand patterns.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link href="/docs">View Documentation</Link>
            </Button>
            <Button asChild>
              <Link href="/app">Back to Dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
