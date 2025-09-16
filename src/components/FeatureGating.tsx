'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Lock, 
  Shield,
  Globe,
  EyeOff,
  Mail,
  BarChart3,
  Users,
  Palette,
  Code,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface UserPlan {
  plan: 'free' | 'pro';
  features: string[];
}

interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  proOnly: boolean;
  category: 'boards' | 'customization' | 'integrations' | 'analytics' | 'support';
}

// Feature gate hook for use throughout the app
export function useFeatureGate(feature: string, userPlan: UserPlan) {
  const featureConfig = FEATURES.find(f => f.id === feature);
  const hasAccess = !featureConfig?.proOnly || userPlan.plan === 'pro';
  
  return {
    hasAccess,
    isPro: userPlan.plan === 'pro',
    feature: featureConfig
  };
}

// Feature gate component wrapper
export function FeatureGate({ 
  feature, 
  userPlan, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: {
  feature: string;
  userPlan: UserPlan;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}) {
  const { hasAccess, feature: featureConfig } = useFeatureGate(feature, userPlan);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <ProFeaturePrompt 
        feature={featureConfig} 
        onUpgrade={() => window.location.href = '/billing'}
      />
    );
  }

  return null;
}

// Pro feature prompt component
export function ProFeaturePrompt({ 
  feature, 
  onUpgrade,
  compact = false 
}: {
  feature?: FeatureConfig;
  onUpgrade: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded border border-yellow-200 dark:border-yellow-800">
        <Crown className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium">Pro Feature</span>
        <Button size="sm" onClick={onUpgrade}>
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-dashed border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
      <CardContent className="text-center py-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
            <Crown className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <h3 className="font-semibold mb-2 flex items-center justify-center gap-2">
          {feature?.icon}
          {feature?.name || 'Pro Feature'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {feature?.description || 'This feature is available on the Pro plan.'}
        </p>
        <Button onClick={onUpgrade} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </Button>
      </CardContent>
    </Card>
  );
}

// Feature configurations
const FEATURES: FeatureConfig[] = [
  {
    id: 'private_boards',
    name: 'Private Boards',
    description: 'Create private feedback boards visible only to your team',
    icon: <EyeOff className="h-4 w-4" />,
    proOnly: true,
    category: 'boards'
  },
  {
    id: 'unlimited_boards',
    name: 'Unlimited Boards',
    description: 'Create as many feedback boards as you need',
    icon: <BarChart3 className="h-4 w-4" />,
    proOnly: true,
    category: 'boards'
  },
  {
    id: 'custom_domain',
    name: 'Custom Domain',
    description: 'Use your own domain for professional branding',
    icon: <Globe className="h-4 w-4" />,
    proOnly: true,
    category: 'customization'
  },
  {
    id: 'remove_branding',
    name: 'Remove Branding',
    description: 'Hide "Powered by SignalSloop" from your widget',
    icon: <Palette className="h-4 w-4" />,
    proOnly: true,
    category: 'customization'
  },
  {
    id: 'email_notifications',
    name: 'Email Notifications',
    description: 'Automated emails for status changes and updates',
    icon: <Mail className="h-4 w-4" />,
    proOnly: true,
    category: 'integrations'
  },
  {
    id: 'api_access',
    name: 'API Access',
    description: 'Full API access for custom integrations',
    icon: <Code className="h-4 w-4" />,
    proOnly: true,
    category: 'integrations'
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed insights and reporting dashboards',
    icon: <BarChart3 className="h-4 w-4" />,
    proOnly: true,
    category: 'analytics'
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: 'Get help faster with priority email support',
    icon: <Shield className="h-4 w-4" />,
    proOnly: true,
    category: 'support'
  },
  {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    description: 'Invite team members with different permission levels',
    icon: <Users className="h-4 w-4" />,
    proOnly: true,
    category: 'support'
  }
];

// Feature usage component with limits
export function FeatureUsage({ 
  feature, 
  current, 
  limit, 
  userPlan 
}: {
  feature: string;
  current: number;
  limit: number | null;
  userPlan: UserPlan;
}) {
  const { hasAccess } = useFeatureGate(feature, userPlan);
  const isUnlimited = limit === null;
  const percentage = limit ? (current / limit) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {current} {isUnlimited ? '' : `/ ${limit}`}
        </span>
        {hasAccess ? (
          <Badge variant={isUnlimited ? 'default' : isAtLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}>
            {isUnlimited ? 'Unlimited' : isAtLimit ? 'Limit reached' : 'Available'}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Crown className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        )}
      </div>
      
      {!isUnlimited && (
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Main feature management dashboard
export function FeatureManagement({ userPlan }: { userPlan: UserPlan }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Features' },
    { id: 'boards', name: 'Boards' },
    { id: 'customization', name: 'Customization' },
    { id: 'integrations', name: 'Integrations' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'support', name: 'Support' }
  ];

  const filteredFeatures = selectedCategory === 'all' 
    ? FEATURES 
    : FEATURES.filter(f => f.category === selectedCategory);

  const enabledFeatures = FEATURES.filter(f => !f.proOnly || userPlan.plan === 'pro').length;
  const totalFeatures = FEATURES.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Feature Access</h3>
          <p className="text-sm text-muted-foreground">
            {enabledFeatures} of {totalFeatures} features available on your plan
          </p>
        </div>
        <Badge variant={userPlan.plan === 'pro' ? 'default' : 'outline'}>
          {userPlan.plan === 'pro' ? (
            <>
              <Crown className="h-3 w-3 mr-1" />
              Pro Plan
            </>
          ) : (
            'Free Plan'
          )}
        </Badge>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map((feature) => {
          const hasAccess = !feature.proOnly || userPlan.plan === 'pro';
          
          return (
            <Card key={feature.id} className={`relative ${!hasAccess ? 'opacity-60' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {feature.icon}
                    <h4 className="font-medium">{feature.name}</h4>
                  </div>
                  {hasAccess ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <Lock className="h-4 w-4 text-yellow-600" />
                      <Crown className="h-3 w-3 text-yellow-600" />
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {feature.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={hasAccess ? 'default' : 'outline'}
                    className={!hasAccess ? 'text-yellow-600 border-yellow-600' : ''}
                  >
                    {hasAccess ? 'Available' : 'Pro Only'}
                  </Badge>
                  
                  {!hasAccess && (
                    <Button 
                      size="sm" 
                      onClick={() => window.location.href = '/billing'}
                    >
                      Upgrade
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upgrade Prompt for Free Users */}
      {userPlan.plan === 'free' && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <Crown className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Unlock All Features</h3>
                  <p className="text-sm text-muted-foreground">
                    Get access to all Pro features for just $19/month
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => window.location.href = '/billing'}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                Upgrade Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Demo component showing feature gates in action
export function FeatureGateDemo() {
  const [userPlan, setUserPlan] = useState<UserPlan>({ plan: 'free', features: [] });

  const togglePlan = () => {
    setUserPlan(prev => ({ 
      ...prev, 
      plan: prev.plan === 'free' ? 'pro' : 'free' 
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feature Gating System</h2>
          <p className="text-muted-foreground">
            Control access to Pro features throughout your app
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Demo as:</span>
          <Button onClick={togglePlan} variant="outline" size="sm">
            {userPlan.plan === 'pro' ? (
              <>
                <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                Pro User
              </>
            ) : (
              'Free User'
            )}
          </Button>
        </div>
      </div>

      {/* Feature Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Private Board Toggle</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureGate feature="private_boards" userPlan={userPlan}>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="private" />
                <label htmlFor="private">Make this board private</label>
              </div>
            </FeatureGate>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Domain Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureGate feature="custom_domain" userPlan={userPlan}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Domain</label>
                <input 
                  type="text" 
                  placeholder="feedback.yourcompany.com"
                  className="w-full p-2 border rounded"
                />
              </div>
            </FeatureGate>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Access</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureGate feature="api_access" userPlan={userPlan}>
              <div className="space-y-2">
                <div className="font-mono text-sm bg-muted p-2 rounded">
                  GET /api/v1/posts
                </div>
                <Button size="sm">Generate API Key</Button>
              </div>
            </FeatureGate>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advanced Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureGate feature="advanced_analytics" userPlan={userPlan}>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-muted rounded">
                    <div className="font-bold">45%</div>
                    <div className="text-xs">Conversion Rate</div>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <div className="font-bold">2.3x</div>
                    <div className="text-xs">Engagement</div>
                  </div>
                </div>
              </div>
            </FeatureGate>
          </CardContent>
        </Card>
      </div>

      {/* Feature Management */}
      <FeatureManagement userPlan={userPlan} />
    </div>
  );
}

// Export individual components for use throughout the app
export { FEATURES };
