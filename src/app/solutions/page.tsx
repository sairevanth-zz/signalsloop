'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, Building2, Rocket, Users, Zap, Target, BarChart3 } from 'lucide-react';

export default function SolutionsPage() {
    const solutions = [
        {
            id: 'startups',
            icon: <Rocket className="w-8 h-8" />,
            name: 'For Startups',
            tagline: 'Ship faster, learn faster',
            description: 'When you\'re pre-PMF, every user interaction matters. SignalsLoop helps you capture feedback from day one, validate ideas quickly, and build what users actually want.',
            color: 'from-[#FF4F00] to-[#FF6B26]',
            borderColor: 'border-t-[#FF4F00]',
            taglineColor: 'text-[#FF4F00]',
            checkColor: 'text-[#FF4F00]',
            qualifiers: [
                'You\'re pre-PMF or early-stage',
                'Team of 1-10 people',
                'Can\'t afford enterprise tools',
            ],
        },
        {
            id: 'scaleups',
            icon: <Zap className="w-8 h-8" />,
            name: 'For Scale-ups',
            tagline: 'Scale decisions, not just products',
            description: 'You\'ve found product-market fit. Now you need to scale efficiently without losing the signal in the noise.',
            color: 'from-[#4A6741] to-[#6B8E6B]',
            borderColor: 'border-t-[#4A6741]',
            taglineColor: 'text-[#4A6741]',
            checkColor: 'text-[#4A6741]',
            qualifiers: [
                'You\'ve found PMF',
                'PM team of 2-10 people',
                'Sales wants roadmap visibility',
            ],
        },
        {
            id: 'enterprise',
            icon: <Building2 className="w-8 h-8" />,
            name: 'For Enterprise',
            tagline: 'Governance meets agility',
            description: 'Large organizations need rigor without bureaucracy. Get audit trails, role-based access, and outcome attribution.',
            color: 'from-[#2E475D] to-[#516F90]',
            borderColor: 'border-t-[#2E475D]',
            taglineColor: 'text-[#2E475D]',
            checkColor: 'text-[#2E475D]',
            qualifiers: [
                'Multiple product lines',
                'Need to justify ROI to leadership',
                'Need board-level reporting',
            ],
        },
    ];

    const useCases = [
        { icon: '🎯', title: 'Product Discovery', desc: 'Find what customers actually want from scattered feedback' },
        { icon: '✏️', title: 'Spec Writing', desc: 'Generate complete PRDs in 30 seconds with AI' },
        { icon: '📊', title: 'Prioritization', desc: 'Revenue-weighted scoring for data-driven roadmaps' },
        { icon: '🔮', title: 'Prediction', desc: 'Know which features will succeed before you build' },
        { icon: '⚔️', title: 'Competitive Intel', desc: 'Track competitor launches and feature gaps' },
        { icon: '📈', title: 'Outcome Tracking', desc: 'Measure feature impact after launch' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
            {/* Gradient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-24 -left-36 w-[500px] h-[500px] rounded-full opacity-60"
                    style={{ background: 'linear-gradient(180deg, #FFB088 0%, #FFD4BF 50%, #FFECE0 100%)', filter: 'blur(60px)' }} />
                <div className="absolute bottom-0 -right-24 w-[450px] h-[450px] rounded-full opacity-60"
                    style={{ background: 'linear-gradient(180deg, #C8E6C9 0%, #E8F5E9 100%)', filter: 'blur(60px)' }} />
            </div>

            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.04]"
                style={{ background: 'rgba(255, 250, 245, 0.9)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
                    <Link href="/" className="flex items-center gap-2.5">
                        <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-9 h-9 rounded-xl" />
                        <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[22px] text-[#2D2D2A]">SignalsLoop</span>
                    </Link>
                    <div className="hidden lg:flex items-center gap-4">
                        <Link href="/login" className="text-[15px] font-medium text-[#2D2D2A] hover:text-[#FF4F00] transition-colors">Log in</Link>
                        <Link href="/login" className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-lg hover:bg-[#E64700] transition-all">
                            Start free
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 pt-32 pb-20 px-6">
                {/* Header */}
                <div className="max-w-4xl mx-auto text-center mb-20">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#FF4F00] mb-4 block">Solutions</span>
                    <h1 className="font-[family-name:var(--font-fraunces)] font-medium text-[#2D2D2A] mb-6"
                        style={{ fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1.1 }}>
                        Built for how you work.<br />Scaled for where you're going.
                    </h1>
                    <p className="text-xl text-[#5C5C57] max-w-2xl mx-auto">
                        Whether you're a solo founder or an enterprise team, SignalsLoop adapts to your workflow and grows with your needs.
                    </p>
                </div>

                {/* Solution Cards - Visual with Color-coded segments */}
                <div className="max-w-7xl mx-auto mb-20">
                    <div className="grid md:grid-cols-3 gap-6">
                        {solutions.map((solution) => (
                            <div key={solution.id} className={`bg-white rounded-2xl border-t-4 ${solution.borderColor} border border-black/[0.06] shadow-sm hover:shadow-lg transition-all`}>
                                <div className="p-8">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${solution.color} flex items-center justify-center text-white mb-5`}>
                                        {solution.icon}
                                    </div>
                                    <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-2">{solution.name}</h2>
                                    <p className={`font-medium text-sm mb-4 ${solution.taglineColor}`}>{solution.tagline}</p>
                                    <p className="text-[15px] text-[#5C5C57] leading-relaxed mb-6">{solution.description}</p>

                                    {/* Is This For Me? */}
                                    <div className="mb-6">
                                        <p className="text-xs font-bold uppercase tracking-wider text-[#8A8A85] mb-3">Is this for me?</p>
                                        <div className="space-y-2">
                                            {solution.qualifiers.map((q, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-[#5C5C57]">
                                                    <CheckCircle className={`w-4 h-4 ${solution.checkColor} flex-shrink-0`} />
                                                    {q}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Link href={`/solutions/${solution.id}`} className="inline-flex items-center gap-1 text-[#FF4F00] font-semibold text-sm hover:gap-2 transition-all">
                                        Learn more <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* What You Get at Each Stage - Plan Comparison Table */}
                <div className="max-w-5xl mx-auto mb-28">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8A8A85] text-center mb-8">What You Get at Each Stage</p>
                    <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-black/[0.06]">
                                    <th className="text-left p-4 text-sm font-semibold text-[#2D2D2A]">Feature</th>
                                    <th className="text-center p-4">
                                        <div className="text-sm font-semibold text-[#2D2D2A]">Free</div>
                                        <div className="text-xs text-[#8A8A85]">$0/mo</div>
                                    </th>
                                    <th className="text-center p-4">
                                        <div className="text-sm font-semibold text-[#2D2D2A]">Pro</div>
                                        <div className="text-xs text-[#8A8A85]">$19/mo</div>
                                    </th>
                                    <th className="text-center p-4">
                                        <div className="text-sm font-semibold text-[#2D2D2A]">Premium</div>
                                        <div className="text-xs text-[#8A8A85]">$79/mo</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-black/[0.04]">
                                    <td className="p-4 text-sm text-[#5C5C57]">AI Agents</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">3</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">12</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">12</td>
                                </tr>
                                <tr className="border-b border-black/[0.04]">
                                    <td className="p-4 text-sm text-[#5C5C57]">Feedback Items</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">50</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">1,200</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">Unlimited</td>
                                </tr>
                                <tr className="border-b border-black/[0.04]">
                                    <td className="p-4 text-sm text-[#5C5C57]">Team Members</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">1</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">5</td>
                                    <td className="p-4 text-center text-sm text-[#2D2D2A]">10</td>
                                </tr>
                                <tr className="border-b border-black/[0.04]">
                                    <td className="p-4 text-sm text-[#5C5C57]">Go/No-Go Dashboards</td>
                                    <td className="p-4 text-center text-sm text-[#8A8A85]">—</td>
                                    <td className="p-4 text-center text-sm text-[#8A8A85]">—</td>
                                    <td className="p-4 text-center text-sm text-[#4A6741]">✓</td>
                                </tr>
                                <tr>
                                    <td className="p-4 text-sm text-[#5C5C57]">Outcome Attribution</td>
                                    <td className="p-4 text-center text-sm text-[#8A8A85]">—</td>
                                    <td className="p-4 text-center text-sm text-[#8A8A85]">—</td>
                                    <td className="p-4 text-center text-sm text-[#4A6741]">✓</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Use Cases Grid */}
                <div className="max-w-7xl mx-auto mb-28">
                    <div className="text-center mb-12">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#FF4F00] mb-4 block">Use Cases</span>
                        <h2 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#2D2D2A]">
                            One platform, endless possibilities
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {useCases.map((uc, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] hover:shadow-lg hover:-translate-y-1 transition-all">
                                <div className="text-3xl mb-4">{uc.icon}</div>
                                <h3 className="font-semibold text-lg text-[#2D2D2A] mb-2">{uc.title}</h3>
                                <p className="text-[15px] text-[#5C5C57]">{uc.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">
                        Find the right fit for your team
                    </h2>
                    <p className="text-lg text-white/60 mb-8">Start free. Upgrade when ready. Cancel anytime.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link href="/login" className="px-8 py-4 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                            Start free →
                        </Link>
                        <Link href="/pricing" className="px-8 py-4 text-[15px] font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all">
                            Compare plans
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
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
