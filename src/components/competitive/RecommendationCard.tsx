'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Swords, Shield, Zap, EyeOff, ArrowRight } from 'lucide-react';
import { StrategicRecommendation } from '@/types/competitive-intelligence';

interface RecommendationCardProps {
  recommendation: StrategicRecommendation;
  onClick?: () => void;
}

export function RecommendationCard({ recommendation, onClick }: RecommendationCardProps) {
  const typeConfig = {
    attack: { color: 'bg-red-100 text-red-700', icon: Swords, label: 'ATTACK' },
    defend: { color: 'bg-blue-100 text-blue-700', icon: Shield, label: 'DEFEND' },
    react: { color: 'bg-purple-100 text-purple-700', icon: Zap, label: 'REACT' },
    ignore: { color: 'bg-gray-100 text-gray-700', icon: EyeOff, label: 'IGNORE' },
  };

  const config = typeConfig[recommendation.recommendation_type];
  const Icon = config.icon;

  const priorityColor = {
    critical: 'border-red-500',
    high: 'border-orange-500',
    medium: 'border-yellow-500',
    low: 'border-gray-500',
  };

  return (
    <Card
      className={`p-5 hover:shadow-md transition-shadow cursor-pointer border-l-4 ${priorityColor[recommendation.priority]}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.color.split(' ')[0]}`}>
            <Icon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-xs ${config.color}`}>
                {config.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {recommendation.priority}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900">{recommendation.title}</h3>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {recommendation.description}
      </p>

      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Impact</p>
          <p className="text-xs font-medium text-gray-900 line-clamp-2">
            {recommendation.estimated_impact || 'TBD'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Cost</p>
          <p className="text-xs font-medium text-gray-900 line-clamp-2">
            {recommendation.estimated_cost || 'TBD'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">ROI</p>
          <p className="text-xs font-medium text-gray-900 line-clamp-2">
            {recommendation.roi_estimate || 'TBD'}
          </p>
        </div>
      </div>
    </Card>
  );
}
