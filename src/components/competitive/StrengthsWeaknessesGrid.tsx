'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThumbsUp, ThumbsDown, TrendingUp, AlertTriangle, Quote, Target } from 'lucide-react';

interface Strength {
  id: string;
  feature_name: string;
  strength_category: string;
  description: string;
  praise_count: number;
  avg_rating: number;
  confidence_score: number;
  sample_quotes: string[];
}

interface Weakness {
  id: string;
  feature_name: string;
  weakness_category: string;
  description: string;
  complaint_count: number;
  avg_rating: number;
  severity_score: number;
  opportunity_score: number;
  strategic_importance: 'critical' | 'high' | 'medium' | 'low';
  sample_quotes: string[];
}

interface StrengthsWeaknessesGridProps {
  competitorProductId: string;
  projectId: string;
}

export function StrengthsWeaknessesGrid({
  competitorProductId,
  projectId,
}: StrengthsWeaknessesGridProps) {
  const [strengths, setStrengths] = useState<Strength[]>([]);
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [competitorProductId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [strengthsRes, weaknessesRes] = await Promise.all([
        fetch(`/api/competitive/external/strengths?competitorProductId=${competitorProductId}`),
        fetch(`/api/competitive/external/weaknesses?competitorProductId=${competitorProductId}`),
      ]);

      const [strengthsData, weaknessesData] = await Promise.all([
        strengthsRes.json(),
        weaknessesRes.json(),
      ]);

      if (strengthsData.success) setStrengths(strengthsData.strengths);
      if (weaknessesData.success) setWeaknesses(weaknessesData.weaknesses);
    } catch (error) {
      console.error('Error loading strengths/weaknesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImportanceBadge = (importance: string) => {
    const badges = {
      critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      low: { label: 'Low', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    };
    return badges[importance as keyof typeof badges] || badges.low;
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="strengths" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="strengths" className="flex items-center gap-2">
          <ThumbsUp className="w-4 h-4" />
          Strengths ({strengths.length})
        </TabsTrigger>
        <TabsTrigger value="weaknesses" className="flex items-center gap-2">
          <ThumbsDown className="w-4 h-4" />
          Weaknesses ({weaknesses.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="strengths" className="space-y-4">
        {strengths.length === 0 ? (
          <Card className="p-8 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No strengths identified yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Strengths will be detected from positive competitor reviews
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strengths.map((strength) => (
              <Card key={strength.id} className="p-5 border-l-4 border-l-green-500">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{strength.feature_name}</h4>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      {strength.strength_category}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-600 mb-1">
                      <span className="text-xl font-bold">{strength.avg_rating.toFixed(1)}</span>
                      <span className="text-sm">★</span>
                    </div>
                    <span className="text-xs text-gray-500">{strength.praise_count} mentions</span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3">{strength.description}</p>

                {strength.sample_quotes && strength.sample_quotes.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-1 mb-2">
                      <Quote className="w-3 h-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">Sample Quote</span>
                    </div>
                    <p className="text-xs text-gray-600 italic">
                      "{strength.sample_quotes[0]}"
                    </p>
                  </div>
                )}

                {/* Confidence */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full"
                      style={{ width: `${strength.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round(strength.confidence_score * 100)}% confidence
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="weaknesses" className="space-y-4">
        {weaknesses.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No weaknesses identified yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Weaknesses will be detected from negative competitor reviews
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weaknesses.map((weakness) => {
              const importanceBadge = getImportanceBadge(weakness.strategic_importance);
              return (
                <Card key={weakness.id} className="p-5 border-l-4 border-l-orange-500">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{weakness.feature_name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                          {weakness.weakness_category}
                        </Badge>
                        <Badge variant="outline" className={`${importanceBadge.className} text-xs`}>
                          {importanceBadge.label} Opportunity
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-red-600 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-bold">{weakness.severity_score.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-gray-500">{weakness.complaint_count} complaints</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{weakness.description}</p>

                  {weakness.sample_quotes && weakness.sample_quotes.length > 0 && (
                    <div className="border-t pt-3 mb-3">
                      <div className="flex items-center gap-1 mb-2">
                        <Quote className="w-3 h-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">Sample Quote</span>
                      </div>
                      <p className="text-xs text-gray-600 italic">
                        "{weakness.sample_quotes[0]}"
                      </p>
                    </div>
                  )}

                  {/* Opportunity Score */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">Your Opportunity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${weakness.opportunity_score * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-blue-900">
                        {Math.round(weakness.opportunity_score * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Build this to differentiate from the competition
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
