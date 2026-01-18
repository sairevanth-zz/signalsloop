'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Beaker, Target, Eye, Flag, BarChart3, TrendingUp, Users,
    Sparkles, Play, Pause, RotateCcw, CheckCircle2, ArrowRight,
    MousePointer, Zap
} from 'lucide-react';

interface Variant {
    id: string;
    name: string;
    color: string;
    visitors: number;
    conversions: number;
    traffic: number;
}

interface Experiment {
    id: string;
    name: string;
    element: string;
    variants: Variant[];
    isRunning: boolean;
    totalVisitors: number;
}

const INITIAL_EXPERIMENTS: Experiment[] = [
    {
        id: 'cta-color',
        name: 'CTA Button Color',
        element: 'Sign Up Button',
        variants: [
            { id: 'control', name: 'Control (Blue)', color: '#3B82F6', visitors: 0, conversions: 0, traffic: 50 },
            { id: 'treatment', name: 'Treatment (Orange)', color: '#FF4F00', visitors: 0, conversions: 0, traffic: 50 },
        ],
        isRunning: false,
        totalVisitors: 0,
    },
    {
        id: 'headline',
        name: 'Headline Copy Test',
        element: 'Hero Headline',
        variants: [
            { id: 'control', name: 'Original', color: '#6B7280', visitors: 0, conversions: 0, traffic: 50 },
            { id: 'treatment', name: 'Action-Oriented', color: '#10B981', visitors: 0, conversions: 0, traffic: 50 },
        ],
        isRunning: false,
        totalVisitors: 0,
    },
];

// Conversion rates per variant (control vs treatment)
const CONVERSION_RATES = {
    'cta-color': { control: 0.032, treatment: 0.048 }, // Treatment is 50% better
    'headline': { control: 0.041, treatment: 0.052 },  // Treatment is 27% better
};

