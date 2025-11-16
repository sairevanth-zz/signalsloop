'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { FeatureGap } from '@/types/competitive-intelligence';

interface FeatureGapCardProps {
  gap: FeatureGap;
  onClick?: () => void;
}

export function FeatureGapCard({ gap, onClick }: FeatureGapCardProps) {
  const priorityConfig = {
    critical: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    high: { color: 'bg-orange-100 text-orange-700', icon: TrendingUp },
    medium: { color: 'bg-yellow-100 text-yellow-700', icon: Users },
    low: { color: 'bg-gray-100 text-gray-700', icon: Users },
  };

  const config = priorityConfig[gap.priority];
  const Icon = config.icon;

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{gap.feature_name}</h3>
            <Badge className={`text-xs ${config.color}`}>
              {gap.priority}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{gap.description}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.color.split(' ')[0]}`}>
          <Icon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Mentions</p>
          <p className="text-sm font-semibold text-gray-900">{gap.mention_count}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Urgency</p>
          <p className="text-sm font-semibold text-gray-900">{gap.urgency_score.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Status</p>
          <Badge variant="outline" className="text-xs">
            {gap.status}
          </Badge>
        </div>
      </div>

      {gap.estimated_revenue_impact && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Revenue Impact:</p>
          <p className="text-sm text-gray-700">{gap.estimated_revenue_impact}</p>
        </div>
      )}
    </Card>
  );
}
