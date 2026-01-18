/**
 * Experiments Hub Product Page
 * 
 * Public product page describing the experimentation platform
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    Code,
    Sparkles,
    Shield,
    Clock,
} from 'lucide-react';

const features = [
    {
        icon: Target,
        title: 'A/B Testing',
        description: 'Test any element on your site. Headlines, CTAs, layouts, pricing—run experiments to find what converts.',
    },
    {
        icon: Eye,
        title: 'Visual Editor',
        description: 'Point-and-click changes without writing code. Edit text, styles, and elements directly in a preview.',
    },
    {
        icon: Flag,
        title: 'Feature Flags',
        description: 'Roll out features gradually with percentage-based targeting. Kill-switch anything instantly.',
    },
    {
        icon: BarChart3,
        title: 'Real-time Results',
        description: 'Watch conversions, lift, and confidence update live. Know when you have a winner.',
    },
    {
        icon: Users,
        title: 'User Targeting',
        description: 'Target by plan, country, device, or any custom attribute. Personalize experiences.',
    },
    {
        icon: Code,
        title: 'JavaScript SDK',
        description: 'One script tag. Auto-tracking, variant assignment, and event batching built in.',
    },
];

const comparisons = [
    { feature: 'A/B Testing', signalsloop: true, optimizely: true },
    { feature: 'Visual Editor', signalsloop: true, optimizely: true },
    { feature: 'Feature Flags', signalsloop: true, optimizely: true },
    { feature: 'Real-time Results', signalsloop: true, optimizely: true },
    { feature: 'Feedback Collection', signalsloop: true, optimizely: false },
    { feature: 'AI Spec Writer', signalsloop: true, optimizely: false },
    { feature: 'Churn Prediction', signalsloop: true, optimizely: false },
    { feature: 'Starting Price', signalsloop: '$19/mo', optimizely: '$200+/mo' },
];

export default function ExperimentsHubPage() {
    return (
        <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
            {/* Header */}
            <header className="border-b border-black/[0.04] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 rounded-lg" />
                        <span className="font-semibold text-[#2D2D2A]">SignalsLoop</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/demo/experiments">
                            <Button variant="outline">Try Demo</Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="bg-[#FF4F00] hover:bg-[#E64700]">Start Free →</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF4F00] to-[#E64700] flex items-center justify-center text-2xl">
                            🧪
                        </div>
                    </div>
                    <Badge className="bg-[#FF4F00]/10 text-[#E64700] mb-4">Experiments Hub</Badge>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#2D2D2A] mb-4">
                        A/B Testing Without Optimizely
                    </h1>
                    <p className="text-xl text-[#5C5C57] max-w-2xl mx-auto mb-8">
                        Full experimentation platform built in. Run A/B tests, manage feature flags,
                        see real-time results—all included in your SignalsLoop plan.
                    </p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Link href="/demo/experiments">
                            <Button size="lg" className="bg-[#FF4F00] hover:bg-[#E64700]">
                                <Zap className="w-4 h-4 mr-2" />
                                Try Interactive Demo
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="lg" variant="outline">
                                Start Free Trial →
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-16 px-6 bg-white/50">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-center text-[#2D2D2A] mb-12">
                        Everything you need to experiment
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <Card key={i} className="p-6 hover:shadow-lg transition-shadow">
                                <feature.icon className="w-8 h-8 text-[#FF4F00] mb-4" />
                                <h3 className="font-semibold text-lg text-[#2D2D2A] mb-2">{feature.title}</h3>
                                <p className="text-sm text-[#5C5C57]">{feature.description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-center text-[#2D2D2A] mb-4">
                        SignalsLoop vs Optimizely
                    </h2>
                    <p className="text-center text-[#5C5C57] mb-8">
                        Get the same experimentation capabilities—plus AI features—at a fraction of the cost.
                    </p>
                    <Card className="overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#2D2D2A]">Feature</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#FF4F00]">SignalsLoop</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#5C5C57]">Optimizely</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisons.map((row, i) => (
                                    <tr key={i} className="border-t border-gray-100">
                                        <td className="px-6 py-4 text-sm text-[#2D2D2A]">{row.feature}</td>
                                        <td className="px-6 py-4 text-center">
                                            {typeof row.signalsloop === 'boolean' ? (
                                                row.signalsloop ? (
                                                    <CheckCircle2 className="w-5 h-5 text-[#FF4F00] mx-auto" />
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )
                                            ) : (
                                                <span className="font-bold text-[#FF4F00]">{row.signalsloop}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {typeof row.optimizely === 'boolean' ? (
                                                row.optimizely ? (
                                                    <CheckCircle2 className="w-5 h-5 text-gray-400 mx-auto" />
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )
                                            ) : (
                                                <span className="text-[#5C5C57]">{row.optimizely}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <Card className="p-8 md:p-12 bg-gradient-to-r from-[#FF4F00] to-[#E64700] text-white border-0 text-center">
                        <Beaker className="w-12 h-12 mx-auto mb-4 text-white/80" />
                        <h2 className="text-3xl font-bold mb-4">Start Experimenting Today</h2>
                        <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                            Join product teams who've switched from Optimizely and saved $2,000+/year
                            while getting AI-powered insights.
                        </p>
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <Link href="/signup">
                                <Button size="lg" className="bg-white text-[#FF4F00] hover:bg-gray-100">
                                    Start Free Trial →
                                </Button>
                            </Link>
                            <Link href="/demo/experiments">
                                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                    See Demo First
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-black/[0.04]">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-6 h-6 rounded" />
                        <span className="text-sm text-[#5C5C57]">SignalsLoop</span>
                    </Link>
                    <div className="flex items-center gap-6 text-sm text-[#5C5C57]">
                        <Link href="/products" className="hover:text-[#FF4F00]">All Products</Link>
                        <Link href="/pricing" className="hover:text-[#FF4F00]">Pricing</Link>
                        <Link href="/demo/experiments" className="hover:text-[#FF4F00]">Demo</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
