'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, Building2, Shield, Lock, BarChart3, FileText, Users } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function EnterprisePage() {
    const challenges = [
        'Multiple product lines with competing priorities',
        'Justifying roadmap decisions to leadership',
        'Measuring feature ROI after launch',
        'Compliance and security requirements',
        'Complex stakeholder management across departments',
    ];

    const solutions = [
        { title: 'Outcome attribution', desc: 'Connect launches to revenue and retention. Prove ROI to leadership.', icon: <BarChart3 className="w-5 h-5" /> },
        { title: 'Decision audit trails', desc: 'Full history of why decisions were made. Pass any audit.', icon: <FileText className="w-5 h-5" /> },
        { title: 'Role-based permissions', desc: 'Fine-grained access control for different teams and departments.', icon: <Users className="w-5 h-5" /> },
        { title: 'Enterprise security', desc: 'SSO, SOC2 compliance (coming soon), and data encryption.', icon: <Shield className="w-5 h-5" /> },
    ];

    const securityFeatures = [
        { title: 'Data Encryption', desc: 'AES-256 at rest, TLS 1.3 in transit', status: '✅ Available' },
        { title: 'SSO Support', desc: 'SAML 2.0 integration', status: '🔜 Coming Q1' },
        { title: 'SOC2 Type II', desc: 'Annual compliance certification', status: '🔜 Coming Q2' },
        { title: 'Data Residency', desc: 'US and EU hosting options', status: '🔜 Coming Q2' },
        { title: 'Audit Logs', desc: 'Complete activity tracking', status: '✅ Available' },
        { title: 'Role-Based Access', desc: 'Fine-grained permissions', status: '✅ Available' },
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

                {/* Hero */}
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2E475D] to-[#516F90] flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A] mb-4">
                        SignalsLoop for Enterprise
                    </h1>
                    <p className="text-2xl text-[#2E475D] font-medium mb-6">Governance meets agility</p>
                    <p className="text-lg text-[#5C5C57] leading-relaxed max-w-2xl mx-auto mb-8">
                        Large organizations need rigor without bureaucracy. SignalsLoop provides the audit trails, role-based access, and outcome attribution that enterprise product teams need.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                            Try Premium <ArrowRight className="inline w-4 h-4 ml-2" />
                        </Link>
                        <Link href="/support" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                            Contact Sales
                        </Link>
                    </div>
                </div>

                {/* Premium Pricing */}
                <div className="max-w-xl mx-auto mb-20 p-8 rounded-2xl bg-white border-2 border-[#2E475D] shadow-lg text-center">
                    <div className="text-sm font-bold text-[#2E475D] uppercase tracking-wider mb-2">Enterprise-Ready</div>
                    <div className="font-[family-name:var(--font-fraunces)] text-5xl font-bold text-[#2D2D2A] mb-2">$79<span className="text-xl text-[#8A8A85]">/mo</span></div>
                    <p className="text-[#5C5C57] mb-6">Premium plan with full enterprise features</p>
                    <ul className="text-left space-y-3 mb-6">
                        {['10 team members', 'Unlimited projects', 'All 12 AI agents', 'Go/No-Go Dashboards', 'Outcome Attribution', 'Linear & Webhooks', 'Priority support (24hr)'].map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-[#5C5C57]">
                                <span className="text-[#4A6741]">✓</span> {f}
                            </li>
                        ))}
                    </ul>
                    <Link href="/signup" className="block w-full py-3 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                        Start Premium Trial
                    </Link>
                </div>

                {/* Challenges vs Solutions */}
                <div className="max-w-5xl mx-auto mb-20 grid md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-2xl border-2 border-slate-200 bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wider mb-6">🏢 Enterprise Challenges</h2>
                        <ul className="space-y-4">
                            {challenges.map((c, i) => (
                                <li key={i} className="flex items-start gap-3 text-[#5C5C57]">
                                    <span className="text-slate-400 mt-1">•</span>
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

                {/* Security & Compliance */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Security & Compliance</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        {securityFeatures.map((f, i) => (
                            <div key={i} className="bg-white rounded-xl p-5 border border-black/[0.06]">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-[#2D2D2A]">{f.title}</h3>
                                    <span className="text-xs">{f.status}</span>
                                </div>
                                <p className="text-sm text-[#8A8A85]">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Case Study */}
                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#2E475D] mb-4">Case Study: Enterprise SaaS</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">
                        "Finally, we can show the board exactly how product decisions map to business outcomes"
                    </h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        A public enterprise SaaS company used SignalsLoop's outcome attribution to demonstrate $2.3M in retained revenue from features built based on feedback analysis. Their CPO now presents this data to the board quarterly.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#E8EEF2]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2E475D]">$2.3M</div>
                            <div className="text-xs text-[#8A8A85]">revenue attributed</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">100%</div>
                            <div className="text-xs text-[#8A8A85]">board visibility</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">Quarterly</div>
                            <div className="text-xs text-[#8A8A85]">reporting cadence</div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">Ready for enterprise-grade product intelligence?</h2>
                    <p className="text-lg text-white/60 mb-8">Premium plan at $79/mo. Contact us for custom enterprise plans.</p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link href="/signup" className="px-8 py-4 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">Try Premium →</Link>
                        <Link href="/support" className="px-8 py-4 text-[15px] font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all">Contact Sales</Link>
                    </div>
                </div>
            </div>

            <SiteFooter />
        </div>
    );
}
