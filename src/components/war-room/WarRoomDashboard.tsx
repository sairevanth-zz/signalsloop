/**
 * Competitor War Room Dashboard
 * Real-time competitor alerts, job postings, and hiring trends
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Bell,
  Briefcase,
  Building2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  CompetitorAlert,
  CompetitorJobPosting,
  WarRoomSummary,
  HiringTrend,
  AlertStatus,
  AlertSeverity,
  ALERT_TYPE_LABELS,
  SEVERITY_COLORS,
  DEPARTMENT_LABELS,
} from '@/lib/war-room/types';

interface WarRoomDashboardProps {
  projectId: string;
  projectSlug: string;
}

export function WarRoomDashboard({ projectId, projectSlug }: WarRoomDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WarRoomSummary | null>(null);
  const [alerts, setAlerts] = useState<CompetitorAlert[]>([]);
  const [jobPostings, setJobPostings] = useState<CompetitorJobPosting[]>([]);
  const [hiringTrends, setHiringTrends] = useState<HiringTrend[]>([]);
  const [selectedTab, setSelectedTab] = useState('alerts');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load summary and trends
      const summaryRes = await fetch(`/api/war-room?projectId=${projectId}`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.summary);
        setHiringTrends(summaryData.hiringTrends || []);
      }

      // Load alerts
      const alertsRes = await fetch(`/api/war-room/alerts?projectId=${projectId}&limit=20`);
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.alerts);
      }

      // Load job postings
      const jobsRes = await fetch(`/api/war-room/jobs?projectId=${projectId}&active=true&limit=20`);
      const jobsData = await jobsRes.json();
      if (jobsData.success) {
        setJobPostings(jobsData.postings);
      }
    } catch (error) {
      console.error('[WarRoom] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUpdateAlertStatus = async (alertId: string, status: AlertStatus) => {
    try {
      const res = await fetch('/api/war-room/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status }),
      });

      if (res.ok) {
        setAlerts(prev =>
          prev.map(a => (a.id === alertId ? { ...a, status } : a))
        );
      }
    } catch (error) {
      console.error('[WarRoom] Error updating alert:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={summary?.critical_alerts ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-600">{summary?.critical_alerts || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New Alerts</p>
                <p className="text-3xl font-bold text-orange-600">{summary?.new_alerts || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Bell className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Job Postings</p>
                <p className="text-3xl font-bold text-blue-600">{summary?.total_job_postings || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            {summary?.ai_ml_postings ? (
              <p className="text-xs text-gray-500 mt-2">
                {summary.ai_ml_postings} AI/ML positions
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className={summary?.revenue_at_risk ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue at Risk</p>
                <p className="text-3xl font-bold text-yellow-600">
                  ${((summary?.revenue_at_risk || 0) / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
              {summary?.new_alerts ? (
                <Badge variant="destructive" className="ml-1">{summary.new_alerts}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Job Postings
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hiring Trends
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Filters:</span>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="addressed">Addressed</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Alert List */}
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="font-medium text-gray-700">No alerts to show</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Set up competitor monitoring to receive real-time alerts
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onUpdateStatus={handleUpdateAlertStatus}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Job Postings Tab */}
        <TabsContent value="jobs" className="space-y-4">
          {jobPostings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="font-medium text-gray-700">No job postings tracked</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure competitor careers pages to track hiring patterns
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobPostings.map(job => (
                <JobPostingCard key={job.id} posting={job} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Hiring Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {hiringTrends.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="font-medium text-gray-700">No hiring trends available</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Track competitor job postings to see hiring trends
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {hiringTrends.map(trend => (
                <HiringTrendCard key={trend.competitor} trend={trend} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Alert Card Component
function AlertCard({
  alert,
  onUpdateStatus,
}: {
  alert: CompetitorAlert;
  onUpdateStatus: (id: string, status: AlertStatus) => void;
}) {
  const severityStyle = SEVERITY_COLORS[alert.severity];

  return (
    <Card className={`${severityStyle.border} ${severityStyle.bg}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${severityStyle.bg} ${severityStyle.text}`}>
                {alert.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline">{ALERT_TYPE_LABELS[alert.alert_type]}</Badge>
              <Badge variant="secondary">{alert.competitor_name}</Badge>
            </div>
            <h3 className="font-semibold text-gray-900">{alert.title}</h3>
            {alert.description && (
              <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
            )}
            {alert.ai_summary && (
              <p className="text-sm text-gray-700 mt-2 p-2 bg-white/50 rounded">
                <Zap className="h-3 w-3 inline mr-1 text-purple-500" />
                {alert.ai_summary}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(alert.detected_at).toLocaleDateString()}
              </span>
              {alert.customer_impact_count > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {alert.customer_impact_count} customers affected
                </span>
              )}
              {alert.revenue_at_risk > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Target className="h-3 w-3" />
                  ${(alert.revenue_at_risk / 1000).toFixed(0)}K at risk
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            {alert.status === 'new' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStatus(alert.id, 'acknowledged')}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ack
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUpdateStatus(alert.id, 'dismissed')}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              </>
            )}
            {alert.status === 'acknowledged' && (
              <Button
                size="sm"
                onClick={() => onUpdateStatus(alert.id, 'addressed')}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Resolve
              </Button>
            )}
            {alert.source_url && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(alert.source_url, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        {alert.ai_recommended_action && (
          <div className="mt-3 p-2 bg-purple-50 rounded border border-purple-200">
            <p className="text-xs font-medium text-purple-700 mb-1">Recommended Action:</p>
            <p className="text-sm text-purple-900">{alert.ai_recommended_action}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Job Posting Card Component
function JobPostingCard({ posting }: { posting: CompetitorJobPosting }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{posting.competitor_name}</Badge>
              {posting.department && (
                <Badge variant="outline">
                  {DEPARTMENT_LABELS[posting.department] || posting.department}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-900">{posting.job_title}</h3>
            {posting.location && (
              <p className="text-sm text-gray-500 mt-1">{posting.location}</p>
            )}
            {posting.strategic_signals && posting.strategic_signals.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {posting.strategic_signals.map(signal => (
                  <Badge key={signal} variant="outline" className="text-xs">
                    {signal.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            )}
            {posting.ai_interpretation && (
              <p className="text-xs text-gray-600 mt-2 p-2 bg-purple-50 rounded">
                <Zap className="h-3 w-3 inline mr-1 text-purple-500" />
                {posting.ai_interpretation}
              </p>
            )}
          </div>
          {posting.source_url && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(posting.source_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          First seen: {new Date(posting.first_seen_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

// Hiring Trend Card Component
function HiringTrendCard({ trend }: { trend: HiringTrend }) {
  const departments = Object.entries(trend.departments || {}).sort(([, a], [, b]) => b - a);
  const maxCount = Math.max(...Object.values(trend.departments || {}), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            {trend.competitor}
          </CardTitle>
          <Badge variant="secondary" className="text-lg">
            {trend.total_jobs} jobs
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {departments.map(([dept, count]) => (
            <div key={dept}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {DEPARTMENT_LABELS[dept as keyof typeof DEPARTMENT_LABELS] || dept}
                </span>
                <span className="text-sm font-medium">{count}</span>
              </div>
              <Progress value={(count / maxCount) * 100} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default WarRoomDashboard;
