'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Zap,
  Crown,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface AIUpgradePromptProps {
  featureName: string;
  current: number;
  limit: number;
  remaining: number;
}

export default function AIUpgradePrompt({
  featureName,
  current,
  limit,
  remaining
}: AIUpgradePromptProps) {
  const isLimitReached = remaining === 0;
  const isNearLimit = remaining <= 3 && remaining > 0;

  if (isLimitReached) {
    return (
      <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-gray-900">Free Tier Limit Reached</h3>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  {current}/{limit}
                </Badge>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                You've used all <strong>{limit}</strong> {featureName} this month.
                Upgrade to Pro for <strong>unlimited AI features</strong> and unlock the full power of your feedback board!
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Sparkles className="h-3 w-3 text-teal-600" />
                  <span>Unlimited AI</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Zap className="h-3 w-3 text-orange-600" />
                  <span>Priority Support</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span>Advanced Analytics</span>
                </div>
              </div>

              <Link href="/pricing">
                <Button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isNearLimit) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {remaining} {featureName} {remaining === 1 ? 'use' : 'uses'} remaining this month
                </p>
                <p className="text-xs text-gray-600">
                  Upgrade to Pro for unlimited access
                </p>
              </div>
            </div>
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                Upgrade
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show usage badge (plenty remaining)
  return (
    <div className="flex items-center gap-2 mb-2">
      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
        {remaining} of {limit} uses remaining this month
      </Badge>
      <Link href="/pricing" className="text-xs text-blue-600 hover:underline">
        Upgrade for unlimited
      </Link>
    </div>
  );
}

