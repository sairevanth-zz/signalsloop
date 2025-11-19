'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Heart, Users, Phone, AlertTriangle } from 'lucide-react';

interface CallSummary {
  total_calls: number;
  analyzed_calls: number;
  expansion_revenue: number;
  churn_risk_revenue: number;
  avg_sentiment: number;
  top_objections: Array<{ type: string; count: number }>;
  top_competitors: Array<{ name: string; mentions: number }>;
}

export function CallMetricsCards({ summary }: { summary: CallSummary }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'text-green-600';
    if (sentiment < -0.3) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.3) return 'Positive';
    if (sentiment < -0.3) return 'Negative';
    return 'Neutral';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Total Calls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          <Phone className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_calls}</div>
          <p className="text-xs text-gray-500">
            {summary.analyzed_calls} analyzed
          </p>
        </CardContent>
      </Card>

      {/* Expansion Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expansion Opportunity</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.expansion_revenue)}
          </div>
          <p className="text-xs text-gray-500">
            Potential revenue from upsell signals
          </p>
        </CardContent>
      </Card>

      {/* Churn Risk */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Churn Risk</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.churn_risk_revenue)}
          </div>
          <p className="text-xs text-gray-500">
            Revenue at risk from negative signals
          </p>
        </CardContent>
      </Card>

      {/* Average Sentiment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
          <Heart className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getSentimentColor(summary.avg_sentiment)}`}>
            {getSentimentLabel(summary.avg_sentiment)}
          </div>
          <p className="text-xs text-gray-500">
            Score: {(summary.avg_sentiment * 100).toFixed(0)}%
          </p>
        </CardContent>
      </Card>

      {/* Top Objections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Objections</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          {summary.top_objections.length > 0 ? (
            <div>
              <div className="text-lg font-bold">
                {summary.top_objections[0].type}
              </div>
              <p className="text-xs text-gray-500">
                {summary.top_objections[0].count} mentions
                {summary.top_objections.length > 1 && ` + ${summary.top_objections.length - 1} more`}
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No objections detected</div>
          )}
        </CardContent>
      </Card>

      {/* Top Competitors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Competitors Mentioned</CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          {summary.top_competitors.length > 0 ? (
            <div>
              <div className="text-lg font-bold">
                {summary.top_competitors[0].name}
              </div>
              <p className="text-xs text-gray-500">
                {summary.top_competitors[0].mentions} mentions
                {summary.top_competitors.length > 1 && ` + ${summary.top_competitors.length - 1} more`}
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No competitors mentioned</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
