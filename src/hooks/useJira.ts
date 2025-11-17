/**
 * Custom React Hooks for Jira Integration
 */

import { useState, useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import type {
  JiraConnection,
  JiraIssueLink,
  JiraSyncStats,
  CreateJiraIssueResponse,
  BulkCreateJiraIssuesResponse
} from '@/types/jira';

/**
 * Hook to manage Jira connection for a project
 */
export function useJiraConnection(projectId: string) {
  const [connection, setConnection] = useState<JiraConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Unable to connect to database');
      }

      const { data, error: fetchError } = await supabase
        .from('jira_connections')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) throw fetchError;

      setConnection(data);
    } catch (err) {
      console.error('Error fetching Jira connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to load connection');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    loading,
    error,
    refetch: fetchConnection,
    isConnected: !!connection
  };
}

/**
 * Hook to get issue link for a feedback item
 */
export function useJiraIssueLink(feedbackId: string | null) {
  const [issueLink, setIssueLink] = useState<JiraIssueLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssueLink = useCallback(async () => {
    if (!feedbackId) {
      setIssueLink(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Unable to connect to database');
      }

      const { data, error: fetchError } = await supabase
        .from('jira_issue_links')
        .select('*')
        .eq('feedback_id', feedbackId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setIssueLink(data);
    } catch (err) {
      console.error('Error fetching issue link:', err);
      setError(err instanceof Error ? err.message : 'Failed to load issue link');
    } finally {
      setLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    fetchIssueLink();
  }, [fetchIssueLink]);

  return {
    issueLink,
    loading,
    error,
    refetch: fetchIssueLink,
    hasIssue: !!issueLink
  };
}

/**
 * Hook to create a Jira issue
 */
export function useCreateJiraIssue() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createIssue = useCallback(async (params: {
    feedbackId: string;
    connectionId: string;
    projectKey?: string;
    issueType?: string;
    useAI?: boolean;
    manualSummary?: string;
    manualDescription?: string;
    manualPriority?: string;
    manualLabels?: string[];
  }): Promise<CreateJiraIssueResponse | null> => {
    try {
      setCreating(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Unable to connect to database');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to create issues');
      }

      const response = await fetch('/api/integrations/jira/create-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          feedback_id: params.feedbackId,
          connection_id: params.connectionId,
          project_key: params.projectKey,
          issue_type: params.issueType,
          use_ai: params.useAI ?? true,
          manual_summary: params.manualSummary,
          manual_description: params.manualDescription,
          manual_priority: params.manualPriority,
          manual_labels: params.manualLabels
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create issue');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error creating Jira issue:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create issue';
      setError(errorMessage);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    createIssue,
    creating,
    error,
    clearError: () => setError(null)
  };
}

/**
 * Hook to bulk create Jira issues
 */
export function useBulkCreateJiraIssues() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const bulkCreate = useCallback(async (params: {
    feedbackIds: string[];
    connectionId: string;
    projectKey?: string;
    issueType?: string;
    createEpic?: boolean;
    themeName?: string;
  }): Promise<BulkCreateJiraIssuesResponse | null> => {
    try {
      setCreating(true);
      setError(null);
      setProgress(0);

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Unable to connect to database');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to create issues');
      }

      const response = await fetch('/api/integrations/jira/bulk-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          feedback_ids: params.feedbackIds,
          connection_id: params.connectionId,
          project_key: params.projectKey,
          issue_type: params.issueType,
          create_epic: params.createEpic,
          theme_name: params.themeName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create issues');
      }

      const data = await response.json();
      setProgress(100);
      return data;
    } catch (err) {
      console.error('Error bulk creating Jira issues:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create issues';
      setError(errorMessage);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    bulkCreate,
    creating,
    error,
    progress,
    clearError: () => setError(null)
  };
}

/**
 * Hook to disconnect Jira integration
 */
export function useDisconnectJira() {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(async (connectionId: string): Promise<boolean> => {
    try {
      setDisconnecting(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Unable to connect to database');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in');
      }

      const response = await fetch('/api/integrations/jira/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ connection_id: connectionId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
      }

      return true;
    } catch (err) {
      console.error('Error disconnecting Jira:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(errorMessage);
      return false;
    } finally {
      setDisconnecting(false);
    }
  }, []);

  return {
    disconnect,
    disconnecting,
    error,
    clearError: () => setError(null)
  };
}

/**
 * Hook to get Jira sync statistics
 */
export function useJiraSyncStats(projectId: string) {
  const [stats, setStats] = useState<JiraSyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Unable to connect to database');
      }

      const { data, error: fetchError } = await supabase
        .rpc('get_jira_sync_stats', { p_project_id: projectId });

      if (fetchError) throw fetchError;

      setStats(data?.[0] || null);
    } catch (err) {
      console.error('Error fetching Jira stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}
