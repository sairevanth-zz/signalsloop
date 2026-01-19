/**
 * Experiment Creation Wizard Component
 * Step-by-step wizard for creating A/B tests, multivariate tests, and feature flags
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
    FlaskConical,
    Split,
    Flag,
    Sparkles,
    ArrowRight,
    ArrowLeft,
    Plus,
    Trash2,
    Target,
    Users,
    MousePointer,
    Eye,
    DollarSign,
    CheckCircle,
} from 'lucide-react';

type ExperimentType = 'ab_test' | 'multivariate' | 'feature_flag';
type GoalType = 'pageview' | 'click' | 'form_submit' | 'custom' | 'revenue';

interface Variant {
    id: string;
    name: string;
    key: string;
    description: string;
    trafficPercentage: number;
    isControl: boolean;
}

interface Goal {
    id: string;
    name: string;
    type: GoalType;
    selector?: string;
    urlPattern?: string;
    isPrimary: boolean;
}

interface ExperimentConfig {
    name: string;
    hypothesis: string;
    type: ExperimentType;
    variants: Variant[];
    goals: Goal[];
    trafficAllocation: number;
    targetingRules: Record<string, unknown>;
    // New parameters for Step 5
    successCriteria: string;
    minimumDetectableEffect: number;
    sampleSizeTarget: number;
    secondaryMetrics: string[];
}

interface Props {
    projectId: string;
    onComplete: (experimentId: string) => void;
    onCancel: () => void;
}

const experimentTypes = [
    {
        type: 'ab_test' as ExperimentType,
        name: 'A/B Test',
        description: 'Compare two versions to find the winner',
        icon: Split,
        color: 'bg-blue-500',
    },
    {
        type: 'multivariate' as ExperimentType,
        name: 'Multivariate Test',
        description: 'Test multiple combinations at once',
        icon: FlaskConical,
        color: 'bg-purple-500',
    },
    {
        type: 'feature_flag' as ExperimentType,
        name: 'Feature Flag',
        description: 'Gradually roll out a new feature',
        icon: Flag,
        color: 'bg-green-500',
    },
];

const goalTypes: { type: GoalType; name: string; icon: typeof Eye }[] = [
    { type: 'pageview', name: 'Page View', icon: Eye },
    { type: 'click', name: 'Click', icon: MousePointer },
    { type: 'form_submit', name: 'Form Submit', icon: CheckCircle },
    { type: 'revenue', name: 'Revenue', icon: DollarSign },
    { type: 'custom', name: 'Custom Event', icon: Target },
];

export function ExperimentWizard({ projectId, onComplete, onCancel }: Props) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [newMetric, setNewMetric] = useState('');
    const [config, setConfig] = useState<ExperimentConfig>({
        name: '',
        hypothesis: '',
        type: 'ab_test',
        variants: [
            { id: '1', name: 'Control', key: 'control', description: '', trafficPercentage: 50, isControl: true },
            { id: '2', name: 'Treatment', key: 'treatment', description: '', trafficPercentage: 50, isControl: false },
        ],
        goals: [
            { id: '1', name: 'Conversion', type: 'click', isPrimary: true },
        ],
        trafficAllocation: 100,
        targetingRules: {},
        // New parameters
        successCriteria: 'Ship if primary metric improves >10% with p<0.05',
        minimumDetectableEffect: 10,
        sampleSizeTarget: 5000,
        secondaryMetrics: [],
    });

    const totalSteps = 5;

    const updateConfig = (updates: Partial<ExperimentConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const addVariant = () => {
        const newVariant: Variant = {
            id: Date.now().toString(),
            name: `Variant ${config.variants.length}`,
            key: `variant_${config.variants.length}`,
            description: '',
            trafficPercentage: 0,
            isControl: false,
        };
        updateConfig({ variants: [...config.variants, newVariant] });
        redistributeTraffic([...config.variants, newVariant]);
    };

    const removeVariant = (id: string) => {
        if (config.variants.length <= 2) return;
        const newVariants = config.variants.filter(v => v.id !== id);
        redistributeTraffic(newVariants);
    };

    const redistributeTraffic = (variants: Variant[]) => {
        const equalShare = Math.floor(100 / variants.length);
        const remainder = 100 - equalShare * variants.length;
        const updated = variants.map((v, i) => ({
            ...v,
            trafficPercentage: equalShare + (i === 0 ? remainder : 0),
        }));
        updateConfig({ variants: updated });
    };

    const updateVariantTraffic = (id: string, percentage: number) => {
        const otherVariants = config.variants.filter(v => v.id !== id);
        const otherTotal = 100 - percentage;
        const otherShare = Math.floor(otherTotal / otherVariants.length);

        const updated = config.variants.map(v => {
            if (v.id === id) return { ...v, trafficPercentage: percentage };
            return { ...v, trafficPercentage: otherShare };
        });
        updateConfig({ variants: updated });
    };

    const addGoal = () => {
        const newGoal: Goal = {
            id: Date.now().toString(),
            name: '',
            type: 'click',
            isPrimary: false,
        };
        updateConfig({ goals: [...config.goals, newGoal] });
    };

    const removeGoal = (id: string) => {
        if (config.goals.length <= 1) return;
        updateConfig({ goals: config.goals.filter(g => g.id !== id) });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Find control and treatment descriptions from variants
            const controlVariant = config.variants.find(v => v.isControl);
            const treatmentVariant = config.variants.find(v => !v.isControl);

            // Create experiment with all parameters
            const expResponse = await fetch('/api/experiments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    name: config.name,
                    hypothesis: config.hypothesis,
                    experimentType: config.type,
                    experimentMode: config.type,
                    primaryMetric: config.goals.find(g => g.isPrimary)?.name || 'conversion',
                    secondaryMetrics: config.secondaryMetrics,
                    trafficAllocation: config.trafficAllocation,
                    targetingRules: config.targetingRules,
                    // New parameters from Step 5
                    successCriteria: config.successCriteria,
                    minimumDetectableEffect: config.minimumDetectableEffect / 100, // Convert to decimal
                    sampleSizeTarget: config.sampleSizeTarget,
                    controlDescription: controlVariant?.description || '',
                    treatmentDescription: treatmentVariant?.description || '',
                }),
            });

            if (!expResponse.ok) throw new Error('Failed to create experiment');
            const { experiment } = await expResponse.json();

            // Create variants
            for (const variant of config.variants) {
                await fetch(`/api/experiments/${experiment.id}/variants`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: variant.name,
                        variantKey: variant.key,
                        description: variant.description,
                        trafficPercentage: variant.trafficPercentage,
                        isControl: variant.isControl,
                    }),
                });
            }

            onComplete(experiment.id);
        } catch (error) {
            console.error('Error creating experiment:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
                {['Type', 'Details', 'Variants', 'Goals', 'Parameters'].map((label, i) => (
                    <div key={label} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step > i + 1 ? 'bg-green-500 text-white' :
                            step === i + 1 ? 'bg-blue-500 text-white' :
                                'bg-gray-200 text-gray-500 dark:bg-gray-700'
                            }`}>
                            {step > i + 1 ? <CheckCircle className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className={`ml-2 text-sm ${step === i + 1 ? 'font-medium' : 'text-muted-foreground'}`}>
                            {label}
                        </span>
                        {i < 4 && <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700 mx-2" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Experiment Type */}
            {step === 1 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Choose Experiment Type</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {experimentTypes.map(({ type, name, description, icon: Icon, color }) => (
                            <Card
                                key={type}
                                className={`p-6 cursor-pointer transition-all hover:shadow-md ${config.type === type ? 'ring-2 ring-blue-500' : ''
                                    }`}
                                onClick={() => updateConfig({ type })}
                            >
                                <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4`}>
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold mb-2">{name}</h3>
                                <p className="text-sm text-muted-foreground">{description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Basic Details */}
            {step === 2 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Experiment Details</h2>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Experiment Name</Label>
                            <Input
                                id="name"
                                value={config.name}
                                onChange={(e) => updateConfig({ name: e.target.value })}
                                placeholder="e.g., Pricing Page CTA Color Test"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="hypothesis">Hypothesis</Label>
                            <Textarea
                                id="hypothesis"
                                value={config.hypothesis}
                                onChange={(e) => updateConfig({ hypothesis: e.target.value })}
                                placeholder="e.g., Changing the CTA button from blue to green will increase conversions by 15%"
                                rows={3}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label>Traffic Allocation</Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                Percentage of total visitors to include in this experiment
                            </p>
                            <div className="flex items-center gap-4">
                                <Slider
                                    value={[config.trafficAllocation]}
                                    onValueChange={([value]) => updateConfig({ trafficAllocation: value })}
                                    min={10}
                                    max={100}
                                    step={10}
                                    className="flex-1"
                                />
                                <span className="w-12 text-center font-medium">{config.trafficAllocation}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Variants */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Configure Variants</h2>
                        <Button variant="outline" size="sm" onClick={addVariant}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Variant
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {config.variants.map((variant, index) => (
                            <Card key={variant.id} className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={variant.name}
                                                onChange={(e) => {
                                                    const updated = [...config.variants];
                                                    updated[index].name = e.target.value;
                                                    updateConfig({ variants: updated });
                                                }}
                                                placeholder="Variant name"
                                                className="flex-1"
                                            />
                                            {variant.isControl && <Badge variant="secondary">Control</Badge>}
                                        </div>
                                        <Textarea
                                            value={variant.description}
                                            onChange={(e) => {
                                                const updated = [...config.variants];
                                                updated[index].description = e.target.value;
                                                updateConfig({ variants: updated });
                                            }}
                                            placeholder="Describe what's different in this variant..."
                                            rows={2}
                                        />
                                        <div className="flex items-center gap-4">
                                            <Label className="text-sm">Traffic: {variant.trafficPercentage}%</Label>
                                            <Slider
                                                value={[variant.trafficPercentage]}
                                                onValueChange={([value]) => updateVariantTraffic(variant.id, value)}
                                                min={5}
                                                max={95}
                                                step={5}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    {!variant.isControl && config.variants.length > 2 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeVariant(variant.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 4: Goals */}
            {step === 4 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Define Goals</h2>
                        <Button variant="outline" size="sm" onClick={addGoal}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Goal
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {config.goals.map((goal, index) => (
                            <Card key={goal.id} className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={goal.name}
                                                onChange={(e) => {
                                                    const updated = [...config.goals];
                                                    updated[index].name = e.target.value;
                                                    updateConfig({ goals: updated });
                                                }}
                                                placeholder="Goal name (e.g., Signup, Purchase)"
                                                className="flex-1"
                                            />
                                            {goal.isPrimary && <Badge className="bg-blue-500">Primary</Badge>}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {goalTypes.map(({ type, name, icon: Icon }) => (
                                                <Button
                                                    key={type}
                                                    variant={goal.type === type ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => {
                                                        const updated = [...config.goals];
                                                        updated[index].type = type;
                                                        updateConfig({ goals: updated });
                                                    }}
                                                >
                                                    <Icon className="h-4 w-4 mr-1" />
                                                    {name}
                                                </Button>
                                            ))}
                                        </div>
                                        {(goal.type === 'click' || goal.type === 'form_submit') && (
                                            <Input
                                                value={goal.selector || ''}
                                                onChange={(e) => {
                                                    const updated = [...config.goals];
                                                    updated[index].selector = e.target.value;
                                                    updateConfig({ goals: updated });
                                                }}
                                                placeholder="CSS selector (e.g., #signup-btn, .cta-button)"
                                            />
                                        )}
                                        {goal.type === 'pageview' && (
                                            <Input
                                                value={goal.urlPattern || ''}
                                                onChange={(e) => {
                                                    const updated = [...config.goals];
                                                    updated[index].urlPattern = e.target.value;
                                                    updateConfig({ goals: updated });
                                                }}
                                                placeholder="URL pattern (e.g., /thank-you, /success*)"
                                            />
                                        )}
                                    </div>
                                    {config.goals.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeGoal(goal.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 5: Parameters */}
            {step === 5 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Experiment Parameters</h2>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="successCriteria">Success Criteria</Label>
                            <Textarea
                                id="successCriteria"
                                value={config.successCriteria}
                                onChange={(e) => updateConfig({ successCriteria: e.target.value })}
                                placeholder="e.g., Ship if primary metric improves >10% with p<0.05"
                                rows={2}
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label>Minimum Detectable Effect (MDE)</Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                Smallest improvement worth detecting. Smaller MDE = larger sample size needed.
                            </p>
                            <div className="flex items-center gap-4">
                                <Slider
                                    value={[config.minimumDetectableEffect]}
                                    onValueChange={([value]) => updateConfig({ minimumDetectableEffect: value })}
                                    min={5}
                                    max={50}
                                    step={5}
                                    className="flex-1"
                                />
                                <span className="w-16 text-center font-medium">{config.minimumDetectableEffect}%</span>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="sampleSize">Sample Size Target (per variant)</Label>
                            <Input
                                id="sampleSize"
                                type="number"
                                value={config.sampleSizeTarget}
                                onChange={(e) => updateConfig({ sampleSizeTarget: parseInt(e.target.value) || 5000 })}
                                className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Recommended: 500-20,000 users per variant
                            </p>
                        </div>

                        <div>
                            <Label>Secondary Metrics</Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                Additional metrics to track (guardrails, supporting metrics)
                            </p>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={newMetric}
                                    onChange={(e) => setNewMetric(e.target.value)}
                                    placeholder="e.g., Time on page, Bounce rate"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newMetric.trim()) {
                                            updateConfig({ secondaryMetrics: [...config.secondaryMetrics, newMetric.trim()] });
                                            setNewMetric('');
                                        }
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (newMetric.trim()) {
                                            updateConfig({ secondaryMetrics: [...config.secondaryMetrics, newMetric.trim()] });
                                            setNewMetric('');
                                        }
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {config.secondaryMetrics.map((metric, i) => (
                                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                                        {metric}
                                        <button
                                            onClick={() => updateConfig({
                                                secondaryMetrics: config.secondaryMetrics.filter((_, idx) => idx !== i)
                                            })}
                                            className="ml-1 hover:text-red-500"
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {step === 1 ? 'Cancel' : 'Back'}
                </Button>

                {step < totalSteps ? (
                    <Button onClick={() => setStep(s => s + 1)}>
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Experiment'}
                        <Sparkles className="h-4 w-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    );
}
