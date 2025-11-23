import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';

interface Learning {
  id: string;
  learning_type: 'insight' | 'recommendation' | 'mistake' | 'success';
  title: string;
  description: string;
  impact_score?: number;
  tags: string[];
}

interface LearningsPanelProps {
  learnings: Learning[];
  onExtractLearnings: () => void;
}

const learningTypeConfig = {
  insight: {
    icon: Lightbulb,
    label: 'Insight',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  recommendation: {
    icon: TrendingUp,
    label: 'Recommendation',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  mistake: {
    icon: AlertTriangle,
    label: 'Mistake',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  success: {
    icon: CheckCircle,
    label: 'Success',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
};

export function LearningsPanel({ learnings, onExtractLearnings }: LearningsPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Group learnings by type
  const groupedLearnings = learnings.reduce((acc, learning) => {
    if (!acc[learning.learning_type]) {
      acc[learning.learning_type] = [];
    }
    acc[learning.learning_type].push(learning);
    return acc;
  }, {} as Record<string, Learning[]>);

  // Calculate stats
  const stats = {
    total: learnings.length,
    insights: groupedLearnings.insight?.length || 0,
    recommendations: groupedLearnings.recommendation?.length || 0,
    mistakes: groupedLearnings.mistake?.length || 0,
    successes: groupedLearnings.success?.length || 0,
    avgImpact: learnings.length > 0
      ? (learnings.reduce((sum, l) => sum + (l.impact_score || 0), 0) / learnings.length).toFixed(1)
      : 0,
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Experiment Learnings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-extracted insights and recommendations from this experiment
          </p>
        </div>
        <Button onClick={onExtractLearnings} size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          {learnings.length > 0 ? 'Re-extract' : 'Extract Learnings'}
        </Button>
      </div>

      {learnings.length > 0 ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.insights}</p>
              <p className="text-xs text-muted-foreground">Insights</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.recommendations}</p>
              <p className="text-xs text-muted-foreground">Actions</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.mistakes}</p>
              <p className="text-xs text-muted-foreground">Mistakes</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.successes}</p>
              <p className="text-xs text-muted-foreground">Successes</p>
            </div>
          </div>

          {/* Learnings List */}
          <div className="space-y-3">
            {learnings
              .sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))
              .map((learning) => {
                const config = learningTypeConfig[learning.learning_type];
                const Icon = config.icon;
                const isExpanded = expandedIds.has(learning.id);

                return (
                  <div
                    key={learning.id}
                    className={`border rounded-lg ${config.borderColor} ${config.bgColor} overflow-hidden`}
                  >
                    {/* Header */}
                    <button
                      onClick={() => toggleExpanded(learning.id)}
                      className="w-full p-4 flex items-start gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Icon className={`h-5 w-5 ${config.color} mt-0.5 flex-shrink-0`} />

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{learning.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          {learning.impact_score !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              Impact: {learning.impact_score}/10
                            </Badge>
                          )}
                        </div>

                        {!isExpanded && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {learning.description}
                          </p>
                        )}
                      </div>

                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pl-12">
                        <p className="text-sm mb-3 whitespace-pre-wrap">
                          {learning.description}
                        </p>

                        {learning.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {learning.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Average Impact */}
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Average Impact Score: <span className="font-semibold text-foreground">{stats.avgImpact}/10</span>
            </p>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Learnings Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Extract AI-powered insights and recommendations from your experiment results
          </p>
          <Button onClick={onExtractLearnings}>
            <Sparkles className="h-4 w-4 mr-2" />
            Extract Learnings
          </Button>
        </div>
      )}
    </Card>
  );
}
