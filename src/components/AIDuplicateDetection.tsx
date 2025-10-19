'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  GitMerge
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGating';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface DuplicatePost {
  id: string;
  postId: string;
  title: string;
  description: string;
  similarityPercent: number;
  similarityScore: number;
  reason: string;
  duplicateType?: string;
  mergeRecommendation?: string;
  similarityRecordId?: string;
  createdAt: string;
}

interface AIDuplicateDetectionProps {
  postId: string;
  projectId: string;
  userPlan: { plan: 'free' | 'pro'; features?: string[] };
  onShowNotification?: (message: string, type: 'success' | 'error') => void;
}

export function AIDuplicateDetection({ 
  postId, 
  projectId, 
  userPlan, 
  onShowNotification 
}: AIDuplicateDetectionProps) {
  const [duplicates, setDuplicates] = useState<DuplicatePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: 'confirmed' | 'dismissed' | 'merged' } | null>(null);
  const [mergeCandidate, setMergeCandidate] = useState<DuplicatePost | null>(null);
  const [lastMergeTarget, setLastMergeTarget] = useState<DuplicatePost | null>(null);
  const featurePlan = {
    plan: userPlan.plan,
    features: userPlan.features ?? []
  };

  const detectDuplicates = async () => {
    setIsLoading(true);
    console.log('Starting duplicate detection for post:', postId, 'project:', projectId);
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

      // Fetch current post data
      const { data: currentPost, error: currentPostError } = await supabase
        .from('posts')
        .select('title, description')
        .eq('id', postId)
        .single();

      if (currentPostError || !currentPost) {
        throw new Error('Failed to fetch current post data');
      }

      // Fetch all other posts in the project
      const { data: boardData } = await supabase
        .from('posts')
        .select('id, title, description, board_id')
        .neq('id', postId)
        .limit(100);

      const existingPosts = (boardData || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description || ''
      }));

      const response = await fetch('/api/ai/duplicate-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          mode: 'single',
          newPost: {
            id: postId,
            title: currentPost.title,
            description: currentPost.description || ''
          },
          existingPosts,
          projectId
        })
      });

      const data = await response.json();
      console.log('API Response:', response.status, data);

      if (!response.ok) {
        console.error('API Error:', data);
        if (data.upgrade_required) {
          onShowNotification?.('AI Duplicate Detection is a Pro feature', 'error');
          return;
        }
        throw new Error(data.error || data.message || 'Failed to detect duplicates');
      }

      // Map duplicates to the expected format
      const mappedDuplicates = (data.duplicates || []).map((dup: any) => {
        const postData = dup.post || dup;
        const analysis = dup.analysis || {};
        const rawScore =
          typeof analysis.similarityScore === 'number'
            ? analysis.similarityScore
            : typeof dup.similarityScore === 'number'
              ? dup.similarityScore
              : typeof dup.similarity === 'number'
                ? dup.similarity / 100
                : 0;
        const similarityScore = Math.min(Math.max(rawScore || 0, 0), 1);

        return {
          id: postData.id,
          postId: postData.id,
          title: postData.title,
          description: postData.description || '',
          similarityPercent: Math.round(similarityScore * 100),
          similarityScore,
          reason:
            analysis.explanation ||
            analysis.reason ||
            dup.reason ||
            'Flagged as similar by AI',
          duplicateType: analysis.duplicateType,
          mergeRecommendation: analysis.mergeRecommendation,
          similarityRecordId: dup.similarityId || analysis.similarityId || undefined,
          createdAt: new Date().toISOString()
        } as DuplicatePost;
      });

      setDuplicates(mappedDuplicates);
      setLastMergeTarget(null);
      setIsAnalyzed(true);

      if (mappedDuplicates.length === 0) {
        onShowNotification?.('No duplicates found', 'success');
      } else {
        onShowNotification?.(`Found ${mappedDuplicates.length} potential duplicates`, 'success');
      }
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      onShowNotification?.('Failed to detect duplicates', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateAction = async (
    duplicate: DuplicatePost,
    action: 'confirmed' | 'dismissed' | 'merged'
  ) => {
    try {
      setPendingAction({ id: duplicate.id, action });
      // Get the current session token
      const supabase = (await import('@/lib/supabase-client')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        onShowNotification?.('Please sign in to use AI features', 'error');
        setPendingAction(null);
        return;
      }

      // Update similarity status in database
      const response = await fetch('/api/ai/duplicate-detection', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          action: action === 'merged' ? 'merge' : action,
          sourcePostId: postId,
          targetPostId: duplicate.postId,
          similarityScore: duplicate.similarityScore,
          similarityReason: duplicate.reason,
          similarityId: duplicate.similarityRecordId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update duplicate status');
      }

      // Remove from local state
      setDuplicates(prev => prev.filter(d => d.id !== duplicate.id));

      if (action === 'merged') {
        setLastMergeTarget(duplicate);
        setDuplicates([]);
        setIsAnalyzed(false);
        onShowNotification?.(`Merged into "${duplicate.title}"`, 'success');
      } else if (action === 'confirmed') {
        setLastMergeTarget(null);
        onShowNotification?.(`Marked "${duplicate.title}" as duplicate`, 'success');
      } else {
        setLastMergeTarget(null);
        onShowNotification?.(`Dismissed "${duplicate.title}"`, 'success');
      }
    } catch (error) {
      console.error('Error updating duplicate status:', error);
      onShowNotification?.('Failed to update duplicate status', 'error');
    } finally {
      setPendingAction(null);
      if (action === 'merged') {
        setMergeCandidate(null);
      }
    }
  };

  const getSimilarityColor = (similarityPercent: number) => {
    if (similarityPercent >= 90) return 'bg-red-100 text-red-800 border-red-200';
    if (similarityPercent >= 80) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (similarityPercent >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <FeatureGate feature="ai_duplicate_detection" userPlan={featurePlan}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            AI Duplicate Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastMergeTarget && (
            <Alert className="mb-4 border border-orange-200 bg-orange-50 text-orange-900">
              <GitMerge className="h-4 w-4 text-orange-600" />
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm">
                  Merged into <span className="font-semibold">{lastMergeTarget.title}</span>. Manage feedback on the canonical post.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/post/${lastMergeTarget.postId}`, '_blank')}
                >
                  View Post
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {!isAnalyzed ? (
            <div className="text-center py-4">
              <Button 
                onClick={detectDuplicates}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing for duplicates...
                  </>
                ) : (
                  'Check for Duplicates'
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                AI will analyze this post against all other posts in your project
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No duplicates found! This post appears to be unique.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Found {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    {duplicates.map((duplicate) => {
                      const isCurrentPending = pendingAction?.id === duplicate.id;
                      const isMerging = isCurrentPending && pendingAction?.action === 'merged';
                      const isConfirming = isCurrentPending && pendingAction?.action === 'confirmed';
                      const isDismissing = isCurrentPending && pendingAction?.action === 'dismissed';
                      const disableOtherActions = Boolean(pendingAction) && !isCurrentPending;

                      return (
                        <Card key={duplicate.id} className="border-l-4 border-l-orange-400">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">
                                {duplicate.title}
                              </h4>
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {duplicate.description}
                              </p>
                              <p className="text-xs text-gray-500 mb-2">
                                {duplicate.reason}
                              </p>
                              {(duplicate.duplicateType || duplicate.mergeRecommendation) && (
                                <div className="text-[11px] text-gray-500 space-x-2 mb-2">
                                  {duplicate.duplicateType && (
                                    <span className="uppercase tracking-wide">
                                      Type: {duplicate.duplicateType}
                                    </span>
                                  )}
                                  {duplicate.mergeRecommendation && (
                                    <span>
                                      Recommendation: {duplicate.mergeRecommendation}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge className={getSimilarityColor(duplicate.similarityPercent)}>
                              {duplicate.similarityPercent}% similar
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => setMergeCandidate(duplicate)}
                              disabled={disableOtherActions || isMerging}
                            >
                              {isMerging ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Merging...
                                </>
                              ) : (
                                <>
                                  <GitMerge className="h-3 w-3 mr-1" />
                                  Merge Posts
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicateAction(duplicate, 'confirmed')}
                              disabled={disableOtherActions || isConfirming}
                            >
                              {isConfirming ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Confirm Duplicate
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicateAction(duplicate, 'dismissed')}
                              disabled={disableOtherActions || isDismissing}
                            >
                              {isDismissing ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Dismissing...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Dismiss
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/post/${duplicate.postId}`, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsAnalyzed(false);
                    setDuplicates([]);
                  }}
                  className="w-full"
                >
                  Analyze Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(mergeCandidate)}
        onOpenChange={(open) => {
          if (!open) {
            setMergeCandidate(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge duplicate posts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the current post as a duplicate of &quot;
              {mergeCandidate?.title}&quot;. The original post will be hidden from your board and any future updates should be tracked on the target post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction?.action === 'merged'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (mergeCandidate) {
                  void handleDuplicateAction(mergeCandidate, 'merged');
                }
              }}
              disabled={
                pendingAction?.id === mergeCandidate?.id &&
                pendingAction?.action === 'merged'
              }
            >
              {pendingAction?.id === mergeCandidate?.id &&
              pendingAction?.action === 'merged' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                'Confirm Merge'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FeatureGate>
  );
}
