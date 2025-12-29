'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, Rocket, Clock, DollarSign, Zap, CheckCircle } from 'lucide-react';

export default function StartupsPage() {
    const challenges = [
        'Feedback scattered across Slack, email, and support chats',
        "No time to write proper specs before building",
        'Guessing which features will drive retention',
        "Can't afford expensive enterprise tools",
        'Limited resources, unlimited ideas',
    ];

    const solutions = [
        { title: 'Free tier with AI', desc: 'Start with powerful AI features at $0/month. No credit card required.', icon: <DollarSign className="w-5 h-5" /> },
        { title: 'Instant spec generation', desc: 'Go from idea to PRD in 30 seconds, not 4 hours.', icon: <Zap className="w-5 h-5" /> },
        { title: 'Early signal detection', desc: 'Catch problems before they become churn.', icon: <Clock className="w-5 h-5" /> },
        { title: '5-minute setup', desc: 'Connect Slack or import CSV in minutes. No complex integrations.', icon: <Rocket className="w-5 h-5" /> },
    ];

    const testimonials = [
        { quote: "We went from guessing to knowing. SignalsLoop helped us find the feature that 10x'd our activation rate.", author: "Solo Founder", company: "Pre-seed SaaS", result: "+10x activation" },
        { quote: "I used to spend 20 hours a week on feedback analysis. Now it's 2 hours and I have better insights.", author: "PM at YC Startup", company: "Seed stage", result: "90% time saved" },
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
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center mx-auto mb-6">
                        <Rocket className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A] mb-4">
                        SignalsLoop for Startups
                    </h1>
                    <p className="text-2xl text-[#FF4F00] font-medium mb-6">Ship faster, learn faster</p>
                    <p className="text-lg text-[#5C5C57] leading-relaxed max-w-2xl mx-auto mb-8">
                        When you're pre-PMF, every user interaction matters. SignalsLoop helps you capture feedback from day one, validate ideas quickly, and build what users actually want—without spending hours on manual analysis.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                            Start Free (No CC) <ArrowRight className="inline w-4 h-4 ml-2" />
                        </Link>
                        <Link href="/pricing" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                            View Pricing
                        </Link>
                    </div>
                </div>

                {/* Challenges vs Solutions */}
                <div className="max-w-5xl mx-auto mb-20 grid md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-2xl border-2 border-red-200 bg-red-50">
                        <h2 className="text-lg font-bold text-red-600 uppercase tracking-wider mb-6">❌ Startup Challenges</h2>
                        <ul className="space-y-4">
                            {challenges.map((c, i) => (
                                <li key={i} className="flex items-start gap-3 text-[#5C5C57]">
                                    <span className="text-red-400 mt-1">•</span>
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

                {/* Why Startups Choose Us */}
                <div className="max-w-4xl mx-auto mb-20 text-center">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] mb-12">Why Startups Choose SignalsLoop</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 rounded-2xl bg-white border border-black/[0.06]">
                            <div className="text-4xl mb-4">💰</div>
                            <h3 className="font-semibold text-[#2D2D2A] mb-2">Free Forever Tier</h3>
                            <p className="text-sm text-[#5C5C57]">50 feedback items, 3 AI agents, Hunter scanning—all at $0/month</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white border border-black/[0.06]">
                            <div className="text-4xl mb-4">⚡</div>
                            <h3 className="font-semibold text-[#2D2D2A] mb-2">5-Minute Setup</h3>
                            <p className="text-sm text-[#5C5C57]">No complex integrations. Import CSV or connect Slack instantly.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white border border-black/[0.06]">
                            <div className="text-4xl mb-4">🚀</div>
                            <h3 className="font-semibold text-[#2D2D2A] mb-2">Grow With You</h3>
                            <p className="text-sm text-[#5C5C57]">Upgrade to Pro at $19/mo when you're ready. No per-user pricing.</p>
                        </div>
                    </div>
                </div>

                {/* Testimonials */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Startup Success Stories</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] shadow-sm">
                                <p className="text-[#5C5C57] italic mb-4">"{t.quote}"</p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="font-semibold text-[#2D2D2A]">{t.author}</div>
                                        <div className="text-sm text-[#8A8A85]">{t.company}</div>
                                    </div>
                                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
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
