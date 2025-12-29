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
            description: 'When you\'re pre-PMF, every user interaction matters. SignalsLoop helps you capture feedback from day one, validate ideas quickly, and build what users actually want—without spending hours on manual analysis.',
            color: 'from-[#FF4F00] to-[#FF6B26]',
            challenges: [
                'Feedback scattered across Slack, email, and support chats',
                'No time to write proper specs before building',
                'Guessing which features will drive retention',
                'Can\'t afford expensive enterprise tools',
            ],
            howWeHelp: [
                { title: 'Free tier with AI', desc: 'Start with powerful AI features at $0/month' },
                { title: 'Instant spec generation', desc: 'Go from idea to PRD in 30 seconds' },
                { title: 'Early signal detection', desc: 'Catch problems before they become churn' },
                { title: '5-minute setup', desc: 'Connect Slack or import CSV in minutes' },
            ],
            testimonial: {
                quote: 'We went from guessing to knowing. SignalsLoop helped us find the feature that 10x\'d our activation rate.',
                author: 'Solo Founder',
                company: 'Pre-seed SaaS',
            },
        },
        {
            id: 'scaleups',
            icon: <Zap className="w-8 h-8" />,
            name: 'For Scale-ups',
            tagline: 'Scale decisions, not just products',
            description: 'You\'ve found product-market fit. Now you need to scale efficiently without losing the signal in the noise. SignalsLoop helps growing teams stay connected to customer reality.',
            color: 'from-[#4A6741] to-[#6B8E6B]',
            challenges: [
                'Team growing faster than processes',
                'Sales and Product not aligned on priorities',
                'Enterprise customers demanding roadmap visibility',
                'Technical debt vs. feature requests tradeoffs',
            ],
            howWeHelp: [
                { title: 'Revenue-weighted scoring', desc: 'Prioritize by actual business impact' },
                { title: 'Stakeholder reports', desc: 'CEO, Sales, and Eng dashboards' },
                { title: 'Go/No-Go decisions', desc: 'Collaborative launch readiness checks' },
                { title: 'Competitive intel', desc: 'Track competitor moves in real-time' },
            ],
            testimonial: {
                quote: 'SignalsLoop helped us scale our PM team from 2 to 8 while keeping everyone on the same page.',
                author: 'VP Product',
                company: 'Series B SaaS',
            },
        },
        {
            id: 'enterprise',
            icon: <Building2 className="w-8 h-8" />,
            name: 'For Enterprise',
            tagline: 'Governance meets agility',
            description: 'Large organizations need rigor without bureaucracy. SignalsLoop provides the audit trails, role-based access, and outcome attribution that enterprise product teams need.',
            color: 'from-[#2E475D] to-[#516F90]',
            challenges: [
                'Multiple product lines with competing priorities',
                'Justifying roadmap decisions to leadership',
                'Measuring feature ROI after launch',
                'Compliance and security requirements',
            ],
            howWeHelp: [
                { title: 'Outcome attribution', desc: 'Connect launches to revenue and retention' },
                { title: 'Decision audit trails', desc: 'Full history of why decisions were made' },
                { title: 'Role-based permissions', desc: 'Fine-grained access control' },
                { title: 'SSO & SOC2', desc: 'Enterprise-grade security (coming soon)' },
            ],
            testimonial: {
                quote: 'Finally, we can show the board exactly how product decisions map to business outcomes.',
                author: 'CPO',
                company: 'Enterprise SaaS',
            },
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
                        <div className="w-9 h-9 bg-[#FF4F00] rounded-xl flex items-center justify-center text-white text-lg">⚡</div>
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

                {/* Solution Cards */}
                <div className="max-w-7xl mx-auto space-y-20 mb-28">
                    {solutions.map((solution) => (
                        <div key={solution.id} id={solution.id} className="bg-white rounded-3xl p-10 border border-black/[0.06] shadow-lg">
                            <div className="grid lg:grid-cols-2 gap-12">
                                <div>
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${solution.color} flex items-center justify-center text-white mb-6`}>
                                        {solution.icon}
                                    </div>
                                    <h2 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#2D2D2A] mb-2">{solution.name}</h2>
                                    <p className="text-lg text-[#FF4F00] font-medium mb-4">{solution.tagline}</p>
                                    <p className="text-[17px] text-[#5C5C57] leading-relaxed mb-8">{solution.description}</p>

                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-[#8A8A85] uppercase tracking-wide mb-4">Common Challenges</h3>
                                        <ul className="space-y-2">
                                            {solution.challenges.map((c, i) => (
                                                <li key={i} className="flex items-start gap-3 text-[15px] text-[#5C5C57]">
                                                    <span className="text-[#C2703D] mt-0.5">×</span>
                                                    {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                        Get started <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-[#8A8A85] uppercase tracking-wide mb-6">How We Help</h3>
                                    <div className="space-y-4 mb-10">
                                        {solution.howWeHelp.map((h, i) => (
                                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-[#FFFAF5]">
                                                <div className="w-8 h-8 rounded-lg bg-[#E8F0E8] flex items-center justify-center text-[#4A6741] flex-shrink-0">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[#2D2D2A] mb-0.5">{h.title}</div>
                                                    <div className="text-sm text-[#5C5C57]">{h.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-6 rounded-xl border border-[#E8E8E6]" style={{ background: 'linear-gradient(135deg, #FFFAF5 0%, #FFF5EB 100%)' }}>
                                        <p className="text-[15px] text-[#5C5C57] italic mb-4">"{solution.testimonial.quote}"</p>
                                        <div className="text-sm">
                                            <span className="font-semibold text-[#2D2D2A]">{solution.testimonial.author}</span>
                                            <span className="text-[#8A8A85]"> · {solution.testimonial.company}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
                        <div className="w-8 h-8 bg-[#FF4F00] rounded-lg flex items-center justify-center text-white text-sm">⚡</div>
                        <span className="font-[family-name:var(--font-fraunces)] font-semibold text-lg text-[#2D2D2A]">SignalsLoop</span>
                    </div>
                    <div className="text-sm text-[#8A8A85]">© 2025 SignalsLoop. All rights reserved.</div>
                </div>
            </footer>
        </div>
    );
}
