/**
 * Hunter Dashboard Component
 * Main dashboard for AI Feedback Hunter
 */

'use client';

import { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('feed');

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load stats
      const statsRes = await fetch(`/api/hunter/stats?projectId=${projectId}`);
      const statsData = await statsRes.json();

      if (statsData.success) {
        setStats(statsData.dashboardStats);
        setPlatformHealth(statsData.platformHealth || []);
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
        // Reload data after scan
        setTimeout(loadData, 2000);
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
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleTriggerScan}
            disabled={refreshing}
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
                      {item.classification && (
                        <ClassificationBadge
                          classification={item.classification}
                          size="sm"
                        />
                      )}
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
            actions.map((action) => (
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
                  <Button size="sm">Take Action</Button>
                </div>
              </Card>
            ))
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
                  {['bug', 'feature_request', 'praise', 'complaint', 'question', 'other'].map((type) => {
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
    </div>
  );
}
