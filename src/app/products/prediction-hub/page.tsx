'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, TrendingUp, BarChart3, AlertTriangle, DollarSign, Target, History } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';

export default function PredictionHubPage() {
    const features = [
        { icon: <TrendingUp className="w-6 h-6" />, title: 'Feature Success Prediction', desc: 'ML-based scoring predicts which features will succeed before you build them.' },
        { icon: <BarChart3 className="w-6 h-6" />, title: 'Adoption Forecasting', desc: 'Estimate usage rates 30+ days in advance. Know if a feature will get traction.' },
        { icon: <AlertTriangle className="w-6 h-6" />, title: 'Churn Radar', desc: 'Identify at-risk customers based on feedback patterns and sentiment shifts.' },
        { icon: <DollarSign className="w-6 h-6" />, title: 'Revenue Impact', desc: 'Calculate potential revenue from each feature based on requesting customers.' },
        { icon: <Target className="w-6 h-6" />, title: 'Confidence Intervals', desc: 'Understand prediction certainty levels. High, medium, or low confidence.' },
        { icon: <History className="w-6 h-6" />, title: 'Historical Validation', desc: 'Compare predictions against actual outcomes to improve accuracy over time.' },
    ];

    const predictions = [
        { feature: 'Dark Mode', adoption: 78, confidence: 'High', revenue: '$12K MRR', status: 'Recommended' },
        { feature: 'CSV Export', adoption: 45, confidence: 'Medium', revenue: '$5K MRR', status: 'Consider' },
        { feature: 'Mobile App', adoption: 23, confidence: 'Low', revenue: '$2K MRR', status: 'Needs Research' },
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
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4A6741] to-[#6B8E6B] flex items-center justify-center text-4xl mb-6">🔮</div>
                            <div className="flex items-center gap-2 mb-4">
                                <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">Prediction Hub</h1>
                                <span className="px-2 py-0.5 bg-[#E8F0E8] rounded-full text-[10px] font-bold text-[#4A6741]">🤖 AI-Powered</span>
                            </div>
                            <p className="text-2xl text-[#4A6741] font-medium mb-6">Know before you build</p>
                            <p className="text-lg text-[#5C5C57] leading-relaxed mb-8">
                                Stop guessing which features will succeed. Our Predictor Agent forecasts adoption rates, churn impact, and revenue potential—so you can prioritize with confidence.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <Link href="/signup" className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                                    Start Free <ArrowRight className="inline w-4 h-4 ml-2" />
                                </Link>
                                <Link href="/demo/health-score" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] border-2 border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                                    Try Demo
                                </Link>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-lg">
                            <div className="text-center mb-6">
                                <div className="font-[family-name:var(--font-fraunces)] text-6xl font-bold text-[#4A6741]">85%</div>
                                <div className="text-[#5C5C57]">prediction accuracy</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-[#E8F0E8] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">30+</div>
                                    <div className="text-sm text-[#8A8A85]">days forecast</div>
                                </div>
                                <div className="p-4 bg-[#E8F0E8] rounded-xl">
                                    <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">$12M+</div>
                                    <div className="text-sm text-[#8A8A85]">decisions informed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sample Predictions */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Sample Feature Predictions</h2>
                    <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-lg">
                        <div className="grid grid-cols-5 bg-[#E8F0E8] p-4 font-bold text-sm text-[#2D2D2A]">
                            <div>Feature</div>
                            <div className="text-center">Predicted Adoption</div>
                            <div className="text-center">Confidence</div>
                            <div className="text-center">Revenue Impact</div>
                            <div className="text-center">Recommendation</div>
                        </div>
                        {predictions.map((p, i) => (
                            <div key={i} className="grid grid-cols-5 p-4 border-t border-black/[0.06] items-center hover:bg-[#FFFAF5] transition-colors">
                                <div className="font-medium text-[#2D2D2A]">{p.feature}</div>
                                <div className="text-center">
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                        <div className="bg-[#4A6741] h-2 rounded-full" style={{ width: `${p.adoption}%` }}></div>
                                    </div>
                                    <span className="text-xs text-[#8A8A85]">{p.adoption}%</span>
                                </div>
                                <div className="text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.confidence === 'High' ? 'bg-green-100 text-green-700' :
                                        p.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                        {p.confidence}
                                    </span>
                                </div>
                                <div className="text-center text-[#4A6741] font-semibold">{p.revenue}</div>
                                <div className="text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.status === 'Recommended' ? 'bg-green-100 text-green-700' :
                                        p.status === 'Consider' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-sm text-[#8A8A85] mt-4">* Based on aggregated feedback, sentiment analysis, and customer revenue data</p>
                </div>

                {/* Features */}
                <div className="max-w-6xl mx-auto mb-20">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-12">Key Features</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-black/[0.06] hover:shadow-lg hover:-translate-y-1 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-[#E8F0E8] flex items-center justify-center text-[#4A6741] mb-4">
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
                    <div className="text-xs font-bold uppercase tracking-wider text-[#4A6741] mb-4">Case Study</div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-4">
                        "The prediction saved us 3 months of wasted development"
                    </h3>
                    <p className="text-[#5C5C57] leading-relaxed mb-6">
                        A productivity SaaS was about to build a complex calendar integration. SignalsLoop's prediction showed only 12% expected adoption with low confidence. They pivoted to keyboard shortcuts instead—which achieved 67% adoption in week one.
                    </p>
                    <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-[#E8F0E8]">
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">3mo</div>
                            <div className="text-xs text-[#8A8A85]">dev time saved</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#4A6741]">67%</div>
                            <div className="text-xs text-[#8A8A85]">actual adoption</div>
                        </div>
                        <div className="text-center">
                            <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">$150K</div>
                            <div className="text-xs text-[#8A8A85]">saved in costs</div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">
                        Predict feature success with AI
                    </h2>
                    <p className="text-lg text-white/60 mb-8">Available on Pro and Premium plans.</p>
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
