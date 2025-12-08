'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { HealthScore } from '@/lib/health-score/types';
import { HealthScoreGauge } from './HealthScoreGauge';
import { Download, Twitter, Linkedin, Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface HealthScoreBadgeProps {
    healthScore: HealthScore;
    shareUrl?: string;
    compact?: boolean;
}

export function HealthScoreBadge({ healthScore, shareUrl, compact = false }: HealthScoreBadgeProps) {
    const badgeRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleExportPNG = async () => {
        if (!badgeRef.current) return;

        setExporting(true);
        try {
            // Dynamically import html2canvas
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(badgeRef.current, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher quality
                useCORS: true,
            });

            const link = document.createElement('a');
            link.download = `${healthScore.productName || 'product'}-health-score.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast.success('Badge exported as PNG!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export badge');
        } finally {
            setExporting(false);
        }
    };

    const handleCopyLink = async () => {
        if (!shareUrl) return;

        const fullUrl = `${window.location.origin}${shareUrl}`;
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        toast.success('Share link copied!');

        setTimeout(() => setCopied(false), 2000);
    };

    const handleTwitterShare = () => {
        const text = `My product's health score is ${healthScore.score} (${healthScore.grade.label}) ${healthScore.grade.emoji}! What's yours?`;
        const url = shareUrl ? `${window.location.origin}${shareUrl}` : window.location.origin;
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            '_blank'
        );
    };

    const handleLinkedInShare = () => {
        const url = shareUrl ? `${window.location.origin}${shareUrl}` : window.location.origin;
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            '_blank'
        );
    };

    return (
        <div className="space-y-4">
            {/* Badge Card */}
            <motion.div
                ref={badgeRef}
                className="rounded-3xl p-6 md:p-8 bg-white shadow-xl border border-gray-100"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className={`flex ${compact ? 'flex-row items-center gap-6' : 'flex-col items-center gap-4'}`}>
                    {/* Gauge */}
                    <HealthScoreGauge
                        score={healthScore.score}
                        grade={healthScore.grade}
                        size={compact ? 'md' : 'lg'}
                    />

                    {/* Info */}
                    <div className={compact ? 'flex-1' : 'text-center'}>
                        {healthScore.productName && (
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {healthScore.productName}
                            </h3>
                        )}
                        <p className="text-sm text-gray-600 mb-2">
                            Product Health Score
                        </p>
                        <p className="text-xs text-gray-500 max-w-xs">
                            {healthScore.grade.description}
                        </p>
                    </div>
                </div>

                {/* Branding */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span>Powered by</span>
                    <span className="font-semibold text-gray-600">SignalsLoop</span>
                </div>
            </motion.div>

            {/* Share Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPNG}
                    disabled={exporting}
                    className="rounded-full"
                >
                    <Download className="w-4 h-4 mr-1" />
                    {exporting ? 'Exporting...' : 'Export PNG'}
                </Button>

                {shareUrl && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="rounded-full"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 mr-1 text-green-600" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4 mr-1" />
                                Copy Link
                            </>
                        )}
                    </Button>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTwitterShare}
                    className="rounded-full text-[#1DA1F2] hover:bg-[#1DA1F2]/10"
                >
                    <Twitter className="w-4 h-4 mr-1" />
                    Tweet
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkedInShare}
                    className="rounded-full text-[#0A66C2] hover:bg-[#0A66C2]/10"
                >
                    <Linkedin className="w-4 h-4 mr-1" />
                    Share
                </Button>
            </div>
        </div>
    );
}
