'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  MessageSquare,
  CheckSquare,
  Mail,
  Loader2,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { Action, executeAction } from '@/lib/stakeholder/action-executor';

interface ActionExecutorProps {
  actions: Action[];
  projectId: string;
  context?: any;
}

export function ActionExecutor({ actions, projectId, context }: ActionExecutorProps) {
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [executing, setExecuting] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, Action>>(
    actions.reduce((acc, action) => ({ ...acc, [action.id]: action }), {})
  );

  // Action-specific form states
  const [slackChannel, setSlackChannel] = useState('#general');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [jiraSummary, setJiraSummary] = useState('');

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText':
        return <FileText className="w-5 h-5" />;
      case 'MessageSquare':
        return <MessageSquare className="w-5 h-5" />;
      case 'CheckSquare':
        return <CheckSquare className="w-5 h-5" />;
      case 'Mail':
        return <Mail className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: Action['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Check className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <X className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Pending
          </Badge>
        );
    }
  };

  const handleExecute = async (action: Action) => {
    setSelectedAction(action);
  };

  const confirmExecute = async () => {
    if (!selectedAction) return;

    setExecuting(true);

    // Update state to in_progress
    setActionStates((prev) => ({
      ...prev,
      [selectedAction.id]: { ...selectedAction, status: 'in_progress' },
    }));

    try {
      // Prepare params based on action type
      let params = { ...context };

      if (selectedAction.type === 'send_slack') {
        params = { ...params, channel: slackChannel };
      } else if (selectedAction.type === 'send_email') {
        params = { ...params, recipients: emailRecipients.split(',').map(e => e.trim()) };
      } else if (selectedAction.type === 'create_jira') {
        params = { ...params, summary: jiraSummary };
      }

      const result = await executeAction(
        { ...selectedAction, params },
        projectId
      );

      if (result.success) {
        setActionStates((prev) => ({
          ...prev,
          [selectedAction.id]: {
            ...selectedAction,
            status: 'completed',
            result: result.data,
          },
        }));
        alert(result.message);
      } else {
        setActionStates((prev) => ({
          ...prev,
          [selectedAction.id]: { ...selectedAction, status: 'failed' },
        }));
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('[Action Executor] Error:', error);
      setActionStates((prev) => ({
        ...prev,
        [selectedAction.id]: { ...selectedAction, status: 'failed' },
      }));
      alert('Failed to execute action');
    } finally {
      setExecuting(false);
      setSelectedAction(null);
    }
  };

  if (actions.length === 0) return null;

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Suggested Actions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((action) => {
            const currentState = actionStates[action.id];

            return (
              <div
                key={action.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-purple-600 dark:text-purple-400 mt-1">
                    {getIcon(action.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {action.description}
                    </p>
                    <div className="mt-2">{getStatusBadge(currentState.status)}</div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleExecute(action)}
                  disabled={currentState.status === 'completed' || currentState.status === 'in_progress'}
                  className="ml-3"
                >
                  Execute
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Action Configuration Dialog */}
      <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAction?.title}</DialogTitle>
            <DialogDescription>{selectedAction?.description}</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedAction?.type === 'send_slack' && (
              <div>
                <Label htmlFor="slack-channel">Slack Channel</Label>
                <Input
                  id="slack-channel"
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  placeholder="#general"
                />
              </div>
            )}

            {selectedAction?.type === 'send_email' && (
              <div>
                <Label htmlFor="email-recipients">Email Recipients (comma-separated)</Label>
                <Input
                  id="email-recipients"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="john@example.com, jane@example.com"
                />
              </div>
            )}

            {selectedAction?.type === 'create_jira' && (
              <div>
                <Label htmlFor="jira-summary">Ticket Summary</Label>
                <Input
                  id="jira-summary"
                  value={jiraSummary}
                  onChange={(e) => setJiraSummary(e.target.value)}
                  placeholder="Fix login authentication issue"
                />
              </div>
            )}

            {selectedAction?.type === 'create_prd' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                A comprehensive PRD will be generated based on the current analysis and feedback.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAction(null)} disabled={executing}>
              Cancel
            </Button>
            <Button onClick={confirmExecute} disabled={executing}>
              {executing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                'Execute'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
