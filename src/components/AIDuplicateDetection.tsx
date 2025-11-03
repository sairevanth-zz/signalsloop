'use client';

import { useEffect, useState } from 'react';
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
  createdAt?: string;
  updatedAt?: string;
  status: 'detected' | 'confirmed' | 'dismissed' | 'merged';
}

interface AIDuplicateDetectionProps {
  postId: string;
  projectId: string;
  userPlan: { plan: 'free' | 'pro'; features?: string[] };
  initialDuplicates?: DuplicatePost[];
  initialAnalyzedAt?: string | null;
  initialHydrated?: boolean;
  onShowNotification?: (message: string, type: 'success' | 'error') => void;
}

const DUPLICATE_STATUS_LABEL: Record<DuplicatePost['status'], string> = {
  detected: 'Needs Review',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
  merged: 'Merged',
};

const DUPLICATE_STATUS_BADGE: Record<DuplicatePost['status'], string> = {
  detected: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  dismissed: 'bg-gray-100 text-gray-600 border-gray-200',
  merged: 'bg-purple-100 text-purple-800 border-purple-200',
};

type DuplicateApiResponse = {
  post?: {
    id: string;
    title: string;
    description?: string;
  };
  analysis?: {
    similarityScore?: number;
    explanation?: string;
    reason?: string;
    duplicateType?: string;
    mergeRecommendation?: string;
  };
  similarityScore?: number;
  similarity?: number;
  reason?: string;
  similarityId?: string;
};

