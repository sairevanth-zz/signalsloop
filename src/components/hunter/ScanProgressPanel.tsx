/**
 * ScanProgressPanel
 * Real-time progress UI for Hunter scans
 */

'use client';

import { useScanProgress, PlatformStatus } from '@/hooks/useScanProgress';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    RefreshCw,
} from 'lucide-react';

interface ScanProgressPanelProps {
    scanId: string | null;
    onClose?: () => void;
    onRetry?: (platform: string) => void;
}

const PLATFORM_ICONS: Record<string, string> = {
    reddit: '🔴',
    twitter: '𝕏',
    hackernews: '🟠',
    g2: '🟢',
    capterra: '🔵',
    trustpilot: '⭐',
    producthunt: '🚀',
    playstore: '📱',
};

const STATUS_CONFIG: Record<PlatformStatus, { icon: React.ReactNode; color: string; text: string }> = {
    pending: { icon: <Clock className="w-4 h-4" />, color: 'text-gray-400', text: 'Queued...' },
    discovering: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400', text: 'Searching...' },
    discovered: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400', text: 'Found items → Analyzing...' },
    filtering: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400', text: 'Filtering relevance...' },
    filtered: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400', text: 'Classifying...' },
    classifying: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400', text: 'Classifying...' },
    complete: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-400', text: 'Complete' },
    failed: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400', text: 'Failed' },
};

export function ScanProgressPanel({ scanId, onClose, onRetry }: ScanProgressPanelProps) {
    const { scan, platforms, progress, allComplete, isLoading, error } = useScanProgress(scanId);

    // Auto-close stale scans (running for > 1 hour)
    const isStale = scan?.status === 'running' && scan?.startedAt &&
        (new Date(scan.startedAt).getTime() < Date.now() - 60 * 60 * 1000);

    // If scan is stale, auto-close and don't render
    if (isStale) {
        // Fire timeout cleanup in background
        if (scanId) {
            fetch('/api/hunter/scan/timeout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scanId }),
            }).catch(() => { });
        }
        // Call onClose after a short delay to avoid React state update issues
        if (onClose) {
            setTimeout(() => onClose(), 0);
        }
        return null;
    }

    if (!scanId) return null;

    if (isLoading && !scan) {
        return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <span>Loading scan status...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-red-400">{error}</span>
                    {onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const isRunning = scan?.status === 'running';
    const completedPlatforms = platforms.filter(p => p.status === 'complete').length;
    const failedPlatforms = platforms.filter(p => p.status === 'failed');

    return (
        <div className={`border rounded-lg p-4 mb-4 ${allComplete
            ? scan?.status === 'complete'
                ? 'bg-green-900/20 border-green-500/50'
                : 'bg-yellow-900/20 border-yellow-500/50'
            : 'bg-blue-900/20 border-blue-500/50'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    {isRunning ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    ) : scan?.status === 'complete' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                    )}
                    <span className="font-medium">
                        {isRunning
                            ? `Scanning... ${completedPlatforms}/${platforms.length} platforms complete`
                            : scan?.status === 'complete'
                                ? 'Scan Complete'
                                : 'Scan Completed with Errors'
                        }
                    </span>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Progress bar (only when running) */}
            {isRunning && (
                <>
                    <Progress value={progress} className="h-2 mb-2" />
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
                        <span>✨ Feedback appears as discovered - no need to wait!</span>
                        <span>~{Math.ceil((platforms.length - completedPlatforms) * 2)} min remaining</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 italic">
                        Scanning continues in background - you can navigate away safely.
                    </p>
                </>
            )}

            {/* Platform status list */}
            <div className="space-y-2">
                {platforms.map(p => {
                    const config = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                    return (
                        <div
                            key={p.platform}
                            className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{PLATFORM_ICONS[p.platform] || '📌'}</span>
                                <span className="capitalize">{p.platform}</span>
                            </div>
                            <div className={`flex items-center gap-2 ${config.color}`}>
                                {config.icon}
                                <span className="text-sm">
                                    {p.status === 'failed' && p.attempts
                                        ? `Failed after ${p.attempts} attempts`
                                        : config.text
                                    }
                                </span>
                                {p.status === 'failed' && onRetry && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onRetry(p.platform)}
                                        className="ml-2 h-6 px-2"
                                    >
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Retry
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stats (when complete) */}
            {allComplete && scan && (
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex gap-6 text-sm">
                    <div>
                        <span className="text-gray-400">Discovered:</span>{' '}
                        <span className="font-medium">{scan.totalDiscovered}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Relevant:</span>{' '}
                        <span className="font-medium text-blue-400">{scan.totalRelevant}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Classified:</span>{' '}
                        <span className="font-medium text-green-400">{scan.totalClassified}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
