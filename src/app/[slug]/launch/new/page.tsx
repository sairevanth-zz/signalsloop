'use client';

/**
 * New Launch Board Page
 * Create a new Go/No-Go board
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function NewLaunchBoardPage() {
    const params = useParams();
    const router = useRouter();
    const projectSlug = params?.slug as string;
    const [projectId, setProjectId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        target_date: '',
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!projectId) {
            toast.error('Project not found');
            return;
        }

        if (!formData.title.trim()) {
            toast.error('Title is required');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    title: formData.title.trim(),
                    description: formData.description.trim() || undefined,
                    target_date: formData.target_date || undefined,
                }),
            });

            if (!response.ok) throw new Error('Failed to create board');

            const data = await response.json();
            toast.success('Launch board created!');
            router.push(`/${projectSlug}/launch/${data.board.id}`);
        } catch (error) {
            console.error('Error creating board:', error);
            toast.error('Failed to create launch board');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#13151a]">
            {/* Header */}
            <div className="bg-[#141b2d] border-b border-white/10 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/${projectSlug}/launch`)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Rocket className="w-5 h-5 text-teal-400" />
                            New Launch Board
                        </h1>
                        <p className="text-sm text-gray-400">
                            Create a Go/No-Go assessment for your feature launch
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl mx-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-[#141b2d] rounded-xl p-6 border border-white/10">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="title" className="text-white">
                                    Feature / Launch Name *
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Dark Mode Launch"
                                    className="mt-1.5 bg-[#0a0f1a] border-gray-700"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description" className="text-white">
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of the feature or launch..."
                                    className="mt-1.5 bg-[#0a0f1a] border-gray-700 min-h-[100px]"
                                />
                            </div>

                            <div>
                                <Label htmlFor="target_date" className="text-white">
                                    Target Launch Date
                                </Label>
                                <Input
                                    id="target_date"
                                    type="date"
                                    value={formData.target_date}
                                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                                    className="mt-1.5 bg-[#0a0f1a] border-gray-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div
                        className="rounded-xl p-4 border"
                        style={{
                            background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.1), rgba(20, 184, 166, 0.1))',
                            borderColor: 'rgba(6, 214, 160, 0.3)',
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-xl">✨</span>
                            <div>
                                <h4 className="font-semibold text-white text-sm mb-1">AI-Powered Analysis</h4>
                                <p className="text-xs text-gray-400">
                                    After creating the board, you can run AI analysis to automatically populate:
                                </p>
                                <ul className="text-xs text-gray-400 mt-2 space-y-1">
                                    <li>• Customer readiness score from feedback data</li>
                                    <li>• Risk assessment from historical outcomes</li>
                                    <li>• Competitive timing insights</li>
                                    <li>• Success prediction with adoption estimates</li>
                                    <li>• Default launch checklist items</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(`/${projectSlug}/launch`)}
                            className="flex-1 border-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !formData.title.trim()}
                            className="flex-1 bg-teal-600 hover:bg-teal-700"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Board'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
