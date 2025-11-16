'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { CompetitiveDashboardOverview } from '@/types/competitive-intelligence';

interface CompetitorCardProps {
  competitor: CompetitiveDashboardOverview;
  onClick?: () => void;
}

export function CompetitorCard({ competitor, onClick }: CompetitorCardProps) {
  const sentimentColor =
    competitor.avg_sentiment_vs_you >= 0.3
      ? 'text-green-600'
      : competitor.avg_sentiment_vs_you <= -0.3
        ? 'text-red-600'
        : 'text-gray-600';

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{competitor.competitor_name}</h3>
          {competitor.category && (
            <p className="text-xs text-gray-500 mt-1">{competitor.category}</p>
          )}
        </div>
        <Badge variant={competitor.status === 'active' ? 'default' : 'secondary'} className="text-xs">
          {competitor.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Total Mentions</p>
          <p className="text-lg font-bold text-gray-900">{competitor.total_mentions}</p>
          <p className="text-xs text-gray-400">
            {competitor.mentions_last_7d} in last 7d
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Net Switches</p>
          <p className={`text-lg font-bold ${competitor.net_switches >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {competitor.net_switches >= 0 ? '+' : ''}
            {competitor.net_switches}
          </p>
          <p className="text-xs text-gray-400">
            {competitor.switches_to_you} to you · {competitor.switches_from_you} from
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sentiment vs you:</span>
          <span className={`text-sm font-semibold ${sentimentColor}`}>
            {competitor.avg_sentiment_vs_you.toFixed(2)}
          </span>
          {competitor.avg_sentiment_vs_you >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>
    </Card>
  );
}
