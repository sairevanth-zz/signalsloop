/**
 * Action Recommendations Component
 * Display AI-generated action items with priority and impact
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ActionRecommendation,
  ActionPriority,
  ActionStatus,
  PRIORITY_META,
} from '@/types/hunter';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ActionRecommendationsProps {
  projectId: string;
  filterByPriority?: ActionPriority;
  filterByStatus?: ActionStatus;
  onActionClick?: (action: ActionRecommendation) => void;
  className?: string;
}

export function ActionRecommendations({
  projectId,
  filterByPriority,
  filterByStatus,
  onActionClick,
  className,
}: ActionRecommendationsProps) {
  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<string>(filterByPriority || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(filterByStatus || 'pending');

  useEffect(() => {
    loadActions();
  }, [projectId, priorityFilter, statusFilter]);

  const loadActions = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ projectId });
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/hunter/actions?${params}`);
      const data = await response.json();

      if (data.success) {
        setActions(data.recommendations || []);
      }
    } catch (error) {
      console.error('[ActionRecommendations] Error loading actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNew = async () => {
    try {
      setGenerating(true);

      const response = await fetch('/api/hunter/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Generated ${data.recommendations.length} new recommendations`);
        loadActions();
      } else {
        toast.error(data.error || 'Failed to generate recommendations');
      }
    } catch (error) {
      toast.error('Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (actionId: string, status: ActionStatus) => {
    try {
      const response = await fetch(`/api/hunter/actions?actionId=${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Status updated');
        loadActions();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const toggleExpanded = (actionId: string) => {
    setExpandedActions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority: ActionPriority) => {
    const meta = PRIORITY_META[priority];
    const colors: Record<string, string> = {
      red: 'bg-red-100 text-red-800 border-red-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[meta.color];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">🚨 Urgent</SelectItem>
              <SelectItem value="high">🔥 High</SelectItem>
              <SelectItem value="medium">⚡ Medium</SelectItem>
              <SelectItem value="low">📌 Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleGenerateNew} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate New
            </>
          )}
        </Button>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        {actions.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No action items found</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Generate recommendations based on recent feedback
            </p>
            <Button onClick={handleGenerateNew} disabled={generating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Recommendations
            </Button>
          </Card>
        ) : (
          actions.map((action) => {
            const isExpanded = expandedActions.has(action.id);

            return (
              <Card
                key={action.id}
                className={`p-5 ${
                  action.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getPriorityColor(
                          action.priority
                        )}`}
                      >
                        {PRIORITY_META[action.priority].emoji} {action.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {action.mention_count} mentions
                      </span>
                      {action.avg_sentiment && (
                        <span
                          className={`text-xs ${
                            action.avg_sentiment > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          Sentiment: {action.avg_sentiment.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <h3 className="font-semibold text-lg mb-2">{action.issue_summary}</h3>

                    {action.issue_category && (
                      <div className="text-sm text-gray-600 mb-2">
                        Category: {action.issue_category}
                      </div>
                    )}

                    {action.business_impact && (
                      <div className="text-sm text-gray-700 mb-3">{action.business_impact}</div>
                    )}

                    {/* Impact Metrics */}
                    <div className="flex gap-4 text-sm mb-3">
                      {action.revenue_at_risk_estimate && action.revenue_at_risk_estimate > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold">
                            ${action.revenue_at_risk_estimate.toLocaleString()}
                          </span>
                          <span className="text-gray-500">at risk</span>
                        </div>
                      )}
                      {action.affected_users_estimate && action.affected_users_estimate > 0 && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">
                            {action.affected_users_estimate}
                          </span>
                          <span className="text-gray-500">affected users</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="space-y-4 mt-4 pt-4 border-t">
                        {/* Suggested Actions */}
                        {action.suggested_actions && action.suggested_actions.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Suggested Actions:</h4>
                            <ul className="space-y-2">
                              {action.suggested_actions.map((sa: any, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {sa.description || sa}
                                    </div>
                                    {sa.priority && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        Priority: {sa.priority}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Draft Response */}
                        {action.draft_response && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Draft Response:</h4>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                              {action.draft_response}
                            </div>
                          </div>
                        )}

                        {/* Priority Reason */}
                        {action.priority_reason && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Why This Priority:</h4>
                            <p className="text-sm text-gray-600">{action.priority_reason}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(action.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show More
                      </>
                    )}
                  </Button>

                  <div className="flex gap-2">
                    {action.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(action.id, 'in_progress')}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onActionClick?.(action)}
                        >
                          Take Action
                        </Button>
                      </>
                    )}
                    {action.status === 'in_progress' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(action.id, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                      </>
                    )}
                    {action.status !== 'dismissed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateStatus(action.id, 'dismissed')}
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
