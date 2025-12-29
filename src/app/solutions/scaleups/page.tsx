'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, Zap, Users, Target, BarChart3, Layers } from 'lucide-react';

export default function ScaleupsPage() {
    const challenges = [
        'Team growing faster than processes',
        'Sales and Product not aligned on priorities',
        'Enterprise customers demanding roadmap visibility',
        'Technical debt vs. feature requests tradeoffs',
        'Too much feedback to process manually',
    ];

    const solutions = [
        { title: 'Revenue-weighted scoring', desc: 'Prioritize by actual business impact, not just vote counts.', icon: <BarChart3 className="w-5 h-5" /> },
        { title: 'Stakeholder reports', desc: 'CEO, Sales, and Engineering dashboards—each sees what matters.', icon: <Users className="w-5 h-5" /> },
        { title: 'Go/No-Go decisions', desc: 'Collaborative launch readiness checks with stakeholder votes.', icon: <Target className="w-5 h-5" /> },
        { title: 'Competitive intel', desc: 'Track competitor moves in real-time.', icon: <Layers className="w-5 h-5" /> },
    ];

    const metrics = [
        { value: '$19/mo', label: 'Pro plan', desc: 'All 12 AI agents, 5 projects' },
        { value: '5', label: 'Team members', desc: 'Included in Pro' },
        { value: '1,200', label: 'Feedback items', desc: 'Per project' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.04]"
                style={{ background: 'rgba(255, 250, 245, 0.9)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
                    <Link href="/" className="flex items-center gap-2.5">
                        <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-9 h-9 rounded-xl" />
                        <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[22px] text-[#2D2D2A]">SignalsLoop</span>
                    </Link>
                    <div className="hidden lg:flex items-center gap-4">
                        <Link href="/login" className="text-[15px] font-medium text-[#2D2D2A] hover:text-[#FF4F00] transition-colors">Log in</Link>
                        <Link href="/signup" className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-lg hover:bg-[#E64700] transition-all">Start free</Link>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto mb-8">
                    <Link href="/solutions" className="inline-flex items-center gap-2 text-[#5C5C57] hover:text-[#FF4F00] transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to Solutions
                    </Link>
                </div>

                {/* Hero */}
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4A6741] to-[#6B8E6B] flex items-center justify-center mx-auto mb-6">
                        <Zap className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A] mb-4">
                        SignalsLoop for Scale-ups
                    </h1>
                    <p className="text-2xl text-[#4A6741] font-medium mb-6">Scale decisions, not just products</p>
                    <p className="text-lg text-[#5C5C57] leading-relaxed max-w-2xl mx-auto mb-8">
                        You've found product-market fit. Now you need to scale efficiently without losing the signal in the noise. SignalsLoop helps growing teams stay connected to customer reality.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                            Try Pro Free <ArrowRight className="inline w-4 h-4 ml-2" />
                        </Link>
                        <Link href="/pricing" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                            View Pricing
                        </Link>
                    </div>
                </div>

                {/* Metrics */}
                <div className="max-w-3xl mx-auto mb-20 p-8 rounded-2xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="grid grid-cols-3 gap-6 text-center">
                        {metrics.map((m, i) => (
                            <div key={i}>
                                <div className="font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#4A6741]">{m.value}</div>
                                <div className="font-medium text-[#2D2D2A]">{m.label}</div>
                                <div className="text-xs text-[#8A8A85]">{m.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Challenges vs Solutions */}
                <div className="max-w-5xl mx-auto mb-20 grid md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-2xl border-2 border-amber-200 bg-amber-50">
                        <h2 className="text-lg font-bold text-amber-700 uppercase tracking-wider mb-6">⚠️ Scale-up Challenges</h2>
                        <ul className="space-y-4">
                            {challenges.map((c, i) => (
                                <li key={i} className="flex items-start gap-3 text-[#5C5C57]">
                                    <span className="text-amber-500 mt-1">•</span>
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-8 rounded-2xl border-2 border-green-200 bg-green-50">
                        <h2 className="text-lg font-bold text-green-600 uppercase tracking-wider mb-6">✅ How SignalsLoop Helps</h2>
                        <ul className="space-y-4">
                            {solutions.map((s, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-green-200 flex items-center justify-center text-green-700 flex-shrink-0">
                                        {s.icon}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-[#2D2D2A]">{s.title}</div>
                                        <div className="text-sm text-[#5C5C57]">{s.desc}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Case Study */}
                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#4A6741] mb-4">Case Study: Series B SaaS</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">
                        "SignalsLoop helped us scale our PM team from 2 to 8 while keeping everyone on the same page"
                    </h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        When their PM team tripled in 6 months, a B2B scale-up struggled to maintain consistency. With SignalsLoop's stakeholder reports and revenue-weighted prioritization, they achieved 100% alignment on roadmap priorities for the first time.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#E8F0E8]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">4x</div>
                            <div className="text-xs text-[#8A8A85]">team growth</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">100%</div>
                            <div className="text-xs text-[#8A8A85]">roadmap alignment</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">2x</div>
                            <div className="text-xs text-[#8A8A85]">shipping velocity</div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">Scale your product decisions with confidence</h2>
                    <p className="text-lg text-white/60 mb-8">Pro plan at $19/mo. Upgrade to Premium for Go/No-Go dashboards.</p>
                    <Link href="/signup" className="inline-block px-8 py-4 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                        Try Pro free →
                    </Link>
                </div>
            </div>

            <footer className="py-12 px-6 border-t border-black/[0.06]" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2.5">
                        <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 rounded-lg" />
                        <span className="font-[family-name:var(--font-fraunces)] font-semibold text-lg text-[#2D2D2A]">SignalsLoop</span>
                    </div>
                    <div className="text-sm text-[#8A8A85]">© 2025 SignalsLoop. All rights reserved.</div>
                </div>
            </footer>
        </div>
    );
}