type SavedSimilarityResponse = {
  id?: string;
  post_id?: string;
  similar_post_id?: string;
  similarity_score?: number;
  similarity_reason?: string | null;
  status?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

const formatTimestamp = (timestamp: string) =>
  new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export function AIDuplicateDetection({ 
  postId, 
  projectId, 
  userPlan, 
  initialDuplicates = [],
  initialAnalyzedAt = null,
  initialHydrated = false,
  onShowNotification 
}: AIDuplicateDetectionProps) {
  const [duplicates, setDuplicates] = useState<DuplicatePost[]>(initialDuplicates);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(
    initialHydrated || initialDuplicates.length > 0 || Boolean(initialAnalyzedAt)
  );
  const [pendingAction, setPendingAction] = useState<{ id: string; action: 'confirmed' | 'dismissed' | 'merged' } | null>(null);
  const [mergeCandidate, setMergeCandidate] = useState<DuplicatePost | null>(null);
  const [lastMergeTarget, setLastMergeTarget] = useState<DuplicatePost | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(initialAnalyzedAt);
  const featurePlan = {
    plan: userPlan.plan,
    features: userPlan.features ?? []
  };

  useEffect(() => {
    setDuplicates(initialDuplicates);
    setIsAnalyzed(
      initialHydrated || initialDuplicates.length > 0 || Boolean(initialAnalyzedAt)
    );
    if (initialDuplicates.length === 0 && !initialAnalyzedAt) {
      setLastAnalyzedAt(null);
      return;
    }

    const derivedTimestamp = initialAnalyzedAt ?? initialDuplicates.reduce<string | null>((latest, entry) => {
      const candidate = entry.updatedAt || entry.createdAt || null;
      if (!candidate) return latest;
      if (!latest || new Date(candidate).getTime() > new Date(latest).getTime()) {
        return candidate;
      }
      return latest;
    }, null);

    setLastAnalyzedAt(derivedTimestamp);
  }, [postId, initialDuplicates, initialAnalyzedAt, initialHydrated]);

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
        .select('id, title, description, category, created_at, vote_count, duplicate_of, project_id')
        .eq('project_id', projectId)
        .is('duplicate_of', null)
        .neq('id', postId)
        .limit(200);

      const existingPosts = (boardData || []).map((p) => ({
        id: p.id,
        title: (p.title as string) || '',
        description: (p.description as string) || '',
        category: (p.category as string | null) || undefined,
        createdAt: p.created_at,
        voteCount: typeof p.vote_count === 'number' ? p.vote_count : 0,
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

      const savedSimilarities = Array.isArray(data.savedSimilarities)
        ? (data.savedSimilarities as SavedSimilarityResponse[])
        : [];
      const savedMap = new Map<string, {
        id?: string;
        status: DuplicatePost['status'];
        similarityScore?: number;
        similarityReason?: string | null;
        createdAt?: string | null;
        updatedAt?: string | null;
      }>();

      savedSimilarities.forEach((record) => {
        const sourceId = typeof record.post_id === 'string' ? record.post_id : null;
        const targetId = typeof record.similar_post_id === 'string' ? record.similar_post_id : null;
        if (!sourceId || !targetId) return;

        const otherPostId = sourceId === postId ? targetId : targetId === postId ? sourceId : null;
        if (!otherPostId) return;

        const normalizedScore = typeof record.similarity_score === 'number'
          ? Math.min(Math.max(record.similarity_score > 1 ? record.similarity_score / 100 : record.similarity_score, 0), 1)
          : undefined;

        savedMap.set(otherPostId, {
          id: typeof record.id === 'string' ? record.id : undefined,
          status:
            record.status === 'confirmed' ||
            record.status === 'dismissed' ||
            record.status === 'merged'
              ? record.status
              : 'detected',
          similarityScore: normalizedScore,
          similarityReason: record.similarity_reason ?? null,
          createdAt: record.created_at ?? null,
          updatedAt: record.updated_at ?? null,
        });
      });

      const nowIso = new Date().toISOString();
      const previousDuplicates = duplicates;

      const duplicatesData = Array.isArray(data.duplicates)
        ? (data.duplicates as DuplicateApiResponse[])
        : [];

      const mappedDuplicates = duplicatesData.map((dup) => {
        const postData = dup.post;
        if (!postData || !postData.id) {
          return null;
        }
        const analysis = dup.analysis || {};
        const similarityScore = Math.min(Math.max(analysis.similarityScore ?? 0, 0), 1);

        const persisted = savedMap.get(postData.id);
        const status = persisted?.status ?? 'detected';
        const similarityRecordId = persisted?.id || dup.similarityId || analysis.similarityId || undefined;
        const reason =
          analysis.explanation ||
          dup.reason ||
          persisted?.similarityReason ||
          'Flagged as similar by AI';

        return {
          id: postData.id,
          postId: postData.id,
          title: postData.title,
          description: postData.description || '',
          similarityPercent: Math.round(similarityScore * 100),
          similarityScore,
          reason,
          duplicateType: analysis.duplicateType,
          mergeRecommendation: analysis.mergeRecommendation,
          similarityRecordId,
          createdAt: persisted?.createdAt || nowIso,
          updatedAt: persisted?.updatedAt || nowIso,
          status,
        } as DuplicatePost;
      });

      const baseDuplicates = mappedDuplicates.filter((dup): dup is DuplicatePost => Boolean(dup));

      const mappedIds = new Set(baseDuplicates.map((dup) => dup.postId));

      const persistedButMissing = previousDuplicates.filter((dup) => !mappedIds.has(dup.postId));

      persistedButMissing.forEach((dup) => {
        const persisted = savedMap.get(dup.postId);
        const normalizedScore = persisted?.similarityScore ?? dup.similarityScore ?? 0;
        baseDuplicates.push({
          ...dup,
          similarityScore: normalizedScore,
          similarityPercent: Math.round((normalizedScore || 0) * 100),
          similarityRecordId: persisted?.id || dup.similarityRecordId,
          status: persisted?.status ?? dup.status,
          reason: persisted?.similarityReason || dup.reason,
          updatedAt: persisted?.updatedAt || dup.updatedAt || nowIso,
          createdAt: persisted?.createdAt || dup.createdAt || nowIso,
        });
      });

      const orderedDuplicates = baseDuplicates.sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0));

      setDuplicates(orderedDuplicates);
      setLastMergeTarget(null);
      setIsAnalyzed(true);

      const latestTimestamp = data.metadata?.timestamp || orderedDuplicates.reduce<string | null>((latest, entry) => {
        const candidate = entry.updatedAt || entry.createdAt || null;
        if (!candidate) return latest;
        if (!latest || new Date(candidate).getTime() > new Date(latest).getTime()) {
          return candidate;
        }
        return latest;
      }, null) || nowIso;

      setLastAnalyzedAt(latestTimestamp);

      if (orderedDuplicates.length === 0) {
        onShowNotification?.('No duplicates found', 'success');
      } else {
        onShowNotification?.(`Found ${orderedDuplicates.length} potential duplicates`, 'success');
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

      const updatedStatus: DuplicatePost['status'] = action === 'merged' ? 'merged' : action;
      const updatedAtIso = new Date().toISOString();

      setDuplicates((prev) =>
        prev.map((entry) =>
          entry.postId === duplicate.postId
            ? {
                ...entry,
                status: updatedStatus,
                updatedAt: updatedAtIso,
              }
            : entry
        )
      );

      if (action === 'merged') {
        const mergedTarget = { ...duplicate, status: 'merged', updatedAt: updatedAtIso };
        setLastMergeTarget(mergedTarget);
        onShowNotification?.(`Merged into "${duplicate.title}"`, 'success');
      } else if (action === 'confirmed') {
        setLastMergeTarget(null);
        onShowNotification?.(`Marked "${duplicate.title}" as duplicate`, 'success');
      } else {
        setLastMergeTarget(null);
        onShowNotification?.(`Dismissed "${duplicate.title}"`, 'success');
      }

      setLastAnalyzedAt(updatedAtIso);
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
            <Badge className="mb-3 bg-gray-100 text-gray-600 border-gray-200 uppercase tracking-wide text-[10px]">
              Not analyzed yet
            </Badge>
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
            <p className="text-xs text-gray-400 mt-1">
              Run at least once to capture a baseline from the board.
            </p>
            {lastAnalyzedAt && (
              <p className="text-xs text-gray-500 mt-1">
                Last analyzed {formatTimestamp(lastAnalyzedAt)}
              </p>
            )}
            </div>
          ) : (
            <div className="space-y-4">
              {lastAnalyzedAt && (
                <p className="text-xs text-gray-500">
                  Last analyzed {formatTimestamp(lastAnalyzedAt)}
                </p>
              )}
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
                      const statusBadgeClass = DUPLICATE_STATUS_BADGE[duplicate.status];
                      const statusLabel = DUPLICATE_STATUS_LABEL[duplicate.status];
                      const isActionable = duplicate.status === 'detected';

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
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={statusBadgeClass}>
                                {statusLabel}
                              </Badge>
                              <Badge className={getSimilarityColor(duplicate.similarityPercent)}>
                                {duplicate.similarityPercent}% similar
                              </Badge>
                            </div>
                          </div>
                          {duplicate.updatedAt && (
                            <p className="text-[11px] text-gray-500 mb-3">
                              Updated {formatTimestamp(duplicate.updatedAt)}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {isActionable ? (
                              <>
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
                              </>
                            ) : (
                              <p className="text-xs text-gray-500 mr-auto">
                                {duplicate.status === 'confirmed'
                                  ? 'Already confirmed as duplicate'
                                  : duplicate.status === 'dismissed'
                                    ? 'Dismissed from review'
                                    : 'Already merged'}
                              </p>
                            )}
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
                    setLastAnalyzedAt(null);
                    setLastMergeTarget(null);
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
