'use client';

/**
 * Survey Details / Results Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Share2, ExternalLink, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SurveyResults } from '@/components/surveys/SurveyResults';
import { toast } from 'sonner';
import type { Survey } from '@/types/polls';

export default function SurveyDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;
    const surveyId = params?.id as string;

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadSurvey();
    }, [surveyId]);

    const loadSurvey = async () => {
        try {
            const res = await fetch(`/api/surveys/${surveyId}`);
            if (!res.ok) throw new Error('Failed to load survey');
            const data = await res.json();
            setSurvey(data.survey);
        } catch (error) {
            toast.error('Failed to load survey');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async () => {
        if (!survey) return;

        const newStatus = survey.status === 'active' ? 'closed' : 'active';
        setUpdating(true);

        try {
            const res = await fetch(`/api/surveys/${surveyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error('Failed to update survey');

            const data = await res.json();
            setSurvey(data.survey);
            toast.success(`Survey ${newStatus === 'active' ? 'activated' : 'closed'}`);
        } catch (error) {
            toast.error('Failed to update survey');
        } finally {
            setUpdating(false);
        }
    };

    const copyShareLink = () => {
        const url = `${window.location.origin}/${slug}/surveys/${surveyId}/respond`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1d23' }}>
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-2 text-slate-400">Loading survey...</p>
                </div>
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1d23' }}>
                <div className="text-center">
                    <p className="text-slate-400">Survey not found</p>
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/${slug}/surveys`)}
                        className="mt-4 text-teal-400"
                    >
                        Back to Surveys
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: '#1a1d23' }}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/${slug}/surveys`)}
                        className="text-slate-400 hover:text-white"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Surveys
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={copyShareLink}
                            className="border-slate-600"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/${slug}/surveys/${surveyId}/respond`, '_blank')}
                            className="border-slate-600"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Survey Page
                        </Button>
                        <Button
                            variant={survey.status === 'active' ? 'destructive' : 'default'}
                            size="sm"
                            onClick={toggleStatus}
                            disabled={updating}
                            className={survey.status !== 'active' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                        >
                            {survey.status === 'active' ? (
                                <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    Close Survey
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Activate Survey
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Results */}
                <SurveyResults surveyId={surveyId} />
            </div>
        </div>
    );
}
