'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThumbsUp, Loader2, CheckCircle } from 'lucide-react';

interface VoteButtonProps {
  postId: string;
  initialVoteCount: number;
  initialUserVoted?: boolean;
  onVoteChange?: (newCount: number, userVoted: boolean) => void;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

const PRIORITY_STORAGE_KEY = 'signalsloop_vote_priority';

const PRIORITY_OPTIONS = [
  {
    value: 'must_have',
    title: 'Must Have',
    description: 'Critical for our success or customers',
    accentClass: 'border-red-400 bg-red-50 text-red-700',
    indicator: '🔴',
  },
  {
    value: 'important',
    title: 'Important',
    description: 'Significant business impact',
    accentClass: 'border-amber-300 bg-amber-50 text-amber-700',
    indicator: '🟡',
  },
  {
    value: 'nice_to_have',
    title: 'Nice to Have',
    description: 'Helpful improvement or quality-of-life',
    accentClass: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    indicator: '🟢',
  },
] as const;

type VotePriority = (typeof PRIORITY_OPTIONS)[number]['value'];

const PRIORITY_LABEL: Record<VotePriority, string> = {
  must_have: 'Must Have',
  important: 'Important',
  nice_to_have: 'Nice to Have',
};

const isValidPriority = (value: unknown): value is VotePriority =>
  typeof value === 'string' &&
  PRIORITY_OPTIONS.some((option) => option.value === value);

export function VoteButton({
  postId,
  initialVoteCount,
  initialUserVoted = false,
  onVoteChange,
  onShowNotification,
  size = 'md',
  variant = 'default'
}: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVoted, setUserVoted] = useState(initialUserVoted);
  const [loading, setLoading] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<VotePriority>('important');
  const [pendingPriority, setPendingPriority] = useState<VotePriority>('important');

  useEffect(() => {
    setVoteCount(initialVoteCount);
  }, [initialVoteCount]);

  useEffect(() => {
    setUserVoted(initialUserVoted);
  }, [initialUserVoted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(PRIORITY_STORAGE_KEY);
    if (isValidPriority(stored)) {
      setSelectedPriority(stored);
      setPendingPriority(stored);
    }
  }, []);

