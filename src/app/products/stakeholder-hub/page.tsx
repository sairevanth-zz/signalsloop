'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, Users, BarChart3, FileText, CheckCircle, History, Megaphone } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function StakeholderHubPage() {
    const features = [
        { icon: <Users className="w-6 h-6" />, title: 'Role-Based Reports', desc: 'Custom views for CEO, Sales, Engineering, and Support. Each role sees what matters to them.' },
        { icon: <CheckCircle className="w-6 h-6" />, title: 'Go/No-Go Dashboards', desc: 'Launch readiness with stakeholder votes. Everyone signs off in one place.' },
        { icon: <History className="w-6 h-6" />, title: 'AI Retrospectives', desc: 'Auto-populated insights from each release. What went well, what to improve.' },
        { icon: <BarChart3 className="w-6 h-6" />, title: 'Outcome Attribution', desc: 'Connect launches to business results. See which features drove revenue.' },
        { icon: <FileText className="w-6 h-6" />, title: 'Action Tracking', desc: 'Follow up on commitments automatically. Never lose track of who owns what.' },
        { icon: <Megaphone className="w-6 h-6" />, title: 'Changelog Generation', desc: 'Auto-write release notes for customers. One click to publish.' },
    ];

    const roles = [
        { role: 'CEO', focus: 'Revenue impact, strategic alignment, competitive position', color: '#FF4F00' },
        { role: 'VP Sales', focus: 'Customer requests, churn prevention, deal closers', color: '#4A6741' },
        { role: 'Engineering', focus: 'Technical specs, dependencies, capacity planning', color: '#0091AE' },
        { role: 'Support', focus: 'Bug trends, customer sentiment, FAQ updates', color: '#6A5ACD' },
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
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2E475D] to-[#516F90] flex items-center justify-center text-4xl mb-6">👥</div>
                            <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A] mb-4">Stakeholder Hub</h1>
                            <p className="text-2xl text-[#2E475D] font-medium mb-6">Keep everyone aligned</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                Role-based reporting for CEO, Sales, Engineering, and more. Go/No-Go dashboards, collaborative retrospectives, and real-time launch status—so stakeholders always know where things stand.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start Free <ArrowRight className="inline w-4 h-4 ml-2" />
                                </Link>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-lg">
                            <div className="text-center mb-6">
                                <div className="font-[family-name:var(--font-fraunces)] text-4xl font-bold text-[#2E475D]">4+</div>
                                <div className="text-[#5C5C57]">stakeholder roles supported</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-[#E8EEF2] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">Real-time</div>
                                    <div className="text-xs text-[#8A8A85]">status updates</div>
                                </div>
                                <div className="p-4 bg-[#E8EEF2] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">Auto</div>
                                    <div className="text-xs text-[#8A8A85]">changelog</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Role-Based Reports</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {roles.map((r, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: r.color }}>
                                        {r.role[0]}
                                    </div>
                                    <h3 className="font-semibold text-lg text-[#2D2D2A]">{r.role}</h3>
                                </div>
                                <p className="text-[15px] text-[#5C5C57]">{r.focus}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Key Features</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] hover:shadow-lg hover:-translate-y-1 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-[#E8EEF2] flex items-center justify-center text-[#2E475D] mb-4">{f.icon}</div>
                                <h3 className="font-semibold text-lg text-[#2D2D2A] mb-2">{f.title}</h3>
                                <p className="text-[15px] text-[#5C5C57] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#2E475D] mb-4">Case Study</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">"Our exec meetings went from 3 hours to 45 minutes"</h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        A Series C company used SignalsLoop's role-based reports to give their CEO a single dashboard with revenue impact and strategic alignment. Instead of 3-hour status meetings, the CEO now gets a 10-minute briefing every Monday morning.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#E8EEF2]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2E475D]">75%</div>
                            <div className="text-xs text-[#8A8A85]">less meeting time</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">100%</div>
                            <div className="text-xs text-[#8A8A85]">stakeholder visibility</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">10min</div>
                            <div className="text-xs text-[#8A8A85]">weekly briefing</div>
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">Align your entire organization</h2>
                    <p className="text-lg text-white/60 mb-8">Go/No-Go Dashboards available on Premium plans.</p>
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
