'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
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

// Generate voter hash for anonymous users
const generateVoterHash = (): string => {
  // Only run on client side
  if (typeof window === 'undefined') return '';
  
  // Try to get existing hash from localStorage first
  const existingHash = localStorage.getItem('signalsloop_voter_hash');
  if (existingHash) {
    return existingHash;
  }

  // Generate new hash based on browser fingerprint
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const platform = navigator.platform;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Simple hash function (in production, use a proper hash library)
  const fingerprint = `${userAgent}-${language}-${platform}-${timezone}`;
  const hash = btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  
  // Store for future use
  localStorage.setItem('signalsloop_voter_hash', hash);
  
  return hash;
};

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
  const [voterHash, setVoterHash] = useState<string>('');
  const supabase = getSupabaseClient();

  const checkUserVoteStatus = useCallback(async (hash: string) => {
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .eq('ip_address', hash)
      .maybeSingle();

    if (!error && data) {
      setUserVoted(true);
    }
  }, [supabase, postId]);

  // Initialize Supabase client and voter hash
  useEffect(() => {
    // Generate voter hash
    const hash = generateVoterHash();
    setVoterHash(hash);
    
    // Check if user has already voted on this post
    if (hash && supabase) {
      checkUserVoteStatus(hash);
    }
  }, [postId, supabase, checkUserVoteStatus]);

  const handleVote = async (event: React.MouseEvent) => {
    // Prevent event bubbling to parent elements (like card onClick)
    event.stopPropagation();
    event.preventDefault();
    
    if (loading || !voterHash || !supabase) {
      onShowNotification?.('Voting system not available. Please refresh the page.', 'error');
      return;
    }

    try {
      setLoading(true);

      if (userVoted) {
        // Remove vote (unvote)
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('post_id', postId)
          .eq('ip_address', voterHash);

        if (error) {
          console.error('Error removing vote:', error);
          console.error('Vote removal details:', { postId, voterHash, error });
          onShowNotification?.('Error removing vote', 'error');
          return;
        }

        // Update local state
        const newCount = Math.max(0, voteCount - 1);
        setVoteCount(newCount);
        setUserVoted(false);
        
        onVoteChange?.(newCount, false);
        onShowNotification?.('Vote removed', 'info');

      } else {
        // Add vote
        const { error } = await supabase
          .from('votes')
          .insert([{
            post_id: postId,
            ip_address: voterHash,
            created_at: new Date().toISOString()
          }]);

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            onShowNotification?.('You have already voted on this post', 'error');
            setUserVoted(true); // Update local state to match database
          } else {
            console.error('Error adding vote:', error);
            console.error('Vote addition details:', { postId, voterHash, error });
            onShowNotification?.('Error recording vote', 'error');
          }
          return;
        }

        // Update local state
        const newCount = voteCount + 1;
        setVoteCount(newCount);
        setUserVoted(true);
        
        onVoteChange?.(newCount, true);
        onShowNotification?.('Vote recorded!', 'success');
      }

    } catch (error) {
      console.error('Error handling vote:', error);
      onShowNotification?.('Something went wrong', 'error');
    } finally {
      setLoading(false);
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

  if (variant === 'compact') {
    return (
      <Button
        variant={userVoted ? "default" : "outline"}
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
          <ThumbsUp className={`${sizeClasses[size].icon} ${userVoted ? 'fill-current' : ''}`} />
        )}
        <span className={`font-medium ${sizeClasses[size].text}`}>
          {voteCount}
        </span>
      </Button>
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
          <ThumbsUp className={`${sizeClasses[size].icon} mb-1 ${userVoted ? 'fill-current' : ''}`} />
        )}
        <span className={`font-medium ${sizeClasses[size].text}`}>
          {voteCount}
        </span>
      </Button>
      
      {userVoted && (
        <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span>Voted</span>
        </div>
      )}
    </div>
  );
}

// Enhanced voting statistics component
interface VoteStatsProps {
  postId: string;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function VoteStats({ postId, onShowNotification }: VoteStatsProps) {
  const [stats, setStats] = useState({
    totalVotes: 0,
    recentVotes: 0,
    loading: true
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

  const loadVoteStats = useCallback(async () => {
    if (!supabase) return;
    
    try {
      // Get total votes
      const { data: totalData, error: totalError } = await supabase
        .from('votes')
        .select('id', { count: 'exact' })
        .eq('post_id', postId);

      if (totalError) {
        console.error('Error loading total votes:', totalError);
        return;
      }

      // Get recent votes (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentData, error: recentError } = await supabase
        .from('votes')
        .select('id', { count: 'exact' })
        .eq('post_id', postId)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (recentError) {
        console.error('Error loading recent votes:', recentError);
        return;
      }

      setStats({
        totalVotes: totalData?.length || 0,
        recentVotes: recentData?.length || 0,
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
  }, [postId, supabase, loadVoteStats]);

  if (stats.loading) {
    return (
      <div className="text-xs text-gray-500">
        Loading stats...
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-500 space-y-1">
      <div className="flex items-center gap-1">
        <ThumbsUp className="w-3 h-3" />
        <span>{stats.totalVotes} total votes</span>
      </div>
      {stats.recentVotes > 0 && (
        <div className="text-green-600">
          +{stats.recentVotes} this week
        </div>
      )}
    </div>
  );
}

// Rate limiting hook for vote spam prevention
export function useVoteRateLimit(voterHash: string) {
  const [canVote, setCanVote] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

  const checkRateLimit = useCallback(async () => {
    if (!supabase) return;
    
    try {
      // Check votes in the last hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data, error } = await supabase
        .from('votes')
        .select('created_at')
        .eq('ip_address', voterHash)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking rate limit:', error);
        return;
      }

      // Allow max 10 votes per hour
      const maxVotesPerHour = 10;
      const recentVotes = data?.length || 0;

      if (recentVotes >= maxVotesPerHour) {
        setCanVote(false);
        
        // Calculate time until reset
        const oldestVote = new Date(data[data.length - 1].created_at);
        const resetTime = new Date(oldestVote.getTime() + 60 * 60 * 1000); // 1 hour later
        const timeUntil = Math.max(0, resetTime.getTime() - Date.now());
        
        setTimeUntilReset(timeUntil);
      } else {
        setCanVote(true);
        setTimeUntilReset(0);
      }

    } catch (error) {
      console.error('Error checking rate limit:', error);
    }
  }, [supabase, voterHash]);

  useEffect(() => {
    if (voterHash && supabase) {
      checkRateLimit();
    }
  }, [voterHash, supabase, checkRateLimit]);

  return { canVote, timeUntilReset, checkRateLimit };
}

export default VoteButton;
