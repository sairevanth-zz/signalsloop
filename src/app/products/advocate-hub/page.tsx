'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, AlertTriangle, Zap, Eye, Swords, Target, FileQuestion } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function AdvocateHubPage() {
    const features = [
        { icon: <AlertTriangle className="w-6 h-6" />, title: "Devil's Advocate", desc: "AI challenges your PRDs with hard questions before engineering starts." },
        { icon: <Target className="w-6 h-6" />, title: 'Risk Detection', desc: 'Surface technical, market, and execution risks you might have overlooked.' },
        { icon: <FileQuestion className="w-6 h-6" />, title: 'Data Contradiction Finder', desc: 'Spot when user feedback conflicts with your roadmap decisions.' },
        { icon: <Swords className="w-6 h-6" />, title: 'Competitive Intel', desc: 'Track competitor launches and feature gaps in real-time.' },
        { icon: <Eye className="w-6 h-6" />, title: 'Assumption Validation', desc: 'Test the hypotheses behind your roadmap with actual data.' },
        { icon: <Zap className="w-6 h-6" />, title: 'Decision Audit Trail', desc: 'Record why you made each call for future reference.' },
    ];

    const sampleQuestions = [
        "Have you considered that 34% of feedback mentions mobile, but this spec is desktop-only?",
        "Your biggest competitor launched this feature last month. How does your approach differ?",
        "The churn data shows users leave due to complexity. Will this add more complexity?",
        "What's your rollback plan if adoption is below 20% after 30 days?",
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
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6A5ACD] to-[#9B8FD9] flex items-center justify-center text-4xl mb-6">😈</div>
                            <div className="flex items-center gap-2 mb-4">
                                <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">Advocate Hub</h1>
                                <span className="px-2 py-0.5 bg-[#EDE7F6] rounded-full text-[10px] font-bold text-[#6A5ACD]">🤖 AI-Powered</span>
                            </div>
                            <p className="text-2xl text-[#6A5ACD] font-medium mb-6">Challenge your assumptions</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                The Devil's Advocate Agent stress-tests your specs and roadmap decisions. It surfaces risks, data contradictions, and competitive threats you might have missed.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start Free <ArrowRight className="inline w-4 h-4 ml-2" />
                                </Link>
                                <Link href="/demo/competitive-intel" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    Try Demo
                                </Link>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-lg">
                            <div className="text-center mb-6">
                                <div className="font-[family-name:var(--font-fraunces)] text-4xl font-bold text-[#6A5ACD]">5+</div>
                                <div className="text-[#5C5C57]">risks surfaced per spec</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-[#EDE7F6] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">5/mo</div>
                                    <div className="text-xs text-[#8A8A85]">Pro plan</div>
                                </div>
                                <div className="p-4 bg-[#EDE7F6] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">15/mo</div>
                                    <div className="text-xs text-[#8A8A85]">Premium</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Sample Devil's Advocate Questions</h2>
                    <div className="space-y-4">
                        {sampleQuestions.map((q, i) => (
                            <div key={i} className="bg-white rounded-xl p-5 border border-[#6A5ACD]/20 shadow-sm flex items-start gap-4">
                                <span className="text-2xl">🤔</span>
                                <p className="text-[#5C5C57] text-[15px] leading-relaxed italic">"{q}"</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Key Features</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] hover:shadow-lg hover:-translate-y-1 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-[#EDE7F6] flex items-center justify-center text-[#6A5ACD] mb-4">{f.icon}</div>
                                <h3 className="font-semibold text-lg text-[#2D2D2A] mb-2">{f.title}</h3>
                                <p className="text-[15px] text-[#5C5C57] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="max-w-4xl mx-auto mb-20 p-8 rounded-3xl bg-white border border-black/[0.06] shadow-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#6A5ACD] mb-4">Case Study</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">"Devil's Advocate prevented our biggest product mistake of the year"</h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        A fintech company was about to launch a feature that 3 enterprise customers requested loudly. Devil's Advocate showed that 67% of their user base (SMBs) explicitly said they didn't want it. They pivoted to a different priority—one that increased overall NPS by 12 points.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#EDE7F6]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#6A5ACD]">67%</div>
                            <div className="text-xs text-[#8A8A85]">users didn't want it</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">+12</div>
                            <div className="text-xs text-[#8A8A85]">NPS increase</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">$80K</div>
                            <div className="text-xs text-[#8A8A85]">dev saved</div>
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">Challenge every assumption</h2>
                    <p className="text-lg text-white/60 mb-8">Pro plan includes 5 Devil's Advocate analyses per month.</p>
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
