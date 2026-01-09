/**
 * Hunter Dashboard Component
 * Main dashboard for AI Feedback Hunter
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlatformBadge } from './PlatformBadge';
import { ClassificationBadge } from './ClassificationBadge';
import { HunterSetup } from './HunterSetup';
import {
  HunterDashboardStats,
  PlatformHealthStats,
  DiscoveredFeedback,
  ActionRecommendation,
  PlatformType,
} from '@/types/hunter';
import { RefreshCw, Settings, TrendingUp, AlertCircle, ExternalLink, Clock, User, ThumbsUp, ThumbsDown, Tag } from 'lucide-react';
import { ScanProgressPanel } from './ScanProgressPanel';

interface HunterDashboardProps {
  projectId: string;
}

export function HunterDashboard({ projectId }: HunterDashboardProps) {
  const [stats, setStats] = useState<HunterDashboardStats | null>(null);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealthStats[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<DiscoveredFeedback[]>([]);
  const [allFeedback, setAllFeedback] = useState<DiscoveredFeedback[]>([]); // For analytics
  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<DiscoveredFeedback | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [usageInfo, setUsageInfo] = useState<{ current: number; limit: number; remaining: number; plan: string } | null>(null);
  const [needsReviewFeedback, setNeedsReviewFeedback] = useState<DiscoveredFeedback[]>([]);
  const [processingCount, setProcessingCount] = useState(0);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  // Track if data has been loaded to prevent re-fetch on tab switch
  const dataLoadedRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only load on first mount or if projectId changes
    if (!dataLoadedRef.current) {
      loadData();
      // Also check for active scans to restore progress bar
      fetchActiveScan();
    }

    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [projectId]);

  // Fetch active scan (called on mount to restore progress bar after navigation)
  const fetchActiveScan = async () => {
    try {
      const res = await fetch(`/api/hunter/active?projectId=${projectId}`);
      const data = await res.json();

      if (data.success && data.activeScan) {
        // Only show if scan is running AND not stale (< 1 hour old)
        if (data.activeScan.status === 'running') {
          const startedAt = new Date(data.activeScan.startedAt).getTime();
          const oneHourAgo = Date.now() - 60 * 60 * 1000;

          if (startedAt > oneHourAgo) {
            // Scan is recent and still running - show progress
            setCurrentScanId(data.activeScan.id);
            console.log('[Hunter Dashboard] Restored active scan:', data.activeScan.id);
          } else {
            // Scan is stale (running for over 1 hour) - treat as stuck
            console.log('[Hunter Dashboard] Ignoring stale scan (started:', data.activeScan.startedAt, ')');
            // Optionally mark it as failed in the background
            fetch('/api/hunter/scan/timeout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scanId: data.activeScan.id }),
            }).catch(() => { }); // Fire-and-forget
          }
        }
      }
    } catch (error) {
      console.error('[Hunter Dashboard] Error fetching active scan:', error);
    }
  };

  // Poll for updates when scan is active OR items are processing
  useEffect(() => {
    const shouldPoll = processingCount > 0 || currentScanId;

    if (shouldPoll && !pollingRef.current) {
      // Start polling every 8 seconds (faster for better UX)
      pollingRef.current = setInterval(async () => {
        try {
          // Refresh the feed to show new items
          const feedRes = await fetch(`/api/hunter/feed?projectId=${projectId}&limit=20`);
          const feedData = await feedRes.json();
          if (feedData.success) {
            setRecentFeedback(feedData.items || []);
          }

          // Check for processing items
          const res = await fetch(`/api/hunter/feed?projectId=${projectId}&processingStatus=pending&limit=100`);
          const data = await res.json();

          if (data.success) {
            const pendingItems = data.items || [];
            setProcessingCount(pendingItems.length);
          }

          // Check if scan is still running (to detect completion)
          if (currentScanId) {
            const scanRes = await fetch(`/api/hunter/active?projectId=${projectId}`);
            const scanData = await scanRes.json();

            if (scanData.success) {
              const activeScan = scanData.activeScan;
              // If scan completed or no longer running, clear it
              if (!activeScan || activeScan.status !== 'running') {
                console.log('[Hunter Dashboard] Scan completed, clearing progress bar');
                setCurrentScanId(null);
                dataLoadedRef.current = false; // Allow reload
                loadData();
              }
            }
          }
        } catch (error) {
          console.error('[Hunter Dashboard] Polling error:', error);
        }
      }, 8000);
    } else if (!shouldPoll && pollingRef.current) {
      // Stop polling when no more processing items and no active scan
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [processingCount, projectId, currentScanId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load stats
      const statsRes = await fetch(`/api/hunter/stats?projectId=${projectId}`);
      const statsData = await statsRes.json();

      if (statsData.success) {
        setStats(statsData.dashboardStats);
        setPlatformHealth(statsData.platformHealth || []);
        if (statsData.usageInfo) {
          setUsageInfo(statsData.usageInfo);
        }
      }

      // Load recent feedback (for feed tab)
      const feedRes = await fetch(
        `/api/hunter/feed?projectId=${projectId}&limit=10`
      );
      const feedData = await feedRes.json();

      if (feedData.success) {
        setRecentFeedback(feedData.items || []);
      }

      // Load all feedback for analytics (higher limit)
      const allFeedRes = await fetch(
        `/api/hunter/feed?projectId=${projectId}&limit=500`
      );
      const allFeedData = await allFeedRes.json();

      if (allFeedData.success) {
        setAllFeedback(allFeedData.items || []);
      }

      // Load action recommendations
      const actionsRes = await fetch(
        `/api/hunter/actions?projectId=${projectId}&status=pending`
      );
      const actionsData = await actionsRes.json();

      if (actionsData.success) {
        setActions(actionsData.recommendations || []);
      }

      // Load items needing human review
      const reviewRes = await fetch(
        `/api/hunter/feed?projectId=${projectId}&needsReview=true&limit=50`
      );
      const reviewData = await reviewRes.json();

      if (reviewData.success) {
        // Map platform_url to source_url and author_username to author_name for convenience
        const reviewItems = (reviewData.items || []).map((item: DiscoveredFeedback) => ({
          ...item,
          source_url: item.source_url || item.platform_url,
          author_name: item.author_name || item.author_username,
        }));
        setNeedsReviewFeedback(reviewItems);
      }

      // Check for pending items (to show processing indicator and start polling)
      const pendingRes = await fetch(
        `/api/hunter/feed?projectId=${projectId}&processingStatus=pending&limit=100`
      );
      const pendingData = await pendingRes.json();

      if (pendingData.success) {
        const pendingCount = (pendingData.items || []).length;
        setProcessingCount(pendingCount);
        if (pendingCount > 0) {
          console.log(`[Hunter Dashboard] ${pendingCount} items pending processing`);
        }
      }

      // Mark as loaded to prevent re-fetch on remount
      dataLoadedRef.current = true;
    } catch (error) {
      console.error('[Hunter Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScan = async () => {
    try {
      setRefreshing(true);

      const res = await fetch('/api/hunter/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();

      if (data.success) {
        // Store scanId for progress tracking
        if (data.scanId) {
          setCurrentScanId(data.scanId);
        }
        // Force reload data after scan to show new pending items
        dataLoadedRef.current = false; // Allow reload
        await loadData();
      }
    } catch (error) {
      console.error('[Hunter Dashboard] Error triggering scan:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const generateActions = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/hunter/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, minMentions: 2, lookbackDays: 30 }),
      });

      const data = await res.json();
      if (data.success) {
        // Reload actions after generation
        const actionsRes = await fetch(
          `/api/hunter/actions?projectId=${projectId}&status=pending`
        );
        const actionsData = await actionsRes.json();
        if (actionsData.success) {
          setActions(actionsData.recommendations || []);
        }
      }
    } catch (error) {
      console.error('[Hunter Dashboard] Error generating actions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Feedback Hunter</h1>
          <p className="text-gray-500 mt-1">
            Autonomous feedback discovery across multiple platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Usage Display */}
          {usageInfo && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm">
              <span className="text-gray-500">Scans:</span>
              <span className={`font-medium ${usageInfo.remaining <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                {usageInfo.remaining}/{usageInfo.limit}
              </span>
              <span className="text-xs text-gray-400">({usageInfo.plan})</span>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleTriggerScan}
            disabled={refreshing || !!(usageInfo && usageInfo.remaining <= 0)}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Scanning...' : 'Scan Now'}
          </Button>
          <Button variant="outline" onClick={() => setShowSetup(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Scan Progress Panel */}
      {currentScanId && (
        <ScanProgressPanel
          scanId={currentScanId}
          onClose={() => setCurrentScanId(null)}
        />
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Feedback</div>
            <div className="text-3xl font-bold mt-1">{stats.total_feedback}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.feedback_last_24h} in last 24h
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm text-gray-500">Active Platforms</div>
            <div className="text-3xl font-bold mt-1">{stats.active_platforms}</div>
            <div className="text-xs text-gray-400 mt-1">
              {platformHealth.filter((p) => p.status === 'active').length} running
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm text-gray-500">Avg Sentiment</div>
            <div className="text-3xl font-bold mt-1">
              {stats.avg_sentiment?.toFixed(2) || 'N/A'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              -1 (neg) to +1 (pos)
            </div>
          </Card>

          <Card
            className="p-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
            onClick={async () => {
              // Load urgent items only
              try {
                const res = await fetch(`/api/hunter/feed?projectId=${projectId}&urgency=4&limit=50`);
                const data = await res.json();
                if (data.success) {
                  setRecentFeedback(data.items || []);
                  setActiveTab('feed'); // Switch to feed tab to show results
                }
              } catch (error) {
                console.error('Error loading urgent items:', error);
              }
            }}
          >
            <div className="text-sm text-gray-500">Urgent Items</div>
            <div className="text-3xl font-bold mt-1 text-red-600">
              {stats.urgent_items}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.churn_risks} churn risks - click to filter
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="feed">Recent Feedback</TabsTrigger>
          <TabsTrigger value="actions">
            Action Items
            {actions.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {actions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="review">
            Needs Review
            {needsReviewFeedback.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">
                {needsReviewFeedback.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Recent Feedback Tab */}
        <TabsContent value="feed" className="space-y-4">
          {recentFeedback.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No feedback discovered yet.</p>
              <Button className="mt-4" onClick={handleTriggerScan}>
                Run First Scan
              </Button>
            </Card>
          ) : (
            recentFeedback.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PlatformBadge platform={item.platform} size="sm" />
                      <ClassificationBadge
                        classification={item.classification}
                        size="sm"
                        isProcessing={item.processing_status === 'pending' || item.processing_status === 'processing'}
                      />
                      {item.urgency_score && item.urgency_score >= 4 && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                          Urgent
                        </span>
                      )}
                    </div>
                    {item.title && (
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {item.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>By {item.author_username || 'Anonymous'}</span>
                      <span>
                        {new Date(item.discovered_at).toLocaleDateString()}
                      </span>
                      {item.sentiment_score !== null && (
                        <span>
                          Sentiment:{' '}
                          <span
                            className={
                              item.sentiment_score > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {item.sentiment_score.toFixed(2)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFeedback(item)}>
                    View
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="space-y-4">
          {actions.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No pending action items.</p>
              <p className="text-sm text-gray-400 mt-2">
                Action items are generated based on feedback patterns.
              </p>
              {recentFeedback.length > 0 && (
                <Button
                  className="mt-4"
                  onClick={generateActions}
                  disabled={refreshing}
                >
                  {refreshing ? 'Generating...' : 'Generate Action Items'}
                </Button>
              )}
            </Card>
          ) : (
            <>
              {/* Header with Regenerate button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{actions.length} Action Items</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateActions}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Regenerating...' : 'Regenerate Actions'}
                </Button>
              </div>
              {actions.map((action) => (
                <Card key={action.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${action.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : action.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : action.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                          {action.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {action.mention_count} mentions
                        </span>
                      </div>
                      <h4 className="font-semibold mb-2">{action.issue_summary}</h4>
                      {action.business_impact && (
                        <p className="text-sm text-gray-600 mb-2">
                          {action.business_impact}
                        </p>
                      )}
                      {action.suggested_actions && action.suggested_actions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            Suggested Actions:
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {action.suggested_actions.slice(0, 3).map((sa: any, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-500">•</span>
                                <span>{sa.description || sa}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => setSelectedAction(action)}>Take Action</Button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms" className="space-y-4">
          {platformHealth.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No platforms configured.</p>
            </Card>
          ) : (
            platformHealth.map((platform) => (
              <Card key={platform.platform_type} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <PlatformBadge platform={platform.platform_type} />
                    <div>
                      <div className="text-sm font-medium">
                        {platform.total_scans} scans
                      </div>
                      <div className="text-xs text-gray-500">
                        {platform.success_rate}% success rate
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-medium ${platform.status === 'active'
                        ? 'text-green-600'
                        : platform.status === 'error'
                          ? 'text-red-600'
                          : 'text-gray-600'
                        }`}
                    >
                      {platform.status.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {platform.total_items_found} items found
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {allFeedback.length === 0 ? (
            <Card className="p-8 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No data for analytics yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Run a scan to collect feedback data
              </p>
            </Card>
          ) : (
            <>
              {/* Classification Distribution */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Classification Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['bug', 'feature_request', 'usability_issue', 'praise', 'complaint', 'comparison', 'churn_risk', 'question', 'other'].map((type) => {
                    const count = allFeedback.filter(f => f.classification === type).length;
                    const percentage = allFeedback.length > 0 ? ((count / allFeedback.length) * 100).toFixed(0) : 0;
                    return (
                      <div key={type} className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-gray-500 capitalize">{type.replace('_', ' ')}</div>
                        <div className="text-xs text-gray-400">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Sentiment Breakdown */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 text-center">
                    <ThumbsUp className="h-6 w-6 mx-auto text-green-600 mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {allFeedback.filter(f => (f.sentiment_score ?? 0) > 0.2).length}
                    </div>
                    <div className="text-sm text-gray-500">Positive</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="h-6 w-6 mx-auto bg-gray-400 rounded-full mb-2" />
                    <div className="text-2xl font-bold">
                      {allFeedback.filter(f => (f.sentiment_score ?? 0) >= -0.2 && (f.sentiment_score ?? 0) <= 0.2).length}
                    </div>
                    <div className="text-sm text-gray-500">Neutral</div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4 text-center">
                    <ThumbsDown className="h-6 w-6 mx-auto text-red-600 mb-2" />
                    <div className="text-2xl font-bold text-red-600">
                      {allFeedback.filter(f => (f.sentiment_score ?? 0) < -0.2).length}
                    </div>
                    <div className="text-sm text-gray-500">Negative</div>
                  </div>
                </div>
              </Card>

              {/* Platform Distribution */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Feedback by Platform</h3>
                <div className="space-y-3">
                  {['reddit', 'hackernews', 'twitter', 'playstore'].map((platform) => {
                    const count = allFeedback.filter(f => f.platform === platform).length;
                    const percentage = allFeedback.length > 0 ? ((count / allFeedback.length) * 100) : 0;
                    return (
                      <div key={platform} className="flex items-center gap-4">
                        <PlatformBadge platform={platform as PlatformType} size="sm" />
                        <div className="flex-1">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-medium w-16 text-right">{count} items</div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Urgency Overview */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Urgency Distribution</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const count = allFeedback.filter(f => f.urgency_score === level).length;
                    return (
                      <div key={level} className={`rounded-lg p-3 text-center ${level >= 4 ? 'bg-red-100 dark:bg-red-900/30' :
                        level === 3 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          'bg-green-100 dark:bg-green-900/30'
                        }`}>
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-xs text-gray-500">Level {level}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Needs Review Tab */}
        <TabsContent value="review" className="space-y-4">
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-200">Human Review Queue</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  These items scored between 50-69% relevance and need manual verification.
                  Review and mark as relevant or irrelevant to improve AI accuracy.
                </p>
              </div>
            </div>
          </Card>

          {needsReviewFeedback.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No items pending review. Great job! 🎉</p>
            </Card>
          ) : (
            needsReviewFeedback.map((item) => (
              <Card key={item.id} className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PlatformBadge platform={item.platform} size="sm" />
                      <ClassificationBadge
                        classification={item.classification}
                        size="sm"
                        isProcessing={item.processing_status === 'pending' || item.processing_status === 'processing'}
                      />
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                        Relevance: {item.relevance_score}%
                      </span>
                    </div>
                    {item.title && (
                      <h4 className="font-medium mb-1">{item.title}</h4>
                    )}
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                      {item.content}
                    </p>
                    {item.relevance_reasoning && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        AI: {item.relevance_reasoning}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.author_name || 'Anonymous'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.discovered_at ? new Date(item.discovered_at).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      onClick={async () => {
                        try {
                          await fetch('/api/hunter/feedback/review', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: item.id, decision: 'relevant' }),
                          });
                          setNeedsReviewFeedback(needsReviewFeedback.filter(f => f.id !== item.id));
                        } catch (error) {
                          console.error('Error marking as relevant:', error);
                        }
                      }}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Relevant
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={async () => {
                        try {
                          await fetch('/api/hunter/feedback/review', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: item.id, decision: 'irrelevant' }),
                          });
                          setNeedsReviewFeedback(needsReviewFeedback.filter(f => f.id !== item.id));
                        } catch (error) {
                          console.error('Error marking as irrelevant:', error);
                        }
                      }}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Irrelevant
                    </Button>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center justify-center"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure AI Feedback Hunter</DialogTitle>
          </DialogHeader>
          <HunterSetup
            projectId={projectId}
            onComplete={() => {
              setShowSetup(false);
              loadData(); // Reload data after setup
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedback && <PlatformBadge platform={selectedFeedback.platform} />}
              Feedback Details
            </DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedFeedback.classification && (
                  <ClassificationBadge classification={selectedFeedback.classification} />
                )}
                {selectedFeedback.urgency_score && selectedFeedback.urgency_score >= 4 && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    Urgent (Level {selectedFeedback.urgency_score})
                  </span>
                )}
                {selectedFeedback.sentiment_category && (
                  <span className={`text-xs px-2 py-1 rounded-full ${selectedFeedback.sentiment_category === 'positive' ? 'bg-green-100 text-green-800' :
                    selectedFeedback.sentiment_category === 'negative' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {selectedFeedback.sentiment_category}
                  </span>
                )}
              </div>

              {selectedFeedback.title && (
                <h3 className="text-lg font-semibold">{selectedFeedback.title}</h3>
              )}

              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{selectedFeedback.content}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <User className="h-4 w-4" />
                  <span>{selectedFeedback.author_username || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(selectedFeedback.discovered_at).toLocaleString()}</span>
                </div>
              </div>

              {selectedFeedback.classification_reason && (
                <div className="text-sm">
                  <strong>Classification Reason:</strong>
                  <p className="text-gray-600 mt-1">{selectedFeedback.classification_reason}</p>
                </div>
              )}

              {selectedFeedback.urgency_reason && (
                <div className="text-sm">
                  <strong>Urgency Reason:</strong>
                  <p className="text-gray-600 mt-1">{selectedFeedback.urgency_reason}</p>
                </div>
              )}

              {selectedFeedback.tags && selectedFeedback.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-gray-400" />
                  {selectedFeedback.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedFeedback.platform_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on {selectedFeedback.platform}
                </Button>
                <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Detail Dialog */}
      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Action Required
            </DialogTitle>
          </DialogHeader>
          {selectedAction && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${selectedAction.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  selectedAction.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    selectedAction.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                  }`}>
                  {selectedAction.priority.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  {selectedAction.mention_count} mentions
                </span>
              </div>

              <h3 className="text-lg font-semibold">{selectedAction.issue_summary}</h3>

              {selectedAction.business_impact && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <strong>Business Impact:</strong> {selectedAction.business_impact}
                  </p>
                </div>
              )}

              {selectedAction.suggested_actions && selectedAction.suggested_actions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Suggested Actions:</h4>
                  <div className="space-y-2">
                    {selectedAction.suggested_actions.map((sa: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <input type="checkbox" className="mt-1 h-4 w-4 rounded" />
                        <span className="text-sm">{sa.description || sa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAction.draft_response && (
                <div className="space-y-2">
                  <h4 className="font-medium">Draft Response:</h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{selectedAction.draft_response}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={async () => {
                    // Mark as complete
                    try {
                      await fetch('/api/hunter/actions', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: selectedAction.id,
                          status: 'completed'
                        }),
                      });
                      setActions(actions.filter(a => a.id !== selectedAction.id));
                      setSelectedAction(null);
                    } catch (error) {
                      console.error('Error completing action:', error);
                    }
                  }}
                >
                  Mark Complete
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    // Dismiss
                    try {
                      await fetch('/api/hunter/actions', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: selectedAction.id,
                          status: 'dismissed'
                        }),
                      });
                      setActions(actions.filter(a => a.id !== selectedAction.id));
                      setSelectedAction(null);
                    } catch (error) {
                      console.error('Error dismissing action:', error);
                    }
                  }}
                >
                  Dismiss
                </Button>
                <Button variant="ghost" onClick={() => setSelectedAction(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
