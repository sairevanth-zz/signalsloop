/**
 * Experiments Demo Page
 * 
 * Public demo page showcasing the experimentation platform
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Beaker,
    BarChart3,
    Flag,
    Eye,
    Zap,
    Target,
    TrendingUp,
    Users,
    CheckCircle2,
    Play,
    Sparkles,
} from 'lucide-react';

interface DemoExperiment {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'draft';
    type: 'ab_test' | 'feature_flag';
    variants: { name: string; traffic: number; conversions: number; visitors: number }[];
    lift?: number;
    confidence?: number;
}

const demoExperiments: DemoExperiment[] = [
    {
        id: '1',
        name: 'CTA Button Color Test',
        status: 'running',
        type: 'ab_test',
        variants: [
            { name: 'Control (Blue)', traffic: 50, conversions: 32, visitors: 1000 },
            { name: 'Treatment (Orange)', traffic: 50, conversions: 48, visitors: 1000 },
        ],
        lift: 50,
        confidence: 98,
    },
    {
        id: '2',
        name: 'New Pricing Page',
        status: 'completed',
        type: 'ab_test',
        variants: [
            { name: 'Original', traffic: 50, conversions: 45, visitors: 2000 },
            { name: 'Simplified', traffic: 50, conversions: 72, visitors: 2000 },
        ],
        lift: 60,
        confidence: 99,
    },
    {
        id: '3',
        name: 'Dark Mode Feature',
        status: 'running',
        type: 'feature_flag',
        variants: [
            { name: 'Disabled', traffic: 80, conversions: 0, visitors: 4000 },
            { name: 'Enabled', traffic: 20, conversions: 0, visitors: 1000 },
        ],
    },
];

export default function ExperimentsDemo() {
    const [selectedExperiment, setSelectedExperiment] = useState<DemoExperiment | null>(
        demoExperiments[0]
    );
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newExperiment, setNewExperiment] = useState({
        name: '',
        type: 'ab_test',
        traffic: 50,
    });

    return (
        <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
            {/* Header */}
            <header className="border-b border-black/[0.04] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 rounded-lg" />
                            <span className="font-semibold text-[#2D2D2A]">SignalsLoop</span>
                        </Link>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-2">
                            <Beaker className="w-5 h-5 text-[#FF4F00]" />
                            <span className="font-medium text-[#2D2D2A]">Experiments Demo</span>
                        </div>
                    </div>
                    <Link href="/signup">
                        <Button className="bg-[#FF4F00] hover:bg-[#E64700]">
                            Start Free →
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Hero Banner */}
                <div className="bg-gradient-to-r from-[#FF4F00]/10 via-[#FFECE0] to-[#FF4F00]/10 rounded-2xl p-8 mb-8 border border-[#FF4F00]/20">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Badge className="bg-[#FF4F00] text-white">🧪 Interactive Demo</Badge>
                            </div>
                            <h1 className="text-3xl font-bold text-[#2D2D2A] mb-2">
                                A/B Testing Without Optimizely
                            </h1>
                            <p className="text-[#5C5C57] max-w-xl">
                                Full experimentation platform built in. Create experiments, run A/B tests,
                                manage feature flags, and see real-time results—all included in your plan.
                            </p>
                        </div>
                        <div className="hidden md:flex flex-col gap-2 text-right">
                            <div className="text-sm text-[#8A8A85]">Included in Pro plan</div>
                            <div className="text-2xl font-bold text-[#FF4F00]">$0 extra</div>
                            <div className="text-xs text-[#8A8A85]">(Optimizely: $200+/mo)</div>
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { icon: Target, label: 'A/B Tests', desc: 'Compare variants' },
                        { icon: Eye, label: 'Visual Editor', desc: 'No code needed' },
                        { icon: Flag, label: 'Feature Flags', desc: '% Rollouts' },
                        { icon: BarChart3, label: 'Real-time Results', desc: 'Live analytics' },
                    ].map((feature, i) => (
                        <Card key={i} className="p-4 text-center hover:shadow-md transition-shadow">
                            <feature.icon className="w-6 h-6 mx-auto mb-2 text-[#FF4F00]" />
                            <div className="font-semibold text-[#2D2D2A]">{feature.label}</div>
                            <div className="text-xs text-[#8A8A85]">{feature.desc}</div>
                        </Card>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Experiments List */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-[#2D2D2A]">Experiments</h2>
                            <Button
                                size="sm"
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="bg-[#FF4F00] hover:bg-[#E64700]"
                            >
                                + New
                            </Button>
                        </div>

                        {showCreateForm && (
                            <Card className="p-4 mb-4 border-2 border-[#FF4F00]/30">
                                <h3 className="font-medium mb-3">Create Experiment</h3>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs">Name</Label>
                                        <Input
                                            value={newExperiment.name}
                                            onChange={(e) => setNewExperiment({ ...newExperiment, name: e.target.value })}
                                            placeholder="e.g., Homepage CTA Test"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Traffic Split: {newExperiment.traffic}%</Label>
                                        <Slider
                                            value={[newExperiment.traffic]}
                                            onValueChange={([v]) => setNewExperiment({ ...newExperiment, traffic: v })}
                                            max={100}
                                            step={5}
                                            className="mt-2"
                                        />
                                    </div>
                                    <Button className="w-full bg-[#FF4F00] hover:bg-[#E64700]" size="sm">
                                        <Play className="w-4 h-4 mr-2" />
                                        Create & Start
                                    </Button>
                                </div>
                            </Card>
                        )}

                        <div className="space-y-2">
                            {demoExperiments.map((exp) => (
                                <Card
                                    key={exp.id}
                                    className={`p-4 cursor-pointer transition-all ${selectedExperiment?.id === exp.id
                                            ? 'border-2 border-[#FF4F00] bg-[#FFF8F5]'
                                            : 'hover:border-[#FF4F00]/30'
                                        }`}
                                    onClick={() => setSelectedExperiment(exp)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">{exp.name}</span>
                                        <Badge
                                            variant={exp.status === 'running' ? 'default' : 'secondary'}
                                            className={exp.status === 'running' ? 'bg-[#FF4F00]' : ''}
                                        >
                                            {exp.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#8A8A85]">
                                        {exp.type === 'ab_test' ? (
                                            <Target className="w-3 h-3" />
                                        ) : (
                                            <Flag className="w-3 h-3" />
                                        )}
                                        {exp.type === 'ab_test' ? 'A/B Test' : 'Feature Flag'}
                                        {exp.lift && (
                                            <span className="ml-auto text-[#FF4F00] font-medium">+{exp.lift}% lift</span>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Experiment Details */}
                    <div className="lg:col-span-2">
                        {selectedExperiment ? (
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-[#2D2D2A]">{selectedExperiment.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge
                                                variant={selectedExperiment.status === 'running' ? 'default' : 'secondary'}
                                                className={selectedExperiment.status === 'running' ? 'bg-[#FF4F00]' : ''}
                                            >
                                                {selectedExperiment.status}
                                            </Badge>
                                            <span className="text-sm text-[#8A8A85]">
                                                {selectedExperiment.type === 'ab_test' ? 'A/B Test' : 'Feature Flag'}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedExperiment.confidence && selectedExperiment.confidence >= 95 && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-[#FFF8F5] rounded-lg border border-[#FF4F00]/20">
                                            <CheckCircle2 className="w-5 h-5 text-[#FF4F00]" />
                                            <span className="font-medium text-[#E64700]">Statistical Significance</span>
                                        </div>
                                    )}
                                </div>

                                {/* Variants */}
                                <div className="space-y-4 mb-6">
                                    {selectedExperiment.variants.map((variant, i) => {
                                        const cvr = variant.visitors > 0
                                            ? ((variant.conversions / variant.visitors) * 100).toFixed(1)
                                            : '0.0';
                                        const isWinner = i === 1 && selectedExperiment.lift && selectedExperiment.lift > 0;

                                        return (
                                            <div
                                                key={i}
                                                className={`p-4 rounded-lg ${isWinner
                                                        ? 'bg-[#FFF8F5] border-2 border-[#FF4F00]'
                                                        : 'bg-gray-50 border border-gray-100'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`w-3 h-3 rounded ${i === 0 ? 'bg-blue-500' : 'bg-[#FF4F00]'
                                                                }`}
                                                        />
                                                        <span className="font-medium">{variant.name}</span>
                                                        {isWinner && (
                                                            <Badge className="bg-[#FF4F00]">
                                                                <Sparkles className="w-3 h-3 mr-1" />
                                                                Winner
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-[#8A8A85]">{variant.traffic}% traffic</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <div className="text-2xl font-bold text-[#2D2D2A]">
                                                            {variant.visitors.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-[#8A8A85]">Visitors</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-[#2D2D2A]">
                                                            {variant.conversions}
                                                        </div>
                                                        <div className="text-xs text-[#8A8A85]">Conversions</div>
                                                    </div>
                                                    <div>
                                                        <div className={`text-2xl font-bold ${isWinner ? 'text-[#FF4F00]' : 'text-[#2D2D2A]'}`}>
                                                            {cvr}%
                                                        </div>
                                                        <div className="text-xs text-[#8A8A85]">CVR</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Results Summary */}
                                {selectedExperiment.lift && (
                                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="text-center">
                                            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-[#FF4F00]" />
                                            <div className="text-xl font-bold text-[#FF4F00]">+{selectedExperiment.lift}%</div>
                                            <div className="text-xs text-[#8A8A85]">Lift</div>
                                        </div>
                                        <div className="text-center">
                                            <BarChart3 className="w-5 h-5 mx-auto mb-1 text-[#2D2D2A]" />
                                            <div className="text-xl font-bold text-[#2D2D2A]">{selectedExperiment.confidence}%</div>
                                            <div className="text-xs text-[#8A8A85]">Confidence</div>
                                        </div>
                                        <div className="text-center">
                                            <Users className="w-5 h-5 mx-auto mb-1 text-[#2D2D2A]" />
                                            <div className="text-xl font-bold text-[#2D2D2A]">
                                                {selectedExperiment.variants.reduce((acc, v) => acc + v.visitors, 0).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-[#8A8A85]">Total Visitors</div>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <Card className="p-8 text-center">
                                <Beaker className="w-12 h-12 mx-auto mb-4 text-[#8A8A85]" />
                                <p className="text-[#8A8A85]">Select an experiment to view details</p>
                            </Card>
                        )}
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <Card className="p-8 bg-gradient-to-r from-[#FF4F00] to-[#E64700] text-white border-0">
                        <h2 className="text-2xl font-bold mb-2">Ready to run real experiments?</h2>
                        <p className="text-white/80 mb-6">
                            Get the full experimentation platform included in your SignalsLoop plan.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <Link href="/signup">
                                <Button size="lg" className="bg-white text-[#FF4F00] hover:bg-gray-100">
                                    Start Free Trial →
                                </Button>
                            </Link>
                            <Link href="/pricing">
                                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                    View Pricing
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
