/**
 * Hook for RAG Context Retrieval
 */

import { useState, useCallback } from 'react';
import type { RetrievedContext } from '@/types/specs';

// ============================================================================
// useContextRetrieval - Retrieve context for spec generation
// ============================================================================

export function useContextRetrieval() {
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<RetrievedContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retrieveContext = useCallback(async (projectId: string, query: string, limit?: number) => {
    try {
      setLoading(true);
      setError(null);

      // Get auth headers
      const { getSupabaseClient } = await import('@/lib/supabase-client');
      const supabase = getSupabaseClient();

      if (!supabase) {
        throw new Error('Unable to connect to database');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to retrieve context');
      }

      const params = new URLSearchParams({
        projectId,
        query,
        ...(limit && { limit: limit.toString() }),
      });

      const response = await fetch(`/api/specs/context?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve context');
      }

      const data = await response.json();

      if (data.success) {
        setContext(data.context);
        return data.context;
      } else {
        throw new Error(data.error || 'Failed to retrieve context');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setContext(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    retrieveContext,
    reset,
    loading,
    context,
    error,
  };
}
