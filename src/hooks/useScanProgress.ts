/**
 * useScanProgress Hook
 * Subscribes to Supabase Realtime for live scan updates
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

export type PlatformStatus =
    | 'pending'
    | 'discovering'
    | 'discovered'
    | 'filtering'
    | 'filtered'
    | 'classifying'
    | 'complete'
    | 'failed';

export interface ScanProgress {
    id: string;
    status: 'running' | 'complete' | 'partial' | 'failed' | 'cancelled';
    totalDiscovered: number;
    totalRelevant: number;
    totalClassified: number;
    startedAt: string;
    completedAt: string | null;
}

export interface PlatformProgress {
    platform: string;
    status: PlatformStatus;
    jobType?: string;
    attempts?: number;
    error?: string;
}

export interface ScanProgressState {
    scan: ScanProgress | null;
    platforms: PlatformProgress[];
    progress: number;
    allComplete: boolean;
    isLoading: boolean;
    error: string | null;
}

export function useScanProgress(scanId: string | null) {
    const [state, setState] = useState<ScanProgressState>({
        scan: null,
        platforms: [],
        progress: 0,
        allComplete: false,
        isLoading: !!scanId,
        error: null,
    });

    const fetchStatus = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/hunter/status?scanId=${id}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch status');
            }

            setState({
                scan: data.scan,
                platforms: data.platforms || [],
                progress: data.progress || 0,
                allComplete: data.allComplete || false,
                isLoading: false,
                error: null,
            });

            return data;
        } catch (err) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            }));
            return null;
        }
    }, []);

    useEffect(() => {
        if (!scanId) {
            setState({
                scan: null,
                platforms: [],
                progress: 0,
                allComplete: false,
                isLoading: false,
                error: null,
            });
            return;
        }

        // Initial fetch
        fetchStatus(scanId);

        // Set up Supabase Realtime subscription
        const supabase = getSupabaseClient();
        let channel: ReturnType<typeof supabase.channel> | null = null;

        if (supabase) {
            channel = supabase
                .channel(`scan-${scanId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'hunter_scans',
                        filter: `id=eq.${scanId}`,
                    },
                    (payload: { new: Record<string, unknown> }) => {
                        const newData = payload.new;
                        setState(prev => ({
                            ...prev,
                            scan: {
                                id: newData.id as string,
                                status: newData.status as ScanProgress['status'],
                                totalDiscovered: newData.total_discovered as number,
                                totalRelevant: newData.total_relevant as number,
                                totalClassified: newData.total_classified as number,
                                startedAt: newData.started_at as string,
                                completedAt: newData.completed_at as string | null,
                            },
                            platforms: Object.entries((newData.platforms || {}) as Record<string, string>).map(
                                ([platform, status]) => ({
                                    platform,
                                    status: status as PlatformStatus,
                                })
                            ),
                            allComplete: newData.status !== 'running',
                        }));
                    }
                )
                .subscribe();
        }

        // Also poll every 5 seconds as backup (Realtime might miss updates)
        const pollInterval = setInterval(() => {
            fetchStatus(scanId);
        }, 5000);

        return () => {
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
            clearInterval(pollInterval);
        };
    }, [scanId, fetchStatus]);

    return state;
}