  const submitVote = async (priority: VotePriority) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority }),
        credentials: 'same-origin',
      });

      if (response.status === 409) {
        setUserVoted(true);
        onShowNotification?.('You have already voted on this post', 'info');
        setPriorityDialogOpen(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error recording vote:', errorData);
        onShowNotification?.(errorData.error || 'Error recording vote', 'error');
        return;
      }

      const data = await response.json();
      const newCount =
        typeof data.new_vote_count === 'number'
          ? data.new_vote_count
          : voteCount + 1;

      setVoteCount(newCount);
      setUserVoted(true);
      setSelectedPriority(priority);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PRIORITY_STORAGE_KEY, priority);
      }

      onVoteChange?.(newCount, true);
      onShowNotification?.(
        `Vote recorded as ${PRIORITY_LABEL[priority]}`,
        'success'
      );
    } catch (error) {
      console.error('Error handling vote:', error);
      onShowNotification?.('Something went wrong', 'error');
    } finally {
      setLoading(false);
      setPriorityDialogOpen(false);
    }
  };

  const removeVote = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error removing vote:', errorData);
        onShowNotification?.(errorData.error || 'Error removing vote', 'error');
        return;
      }

      const data = await response.json();
      const newCount =
        typeof data.new_vote_count === 'number'
          ? data.new_vote_count
          : Math.max(0, voteCount - 1);

      setVoteCount(newCount);
      setUserVoted(false);
      onVoteChange?.(newCount, false);
      onShowNotification?.('Vote removed', 'info');
    } catch (error) {
      console.error('Error removing vote:', error);
      onShowNotification?.('Failed to remove vote', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (event: React.MouseEvent) => {
    // Prevent event bubbling to parent elements (like card onClick)
    event.stopPropagation();
    event.preventDefault();
    
    if (loading) {
      return;
    }

    if (userVoted) {
      await removeVote();
    } else {
      setPendingPriority(selectedPriority);
      setPriorityDialogOpen(true);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'h-8 px-2',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      button: 'h-10 px-3',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      button: 'h-12 px-4',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  const priorityBadge = userVoted
    ? PRIORITY_OPTIONS.find((option) => option.value === selectedPriority)
    : null;

  const renderPriorityDialog = () => (
    <Dialog
      open={priorityDialogOpen}
      onOpenChange={(open) => {
        if (!loading) {
          setPriorityDialogOpen(open);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How important is this request?</DialogTitle>
          <DialogDescription>
            Sharing the priority helps the product team understand the urgency
            behind your vote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPendingPriority(option.value)}
              className={`w-full text-left rounded-lg border-2 p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                pendingPriority === option.value
                  ? option.accentClass
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <span>{option.indicator}</span>
                  {option.title}
                </span>
                {pendingPriority === option.value && (
                  <CheckCircle className="w-4 h-4" />
                )}
              </div>
              <p className="text-xs mt-2 opacity-90">{option.description}</p>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPriorityDialogOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => submitVote(pendingPriority)}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Vote'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (variant === 'compact') {
    return (
      <>
        <Button
          variant={userVoted ? 'default' : 'outline'}
          size="sm"
          onClick={handleVote}
          disabled={loading}
          className={`flex items-center gap-1 ${
            userVoted
              ? 'bg-blue-600 text-white border-blue-600'
              : 'text-gray-600 border-gray-300 hover:border-blue-600 hover:text-blue-600'
          } ${sizeClasses[size].button}`}
        >
          {loading ? (
            <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
          ) : (
            <ThumbsUp
              className={`${sizeClasses[size].icon} ${
                userVoted ? 'fill-current' : ''
              }`}
            />
          )}
          <span className={`font-medium ${sizeClasses[size].text}`}>
            {voteCount}
          </span>
        </Button>
        {renderPriorityDialog()}
      </>
    );
  }

  // Default vertical layout
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleVote}
        disabled={loading}
        className={`flex flex-col h-auto py-2 px-3 ${
          userVoted
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
        }`}
      >
        {loading ? (
          <Loader2 className={`${sizeClasses[size].icon} mb-1 animate-spin`} />
        ) : (
          <ThumbsUp
            className={`${sizeClasses[size].icon} mb-1 ${
              userVoted ? 'fill-current' : ''
            }`}
          />
        )}
        <span className={`font-medium ${sizeClasses[size].text}`}>
          {voteCount}
        </span>
      </Button>

      {userVoted && (
        <div className="text-xs mt-1 flex items-center gap-1 text-blue-600">
          <CheckCircle className="w-3 h-3" />
          <span>
            Voted{priorityBadge ? ` · ${priorityBadge.title}` : ''}
          </span>
        </div>
      )}

      {renderPriorityDialog()}
    </div>
  );
}

export default VoteButton;

// Enhanced voting statistics component
interface VoteStatsProps {
  postId: string;
  refreshToken?: unknown;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function VoteStats({ postId, refreshToken, onShowNotification }: VoteStatsProps) {
  const [stats, setStats] = useState({
    totalVotes: 0,
    recentVotes: 0,
    mustHave: 0,
    important: 0,
    niceToHave: 0,
    loading: true
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      setSupabase(client);
    }
  }, []);

  const loadVoteStats = useCallback(async () => {
    if (!supabase) return;
    
    try {
      // Fetch votes for this post
      const { data: voteRows, error: voteError } = await supabase
        .from('votes')
        .select('priority, created_at')
        .eq('post_id', postId);

      if (voteError) {
        console.error('Error loading votes:', voteError);
        return;
      }

      const totalVotes = voteRows?.length || 0;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let recentVotes = 0;
      let mustHave = 0;
      let important = 0;
      let niceToHave = 0;

      voteRows?.forEach((row) => {
        if (row.created_at && new Date(row.created_at) >= sevenDaysAgo) {
          recentVotes += 1;
        }

        const key = (row.priority as VotePriority | null) ?? 'important';
        switch (key) {
          case 'must_have':
            mustHave += 1;
            break;
          case 'nice_to_have':
            niceToHave += 1;
            break;
          case 'important':
          default:
            important += 1;
            break;
        }
      });

      setStats({
        totalVotes,
        recentVotes,
        mustHave,
        important,
        niceToHave,
        loading: false
      });

    } catch (error) {
      console.error('Error loading vote stats:', error);
      onShowNotification?.('Error loading vote statistics', 'error');
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [supabase, postId, onShowNotification]);

  useEffect(() => {
    if (supabase) {
      loadVoteStats();
    }
  }, [postId, supabase, loadVoteStats, refreshToken]);

  if (stats.loading) {
    return (
      <div className="text-xs text-gray-500">
        Loading stats...
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-500 space-y-2">
      <div className="flex items-center gap-1">
        <ThumbsUp className="w-3 h-3" />
        <span>{stats.totalVotes} total votes</span>
        {stats.recentVotes > 0 && (
          <span className="text-green-600 ml-2">
            +{stats.recentVotes} this week
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <span className="flex items-center justify-center gap-1 rounded-full bg-red-50 text-red-600 py-1">
          🔴 Must Have {stats.mustHave}
        </span>
        <span className="flex items-center justify-center gap-1 rounded-full bg-amber-50 text-amber-600 py-1">
          🟡 Important {stats.important}
        </span>
        <span className="flex items-center justify-center gap-1 rounded-full bg-emerald-50 text-emerald-600 py-1">
          🟢 Nice to Have {stats.niceToHave}
        </span>
      </div>
    </div>
  );
}
