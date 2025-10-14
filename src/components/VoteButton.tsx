'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    accentClass: 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm',
    indicator: '🔴',
  },
  {
    value: 'important',
    title: 'Important',
    description: 'Significant business impact',
    accentClass: 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm',
    indicator: '🟡',
  },
  {
    value: 'nice_to_have',
    title: 'Nice to Have',
    description: 'Helpful improvement or quality-of-life',
    accentClass: 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm',
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
  const [selectedPriority, setSelectedPriority] = useState<VotePriority>('important');
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);

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
        setPriorityMenuOpen(false);
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
      setPriorityMenuOpen(false);
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
      setPriorityMenuOpen(false);
    }
  };

  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    if (loading) {
      return;
    }

    if (userVoted) {
      void removeVote();
    } else {
      setPriorityMenuOpen(true);
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

  const VoteTriggerButton = (
    <Button
      variant={userVoted ? 'default' : variant === 'compact' ? 'outline' : 'ghost'}
      size={variant === 'compact' ? 'sm' : 'sm'}
      onClick={handleTriggerClick}
      disabled={loading}
      className={
        variant === 'compact'
          ? `flex items-center gap-1 ${
              userVoted
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-gray-600 border-gray-300 hover:border-blue-600 hover:text-blue-600'
            } ${sizeClasses[size].button}`
          : `flex flex-col h-auto py-2 px-3 ${
              userVoted
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
            }`
      }
    >
      {loading ? (
        <Loader2
          className={`${sizeClasses[size].icon} ${
            variant === 'compact' ? '' : 'mb-1'
          } animate-spin`}
        />
      ) : (
        <ThumbsUp
          className={`${sizeClasses[size].icon} ${
            variant === 'compact' ? '' : 'mb-1'
          } ${userVoted ? 'fill-current' : ''}`}
        />
      )}
      <span
        className={`font-medium ${
          variant === 'compact' ? sizeClasses[size].text : sizeClasses[size].text
        }`}
      >
        {voteCount}
      </span>
    </Button>
  );

  const renderPriorityMenu = (children: React.ReactNode) => (
    <DropdownMenu
      open={priorityMenuOpen}
      onOpenChange={(open) => {
        if (!loading) {
          setPriorityMenuOpen(open);
        }
      }}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="top"
        className="w-72 space-y-1"
        forceMount
      >
        <DropdownMenuLabel className="font-semibold text-gray-900">
          How important is this request?
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PRIORITY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className="px-3 py-2"
            onSelect={(event) => {
              event.preventDefault();
              submitVote(option.value);
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{option.indicator}</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">
                    {option.title}
                  </span>
                  {selectedPriority === option.value && !loading && (
                    <CheckCircle className="w-3 h-3 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (variant === 'compact') {
    return (
      <>
        {userVoted ? VoteTriggerButton : renderPriorityMenu(VoteTriggerButton)}
        {userVoted && priorityBadge && (
          <div className="text-xs mt-1 flex items-center gap-1 text-blue-600">
            <CheckCircle className="w-3 h-3" />
            <span>{priorityBadge.title}</span>
          </div>
        )}
      </>
    );
  }

  // Default vertical layout
  return (
    <div className="flex flex-col items-center">
      {userVoted ? VoteTriggerButton : renderPriorityMenu(VoteTriggerButton)}

      {userVoted && (
        <div className="text-xs mt-1 flex items-center gap-1 text-blue-600">
          <CheckCircle className="w-3 h-3" />
          <span>
            Voted{priorityBadge ? ` · ${priorityBadge.title}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default VoteButton;

// Enhanced voting statistics component
export interface VoteStatsSnapshot {
  totalVotes: number;
  recentVotes: number;
  mustHave: number;
  important: number;
  niceToHave: number;
}

interface VoteStatsState extends VoteStatsSnapshot {
  loading: boolean;
}

interface VoteStatsProps {
  postId: string;
  refreshToken?: unknown;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  onStatsChange?: (stats: VoteStatsSnapshot) => void;
}

export function VoteStats({ postId, refreshToken, onShowNotification, onStatsChange }: VoteStatsProps) {
  const [stats, setStats] = useState<VoteStatsState>({
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

      const nextStats: VoteStatsState = {
        totalVotes,
        recentVotes,
        mustHave,
        important,
        niceToHave,
        loading: false
      };

      setStats(nextStats);
      onStatsChange?.({
        totalVotes,
        recentVotes,
        mustHave,
        important,
        niceToHave,
      });

    } catch (error) {
      console.error('Error loading vote stats:', error);
      onShowNotification?.('Error loading vote statistics', 'error');
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [supabase, postId, onShowNotification, onStatsChange]);

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
        <span
          className="flex items-center justify-center gap-1 rounded-full py-1"
          style={{
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
          }}
        >
          🔴 Must Have {stats.mustHave}
        </span>
        <span
          className="flex items-center justify-center gap-1 rounded-full py-1"
          style={{
            backgroundColor: '#FEF3C7',
            color: '#92400E',
          }}
        >
          🟡 Important {stats.important}
        </span>
        <span
          className="flex items-center justify-center gap-1 rounded-full py-1"
          style={{
            backgroundColor: '#D1FAE5',
            color: '#065F46',
          }}
        >
          🟢 Nice to Have {stats.niceToHave}
        </span>
      </div>
    </div>
  );
}
