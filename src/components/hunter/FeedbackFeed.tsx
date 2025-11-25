/**
 * Feedback Feed Component
 * Real-time stream of discovered feedback with filtering and infinite scroll
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlatformBadge } from './PlatformBadge';
import { ClassificationBadge } from './ClassificationBadge';
import { CompactRevenueBadge } from '@/components/feedback/RevenueBadge';
import {
  DiscoveredFeedback,
  PlatformType,
  FeedbackClassification,
  PLATFORM_META,
  CLASSIFICATION_META,
} from '@/types/hunter';
import {
  ExternalLink,
  Filter,
  Loader2,
  Search,
  RefreshCw,
  MessageSquare,
  User,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CreateIssueButton } from '@/components/CreateIssueButton';

interface FeedbackFeedProps {
  projectId: string;
  initialFeedback?: DiscoveredFeedback[];
  enableFilters?: boolean;
  enableRealtime?: boolean;
  onFeedbackClick?: (feedback: DiscoveredFeedback) => void;
  className?: string;
}

export function FeedbackFeed({
  projectId,
  initialFeedback = [],
  enableFilters = true,
  enableRealtime = true,
  onFeedbackClick,
  className,
}: FeedbackFeedProps) {
  const [feedback, setFeedback] = useState<DiscoveredFeedback[]>(initialFeedback);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');

  const observerTarget = useRef<HTMLDivElement>(null);

  const loadFeedback = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          projectId,
          limit: '20',
          offset: reset ? '0' : offset.toString(),
        });

        if (platformFilter !== 'all') params.append('platform', platformFilter);
        if (classificationFilter !== 'all') params.append('classification', classificationFilter);
        if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter);

        // Sentiment filters
        if (sentimentFilter === 'positive') {
          params.append('sentimentMin', '0.1');
        } else if (sentimentFilter === 'negative') {
          params.append('sentimentMax', '-0.1');
        } else if (sentimentFilter === 'neutral') {
          params.append('sentimentMin', '-0.1');
          params.append('sentimentMax', '0.1');
        }

        const response = await fetch(`/api/hunter/feed?${params}`);
        const data = await response.json();

        if (data.success) {
          setFeedback((prev) => (reset ? data.items : [...prev, ...data.items]));
          setHasMore(data.hasMore);
          setTotal(data.total);
          setOffset((prev) => (reset ? 20 : prev + 20));
        }
      } catch (error) {
        console.error('[FeedbackFeed] Error loading feedback:', error);
      } finally {
        setLoading(false);
      }
    },
    [projectId, offset, platformFilter, classificationFilter, urgencyFilter, sentimentFilter]
  );

  // Initial load
  useEffect(() => {
    if (initialFeedback.length === 0) {
      loadFeedback(true);
    }
  }, []);

  // Reload when filters change
  useEffect(() => {
    setOffset(0);
    loadFeedback(true);
  }, [platformFilter, classificationFilter, urgencyFilter, sentimentFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadFeedback();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadFeedback]);

  // Real-time polling (every 30 seconds)
  useEffect(() => {
    if (!enableRealtime) return;

    const interval = setInterval(() => {
      loadFeedback(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [enableRealtime, loadFeedback]);

  const handleRefresh = () => {
    setOffset(0);
    loadFeedback(true);
  };

  // Client-side filtering for search and segment
  const filteredFeedback = feedback.filter((item) => {
    // Search filter
    if (searchQuery) {
      const matchesSearch =
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Segment filter
    if (segmentFilter !== 'all') {
      if (!item.customer_segment || item.customer_segment.toLowerCase() !== segmentFilter.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  const getSentimentColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score > 0.3) return 'text-green-600';
    if (score < -0.3) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSentimentLabel = (score: number | null) => {
    if (score === null) return 'Unknown';
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  return (
    <div className={className}>
      {/* Header with Search and Refresh */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      {enableFilters && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {Object.entries(PLATFORM_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.icon} {meta.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={classificationFilter} onValueChange={setClassificationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(CLASSIFICATION_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.emoji} {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgency</SelectItem>
              <SelectItem value="5">🚨 Critical (5)</SelectItem>
              <SelectItem value="4">🔥 High (4)</SelectItem>
              <SelectItem value="3">⚡ Medium (3)</SelectItem>
              <SelectItem value="2">📌 Low (2)</SelectItem>
              <SelectItem value="1">💤 Minimal (1)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiment</SelectItem>
              <SelectItem value="positive">😊 Positive</SelectItem>
              <SelectItem value="neutral">😐 Neutral</SelectItem>
              <SelectItem value="negative">😞 Negative</SelectItem>
            </SelectContent>
          </Select>

          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="enterprise">💼 Enterprise</SelectItem>
              <SelectItem value="mid-market">🏢 Mid-Market</SelectItem>
              <SelectItem value="smb">🏪 SMB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stats Summary */}
      <div className="bg-gray-50 rounded-lg p-3 mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredFeedback.length}</span> of{' '}
          <span className="font-semibold">{total}</span> items
        </div>
        {enableRealtime && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live updates enabled
          </div>
        )}
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No feedback found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Feedback will appear here as it\'s discovered'}
            </p>
          </Card>
        ) : (
          filteredFeedback.map((item) => (
            <Card
              key={item.id}
              className={`p-5 hover:shadow-md transition-shadow cursor-pointer ${
                item.urgency_score && item.urgency_score >= 4
                  ? 'border-l-4 border-l-red-500'
                  : ''
              }`}
              onClick={() => onFeedbackClick?.(item)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <PlatformBadge platform={item.platform} size="sm" />
                  {item.classification && (
                    <ClassificationBadge classification={item.classification} size="sm" />
                  )}
                  {(item.customer_segment || item.customer_plan_tier) && (
                    <CompactRevenueBadge
                      segment={item.customer_segment}
                      planTier={item.customer_plan_tier}
                    />
                  )}
                  {item.urgency_score && item.urgency_score >= 4 && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Urgent
                    </span>
                  )}
                </div>
                <a
                  href={item.platform_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Content */}
              {item.title && (
                <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
              )}
              <p className="text-gray-700 text-sm line-clamp-3 mb-3">{item.content}</p>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.tags.slice(0, 5).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.author_username || 'Anonymous'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(item.discovered_at), { addSuffix: true })}
                  </div>
                  {item.sentiment_score !== null && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span className={getSentimentColor(item.sentiment_score)}>
                        {getSentimentLabel(item.sentiment_score)}
                        {' '}
                        ({item.sentiment_score.toFixed(2)})
                      </span>
                    </div>
                  )}
                  {item.engagement_score > 0 && (
                    <div className="text-xs text-gray-500">
                      {item.engagement_score} engagement
                    </div>
                  )}
                </div>

                {/* Jira Integration Button */}
                <div onClick={(e) => e.stopPropagation()}>
                  <CreateIssueButton
                    feedbackId={item.id}
                    feedbackContent={item.content}
                    projectId={projectId}
                    variant="outline"
                    size="sm"
                  />
                </div>
              </div>
            </Card>
          ))
        )}

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={observerTarget} className="py-8 text-center">
            {loading && <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />}
          </div>
        )}

        {!hasMore && filteredFeedback.length > 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No more feedback to load
          </div>
        )}
      </div>
    </div>
  );
}
