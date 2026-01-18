'use client';

import Link from 'next/link';
import { ArrowLeft, Target, Eye, Flag, BarChart3, Users, Code, Zap, TrendingUp, Shield, Clock, CheckCircle } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function ExperimentsHubPage() {
    const features = [
        { icon: <Target className="w-6 h-6" />, title: 'A/B & Multivariate Testing', desc: 'Test any element on your site—headlines, CTAs, layouts, pricing. Split traffic and measure what actually converts.' },
        { icon: <Eye className="w-6 h-6" />, title: 'Visual Editor', desc: 'Point-and-click changes without writing code. Edit text, styles, and visibility directly in a live preview.' },
        { icon: <Flag className="w-6 h-6" />, title: 'Feature Flags', desc: 'Roll out features gradually with percentage-based targeting. Kill-switch anything instantly.' },
        { icon: <BarChart3 className="w-6 h-6" />, title: 'Real-time Results', desc: 'Watch conversions, lift, and confidence update live. Statistical significance calculated automatically.' },
        { icon: <Users className="w-6 h-6" />, title: 'User Targeting', desc: 'Target by plan, country, device, or any custom attribute. Personalize experiences for specific segments.' },
        { icon: <Code className="w-6 h-6" />, title: 'JavaScript SDK', desc: 'One script tag. Auto-tracking, variant assignment, and event batching built in. Edge runtime for speed.' },
    ];

    const useCases = [
        { name: 'Pricing Tests', icon: '💰', desc: 'Find the price that maximizes conversions' },
        { name: 'CTA Optimization', icon: '🎯', desc: 'Discover button text that drives action' },
        { name: 'Feature Rollouts', icon: '🚀', desc: 'Gradually release to detect issues early' },
        { name: 'Page Layouts', icon: '📐', desc: 'Test different information hierarchies' },
        { name: 'Onboarding Flows', icon: '👋', desc: 'Optimize first-time user experience' },
        { name: 'Email Capture', icon: '📧', desc: 'Maximize newsletter signups' },
        { name: 'Social Proof', icon: '⭐', desc: 'Test testimonial placement and styles' },
        { name: 'Navigation', icon: '🧭', desc: 'Find the menu structure that works' },
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
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center text-4xl mb-6">🧪</div>
                            <div className="flex items-center gap-2 mb-4">
                                <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">Experiments Hub</h1>
                                <span className="px-2 py-0.5 bg-[#E8F0E8] rounded-full text-[10px] font-bold text-[#4A6741]">🤖 AI-Powered</span>
                            </div>
                            <p className="text-2xl text-[#FF4F00] font-medium mb-6">Ship with confidence, not guesswork</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                Full experimentation platform built right in. Run A/B tests, manage feature flags, track real-time results—all without paying $200+/month for a separate tool. Make data-driven decisions, not assumptions.
                            </p>
                            <div className="flex gap-4 flex-wrap mb-6">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start experimenting →
                                </Link>
                                <Link href="/demo/experiments" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    Try demo
                                </Link>
                            </div>
                            <p className="text-sm text-[#8A8A85]">✓ Included in Pro and Premium plans</p>
                        </div>
                        {/* Experiment Dashboard Mockup */}
                        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-lg overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8F8F8] border-b border-black/[0.06]">
                                <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#27CA40]"></span>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-[#2D2D2A]">CTA Button Color Test</h3>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#FFECE0] rounded-full text-xs font-medium text-[#FF4F00]"><span className="w-2 h-2 rounded-full bg-[#FF4F00] animate-pulse"></span> Running</span>
                                </div>
                                <div className="grid grid-cols-4 gap-3 mb-5">
                                    <div className="text-center p-3 bg-[#FFFAF5] rounded-lg">
                                        <div className="font-[family-name:var(--font-fraunces)] text-xl font-bold text-[#FF4F00]">2,340</div>
                                        <div className="text-[10px] text-[#8A8A85]">Visitors</div>
                                    </div>
                                    <div className="text-center p-3 bg-[#FFFAF5] rounded-lg">
                                        <div className="font-[family-name:var(--font-fraunces)] text-xl font-bold text-[#2D2D2A]">2</div>
                                        <div className="text-[10px] text-[#8A8A85]">Variants</div>
                                    </div>
                                    <div className="text-center p-3 bg-[#FFFAF5] rounded-lg">
                                        <div className="font-[family-name:var(--font-fraunces)] text-xl font-bold text-[#4A6741]">+50%</div>
                                        <div className="text-[10px] text-[#8A8A85]">Lift</div>
                                    </div>
                                    <div className="text-center p-3 bg-[#FFFAF5] rounded-lg">
                                        <div className="font-[family-name:var(--font-fraunces)] text-xl font-bold text-[#2D2D2A]">98%</div>
                                        <div className="text-[10px] text-[#8A8A85]">Confidence</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-black/[0.06]">
                                        <div className="w-4 h-4 rounded bg-blue-500"></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[#2D2D2A]">Control (Blue Button)</p>
                                            <p className="text-[10px] text-[#8A8A85]">1,170 visitors • 37 conversions</p>
                                        </div>
                                        <span className="text-sm font-medium text-[#2D2D2A]">3.2% CVR</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-[#FFF8F5] rounded-lg border-2 border-[#FF4F00]">
                                        <div className="w-4 h-4 rounded bg-[#FF4F00]"></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[#2D2D2A]">Treatment (Orange Button)</p>
                                            <p className="text-[10px] text-[#8A8A85]">1,170 visitors • 56 conversions</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-[#FF4F00] text-white text-[10px] rounded-full font-medium">Winner</span>
                                            <span className="text-sm font-bold text-[#FF4F00]">4.8% CVR</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-[#E8F0E8] rounded-lg flex items-center gap-3">
                                    <Zap className="w-4 h-4 text-[#4A6741]" />
                                    <p className="text-xs text-[#4A6741]"><span className="font-semibold">AI Recommendation:</span> Treatment variant is performing significantly better. Consider ending the test and deploying.</p>
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
                            'Shipping features without knowing if they work',
                            'Separate experimentation tools cost $200+/month',
                            'Engineering overhead to set up A/B testing',
                            'No easy way to test copy or design changes',
                            'Feature rollouts are all-or-nothing risky bets',
                            'No data to back product decisions to stakeholders',
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

                    {/* Hero Features - First 2 */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {features.slice(0, 2).map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl p-8 border border-black/[0.06] hover:shadow-lg transition-all">
                                <div className="w-14 h-14 rounded-xl bg-[#FFECE0] flex items-center justify-center text-[#FF4F00] mb-5">
                                    {f.icon}
                                </div>
                                <h3 className="font-semibold text-xl text-[#2D2D2A] mb-3">{f.title}</h3>
                                <p className="text-[15px] text-[#5C5C57] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Standard Features - Remaining 4 */}
                    <div className="grid md:grid-cols-4 gap-4">
                        {features.slice(2).map((f, i) => (
                            <div key={i} className="bg-white rounded-xl p-5 border border-black/[0.06] hover:shadow-md transition-all">
                                <div className="w-10 h-10 rounded-lg bg-[#FFECE0] flex items-center justify-center text-[#FF4F00] mb-3">
                                    {f.icon}
                                </div>
                                <h3 className="font-semibold text-[#2D2D2A] mb-2">{f.title}</h3>
                                <p className="text-sm text-[#5C5C57] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Use Cases */}
                <div className="max-w-6xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-4">What You Can Test</h2>
                    <p className="text-center text-[#5C5C57] mb-12 max-w-2xl mx-auto">From pricing pages to onboarding flows, test anything that affects conversion.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {useCases.map((u, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 border border-black/[0.06] text-center hover:shadow-md transition-all">
                                <div className="text-3xl mb-2">{u.icon}</div>
                                <div className="font-semibold text-[#2D2D2A] mb-1">{u.name}</div>
                                <div className="text-xs text-[#8A8A85]">{u.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Case Study */}
                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#FF4F00] mb-4">Case Study</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">
                        "We increased signups by 34% with one button color test"
                    </h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        A SaaS startup used SignalsLoop's Experiments Hub to test their CTA button color against 5 alternatives. Within 2 weeks and 8,000 visitors, they found a variant that converted 34% better. The change took 2 minutes to implement using the visual editor.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#FFFAF5]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#FF4F00]">+34%</div>
                            <div className="text-xs text-[#8A8A85]">signup increase</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">2 weeks</div>
                            <div className="text-xs text-[#8A8A85]">test duration</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">2 min</div>
                            <div className="text-xs text-[#8A8A85]">to implement</div>
                        </div>
                    </div>
                </div>

                {/* Why SignalsLoop Section */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Why Choose Built-in Experimentation?</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            { icon: <Zap className="w-5 h-5" />, title: 'No Extra Cost', desc: 'Included with Pro and Premium plans. Save $2,400+/year compared to standalone tools.' },
                            { icon: <TrendingUp className="w-5 h-5" />, title: 'Unified Platform', desc: 'Feedback, specs, experiments, and insights—all in one place. No context switching.' },
                            { icon: <Shield className="w-5 h-5" />, title: 'Enterprise Ready', desc: 'SOC2 compliant, edge-deployed for speed, deterministic hashing for consistency.' },
                            { icon: <Clock className="w-5 h-5" />, title: 'Setup in Minutes', desc: 'One script tag. No engineering overhead. Start running experiments today.' },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 p-5 bg-white rounded-xl border border-black/[0.06]">
                                <div className="w-10 h-10 rounded-lg bg-[#FFECE0] flex items-center justify-center text-[#FF4F00] flex-shrink-0">
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#2D2D2A] mb-1">{item.title}</h3>
                                    <p className="text-sm text-[#5C5C57]">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">
                        Start experimenting today
                    </h2>
                    <p className="text-lg text-white/60 mb-8">Stop guessing what works. Let data drive your product decisions.</p>
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
