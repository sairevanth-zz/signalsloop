'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import {
  FeedbackListWithSentimentProps,
  PostWithSentiment,
  SentimentCategory,
} from '@/types/sentiment';
import { SentimentBadgeGroup } from './SentimentBadge';

/**
 * FeedbackListWithSentiment Component
 * Displays a list of feedback posts with sentiment analysis
 *
 * Features:
 * - Real-time updates via Supabase subscriptions
 * - Filter by sentiment category
 * - Loading and empty states
 * - Responsive design
 */
export function FeedbackListWithSentiment({
  projectId,
  initialPosts = [],
  filterBySentiment = null,
  onSentimentFilter,
  className = '',
}: FeedbackListWithSentimentProps) {
  const [posts, setPosts] = useState<PostWithSentiment[]>(initialPosts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<SentimentCategory | null>(
    filterBySentiment,
  );

  // Initialize Supabase client
  const supabase = getSupabaseClient();

  // Fetch posts with sentiment
  useEffect(() => {
    fetchPosts();
  }, [projectId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase) return;

    console.log('[FEEDBACK LIST] Setting up real-time subscription');

    // Subscribe to sentiment_analysis changes
    const sentimentChannel = supabase
      .channel('sentiment_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sentiment_analysis',
        },
        (payload) => {
          console.log('[FEEDBACK LIST] Sentiment update:', payload);
          handleSentimentUpdate(payload);
        },
      )
      .subscribe();

    // Subscribe to posts changes
    const postsChannel = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('[FEEDBACK LIST] Post update:', payload);
          handlePostUpdate(payload);
        },
      )
      .subscribe();

    return () => {
      console.log('[FEEDBACK LIST] Cleaning up subscriptions');
      sentimentChannel.unsubscribe();
      postsChannel.unsubscribe();
    };
  }, [projectId, supabase]);

  // Update filter when prop changes
  useEffect(() => {
    setSelectedFilter(filterBySentiment);
  }, [filterBySentiment]);

  const fetchPosts = async () => {
    if (!supabase) {
      setError('Supabase client not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch posts with sentiment from the view
      const { data, error: fetchError } = await supabase
        .from('posts_with_sentiment')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setPosts(data || []);
    } catch (err) {
      console.error('[FEEDBACK LIST] Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSentimentUpdate = async (payload: any) => {
    const { new: newRecord, old: oldRecord, eventType } = payload;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      // Fetch the updated post with sentiment
      const { data, error } = await supabase!
        .from('posts_with_sentiment')
        .select('*')
        .eq('id', newRecord.post_id)
        .single();

      if (!error && data) {
        setPosts((prev) => {
          const index = prev.findIndex((p) => p.id === data.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = data;
            return updated;
          } else {
            return [data, ...prev];
          }
        });
      }
    } else if (eventType === 'DELETE') {
      setPosts((prev) => prev.filter((p) => p.id !== oldRecord.post_id));
    }
  };

  const handlePostUpdate = async (payload: any) => {
    const { new: newRecord, old: oldRecord, eventType } = payload;

    if (eventType === 'INSERT') {
      const { data, error } = await supabase!
        .from('posts_with_sentiment')
        .select('*')
        .eq('id', newRecord.id)
        .single();

      if (!error && data) {
        setPosts((prev) => [data, ...prev]);
      }
    } else if (eventType === 'UPDATE') {
      const { data, error } = await supabase!
        .from('posts_with_sentiment')
        .select('*')
        .eq('id', newRecord.id)
        .single();

      if (!error && data) {
        setPosts((prev) =>
          prev.map((p) => (p.id === data.id ? data : p)),
        );
      }
    } else if (eventType === 'DELETE') {
      setPosts((prev) => prev.filter((p) => p.id !== oldRecord.id));
    }
  };

  const handleFilterChange = (category: SentimentCategory | null) => {
    setSelectedFilter(category);
    onSentimentFilter?.(category);
  };

  // Filter posts by sentiment
  const filteredPosts = selectedFilter
    ? posts.filter((post) => post.sentiment_category === selectedFilter)
    : posts;

  // Count by sentiment
  const sentimentCounts = {
    positive: posts.filter((p) => p.sentiment_category === 'positive').length,
    negative: posts.filter((p) => p.sentiment_category === 'negative').length,
    neutral: posts.filter((p) => p.sentiment_category === 'neutral').length,
    mixed: posts.filter((p) => p.sentiment_category === 'mixed').length,
    unanalyzed: posts.filter((p) => !p.sentiment_category).length,
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header with Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Feedback ({filteredPosts.length})
          </h3>
          <button
            onClick={fetchPosts}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>

        {/* Sentiment Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange(null)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md border transition-colors
              ${
                selectedFilter === null
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }
            `}
          >
            All ({posts.length})
          </button>
          {(['positive', 'neutral', 'mixed', 'negative'] as SentimentCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => handleFilterChange(category)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md border transition-colors
                ${
                  selectedFilter === category
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                }
              `}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)} (
              {sentimentCounts[category]})
            </button>
          ))}
          {sentimentCounts.unanalyzed > 0 && (
            <span className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-md bg-gray-50">
              Unanalyzed ({sentimentCounts.unanalyzed})
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-600 font-medium">Error loading feedback</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <button
              onClick={fetchPosts}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedFilter
                ? `No ${selectedFilter} feedback in this project.`
                : 'No feedback has been submitted yet.'}
            </p>
            {selectedFilter && (
              <button
                onClick={() => handleFilterChange(null)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          filteredPosts.map((post) => (
            <FeedbackItem key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Individual Feedback Item Component
 */
function FeedbackItem({ post }: { post: PostWithSentiment }) {
  const hasAnalysis = post.sentiment_category !== null && post.sentiment_category !== undefined;

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-medium text-gray-900 truncate">{post.title}</h4>
          {post.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{post.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span>{post.author_name || 'Anonymous'}</span>
            <span>•</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            {post.category && (
              <>
                <span>•</span>
                <span className="text-blue-600">{post.category}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          {hasAnalysis ? (
            <SentimentBadgeGroup
              sentiment_category={post.sentiment_category!}
              sentiment_score={post.sentiment_score}
              emotional_tone={post.emotional_tone}
              confidence_score={post.confidence_score}
              size="sm"
              showConfidence={false}
            />
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
              Not analyzed
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
          <span>{post.vote_count || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{post.comment_count || 0}</span>
        </div>
        <div className="flex-1" />
        <span
          className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${post.status === 'open' ? 'bg-green-100 text-green-800' : ''}
            ${post.status === 'planned' ? 'bg-blue-100 text-blue-800' : ''}
            ${post.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${post.status === 'done' ? 'bg-purple-100 text-purple-800' : ''}
            ${post.status === 'declined' ? 'bg-red-100 text-red-800' : ''}
          `}
        >
          {post.status}
        </span>
      </div>
    </div>
  );
}
