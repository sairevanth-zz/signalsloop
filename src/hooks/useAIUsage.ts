'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AIUsageInfo {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  isPro: boolean;
}

interface RefreshOptions {
  silent?: boolean;
}

export function useAIUsage(projectId?: string, feature?: string) {
  const [usageInfo, setUsageInfo] = useState<AIUsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchUsage = useCallback(
    async (options: RefreshOptions = {}): Promise<AIUsageInfo | null> => {
      if (!projectId || !feature) {
        return null;
      }

      if (!options.silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/ai/check-limit?projectId=${projectId}&feature=${feature}`
        );

        if (!response.ok) {
          throw new Error('Failed to load AI usage');
        }

        const data: AIUsageInfo = await response.json();

        if (isMountedRef.current) {
          setUsageInfo(data);
        }

        return data;
      } catch (err) {
        console.error('[useAIUsage] Failed to fetch usage info', err);
        if (isMountedRef.current) {
          setError('Unable to load AI usage');
        }
        return null;
      } finally {
        if (isMountedRef.current && !options.silent) {
          setLoading(false);
        }
      }
    },
    [projectId, feature]
  );

  useEffect(() => {
    if (!projectId || !feature) {
      setUsageInfo(null);
      setLoading(false);
      return;
    }
    fetchUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, feature]);

  const refreshUsage = useCallback(
    (options: RefreshOptions = {}) => fetchUsage(options),
    [fetchUsage]
  );

  return {
    usageInfo,
    loading,
    error,
    refreshUsage,
    setUsageInfo
  };
}
