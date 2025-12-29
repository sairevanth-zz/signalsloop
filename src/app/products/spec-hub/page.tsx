'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, FileText, Zap, CheckCircle, Clock, Code, Link2 } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function SpecHubPage() {
    const features = [
        { icon: <Clock className="w-6 h-6" />, title: '30-Second Generation', desc: 'Complete PRD from idea to spec in under a minute. No more 4-hour writing sessions.' },
        { icon: <FileText className="w-6 h-6" />, title: 'Evidence-Based Specs', desc: 'Automatically cite feedback sources in your specs. Every claim backed by user data.' },
        { icon: <CheckCircle className="w-6 h-6" />, title: 'User Story Generation', desc: 'Auto-generated "As a [user], I want [goal], so that [benefit]" format stories.' },
        { icon: <Zap className="w-6 h-6" />, title: 'Acceptance Criteria', desc: 'Testable scenarios for each user story, ready for QA review.' },
        { icon: <Link2 className="w-6 h-6" />, title: 'One-Click Jira Export', desc: 'Push specs directly to Jira as epics and stories. No copy-paste needed.' },
        { icon: <Code className="w-6 h-6" />, title: 'Version History', desc: 'Track spec changes and iterations over time. Never lose previous versions.' },
    ];

    const workflow = [
        { step: 1, title: 'Select Feedback', desc: 'Choose the feedback items you want to address' },
        { step: 2, title: 'Click Generate', desc: 'AI analyzes and structures the requirements' },
        { step: 3, title: 'Review & Edit', desc: 'Refine the generated spec with your insights' },
        { step: 4, title: 'Export to Jira', desc: 'One-click export to your project management tool' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
            <SiteNav />
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
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C2703D] to-[#D4886A] flex items-center justify-center text-4xl mb-6">✏️</div>
                            <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A] mb-4">
                                Spec Hub
                            </h1>
                            <p className="text-2xl text-[#C2703D] font-medium mb-6">PRDs in 30 seconds, not 4 hours</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                Transform your feedback into shippable specifications instantly. Our Spec Writer Agent generates complete PRDs with problem statements, user stories, and acceptance criteria—ready for Jira export.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start Free <ArrowRight className="inline w-4 h-4 ml-2" />
                                </Link>
                                <Link href="/demo/spec" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    Try Demo
                                </Link>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-lg">
                            <div className="text-center mb-6">
                                <div className="font-[family-name:var(--font-fraunces)] text-6xl font-bold text-[#C2703D]">4hrs</div>
                                <div className="text-[#5C5C57]">saved per spec</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-[#FFFAF5] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">30s</div>
                                    <div className="text-sm text-[#8A8A85]">generation</div>
                                </div>
                                <div className="p-4 bg-[#FFFAF5] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">1-click</div>
                                    <div className="text-sm text-[#8A8A85]">Jira export</div>
                                </div>
                                <div className="p-4 bg-[#FFFAF5] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">10/mo</div>
                                    <div className="text-sm text-[#8A8A85]">Pro plan</div>
                                </div>
                                <div className="p-4 bg-[#FFFAF5] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">30/mo</div>
                                    <div className="text-sm text-[#8A8A85]">Premium</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Before/After */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Before & After SignalsLoop</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl border-2 border-red-200 bg-red-50">
                            <div className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4">❌ Before</div>
                            <ul className="space-y-3 text-[#5C5C57]">
                                <li className="flex items-start gap-2"><span className="text-red-400 mt-1">•</span> 4+ hours writing each PRD</li>
                                <li className="flex items-start gap-2"><span className="text-red-400 mt-1">•</span> Manually searching for supporting data</li>
                                <li className="flex items-start gap-2"><span className="text-red-400 mt-1">•</span> Copy-pasting between tools</li>
                                <li className="flex items-start gap-2"><span className="text-red-400 mt-1">•</span> Inconsistent spec formats</li>
                                <li className="flex items-start gap-2"><span className="text-red-400 mt-1">•</span> Missing acceptance criteria</li>
                            </ul>
                        </div>
                        <div className="p-6 rounded-2xl border-2 border-green-200 bg-green-50">
                            <div className="text-sm font-bold text-green-600 uppercase tracking-wider mb-4">✅ After</div>
                            <ul className="space-y-3 text-[#5C5C57]">
                                <li className="flex items-start gap-2"><span className="text-green-500 mt-1">•</span> 30 seconds to complete PRD</li>
                                <li className="flex items-start gap-2"><span className="text-green-500 mt-1">•</span> Auto-cited feedback evidence</li>
                                <li className="flex items-start gap-2"><span className="text-green-500 mt-1">•</span> One-click Jira export</li>
                                <li className="flex items-start gap-2"><span className="text-green-500 mt-1">•</span> Consistent, professional format</li>
                                <li className="flex items-start gap-2"><span className="text-green-500 mt-1">•</span> AI-generated acceptance criteria</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Workflow */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">How It Works</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        {workflow.map((w) => (
                            <div key={w.step} className="text-center">
                                <div className="w-12 h-12 rounded-full bg-[#FF4F00] text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                                    {w.step}
                                </div>
                                <h3 className="font-semibold text-[#2D2D2A] mb-2">{w.title}</h3>
                                <p className="text-sm text-[#8A8A85]">{w.desc}</p>
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
                                <div className="w-12 h-12 rounded-xl bg-[#FFF5EB] flex items-center justify-center text-[#C2703D] mb-4">
                                    {f.icon}
                                </div>
                                <h3 className="font-semibold text-lg text-[#2D2D2A] mb-2">{f.title}</h3>
                                <p className="text-[15px] text-[#5C5C57] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Case Study */}
                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#C2703D] mb-4">Case Study</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">
                        "Our engineering team finally trusts PM specs because they're backed by real data"
                    </h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        A Series A startup reduced their PRD creation time from 4 hours to 30 minutes by using SignalsLoop's Spec Writer. More importantly, engineering velocity increased 23% because specs now include acceptance criteria and are backed by actual user feedback.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#FFFAF5]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#C2703D]">87%</div>
                            <div className="text-xs text-[#8A8A85]">time saved</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">23%</div>
                            <div className="text-xs text-[#8A8A85]">velocity increase</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">100%</div>
                            <div className="text-xs text-[#8A8A85]">specs with AC</div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">
                        Write better specs in less time
                    </h2>
                    <p className="text-lg text-white/60 mb-8">Pro plan includes 10 AI specs per month.</p>
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

            {/* Footer */}
            <SiteFooter />
        </div>
    );
}
