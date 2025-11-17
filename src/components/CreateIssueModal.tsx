'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useCreateJiraIssue } from '@/hooks/useJira';

interface CreateIssueModalProps {
  feedbackId: string;
  feedbackContent: string;
  connectionId: string;
  projectKey?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (issueKey: string, issueUrl: string) => void;
}

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const ISSUE_TYPES = ['Bug', 'Story', 'Task', 'Improvement'];

export function CreateIssueModal({
  feedbackId,
  feedbackContent,
  connectionId,
  projectKey,
  isOpen,
  onClose,
  onSuccess
}: CreateIssueModalProps) {
  const { createIssue, creating, error, clearError } = useCreateJiraIssue();

  const [useAI, setUseAI] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);

  // Form fields
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [issueType, setIssueType] = useState('Bug');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');

  const [success, setSuccess] = useState(false);
  const [createdIssue, setCreatedIssue] = useState<any>(null);

  // Generate AI preview
  useEffect(() => {
    if (isOpen && useAI && !generated && !generating) {
      generatePreview();
    }
  }, [isOpen, useAI]);

  const generatePreview = async () => {
    try {
      setGenerating(true);

      // In a real implementation, you'd call an API to generate the preview
      // For now, we'll create a simulated preview
      await new Promise(resolve => setTimeout(resolve, 1500));

      const aiGenerated = {
        summary: `Fix: ${feedbackContent.substring(0, 60)}${feedbackContent.length > 60 ? '...' : ''}`,
        description: `## Problem\n${feedbackContent}\n\n## Impact\nReported by user\n\n## Acceptance Criteria\n- [ ] Issue resolved\n- [ ] User notified`,
        priority: 'High',
        issueType: 'Bug',
        labels: ['user-feedback', 'needs-triage']
      };

      setGenerated(aiGenerated);
      setSummary(aiGenerated.summary);
      setDescription(aiGenerated.description);
      setPriority(aiGenerated.priority);
      setIssueType(aiGenerated.issueType);
      setLabels(aiGenerated.labels);
    } catch (err) {
      console.error('Error generating preview:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    const result = await createIssue({
      feedbackId,
      connectionId,
      projectKey,
      issueType,
      useAI,
      manualSummary: !useAI ? summary : undefined,
      manualDescription: !useAI ? description : undefined,
      manualPriority: !useAI ? priority : undefined,
      manualLabels: !useAI && labels.length > 0 ? labels : undefined
    });

    if (result && result.success) {
      setSuccess(true);
      setCreatedIssue(result.issue);
      onSuccess?.(result.issue.key, result.issue.url);

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setCreatedIssue(null);
    setGenerated(null);
    clearError();
    onClose();
  };

  const handleAddLabel = () => {
    if (labelInput.trim() && !labels.includes(labelInput.trim())) {
      setLabels([...labels, labelInput.trim().toLowerCase()]);
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setLabels(labels.filter(l => l !== label));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Jira Issue</DialogTitle>
          <DialogDescription>
            Create a Jira issue from this feedback
          </DialogDescription>
        </DialogHeader>

        {success && createdIssue ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Issue Created Successfully!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {createdIssue.key} - {createdIssue.summary}
              </p>
            </div>
            <Button onClick={() => window.open(createdIssue.url, '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Jira
            </Button>
          </div>
        ) : generating ? (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI is generating issue details...
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                This will only take a moment
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* AI Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI-Powered Generation</span>
              </div>
              <Button
                variant={useAI ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseAI(!useAI)}
              >
                {useAI ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary">Summary *</Label>
              <Input
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief description of the issue"
                disabled={useAI || creating}
                maxLength={255}
              />
              <p className="text-xs text-muted-foreground">
                {summary.length}/255 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description..."
                disabled={useAI || creating}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            {/* Issue Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Type</Label>
                <Select
                  value={issueType}
                  onValueChange={setIssueType}
                  disabled={useAI || creating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={setPriority}
                  disabled={useAI || creating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <Label>Labels</Label>
              <div className="flex gap-2">
                <Input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                  placeholder="Add label..."
                  disabled={useAI || creating}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddLabel}
                  disabled={useAI || creating}
                >
                  Add
                </Button>
              </div>
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {labels.map(label => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => !useAI && !creating && handleRemoveLabel(label)}
                    >
                      {label}
                      {!useAI && !creating && <span className="ml-1">×</span>}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!success && !generating && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !summary}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Issue
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
