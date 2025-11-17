'use client';

import { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';
import { useBulkCreateJiraIssues } from '@/hooks/useJira';

interface BulkIssueCreatorProps {
  feedbackIds: string[];
  connectionId: string;
  themeName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdCount: number) => void;
}

export function BulkIssueCreator({
  feedbackIds,
  connectionId,
  themeName,
  isOpen,
  onClose,
  onSuccess
}: BulkIssueCreatorProps) {
  const { bulkCreate, creating, error, progress, clearError } = useBulkCreateJiraIssues();

  const [createEpic, setCreateEpic] = useState(true);
  const [themeNameInput, setThemeNameInput] = useState(themeName || '');

  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCreate = async () => {
    const bulkResult = await bulkCreate({
      feedbackIds,
      connectionId,
      createEpic,
      themeName: themeNameInput || themeName
    });

    if (bulkResult && bulkResult.success) {
      setSuccess(true);
      setResult(bulkResult);
      onSuccess?.(bulkResult.created_count);

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setResult(null);
    clearError();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Bulk Create Jira Issues
          </DialogTitle>
          <DialogDescription>
            Create {feedbackIds.length} Jira issues from selected feedback
          </DialogDescription>
        </DialogHeader>

        {success && result ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">
                Successfully Created {result.created_count} Issues!
              </h3>
              {result.error_count > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  {result.error_count} issues failed to create
                </p>
              )}
              {result.epic && (
                <div className="mt-3">
                  <Badge variant="outline" className="text-sm">
                    <Layers className="mr-1 h-3 w-3" />
                    Epic: {result.epic.key}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {result.epic && (
                <Button
                  variant="outline"
                  onClick={() => window.open(result.epic.url, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Epic in Jira
                </Button>
              )}
            </div>

            {result.issues && result.issues.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Created Issues:</p>
                <div className="space-y-1">
                  {result.issues.map((issue: any) => (
                    <div
                      key={issue.key}
                      className="flex items-center justify-between text-sm p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => window.open(issue.url, '_blank')}
                    >
                      <span className="font-mono text-xs">{issue.key}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : creating ? (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                Creating Issues with AI...
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Generating {feedbackIds.length} issues
                {createEpic && ' and 1 epic'}
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                <strong>AI will generate:</strong> {feedbackIds.length} issues
                {createEpic && ' grouped under 1 epic'} based on the feedback content
              </AlertDescription>
            </Alert>

            {/* Epic Creation Option */}
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <Checkbox
                id="create-epic"
                checked={createEpic}
                onCheckedChange={(checked) => setCreateEpic(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="create-epic"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Create Epic to group issues
                </label>
                <p className="text-xs text-muted-foreground">
                  Recommended for theme clusters. All issues will be linked to the epic.
                </p>
              </div>
            </div>

            {/* Theme Name */}
            <div className="space-y-2">
              <Label htmlFor="theme-name">
                Theme Name {createEpic && '*'}
              </Label>
              <Input
                id="theme-name"
                value={themeNameInput}
                onChange={(e) => setThemeNameInput(e.target.value)}
                placeholder="e.g., Mobile Performance Issues"
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">
                {createEpic ? 'Used as the epic title' : 'Optional theme identifier'}
              </p>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
              <p className="text-sm font-medium">Will Create:</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                {createEpic && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span>1 Epic: {themeNameInput || 'Bulk Import'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{feedbackIds.length} Issues (AI-generated)</span>
                </div>
              </div>
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

        {!success && !creating && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || (createEpic && !themeNameInput)}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create {feedbackIds.length} Issues
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
