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

                {/* Hero with UI Mockup */}
                <div className="max-w-6xl mx-auto mb-16">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2E475D] to-[#516F90] flex items-center justify-center mb-6">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#2D2D2A] mb-4">
                                SignalsLoop for Enterprise
                            </h1>
                            <p className="text-xl text-[#2E475D] font-medium mb-4">Governance meets agility</p>
                            <p className="text-[17px] text-[#5C5C57] leading-relaxed mb-6">
                                Large organizations need rigor without bureaucracy. SignalsLoop provides the audit trails, role-based access, and outcome attribution that enterprise product teams need.
                            </p>

                            {/* Premium Tier Callout */}
                            <div className="p-4 rounded-xl bg-[#E8EEF2] mb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#2E475D]">For Growing Teams</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#2D2D2A]">$79<span className="text-base font-normal text-[#5C5C57]">/mo</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-[#5C5C57]">
                                    <span>✓ 10 team members</span>
                                    <span>✓ Unlimited projects</span>
                                    <span>✓ Go/No-Go Dashboards</span>
                                    <span>✓ Outcome Attribution</span>
                                    <span>✓ Linear & Webhooks</span>
                                    <span>✓ Priority support (24hr)</span>
                                </div>
                            </div>

                            <div className="flex gap-4 flex-wrap">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Try Premium →
                                </Link>
                                <Link href="/support" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    Contact Sales
                                </Link>
                            </div>
                        </div>

                        {/* Outcome Attribution Mockup */}
                        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-lg overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8F8F8] border-b border-black/[0.06]">
                                <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#27CA40]"></span>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-semibold text-[#2D2D2A]">Outcome Attribution</h3>
                                    <span className="px-2 py-1 bg-[#E8F0E8] rounded-full text-[10px] font-medium text-[#4A6741]">Premium</span>
                                </div>

                                <div className="mb-5">
                                    <p className="text-[10px] text-[#8A8A85] uppercase tracking-wider mb-1">Revenue Attributed to Feedback</p>
                                    <p className="font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#4A6741]">$2.3M</p>
                                    <div className="mt-2 h-2 bg-[#E8F0E8] rounded-full overflow-hidden">
                                        <div className="h-full w-3/4 bg-[#4A6741] rounded-full"></div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-3 p-3 bg-[#F0F5E8] rounded-lg border border-[#4A6741]/10">
                                        <span className="w-6 h-6 rounded bg-[#4A6741] flex items-center justify-center text-white text-xs">✓</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#2D2D2A]">API v2 shipped → $847K retained</p>
                                            <p className="text-[10px] text-[#8A8A85]">Linked to 147 feedback items • Jan 15</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-black/[0.06]">
                                        <span className="w-6 h-6 rounded bg-[#4A6741] flex items-center justify-center text-white text-xs">✓</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#2D2D2A]">Dark mode → 23% adoption</p>
                                            <p className="text-[10px] text-[#8A8A85]">Prediction was 31% • Jan 8</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-black/[0.06]">
                                        <span className="w-6 h-6 rounded bg-[#8A8A85] flex items-center justify-center text-white text-xs">📋</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#5C5C57]">Decision audit trail available</p>
                                            <p className="text-[10px] text-[#8A8A85]">Full history of why decisions were made</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D2D2A] rounded-full text-xs text-white">
                                        <span>📊</span> Show the board exactly how product drives revenue
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security & Compliance */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Security & Compliance</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-black/[0.06] text-center">
                            <div className="text-3xl mb-2">🔐</div>
                            <h3 className="font-semibold text-[#2D2D2A] mb-1">Data Encryption</h3>
                            <p className="text-xs text-[#4A6741] font-medium mb-1">✓ Available</p>
                            <p className="text-xs text-[#8A8A85]">AES-256 at rest, TLS 1.3 in transit</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-black/[0.06] text-center">
                            <div className="text-3xl mb-2">🌍</div>
                            <h3 className="font-semibold text-[#2D2D2A] mb-1">Data Residency</h3>
                            <p className="text-xs text-[#FF4F00] font-medium mb-1">Coming soon</p>
                            <p className="text-xs text-[#8A8A85]">US and EU hosting options</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-black/[0.06] text-center">
                            <div className="text-3xl mb-2">📋</div>
                            <h3 className="font-semibold text-[#2D2D2A] mb-1">Audit Logs</h3>
                            <p className="text-xs text-[#4A6741] font-medium mb-1">✓ Available</p>
                            <p className="text-xs text-[#8A8A85]">Complete activity tracking</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-black/[0.06] text-center">
                            <div className="text-3xl mb-2">👥</div>
                            <h3 className="font-semibold text-[#2D2D2A] mb-1">Role-Based Access</h3>
                            <p className="text-xs text-[#4A6741] font-medium mb-1">✓ Available</p>
                            <p className="text-xs text-[#8A8A85]">Fine-grained permissions</p>
                        </div>
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
