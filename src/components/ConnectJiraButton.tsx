'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useJiraConnection } from '@/hooks/useJira';

interface ConnectJiraButtonProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  showStatus?: boolean;
}

export function ConnectJiraButton({
  projectId,
  onSuccess,
  onError,
  className,
  variant = 'default',
  showStatus = true
}: ConnectJiraButtonProps) {
  const { connection, loading, isConnected, refetch } = useJiraConnection(projectId);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Redirect to OAuth connect endpoint
      const connectUrl = `/api/integrations/jira/connect?project_id=${encodeURIComponent(projectId)}`;
      window.location.href = connectUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Jira';
      setError(errorMessage);
      onError?.(errorMessage);
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Button disabled variant={variant} className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isConnected && connection) {
    return (
      <div className="space-y-2">
        {showStatus && (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
            <span className="text-sm text-muted-foreground">
              {connection.site_name || connection.site_url}
            </span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://${connection.site_url}`, '_blank')}
          className={className}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Jira
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleConnect}
        disabled={connecting}
        variant={variant}
        className={className}
      >
        {connecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Connect to Jira
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
