'use client';

import React from 'react';
import { ActionCardProps } from '@/types/stakeholder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function ActionCard({ title, description, severity, cta, actionUrl, actionType }: ActionCardProps) {
  const severityConfig = {
    critical: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-300 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    high: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      borderColor: 'border-orange-300 dark:border-orange-800',
      iconColor: 'text-orange-600 dark:text-orange-400',
      badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    medium: {
      icon: Info,
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-300 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    low: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-300 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={`p-6 ${config.bgColor} border-2 ${config.borderColor}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${config.badgeColor}`}>
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded ${config.badgeColor} uppercase`}>
              {severity}
            </span>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{description}</p>

          {actionUrl ? (
            <Link href={actionUrl}>
              <Button className="w-full sm:w-auto" variant={severity === 'critical' || severity === 'high' ? 'default' : 'outline'}>
                {cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          ) : (
            <Button className="w-full sm:w-auto" variant={severity === 'critical' || severity === 'high' ? 'default' : 'outline'}>
              {cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