export default function ExperimentsDemoPage() {
    const [experiments, setExperiments] = useState<Experiment[]>(INITIAL_EXPERIMENTS);
    const [selectedExperiment, setSelectedExperiment] = useState<Experiment>(INITIAL_EXPERIMENTS[0]);
    const [showWinner, setShowWinner] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState<'normal' | 'fast'>('normal');

    // Simulate visitors coming in
    useEffect(() => {
        const exp = experiments.find(e => e.id === selectedExperiment.id);
        if (!exp?.isRunning) return;

        const interval = setInterval(() => {
            setExperiments(prev => prev.map(experiment => {
                if (experiment.id !== selectedExperiment.id || !experiment.isRunning) return experiment;

                const rates = CONVERSION_RATES[experiment.id as keyof typeof CONVERSION_RATES];
                const visitorsPerTick = simulationSpeed === 'fast' ? 50 : 10;

                const updatedVariants = experiment.variants.map(variant => {
                    const newVisitors = Math.floor(visitorsPerTick * (variant.traffic / 100));
                    const conversionRate = variant.id === 'control' ? rates.control : rates.treatment;
                    const newConversions = Math.floor(newVisitors * conversionRate * (0.8 + Math.random() * 0.4));

                    return {
                        ...variant,
                        visitors: variant.visitors + newVisitors,
                        conversions: variant.conversions + newConversions,
                    };
                });

                const newTotal = updatedVariants.reduce((acc, v) => acc + v.visitors, 0);

                // Check for statistical significance (simplified)
                if (newTotal >= 1000 && !showWinner) {
                    setShowWinner(true);
                }

                return {
                    ...experiment,
                    variants: updatedVariants,
                    totalVisitors: newTotal,
                };
            }));
        }, simulationSpeed === 'fast' ? 100 : 300);

        return () => clearInterval(interval);
    }, [experiments, selectedExperiment.id, simulationSpeed, showWinner]);

    // Update selected experiment when experiments change
    useEffect(() => {
        const updated = experiments.find(e => e.id === selectedExperiment.id);
        if (updated) setSelectedExperiment(updated);
    }, [experiments, selectedExperiment.id]);

    const toggleExperiment = useCallback(() => {
        setExperiments(prev => prev.map(exp =>
            exp.id === selectedExperiment.id ? { ...exp, isRunning: !exp.isRunning } : exp
        ));
        if (showWinner) setShowWinner(false);
    }, [selectedExperiment.id, showWinner]);

    const resetExperiment = useCallback(() => {
        setExperiments(prev => prev.map(exp =>
            exp.id === selectedExperiment.id
                ? {
                    ...exp,
                    isRunning: false,
                    totalVisitors: 0,
                    variants: exp.variants.map(v => ({ ...v, visitors: 0, conversions: 0 }))
                }
                : exp
        ));
        setShowWinner(false);
    }, [selectedExperiment.id]);

    const calculateLift = () => {
        const control = selectedExperiment.variants.find(v => v.id === 'control');
        const treatment = selectedExperiment.variants.find(v => v.id === 'treatment');
        if (!control || !treatment || control.visitors === 0 || treatment.visitors === 0) return 0;

        const controlCVR = control.conversions / control.visitors;
        const treatmentCVR = treatment.conversions / treatment.visitors;
        if (controlCVR === 0) return 0;

        return ((treatmentCVR - controlCVR) / controlCVR) * 100;
    };

    const calculateConfidence = () => {
        const total = selectedExperiment.totalVisitors;
        if (total < 100) return 0;
        if (total < 500) return Math.min(75, 50 + (total / 10));
        if (total < 1000) return Math.min(95, 75 + ((total - 500) / 25));
        return Math.min(99, 95 + ((total - 1000) / 500));
    };

    const lift = calculateLift();
    const confidence = calculateConfidence();

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FFFAF5 0%, #FFF5EB 100%)' }}>
            {/* Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 md:py-16">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12 space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4F00]/10 border border-[#FF4F00]/20 text-[#FF4F00] text-xs font-medium mb-2">
                        <Beaker className="w-3 h-3" />
                        <span>Interactive Demo</span>
                    </div>

                    <h1 className="font-[family-name:var(--font-fraunces)] text-4xl md:text-5xl font-bold tracking-tight text-[#2D2D2A] pb-2">
                        Run an A/B Test.<br />
                        <span className="text-[#FF4F00]">Watch It Win in Real-Time.</span>
                    </h1>
                    <p className="text-lg text-[#5C5C57] max-w-2xl mx-auto">
                        Click "Start Experiment" and watch visitors flow in, conversions tick up,
                        and statistical significance emerge. No login required.
                    </p>
                </motion.div>

                {/* Features Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-10"
                >
                    {[
                        { icon: Target, label: 'A/B Tests', desc: 'Compare variants' },
                        { icon: Eye, label: 'Visual Editor', desc: 'No code needed' },
                        { icon: Flag, label: 'Feature Flags', desc: '% Rollouts' },
                        { icon: BarChart3, label: 'Real-time Results', desc: 'Live analytics' },
                    ].map((feature, i) => (
                        <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-3 text-center border border-black/[0.06]">
                            <feature.icon className="w-5 h-5 mx-auto mb-1 text-[#FF4F00]" />
                            <div className="font-semibold text-sm text-[#2D2D2A]">{feature.label}</div>
                            <div className="text-[10px] text-[#8A8A85]">{feature.desc}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Main Demo Area */}
                <div className="max-w-5xl mx-auto">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Experiment Selector */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:col-span-1"
                        >
                            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-lg overflow-hidden">
                                <div className="p-4 border-b border-black/[0.06] flex items-center justify-between">
                                    <span className="font-semibold text-[#2D2D2A]">Experiments</span>
                                    <span className="px-2 py-0.5 bg-[#FFECE0] text-[#FF4F00] text-xs font-medium rounded">Demo</span>
                                </div>
                                <div className="p-3 space-y-2">
                                    {experiments.map(exp => (
                                        <button
                                            key={exp.id}
                                            onClick={() => {
                                                setSelectedExperiment(exp);
                                                setShowWinner(false);
                                            }}
                                            className={`w-full p-4 rounded-xl text-left transition-all ${selectedExperiment.id === exp.id
                                                    ? 'bg-[#FFF8F5] border-2 border-[#FF4F00]'
                                                    : 'bg-gray-50 border border-transparent hover:border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-sm text-[#2D2D2A]">{exp.name}</span>
                                                {exp.isRunning && (
                                                    <span className="px-2 py-0.5 bg-[#FF4F00] text-white text-[10px] font-medium rounded-full animate-pulse">
                                                        Running
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-[#8A8A85] flex items-center gap-1">
                                                <MousePointer className="w-3 h-3" />
                                                {exp.element}
                                            </div>
                                            {exp.totalVisitors > 0 && (
                                                <div className="mt-2 text-xs text-[#5C5C57]">
                                                    {exp.totalVisitors.toLocaleString()} visitors
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Controls */}
                                <div className="p-4 border-t border-black/[0.06] space-y-3">
                                    <button
                                        onClick={toggleExperiment}
                                        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${selectedExperiment.isRunning
                                                ? 'bg-gray-100 text-[#2D2D2A] hover:bg-gray-200'
                                                : 'bg-[#FF4F00] text-white hover:bg-[#E64700]'
                                            }`}
                                    >
                                        {selectedExperiment.isRunning ? (
                                            <><Pause className="w-4 h-4" /> Pause Experiment</>
                                        ) : (
                                            <><Play className="w-4 h-4" /> Start Experiment</>
                                        )}
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={resetExperiment}
                                            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-[#5C5C57] hover:bg-gray-50 flex items-center justify-center gap-1"
                                        >
                                            <RotateCcw className="w-3 h-3" /> Reset
                                        </button>
                                        <button
                                            onClick={() => setSimulationSpeed(s => s === 'normal' ? 'fast' : 'normal')}
                                            className={`flex-1 py-2 rounded-lg border text-sm flex items-center justify-center gap-1 ${simulationSpeed === 'fast'
                                                    ? 'border-[#FF4F00] text-[#FF4F00] bg-[#FFF8F5]'
                                                    : 'border-gray-200 text-[#5C5C57] hover:bg-gray-50'
                                                }`}
                                        >
                                            <Zap className="w-3 h-3" /> {simulationSpeed === 'fast' ? '10x Speed' : 'Speed Up'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Results Panel */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="lg:col-span-2"
                        >
                            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-lg p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-[#2D2D2A]">{selectedExperiment.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedExperiment.isRunning
                                                    ? 'bg-[#FFECE0] text-[#FF4F00]'
                                                    : 'bg-gray-100 text-[#5C5C57]'
                                                }`}>
                                                {selectedExperiment.isRunning ? 'Running' : 'Paused'}
                                            </span>
                                            <span className="text-sm text-[#8A8A85]">• A/B Test</span>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {showWinner && confidence >= 95 && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex items-center gap-2 px-4 py-2 bg-[#E8F0E8] rounded-lg border border-[#4A6741]/20"
                                            >
                                                <CheckCircle2 className="w-5 h-5 text-[#4A6741]" />
                                                <span className="font-semibold text-[#4A6741]">Statistical Significance!</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Variants */}
                                <div className="space-y-4 mb-6">
                                    {selectedExperiment.variants.map((variant, i) => {
                                        const cvr = variant.visitors > 0
                                            ? ((variant.conversions / variant.visitors) * 100).toFixed(2)
                                            : '0.00';
                                        const isWinner = i === 1 && showWinner && confidence >= 95;

                                        return (
                                            <motion.div
                                                key={variant.id}
                                                layout
                                                className={`p-4 rounded-xl transition-all ${isWinner
                                                        ? 'bg-[#FFF8F5] border-2 border-[#FF4F00]'
                                                        : 'bg-gray-50 border border-gray-100'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-4 h-4 rounded"
                                                            style={{ backgroundColor: variant.color }}
                                                        />
                                                        <span className="font-medium text-[#2D2D2A]">{variant.name}</span>
                                                        {isWinner && (
                                                            <span className="px-2 py-0.5 bg-[#FF4F00] text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                                                                <Sparkles className="w-3 h-3" /> Winner
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-[#8A8A85]">{variant.traffic}% traffic</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <motion.div
                                                            key={variant.visitors}
                                                            initial={{ scale: 1.1 }}
                                                            animate={{ scale: 1 }}
                                                            className="text-2xl font-bold text-[#2D2D2A]"
                                                        >
                                                            {variant.visitors.toLocaleString()}
                                                        </motion.div>
                                                        <div className="text-xs text-[#8A8A85]">Visitors</div>
                                                    </div>
                                                    <div>
                                                        <motion.div
                                                            key={variant.conversions}
                                                            initial={{ scale: 1.1 }}
                                                            animate={{ scale: 1 }}
                                                            className="text-2xl font-bold text-[#2D2D2A]"
                                                        >
                                                            {variant.conversions}
                                                        </motion.div>
                                                        <div className="text-xs text-[#8A8A85]">Conversions</div>
                                                    </div>
                                                    <div>
                                                        <motion.div
                                                            key={cvr}
                                                            initial={{ scale: 1.1 }}
                                                            animate={{ scale: 1 }}
                                                            className={`text-2xl font-bold ${isWinner ? 'text-[#FF4F00]' : 'text-[#2D2D2A]'}`}
                                                        >
                                                            {cvr}%
                                                        </motion.div>
                                                        <div className="text-xs text-[#8A8A85]">CVR</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="text-center">
                                        <TrendingUp className="w-5 h-5 mx-auto mb-1 text-[#FF4F00]" />
                                        <div className={`text-xl font-bold ${lift > 0 ? 'text-[#FF4F00]' : 'text-[#2D2D2A]'}`}>
                                            {lift > 0 ? '+' : ''}{lift.toFixed(0)}%
                                        </div>
                                        <div className="text-xs text-[#8A8A85]">Lift</div>
                                    </div>
                                    <div className="text-center">
                                        <BarChart3 className="w-5 h-5 mx-auto mb-1 text-[#2D2D2A]" />
                                        <div className="text-xl font-bold text-[#2D2D2A]">{confidence.toFixed(0)}%</div>
                                        <div className="text-xs text-[#8A8A85]">Confidence</div>
                                    </div>
                                    <div className="text-center">
                                        <Users className="w-5 h-5 mx-auto mb-1 text-[#2D2D2A]" />
                                        <div className="text-xl font-bold text-[#2D2D2A]">
                                            {selectedExperiment.totalVisitors.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-[#8A8A85]">Total Visitors</div>
                                    </div>
                                </div>

                                {/* AI Recommendation */}
                                <AnimatePresence>
                                    {showWinner && confidence >= 95 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="mt-4 p-4 bg-[#E8F0E8] rounded-xl flex items-start gap-3"
                                        >
                                            <Sparkles className="w-5 h-5 text-[#4A6741] flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-[#4A6741] mb-1">AI Recommendation</p>
                                                <p className="text-sm text-[#4A6741]/80">
                                                    Treatment variant is outperforming control by {lift.toFixed(0)}% with {confidence.toFixed(0)}% confidence.
                                                    Consider deploying the winning variant to 100% of traffic.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-3xl mx-auto mt-16"
                >
                    <div className="bg-gradient-to-r from-[#FF4F00] to-[#E64700] rounded-2xl p-8 text-center text-white">
                        <h2 className="text-2xl font-bold mb-2">Ready to run real experiments?</h2>
                        <p className="text-white/80 mb-6">
                            Get the full experimentation platform included in your SignalsLoop plan.
                        </p>
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <Link
                                href="/signup"
                                className="px-6 py-3 bg-white text-[#FF4F00] font-semibold rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2"
                            >
                                Start Free Trial <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/products/experiments-hub"
                                className="px-6 py-3 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
