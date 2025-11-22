/**
 * Agent Health Monitor
 * Tracks agent execution time, failures, and performance metrics
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

interface AgentHealth {
  agent_name: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_execution_time: number;
  last_execution: string;
  error_rate_trend: 'up' | 'down' | 'stable';
  performance_trend: 'up' | 'down' | 'stable';
}

interface AgentHealthMonitorProps {
  projectId: string;
}

export function AgentHealthMonitor({ projectId }: AgentHealthMonitorProps) {
  const [healthData, setHealthData] = useState<AgentHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadHealthData();
  }, [projectId, timeRange]);

  const loadHealthData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `/api/agents/health?project_id=${projectId}&time_range=${timeRange}`
      );

      if (response.ok) {
        const data = await response.json();
        setHealthData(data.agents || []);
      } else {
        toast.error('Failed to load agent health data');
      }
    } catch (error) {
      console.error('Error loading agent health:', error);
      toast.error('Error loading agent health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getHealthStatus = (successRate: number) => {
    if (successRate >= 95) return { label: 'Healthy', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
    if (successRate >= 80) return { label: 'Warning', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
    return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalExecutions = healthData.reduce((sum, agent) => sum + agent.total_executions, 0);
  const totalFailures = healthData.reduce((sum, agent) => sum + agent.failed_executions, 0);
  const overallSuccessRate = totalExecutions > 0
    ? ((totalExecutions - totalFailures) / totalExecutions) * 100
    : 100;
  const avgExecutionTime = healthData.length > 0
    ? healthData.reduce((sum, agent) => sum + agent.avg_execution_time, 0) / healthData.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-500" />
            Agent Health Monitor
          </h2>
          <p className="text-gray-500 mt-1">
            Track agent performance, execution time, and failure rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button
            onClick={loadHealthData}
            variant="outline"
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{overallSuccessRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalExecutions}</div>
              <div className="text-sm text-gray-500">Total Executions</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalFailures}</div>
              <div className="text-sm text-gray-500">Failed Executions</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{avgExecutionTime.toFixed(0)}ms</div>
              <div className="text-sm text-gray-500">Avg Execution Time</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Agent Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {healthData.map((agent, index) => {
          const status = getHealthStatus(agent.success_rate);
          return (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${status.bg} rounded-lg`}>
                    <Zap className={`h-5 w-5 ${status.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{agent.agent_name}</h3>
                    <p className="text-xs text-gray-500">
                      Last run: {new Date(agent.last_execution).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`${status.bg} ${status.color} ${status.border}`}>
                  {status.label}
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Success Rate */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">Success Rate</span>
                    <span className="font-semibold">{agent.success_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        agent.success_rate >= 95 ? 'bg-green-500' :
                        agent.success_rate >= 80 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${agent.success_rate}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div>
                    <div className="text-xs text-gray-500">Executions</div>
                    <div className="font-semibold">{agent.total_executions}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Failures</div>
                    <div className="font-semibold text-red-500">{agent.failed_executions}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Avg Time</div>
                    <div className="font-semibold">{agent.avg_execution_time.toFixed(0)}ms</div>
                  </div>
                </div>

                {/* Trends */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Error Rate:</span>
                    {getTrendIcon(agent.error_rate_trend)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Performance:</span>
                    {getTrendIcon(agent.performance_trend)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {healthData.length === 0 && (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Health Data Available</h3>
          <p className="text-gray-500">
            Agent health metrics will appear here once agents start processing events
          </p>
        </Card>
      )}
    </div>
  );
}
