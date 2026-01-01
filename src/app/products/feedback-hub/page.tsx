'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle, ArrowLeft, Search, Tag, Zap, BarChart3, MessageSquare, Globe } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function FeedbackHubPage() {
    const features = [
        { icon: <Search className="w-6 h-6" />, title: 'Multi-Platform Hunting', desc: 'Automatically scan Reddit, HackerNews, G2, App Store, Product Hunt, Twitter, and more for mentions of your product.' },
        { icon: <Tag className="w-6 h-6" />, title: 'AI Categorization', desc: '10 SaaS-specific categories: Feature Request, Bug Report, Praise, Question, Complaint, and more. 99.2% accuracy.' },
        { icon: <Zap className="w-6 h-6" />, title: 'Smart Deduplication', desc: 'Vector-based semantic similarity detects duplicate requests even when worded differently.' },
        { icon: <BarChart3 className="w-6 h-6" />, title: 'Revenue Weighting', desc: 'Priority scores factor in customer MRR, account tier, and churn risk for business-aligned prioritization.' },
        { icon: <MessageSquare className="w-6 h-6" />, title: 'Sentiment Analysis', desc: 'Track positive, negative, and neutral sentiment across channels over time.' },
        { icon: <Globe className="w-6 h-6" />, title: 'Source Attribution', desc: 'Every signal tagged with exact source, timestamp, and customer context.' },
    ];

    const platforms = [
        { name: 'Reddit', icon: '🔴', desc: 'Monitor subreddits for product mentions' },
        { name: 'HackerNews', icon: '🟠', desc: 'Track technical discussions' },
        { name: 'G2 Reviews', icon: '🟢', desc: 'Aggregate review feedback' },
        { name: 'App Store', icon: '🍎', desc: 'iOS and Android reviews' },
        { name: 'Product Hunt', icon: '🐱', desc: 'Launch feedback and comments' },
        { name: 'Twitter/X', icon: '🐦', desc: 'Social mentions (Premium)' },
        { name: 'Intercom', icon: '💬', desc: 'Support chat integration' },
        { name: 'Slack', icon: '💼', desc: 'Team feedback channels' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
            <SiteNav />

            <div className="relative z-10 pt-32 pb-20 px-6">
                {/* Back Link */}
                <div className="max-w-6xl mx-auto mb-8">
                    <Link href="/products" className="inline-flex items-center gap-2 text-[#5C5C57] hover:text-[#FF4F00] transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to Products
                    </Link>
                </div>

                {/* Hero */}
                <div className="max-w-6xl mx-auto mb-20">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center text-4xl mb-6">📬</div>
                            <div className="flex items-center gap-2 mb-4">
                                <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">Feedback Hub</h1>
                                <span className="px-2 py-0.5 bg-[#E8F0E8] rounded-full text-[10px] font-bold text-[#4A6741]">🤖 AI-Powered</span>
                            </div>
                            <p className="text-2xl text-[#FF4F00] font-medium mb-6">Discover what users actually want</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                Stop missing critical feedback buried across 12+ tools. Our Hunter Agent scans Reddit, HN, G2, App Store, Intercom, and more—automatically categorizing and deduplicating signals so you never miss what matters.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start Free <ArrowRight className="inline w-4 h-4 ml-2" />
                                </Link>
                                <Link href="/demo/feedback" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    Try Demo
                                </Link>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-lg">
                            <div className="text-center mb-6">
                                <div className="font-[family-name:var(--font-fraunces)] text-6xl font-bold text-[#FF4F00]">14K+</div>
                                <div className="text-[#5C5C57]">signals hunted weekly</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-[#FFFAF5] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">8</div>
                                    <div className="text-sm text-[#8A8A85]">platforms</div>
                                </div>
                                <div className="p-4 bg-[#FFFAF5] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">93%</div>
                                    <div className="text-sm text-[#8A8A85]">accuracy</div>
                                </div>
                                <div className="p-4 bg-[#FFFAF5] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">30min</div>
                                    <div className="text-sm text-[#8A8A85]">scan interval</div>
                                </div>
                                <div className="p-4 bg-[#FFFAF5] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">$0</div>
                                    <div className="text-sm text-[#8A8A85]">to start</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Problem Section */}
                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl border border-[#C2703D]/20" style={{ background: 'linear-gradient(135deg, #FFF5EB 0%, #FFECE0 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-6">The Problem</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            'Feedback scattered across 12+ different tools',
                            'Manual categorization takes 15+ hours/week',
                            'Duplicate requests waste engineering time',
                            'No way to weight requests by business value',
                            'Missing critical feedback from external platforms',
                            'Can\'t track sentiment trends over time',
                        ].map((problem, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <span className="text-[#C2703D] mt-0.5">×</span>
                                <span className="text-[#5C5C57]">{problem}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features */}
                <div className="max-w-6xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Key Features</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] hover:shadow-lg hover:-translate-y-1 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-[#FFECE0] flex items-center justify-center text-[#FF4F00] mb-4">
                                    {f.icon}
                                </div>
                                <h3 className="font-semibold text-lg text-[#2D2D2A] mb-2">{f.title}</h3>
                                <p className="text-[15px] text-[#5C5C57] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Connected Platforms */}
                <div className="max-w-6xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-4">Connected Platforms</h2>
                    <p className="text-center text-[#5C5C57] mb-12 max-w-2xl mx-auto">The Hunter Agent scans these platforms automatically to capture every relevant signal about your product.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {platforms.map((p, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 border border-black/[0.06] text-center hover:shadow-md transition-all">
                                <div className="text-3xl mb-2">{p.icon}</div>
                                <div className="font-semibold text-[#2D2D2A] mb-1">{p.name}</div>
                                <div className="text-xs text-[#8A8A85]">{p.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Case Study */}
                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#FF4F00] mb-4">Case Study</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">
                        "We discovered a critical bug from Reddit before any support tickets came in"
                    </h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        A B2B SaaS company using SignalsLoop's Hunter Agent detected a negative Reddit thread about their API within 30 minutes of posting. They fixed the issue before it escalated, preventing an estimated 15% churn in affected accounts.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#FFFAF5]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#FF4F00]">30min</div>
                            <div className="text-xs text-[#8A8A85]">detection time</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">15%</div>
                            <div className="text-xs text-[#8A8A85]">churn prevented</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">$40K</div>
                            <div className="text-xs text-[#8A8A85]">ARR saved</div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">
                        Start discovering signals today
                    </h2>
                    <p className="text-lg text-white/60 mb-8">Free forever plan includes 4 Hunter scans per month.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link href="/signup" className="px-8 py-4 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                            Start free →
                        </Link>
                        <Link href="/pricing" className="px-8 py-4 text-[15px] font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all">
                            View pricing
                        </Link>
                    </div>
                </div>
            </div>

            <SiteFooter />
        </div>
    );
}
