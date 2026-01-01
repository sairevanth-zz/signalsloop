'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, Rocket, Clock, DollarSign, Zap, CheckCircle } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function StartupsPage() {
    const challenges = [
        'Feedback scattered across Slack, email, and support chats',
        'No time to write proper specs before building',
        'Guessing which features will drive retention',
    ];

    const solutions = [
        { title: 'Free tier with AI', desc: 'Start with powerful AI features at $0/month', icon: <DollarSign className="w-5 h-5" /> },
        { title: 'Instant spec generation', desc: 'Go from idea to PRD in 30 seconds', icon: <Zap className="w-5 h-5" /> },
        { title: 'Early signal detection', desc: 'Catch problems before they become churn', icon: <Clock className="w-5 h-5" /> },
    ];

    const testimonials = [
        { quote: "We went from guessing to knowing. SignalsLoop helped us find the feature that 10x'd our activation rate.", author: "Marcus Chen", company: "Founder, DevToolKit (Pre-seed)", result: "+10x activation" },
        { quote: "I used to spend 20 hours a week on feedback analysis. Now it's 2 hours and I have better insights.", author: "Sarah Kim", company: "PM, CloudSync (YC W23)", result: "90% time saved" },
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
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center mb-6">
                                <Rocket className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#2D2D2A] mb-4">
                                SignalsLoop for Startups
                            </h1>
                            <p className="text-xl text-[#FF4F00] font-medium mb-4">Ship faster, learn faster</p>
                            <p className="text-[17px] text-[#5C5C57] leading-relaxed mb-6">
                                When you're pre-PMF, every user interaction matters. SignalsLoop helps you capture feedback from day one, validate ideas quickly, and build what users actually want.
                            </p>

                            {/* Free Tier Callout */}
                            <div className="p-4 rounded-xl bg-[#2D2D2A] mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="px-3 py-1 bg-[#FF4F00] rounded-lg text-white text-sm font-bold">$0/mo</div>
                                    <div>
                                        <div className="font-semibold text-white">Free Forever Tier</div>
                                        <div className="text-sm text-white/60">50 feedback items • 3 AI agents • No credit card</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 flex-wrap mb-4">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start Free (No CC) →
                                </Link>
                                <Link href="/pricing" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    View Pricing
                                </Link>
                            </div>
                            <p className="text-sm text-[#8A8A85]">✓ Setup in under 5 minutes</p>
                        </div>

                        {/* Your First Signals Mockup */}
                        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-lg overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8F8F8] border-b border-black/[0.06]">
                                <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#27CA40]"></span>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-semibold text-[#2D2D2A]">Your First Signals</h3>
                                    <span className="px-2 py-1 bg-[#E8F0E8] rounded-full text-[10px] font-medium text-[#4A6741]">Free Plan</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    <div className="text-center p-3 bg-[#FFFAF5] rounded-lg">
                                        <div className="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-[#FF4F00]">23</div>
                                        <div className="text-[10px] text-[#8A8A85]">Signals found</div>
                                    </div>
                                    <div className="text-center p-3 bg-[#FFFAF5] rounded-lg">
                                        <div className="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-[#2D2D2A]">4</div>
                                        <div className="text-[10px] text-[#8A8A85]">Sources</div>
                                    </div>
                                    <div className="text-center p-3 bg-[#FFFAF5] rounded-lg">
                                        <div className="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-[#2D2D2A]">3</div>
                                        <div className="text-[10px] text-[#8A8A85]">Themes</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-black/[0.06]">
                                        <span className="text-lg">⭐</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#2D2D2A] truncate">&quot;Would love dark mode support&quot;</p>
                                        </div>
                                        <span className="px-2 py-0.5 bg-[#0091AE]/10 rounded text-[10px] font-medium text-[#0091AE]">Feature</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-black/[0.06]">
                                        <span className="text-lg">💬</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#2D2D2A] truncate">&quot;Best onboarding I&apos;ve seen&quot;</p>
                                        </div>
                                        <span className="px-2 py-0.5 bg-[#4A6741]/10 rounded text-[10px] font-medium text-[#4A6741]">Praise</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-black/[0.06]">
                                        <span className="text-lg">🐛</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#2D2D2A] truncate">&quot;API returns 500 on bulk export&quot;</p>
                                        </div>
                                        <span className="px-2 py-0.5 bg-[#DC3545]/10 rounded text-[10px] font-medium text-[#DC3545]">Bug</span>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D2D2A] rounded-full text-xs text-white">
                                        <span className="text-[#FF4F00]">⚡</span> Found in 5 minutes with Hunter Agent
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Challenges vs Solutions */}
                <div className="max-w-5xl mx-auto mb-20 grid md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl border-2 border-[#FF4F00]/20 bg-[#FFF8F5]">
                        <h2 className="text-sm font-bold text-[#C2703D] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="text-base">❌</span> Startup Challenges
                        </h2>
                        <ul className="space-y-3">
                            {challenges.map((c, i) => (
                                <li key={i} className="flex items-start gap-3 text-[15px] text-[#5C5C57]">
                                    <span className="text-[#C2703D] mt-1">•</span>
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-6 rounded-2xl border-2 border-[#4A6741]/20 bg-[#F0F5E8]">
                        <h2 className="text-sm font-bold text-[#4A6741] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="text-base">✅</span> How SignalsLoop Helps
                        </h2>
                        <ul className="space-y-4">
                            {solutions.map((s, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#4A6741]/20 flex items-center justify-center text-[#4A6741] flex-shrink-0">
                                        {s.icon}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-[#2D2D2A] text-sm">{s.title}</div>
                                        <div className="text-sm text-[#5C5C57]">{s.desc}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Testimonials */}
                <div className="max-w-5xl mx-auto mb-20">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8A8A85] text-center mb-8">Startup Success Stories</p>
                    <div className="grid md:grid-cols-2 gap-6">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] shadow-sm">
                                <p className="text-[15px] text-[#5C5C57] italic mb-4">&quot;{t.quote}&quot;</p>
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full ${i === 0 ? 'bg-[#FF4F00]' : 'bg-[#4A6741]'} flex items-center justify-center text-white font-bold`}>
                                            {t.author[0]}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-[#2D2D2A]">{t.author}</div>
                                            <div className="text-xs text-[#8A8A85]">{t.company}</div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-[#E8F0E8] text-[#4A6741] rounded-full text-sm font-medium">
                                        {t.result}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">Ready to find product-market fit faster?</h2>
                    <p className="text-lg text-white/60 mb-8">Start free. No credit card. Setup in 5 minutes.</p>
                    <Link href="/signup" className="inline-block px-8 py-4 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                        Start free →
                    </Link>
                </div>
            </div>

            <SiteFooter />
        </div>
    );
}
