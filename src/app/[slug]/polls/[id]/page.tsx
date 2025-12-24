'use client';

/**
 * Poll Details / Results Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Edit, Share2, ExternalLink, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PollResults } from '@/components/polls/PollResults';
import { toast } from 'sonner';
import type { Poll } from '@/types/polls';

export default function PollDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;
    const pollId = params?.id as string;

    const [poll, setPoll] = useState<Poll | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadPoll();
    }, [pollId]);

    const loadPoll = async () => {
        try {
            const res = await fetch(`/api/polls/${pollId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load poll');
            const data = await res.json();
            setPoll(data.poll);
        } catch (error) {
            toast.error('Failed to load poll');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async () => {
        if (!poll) return;

        const newStatus = poll.status === 'active' ? 'closed' : 'active';
        setUpdating(true);

        try {
            const res = await fetch(`/api/polls/${pollId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error('Failed to update poll');

            const data = await res.json();
            setPoll(data.poll);
            toast.success(`Poll ${newStatus === 'active' ? 'activated' : 'closed'}`);
        } catch (error) {
            toast.error('Failed to update poll');
        } finally {
            setUpdating(false);
        }
    };

    const copyShareLink = () => {
        const url = `${window.location.origin}/${slug}/polls/${pollId}/vote`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-2 text-muted-foreground">Loading poll...</p>
                </div>
            </div>
        );
    }

    if (!poll) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-muted-foreground">Poll not found</p>
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/${slug}/polls`)}
                        className="mt-4 text-teal-600 dark:text-teal-400"
                    >
                        Back to Polls
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 bg-background">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/${slug}/polls`)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Polls
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={copyShareLink}
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/${slug}/polls/${pollId}/vote`, '_blank')}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Voting Page
                        </Button>
                        <Button
                            variant={poll.status === 'active' ? 'destructive' : 'default'}
                            size="sm"
                            onClick={toggleStatus}
                            disabled={updating}
                            className={poll.status !== 'active' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                        >
                            {poll.status === 'active' ? (
                                <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    Close Poll
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Activate Poll
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Results */}
                <PollResults pollId={pollId} isOwner={true} />
            </div>
        </div>
    );
}
