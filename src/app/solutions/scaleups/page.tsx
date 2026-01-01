'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, Zap, Users, Target, BarChart3, Layers } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

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
            <SiteNav />

            <div className="relative z-10 pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto mb-8">
                    <Link href="/solutions" className="inline-flex items-center gap-2 text-[#5C5C57] hover:text-[#FF4F00] transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to Solutions
                    </Link>
                </div>

                {/* Hero with UI Mockup */}
                <div className="max-w-6xl mx-auto mb-16">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4A6741] to-[#6B8E6B] flex items-center justify-center mb-6">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#2D2D2A] mb-4">
                                SignalsLoop for Scale-ups
                            </h1>
                            <p className="text-xl text-[#4A6741] font-medium mb-4">Scale decisions, not just products</p>
                            <p className="text-[17px] text-[#5C5C57] leading-relaxed mb-6">
                                You&apos;ve found product-market fit. Now you need to scale efficiently without losing the signal in the noise. SignalsLoop helps growing teams stay connected to customer reality.
                            </p>

                            {/* Pro Tier Callout */}
                            <div className="p-4 rounded-xl bg-[#E8F0E8] mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#2D2D2A]">$19<span className="text-base font-normal text-[#5C5C57]">/mo</span></div>
                                    <span className="px-2 py-1 bg-[#4A6741] rounded-lg text-white text-xs font-bold">Pro Plan</span>
                                </div>
                                <div className="flex gap-4 mt-2 text-sm text-[#5C5C57]">
                                    <span>✓ All 12 AI agents</span>
                                    <span>✓ 5 team members</span>
                                    <span>✓ 1,200 feedback items</span>
                                </div>
                            </div>

                            <div className="flex gap-4 flex-wrap">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Try Pro Free →
                                </Link>
                                <Link href="/pricing" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    View Pricing
                                </Link>
                            </div>
                        </div>

                        {/* Revenue-Weighted Priorities Mockup */}
                        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-lg overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8F8F8] border-b border-black/[0.06]">
                                <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#27CA40]"></span>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-semibold text-[#2D2D2A]">Revenue-Weighted Priorities</h3>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-[#2D2D2A] rounded text-[10px] font-medium text-white">All</span>
                                        <span className="px-2 py-1 bg-[#F8F8F8] rounded text-[10px] font-medium text-[#8A8A85]">Enterprise</span>
                                        <span className="px-2 py-1 bg-[#F8F8F8] rounded text-[10px] font-medium text-[#8A8A85]">SMB</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <p className="text-[10px] text-[#8A8A85] uppercase tracking-wider mb-1">Total ARR at Risk</p>
                                        <p className="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-[#FF4F00]">$127K</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-[#8A8A85] uppercase tracking-wider mb-1">Roadmap Alignment</p>
                                        <p className="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-[#2D2D2A]">94%</p>
                                        <p className="text-xs text-[#4A6741]">↑ 12% this month</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-[#FFFAF5] rounded-lg border border-[#FF4F00]/10">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded bg-[#4A6741] flex items-center justify-center text-white text-xs font-bold">1</span>
                                            <span className="text-sm text-[#2D2D2A]">API Rate Limiting</span>
                                        </div>
                                        <div className="text-right text-xs">
                                            <span className="font-semibold text-[#2D2D2A]">Score: 94</span>
                                            <span className="text-[#8A8A85] ml-2">$47K ARR</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-black/[0.06]">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded bg-[#5C5C57] flex items-center justify-center text-white text-xs font-bold">2</span>
                                            <span className="text-sm text-[#2D2D2A]">Bulk Export</span>
                                        </div>
                                        <div className="text-right text-xs">
                                            <span className="font-semibold text-[#2D2D2A]">Score: 87</span>
                                            <span className="text-[#8A8A85] ml-2">$38K ARR</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-black/[0.06]">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded bg-[#8A8A85] flex items-center justify-center text-white text-xs font-bold">3</span>
                                            <span className="text-sm text-[#2D2D2A]">Dark Mode</span>
                                        </div>
                                        <div className="text-right text-xs">
                                            <span className="font-semibold text-[#2D2D2A]">Score: 72</span>
                                            <span className="text-[#8A8A85] ml-2">$22K ARR</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D2D2A] rounded-full text-xs text-white">
                                        <span>💰</span> Prioritized by revenue impact
                                    </span>
                                </div>
                            </div>
                        </div>
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

            <SiteFooter />
        </div>
    );
}
