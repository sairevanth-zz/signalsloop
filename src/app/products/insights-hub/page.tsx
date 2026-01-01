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
                            <p className="text-2xl text-[#0091AE] font-medium mb-6">See the patterns humans miss</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                Our Theme Detector and Sentiment Forecaster surface hidden patterns in your feedback—clustering themes, tracking trends, and generating weekly AI briefings.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start Free <ArrowRight className="inline w-4 h-4 ml-2" />
                                </Link>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-lg">
                            <div className="text-center mb-6">
                                <div className="font-[family-name:var(--font-fraunces)] text-4xl font-bold text-[#0091AE]">Weekly AI Briefings</div>
                                <div className="text-[#5C5C57] mt-2">Audio summaries delivered every Monday</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-[#E0F7FA] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">7-30d</div>
                                    <div className="text-xs text-[#8A8A85]">forecast</div>
                                </div>
                                <div className="p-4 bg-[#E0F7FA] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">Real-time</div>
                                    <div className="text-xs text-[#8A8A85]">anomalies</div>
                                </div>
                                <div className="p-4 bg-[#E0F7FA] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">Auto</div>
                                    <div className="text-xs text-[#8A8A85]">clustering</div>
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
            </div>

            <SiteFooter />
        </div>
    );
}
