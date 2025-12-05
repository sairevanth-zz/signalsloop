'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Loader2,
  Zap,
  BarChart3
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGating';
import { WhyBadge } from '@/components/reasoning';

interface PriorityScore {
  score: number;
  level: string;
  urgencyScore: number;
  impactScore: number;
  reasoning: string;
  voteCount: number;
  commentCount: number;
  analyzedAt: string;
}

interface AIPriorityScoringProps {
  postId: string;
  projectId: string;
  userPlan: { plan: 'free' | 'pro' };
  currentScore?: number;
  onShowNotification?: (message: string, type: 'success' | 'error') => void;
}

export function AIPriorityScoring({ 
  postId, 
  projectId, 
  userPlan, 
  currentScore,
  onShowNotification 
}: AIPriorityScoringProps) {
  const [priorityScore, setPriorityScore] = useState<PriorityScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzePriority = async () => {
    setIsLoading(true);
    console.log('Starting priority analysis for post:', postId, 'project:', projectId);
    try {
      // Get the current session token
      const supabase = (await import('@/lib/supabase-client')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      console.log('Session found:', !!session, 'Token exists:', !!session?.access_token);

      if (!session?.access_token) {
        console.error('No session token found');
        onShowNotification?.('Please sign in to use AI features', 'error');
        return;
      }

      // Fetch post data first
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('title, description, category, created_at, vote_count, comment_count')
        .eq('id', postId)
        .single();

      if (postError || !postData) {
        throw new Error('Failed to fetch post data');
      }

      const response = await fetch('/api/ai/priority-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          post: {
            id: postId,
            title: postData.title,
            description: postData.description || '',
            category: postData.category,
            createdAt: postData.created_at
          },
          metrics: {
            voteCount: postData.vote_count || 0,
            commentCount: postData.comment_count || 0,
            uniqueVoters: postData.vote_count || 0,
            percentageOfActiveUsers: 0,
            similarPostsCount: 0
          },
          user: {
            tier: userPlan.plan,
            isChampion: false
          },
          projectId
        })
      });

      const data = await response.json();
      console.log('API Response:', response.status, data);

      if (!response.ok) {
        console.error('API Error:', data);
        if (data.upgrade_required) {
          onShowNotification?.('AI Priority Scoring is a Pro feature', 'error');
          return;
        }
        throw new Error(data.error || data.message || 'Failed to analyze priority');
      }

      // Map the new API response to the old format
      const score = data.score;
      setPriorityScore({
        score: score.weightedScore,
        level: score.priorityLevel,
        urgencyScore: Math.round(score.scores.riskMitigation),
        impactScore: Math.round(score.scores.revenueImpact),
        reasoning: score.businessJustification,
        voteCount: postData.vote_count || 0,
        commentCount: postData.comment_count || 0,
        analyzedAt: new Date().toISOString()
      });
      onShowNotification?.(
        `Priority score: ${score.priorityLevel} (${score.weightedScore.toFixed(1)}/10)`,
        'success'
      );
    } catch (error) {
      console.error('Error analyzing priority:', error);
      onShowNotification?.('Failed to analyze priority', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-red-600';
    if (score >= 7) return 'text-orange-600';
    if (score >= 5) return 'text-yellow-600';
    if (score >= 3) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <FeatureGate feature="ai_priority_scoring" userPlan={userPlan}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            AI Priority Scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!priorityScore ? (
            <div className="text-center py-4">
              <Button 
                onClick={analyzePriority}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing priority...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze Priority
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                AI will analyze urgency, impact, and engagement to score this post
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Priority Score Display */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-3xl font-bold" style={{ color: getScoreColor(priorityScore.score) }}>
                    {priorityScore.score}
                  </span>
                  <span className="text-lg text-gray-500">/ 10</span>
                  <WhyBadge
                    entityType="post"
                    entityId={postId}
                    feature="prioritization"
                    size="sm"
                  />
                </div>
                <Badge className={getPriorityColor(priorityScore.level)}>
                  {priorityScore.level} Priority
                </Badge>
                <Progress 
                  value={priorityScore.score * 10} 
                  className="mt-3 h-2"
                />
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Urgency</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    {priorityScore.urgencyScore}/10
                  </div>
                </div>
                
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Impact</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {priorityScore.impactScore}/10
                  </div>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Votes:</span>
                  <span className="font-medium">{priorityScore.voteCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Comments:</span>
                  <span className="font-medium">{priorityScore.commentCount}</span>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>AI Analysis:</strong> {priorityScore.reasoning}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={analyzePriority}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Re-analyzing...
                    </>
                  ) : (
                    'Re-analyze Priority'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
