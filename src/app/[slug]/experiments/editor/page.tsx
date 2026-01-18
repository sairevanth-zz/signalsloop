/**
 * Visual Editor Page
 * 
 * Full-page visual editor for creating experiment variants
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { VisualEditor } from '@/components/experiments/VisualEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

interface ElementChange {
    id: string;
    selector: string;
    originalValue: string;
    newValue: string;
    changeType: 'text' | 'style' | 'class' | 'attribute' | 'visibility';
    property?: string;
}

export default function VisualEditorPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const projectSlug = params.slug as string;
    const experimentId = searchParams.get('experimentId');
    const variantKey = searchParams.get('variant') || 'treatment';
    const targetUrl = searchParams.get('url') || '';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [experiment, setExperiment] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        const fetchExperiment = async () => {
            if (!experimentId) {
                setLoading(false);
                return;
            }

            const supabase = getSupabaseClient();
            if (!supabase) {
                setLoading(false);
                return;
            }

            const { data } = await supabase
                .from('experiments')
                .select('id, name')
                .eq('id', experimentId)
                .single();

            if (data) {
                setExperiment(data);
            }
            setLoading(false);
        };

        fetchExperiment();
    }, [experimentId]);

    const handleSave = async (changes: ElementChange[]) => {
        if (!experimentId) {
            toast.error('No experiment selected');
            return;
        }

        setSaving(true);
        try {
            // Get the variant
            const response = await fetch(`/api/experiments/${experimentId}/variants`);
            if (!response.ok) throw new Error('Failed to fetch variants');

            const { variants } = await response.json();
            const variant = variants.find((v: { variant_key: string }) => v.variant_key === variantKey);

            if (!variant) {
                // Create the variant if it doesn't exist
                const createResponse = await fetch(`/api/experiments/${experimentId}/variants`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: variantKey === 'control' ? 'Control' : 'Treatment',
                        variantKey: variantKey,
                        description: 'Created via Visual Editor',
                        trafficPercentage: 50,
                        isControl: variantKey === 'control',
                        config: {
                            visualChanges: changes,
                            targetUrl: targetUrl,
                        },
                    }),
                });

                if (!createResponse.ok) throw new Error('Failed to create variant');
                toast.success('Variant created with visual changes!');
            } else {
                // Update existing variant config
                const updateResponse = await fetch(`/api/experiments/${experimentId}/variants/${variant.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        config: {
                            ...variant.config,
                            visualChanges: changes,
                            targetUrl: targetUrl,
                        },
                    }),
                });

                if (!updateResponse.ok) throw new Error('Failed to update variant');
                toast.success('Visual changes saved!');
            }

            router.push(`/${projectSlug}/experiments/${experimentId}`);
        } catch (error) {
            console.error('Error saving changes:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (experimentId) {
            router.push(`/${projectSlug}/experiments/${experimentId}`);
        } else {
            router.push(`/${projectSlug}/experiments`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!targetUrl) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <div className="p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                    <h2 className="text-xl font-semibold mb-2">Target URL Required</h2>
                    <p className="text-muted-foreground mb-4">
                        Please provide a URL to edit. Add <code>?url=https://example.com</code> to the page URL.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-background">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    {experiment && (
                        <span className="text-sm font-medium">
                            Editing: {experiment.name}
                        </span>
                    )}
                </div>
                {saving && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Saving...</span>
                    </div>
                )}
            </div>

            {/* Editor */}
            <div className="flex-1 p-4 overflow-hidden">
                <VisualEditor
                    experimentId={experimentId || ''}
                    variantKey={variantKey}
                    targetUrl={targetUrl}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}
