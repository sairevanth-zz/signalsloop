/**
 * Agent Dashboard
 * Displays status, activity, and configuration for all autonomous agents
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Zap,
  Brain,
  TrendingUp,
  MessageSquare,
  Target,
  Users,
  FileCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Radio
} from 'lucide-react';
import { toast } from 'sonner';

interface Agent {
  name: string;
  event: string;
  description: string;
  phase: string;
}

interface AgentStatus {
  running: boolean;
  activeAgents: Agent[];
  futureAgents: Agent[];
  phase: string;
}

interface AgentActivityProps {
  projectId: string;
}

export function AgentDashboard({ projectId }: AgentActivityProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAgentStatus();
  }, [projectId]);

  const loadAgentStatus = async () => {
    try {
      const response = await fetch('/api/agents/status');
      if (response.ok) {
        const data = await response.json();
        // Normalize API responses to the shape the dashboard expects
        const normalizedActive =
          data.activeAgents ||
          data.agents?.registry?.map((agent: any) => ({
            name: agent.name || agent.eventType || 'Agent',
            event: agent.eventType || 'event',
            description: agent.description || 'Autonomous agent',
            phase: agent.phase || 'Phase 3',
          })) ||
          [];

        const normalizedFuture = data.futureAgents || [];

        setStatus({
          running: data.running ?? true,
          activeAgents: normalizedActive,
          futureAgents: normalizedFuture,
          phase: data.phase || 'Phase 3',
        });
      }
    } catch (error) {
      console.error('Error loading agent status:', error);
      toast.error('Failed to load agent status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAgentStatus();
  };

  const getAgentIcon = (agentName: string) => {
    if (agentName.includes('Sentiment')) return Brain;
    if (agentName.includes('Spec')) return FileCheck;
    if (agentName.includes('Notification')) return Zap;
    if (agentName.includes('Feedback')) return MessageSquare;
    if (agentName.includes('Competitive')) return Target;
    if (agentName.includes('User')) return Users;
    return Activity;
  };

  const getPhaseColor = (phase: string) => {
    if (phase === 'Phase 2') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (phase === 'Phase 3') return 'bg-green-500/10 text-green-400 border-green-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to Load Agents</h3>
        <p className="text-gray-500 mb-4">Agent system is not responding</p>
        <Button onClick={handleRefresh} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-6 w-6 text-green-500 animate-pulse" />
            Autonomous Agents
          </h2>
          <p className="text-gray-500 mt-1">
            {status.activeAgents.length} agents running 24/7 • {status.phase}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{status.activeAgents.length}</div>
              <div className="text-sm text-gray-500">Active Agents</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm text-gray-500">Always Running</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{status.futureAgents.length}</div>
              <div className="text-sm text-gray-500">Planned Agents</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Agent Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active Agents ({status.activeAgents.length})
          </TabsTrigger>
          <TabsTrigger value="future">
            Future Agents ({status.futureAgents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-4">
          {status.activeAgents.map((agent, index) => {
            const Icon = getAgentIcon(agent.name);
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
                      <Icon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{agent.name}</h3>
                        <Badge variant="outline" className={getPhaseColor(agent.phase)}>
                          {agent.phase}
                        </Badge>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <Radio className="h-3 w-3 mr-1" />
                          Running
                        </Badge>
                      </div>
                      <p className="text-gray-500 mb-3">{agent.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Listens to:</span>
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {agent.event}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="future" className="mt-6 space-y-4">
          {status.futureAgents.map((agent, index) => {
            const Icon = getAgentIcon(agent.name);
            return (
              <Card key={index} className="p-6 opacity-60">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-gray-500/10 rounded-lg">
                      <Icon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{agent.name}</h3>
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                          Coming Soon
                        </Badge>
                      </div>
                      <p className="text-gray-500 mb-3">{agent.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Will listen to:</span>
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {agent.event}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <Card className="p-6 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Activity className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h4 className="font-semibold mb-1">How Agents Work</h4>
            <p className="text-sm text-gray-600">
              Agents run automatically in response to events (feedback created, sentiment analyzed, etc.).
              They process data in real-time and take actions like sending Slack notifications,
              creating specs, or identifying important patterns. All agents run 24/7 with &lt;10 second latency.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
