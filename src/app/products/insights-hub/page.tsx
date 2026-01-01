'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, LineChart, Bell, Lightbulb, TrendingUp, Layers, Calendar } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function InsightsHubPage() {
    const features = [
        { icon: <Layers className="w-6 h-6" />, title: 'Theme Detection', desc: 'Automatic clustering reveals emerging topics and patterns in your feedback.' },
        { icon: <TrendingUp className="w-6 h-6" />, title: 'Sentiment Forecasting', desc: 'Predict how sentiment will trend over 7-30 days based on current patterns.' },
        { icon: <Bell className="w-6 h-6" />, title: 'Anomaly Alerts', desc: 'Get notified instantly when feedback patterns shift unexpectedly.' },
        { icon: <Calendar className="w-6 h-6" />, title: 'Weekly AI Briefings', desc: 'Audio summaries of what happened this week—listen on your commute.' },
        { icon: <LineChart className="w-6 h-6" />, title: 'Trend Visualization', desc: 'Interactive charts showing theme growth and decline over time.' },
        { icon: <Lightbulb className="w-6 h-6" />, title: 'Comparative Analysis', desc: 'Compare periods to spot changes and identify what caused them.' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
            <SiteNav />

            <div className="relative z-10 pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto mb-8">
                    <Link href="/products" className="inline-flex items-center gap-2 text-[#5C5C57] hover:text-[#FF4F00] transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to Products
                    </Link>
                </div>

                <div className="max-w-6xl mx-auto mb-20">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0091AE] to-[#00BDA5] flex items-center justify-center text-4xl mb-6">📊</div>
                            <div className="flex items-center gap-2 mb-4">
                                <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">Insights Hub</h1>
                                <span className="px-2 py-0.5 bg-[#E0F7FA] rounded-full text-[10px] font-bold text-[#0091AE]">🤖 AI-Powered</span>
                            </div>
                            <p className="text-2xl text-[#0091AE] font-medium mb-6">Detect problems before they become crises</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                Our AI spots anomalies in real-time, forecasts sentiment 30 days ahead, and clusters emerging themes—so you catch issues 3 days before support tickets spike. Plus weekly AI briefings you can listen to on your commute.
                            </p>
                            <div className="flex gap-4 flex-wrap mb-6">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start detecting anomalies →
                                </Link>
                                <Link href="/demo" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    Watch demo
                                </Link>
                            </div>
                            <p className="text-sm text-[#8A8A85]">✓ Available on all plans</p>
                        </div>

                        {/* Insights Dashboard Mockup */}
                        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-lg overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8F8F8] border-b border-black/[0.06]">
                                <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#27CA40]"></span>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-semibold text-[#2D2D2A]">Insights Dashboard</h3>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#FFF0F0] rounded-full text-xs font-medium text-[#DC3545]"><span className="w-2 h-2 rounded-full bg-[#DC3545]"></span> 1 Alert</span>
                                </div>

                                {/* Anomaly Alert */}
                                <div className="p-4 bg-[#FFF8F5] rounded-lg border border-[#FF4F00]/20 mb-5">
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg">⚠️</span>
                                        <div>
                                            <p className="font-semibold text-[#C2703D] text-sm mb-1">Anomaly Detected: Sentiment Spike</p>
                                            <p className="text-xs text-[#5C5C57]">&quot;Login errors&quot; theme up 340% in last 48 hours</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sentiment Forecast */}
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-sm font-medium text-[#2D2D2A]">Sentiment Forecast (30 days)</p>
                                        <span className="text-xs text-[#4A6741]">↑ +0.12 predicted</span>
                                    </div>
                                    <div className="flex gap-1 items-end h-16">
                                        {[65, 70, 60, 75, 72, 80, 85, 82, 90].map((h, i) => (
                                            <div key={i} className={`flex-1 rounded-t ${i >= 7 ? 'bg-[#0091AE]/30 border-2 border-dashed border-[#0091AE]' : 'bg-[#4A6741]'}`} style={{ height: `${h}%` }}></div>
                                        ))}
                                    </div>
                                </div>

                                {/* Theme Tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#DC3545]/10 rounded text-xs text-[#DC3545]">🔴 Login errors <span className="font-semibold">↑ 340%</span></span>
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FFC107]/10 rounded text-xs text-[#886600]">⭐ Dark mode <span className="font-semibold">↑ 45%</span></span>
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#4A6741]/10 rounded text-xs text-[#4A6741]">💳 Pricing <span className="font-semibold">↓ 12%</span></span>
                                </div>

                                <div className="text-center">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D2D2A] rounded-full text-xs text-white">
                                        <span>🚀</span> Caught 3 days before support tickets spiked
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Key Features</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] hover:shadow-lg hover:-translate-y-1 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-[#E0F7FA] flex items-center justify-center text-[#0091AE] mb-4">{f.icon}</div>
                                <h3 className="font-semibold text-lg text-[#2D2D2A] mb-2">{f.title}</h3>
                                <p className="text-[15px] text-[#5C5C57] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#0091AE] mb-4">Case Study</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">
                        "Anomaly detection caught a major issue 3 days before support tickets spiked"
                    </h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        When a SaaS company pushed a buggy release, SignalsLoop detected negative sentiment spikes on Reddit within hours. They rolled back before 80% of users even noticed, preventing a potential PR crisis.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#E0F7FA]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#0091AE]">3 days</div>
                            <div className="text-xs text-[#8A8A85]">early warning</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#0091AE]">2 hrs</div>
                            <div className="text-xs text-[#8A8A85]">to rollback</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">Crisis</div>
                            <div className="text-xs text-[#8A8A85]">averted</div>
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">See patterns before they become problems</h2>
                    <p className="text-lg text-white/60 mb-8">Available on all plans.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link href="/signup" className="px-8 py-4 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">Start free →</Link>
                        <Link href="/pricing" className="px-8 py-4 text-[15px] font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all">View pricing</Link>
                    </div>
                </div>
            </div >

            <SiteFooter />
        </div >
    );
}
