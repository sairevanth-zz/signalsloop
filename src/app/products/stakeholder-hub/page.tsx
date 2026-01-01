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
                            <div className="flex items-center gap-2 mb-4">
                                <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">Stakeholder Hub</h1>
                                <span className="px-2 py-0.5 bg-[#E8EEF2] rounded-full text-[10px] font-bold text-[#2E475D]">🤖 Automated</span>
                            </div>
                            <p className="text-2xl text-[#2E475D] font-medium mb-6">One dashboard, four different views</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                Stop sending 4 different reports to 4 different people. SignalsLoop auto-generates role-specific dashboards—so your CEO sees revenue impact while Engineering sees technical specs. Same data, personalized views.
                            </p>
                            <div className="flex gap-4 flex-wrap mb-6">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    See your dashboard →
                                </Link>
                                <Link href="/demo" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    Watch demo
                                </Link>
                            </div>
                            <p className="text-sm text-[#8A8A85]">✓ Go/No-Go dashboards available on Premium plans</p>
                        </div>

                        {/* Role-Based Views Mockup */}
                        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-lg overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8F8F8] border-b border-black/[0.06]">
                                <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#27CA40]"></span>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-semibold text-[#2D2D2A]">Role-Based Views</h3>
                                    <span className="px-2 py-1 bg-[#E8EEF2] rounded-full text-[10px] font-medium text-[#2E475D]">Auto-generated</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* CEO View */}
                                    <div className="p-4 bg-[#FFF8F5] rounded-lg border border-[#FF4F00]/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded bg-[#FF4F00] flex items-center justify-center text-white text-xs font-bold">C</div>
                                            <span className="font-medium text-[#2D2D2A] text-sm">CEO View</span>
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Revenue at risk</span><span className="font-semibold text-[#2D2D2A]">$47K MRR</span></div>
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Strategic alignment</span><span className="font-semibold text-[#2D2D2A]">78%</span></div>
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Competitive position</span><span className="font-semibold text-[#4A6741]">Strong</span></div>
                                        </div>
                                    </div>
                                    {/* VP Sales View */}
                                    <div className="p-4 bg-[#F0F5E8] rounded-lg border border-[#4A6741]/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded bg-[#4A6741] flex items-center justify-center text-white text-xs font-bold">V</div>
                                            <span className="font-medium text-[#2D2D2A] text-sm">VP Sales View</span>
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Top requests</span><span className="font-semibold text-[#2D2D2A]">API access</span></div>
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Churn risk accounts</span><span className="font-semibold text-[#C2703D]">3</span></div>
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Deal blockers</span><span className="font-semibold text-[#2D2D2A]">SSO, SOC2</span></div>
                                        </div>
                                    </div>
                                    {/* Engineering View */}
                                    <div className="p-4 bg-[#E8F4F7] rounded-lg border border-[#0091AE]/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded bg-[#0091AE] flex items-center justify-center text-white text-xs font-bold">E</div>
                                            <span className="font-medium text-[#2D2D2A] text-sm">Engineering View</span>
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">P0 bugs</span><span className="font-semibold text-[#2D2D2A]">2</span></div>
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Tech debt mentions</span><span className="font-semibold text-[#2D2D2A]">14</span></div>
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">API issues</span><span className="font-semibold text-[#C2703D]">↑ 23%</span></div>
                                        </div>
                                    </div>
                                    {/* Support View */}
                                    <div className="p-4 bg-[#F5F0F8] rounded-lg border border-[#6A5ACD]/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded bg-[#6A5ACD] flex items-center justify-center text-white text-xs font-bold">S</div>
                                            <span className="font-medium text-[#2D2D2A] text-sm">Support View</span>
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Trending issues</span><span className="font-semibold text-[#2D2D2A]">Login errors</span></div>
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">Sentiment</span><span className="font-semibold text-[#4A6741]">+0.12</span></div>
                                            <div className="flex justify-between"><span className="text-[#5C5C57]">FAQ candidates</span><span className="font-semibold text-[#2D2D2A]">5 new</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D2D2A] rounded-full text-xs text-white">
                                        <span>🎯</span> Each role sees what matters to them
                                    </span>
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
