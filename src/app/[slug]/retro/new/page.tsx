'use client';

/**
 * New Retrospective Page
 * Create a new retrospective board
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';
import { PeriodSelector } from '@/components/retro';
import type { RetroPeriod } from '@/types/retro';
import { PERIOD_CONFIGS } from '@/types/retro';

export default function NewRetroPage() {
    const params = useParams();
    const router = useRouter();
    const projectSlug = params?.slug as string;
    const [projectId, setProjectId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        period_type: 'quarterly' as RetroPeriod,
        template: '',
        start_date: '',
        end_date: '',
    });

    // Fetch project ID
    useEffect(() => {
        async function fetchProjectId() {
            const supabase = getSupabaseClient();
            if (!supabase || !projectSlug) return;

            const { data } = await supabase
                .from('projects')
                .select('id')
                .eq('slug', projectSlug)
                .single();

            if (data) {
                setProjectId(data.id);
            }
        }
        fetchProjectId();
    }, [projectSlug]);

    // Set default dates based on period
    useEffect(() => {
        const today = new Date();
        let start: Date;
        let end: Date;

        switch (formData.period_type) {
            case 'sprint':
                start = new Date(today);
                start.setDate(start.getDate() - 14);
                end = today;
                break;
            case 'monthly':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'quarterly':
                const quarter = Math.floor(today.getMonth() / 3);
                start = new Date(today.getFullYear(), quarter * 3, 1);
                end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
                break;
            case 'yearly':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            default:
                start = new Date(today);
                start.setDate(start.getDate() - 30);
                end = today;
        }

        setFormData(prev => ({
            ...prev,
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0],
        }));
    }, [formData.period_type]);

    // Auto-generate title
    useEffect(() => {
        const config = PERIOD_CONFIGS[formData.period_type];
        const startDate = formData.start_date ? new Date(formData.start_date) : new Date();

        let title = '';
        switch (formData.period_type) {
            case 'sprint':
                title = `Sprint Retro - ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                break;
            case 'monthly':
                title = `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} MBR`;
                break;
            case 'quarterly':
                const quarter = Math.floor(startDate.getMonth() / 3) + 1;
                title = `Q${quarter} ${startDate.getFullYear()} QBR`;
                break;
            case 'yearly':
                title = `${startDate.getFullYear()} Annual Retrospective`;
                break;
            default:
                title = 'Custom Retrospective';
        }

        setFormData(prev => ({ ...prev, title }));
    }, [formData.period_type, formData.start_date]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!projectId) {
            toast.error('Project not found');
            return;
        }

        if (!formData.title.trim() || !formData.start_date || !formData.end_date) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/retro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    title: formData.title.trim(),
                    period_type: formData.period_type,
                    template: formData.template || undefined,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                }),
            });

            if (!response.ok) throw new Error('Failed to create board');

            const data = await response.json();
            toast.success('Retrospective created!');
            router.push(`/${projectSlug}/retro/${data.board.id}`);
        } catch (error) {
            console.error('Error creating board:', error);
            toast.error('Failed to create retrospective');
        } finally {
            setIsSubmitting(false);
        }
    };

    const periodConfig = PERIOD_CONFIGS[formData.period_type];

    return (
        <div className="min-h-screen bg-[#13151a]">
            {/* Header */}
            <div className="bg-[#141b2d] border-b border-white/10 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/${projectSlug}/retro`)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <History className="w-5 h-5 text-purple-400" />
                            New Retrospective
                        </h1>
                        <p className="text-sm text-gray-400">
                            Create a period-aware retrospective with AI insights
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl mx-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Period Selection */}
                    <div className="bg-[#141b2d] rounded-xl p-6 border border-white/10">
                        <Label className="text-white mb-3 block">Period Type</Label>
                        <PeriodSelector
                            selected={formData.period_type}
                            onSelect={(period) => setFormData({ ...formData, period_type: period })}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            {periodConfig.duration} • Templates: {periodConfig.templates.slice(0, 2).join(', ')}
                        </p>
                    </div>

                    <div className="bg-[#141b2d] rounded-xl p-6 border border-white/10">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="title" className="text-white">
                                    Title *
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Q4 2024 QBR"
                                    className="mt-1.5 bg-[#0a0f1a] border-gray-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="start_date" className="text-white">
                                        Start Date *
                                    </Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="mt-1.5 bg-[#0a0f1a] border-gray-700"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="end_date" className="text-white">
                                        End Date *
                                    </Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="mt-1.5 bg-[#0a0f1a] border-gray-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div
                        className="rounded-xl p-4 border"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
                            borderColor: 'rgba(139, 92, 246, 0.3)',
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-xl">{periodConfig.icon}</span>
                            <div>
                                <h4 className="font-semibold text-white text-sm mb-1">{periodConfig.label} Retrospectives</h4>
                                <p className="text-xs text-gray-400 mb-2">
                                    Columns: {PERIOD_CONFIGS[formData.period_type].defaultColumns.map(c => c.title).join(' • ')}
                                </p>
                                <p className="text-xs text-gray-400">
                                    Default Metrics: {periodConfig.defaultMetricLabels.join(', ')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(`/${projectSlug}/retro`)}
                            className="flex-1 border-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !formData.title.trim()}
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Retrospective'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
