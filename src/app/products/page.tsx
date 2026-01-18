'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, Target, Bot, Brain, Zap, BarChart3, Users, FileText, Shield, Lightbulb, TrendingUp } from 'lucide-react';
import { SiteNav } from '@/components/SiteNav';

export default function ProductsPage() {
    const products = [
        {
            id: 'feedback-hub',
            icon: '📬',
            emoji: '🎯',
            name: 'Feedback Hub',
            tagline: 'Discover what users actually want',
            description: 'Stop missing critical feedback buried across 12+ tools. Our Hunter Agent scans Reddit, HN, G2, App Store, Intercom, and more—automatically categorizing and deduplicating signals so you never miss what matters.',
            color: 'from-[#FF4F00] to-[#FF6B26]',
            features: [
                { title: 'Multi-Platform Hunting', desc: 'Scan 8+ platforms including Reddit, HN, G2, Twitter, App Store, Product Hunt' },
                { title: 'AI Categorization', desc: 'Automatically tag feedback as bug, feature request, praise, or question' },
                { title: 'Smart Deduplication', desc: 'Vector-based similarity detection merges duplicate requests' },
                { title: 'Revenue Weighting', desc: 'Priority scores factor in MRR and account tier' },
                { title: 'Sentiment Analysis', desc: 'Track positive, negative, and neutral sentiment over time' },
                { title: 'Source Attribution', desc: 'Know exactly where each piece of feedback originated' },
            ],
            metrics: [
                { value: '14K+', label: 'signals hunted weekly' },
                { value: '8', label: 'platforms connected' },
                { value: '93%', label: 'accuracy rate' },
            ],
        },
        {
            id: 'spec-hub',
            icon: '✏️',
            emoji: '📄',
            name: 'Spec Hub',
            tagline: 'PRDs in 30 seconds, not 4 hours',
            description: 'Transform your feedback into shippable specifications instantly. Our Spec Writer Agent generates complete PRDs with problem statements, user stories, and acceptance criteria—ready for Jira export.',
            color: 'from-[#C2703D] to-[#D4886A]',
            features: [
                { title: '30-Second Generation', desc: 'Complete PRD from idea to spec in under a minute' },
                { title: 'Evidence-Based Specs', desc: 'Automatically cite feedback sources in your specs' },
                { title: 'User Story Generation', desc: 'As a [user], I want [goal], so that [benefit]' },
                { title: 'Acceptance Criteria', desc: 'Testable scenarios for each user story' },
                { title: 'One-Click Jira Export', desc: 'Push specs directly to Jira as epics and stories' },
                { title: 'Version History', desc: 'Track spec changes and iterations over time' },
            ],
            metrics: [
                { value: '30s', label: 'avg generation time' },
                { value: '4hrs', label: 'saved per spec' },
                { value: '1-click', label: 'Jira export' },
            ],
        },
        {
            id: 'prediction-hub',
            icon: '🔮',
            emoji: '📈',
            name: 'Prediction Hub',
            tagline: 'Know before you build',
            description: 'Stop guessing which features will succeed. Our Predictor Agent forecasts adoption rates, churn impact, and revenue potential—so you can prioritize with confidence.',
            color: 'from-[#4A6741] to-[#6B8E6B]',
            features: [
                { title: 'Feature Success Prediction', desc: 'ML-based scoring predicts launch outcomes' },
                { title: 'Adoption Forecasting', desc: 'Estimate usage rates 30+ days in advance' },
                { title: 'Churn Radar', desc: 'Identify at-risk customers before they leave' },
                { title: 'Revenue Impact', desc: 'Calculate potential revenue from each feature' },
                { title: 'Confidence Intervals', desc: 'Understand prediction certainty levels' },
                { title: 'Historical Validation', desc: 'Compare predictions against actual outcomes' },
            ],
            metrics: [
                { value: '30+', label: 'days forecast' },
                { value: '85%', label: 'prediction accuracy' },
                { value: '$12M+', label: 'decisions informed' },
            ],
        },
        {
            id: 'experiments-hub',
            icon: '🧪',
            emoji: '🎯',
            name: 'Experiments Hub',
            tagline: 'Ship with confidence, not guesswork',
            description: 'Full A/B testing and experimentation platform built right in. Run tests, manage feature flags, track real-time results—all without paying $200+/month for a separate tool.',
            color: 'from-[#FF4F00] to-[#FF6B26]',
            features: [
                { title: 'A/B & Multivariate Testing', desc: 'Test any element—headlines, CTAs, layouts, pricing' },
                { title: 'Visual Editor', desc: 'Point-and-click changes without writing code' },
                { title: 'Feature Flags', desc: 'Roll out gradually with percentage-based targeting' },
                { title: 'Real-time Results', desc: 'Watch conversions and confidence update live' },
                { title: 'User Targeting', desc: 'Target by plan, country, device, or custom attribute' },
                { title: 'JavaScript SDK', desc: 'One script tag, auto-tracking built in' },
            ],
            metrics: [
                { value: '+34%', label: 'avg conversion lift' },
                { value: '2 min', label: 'setup time' },
                { value: '$0', label: 'extra cost' },
            ],
        },
        {
            id: 'insights-hub',
            icon: '📊',
            emoji: '💡',
            name: 'Insights Hub',
            tagline: 'See the patterns humans miss',
            description: 'Our Theme Detector and Sentiment Forecaster surface hidden patterns in your feedback—clustering themes, tracking trends, and generating weekly AI briefings.',
            color: 'from-[#0091AE] to-[#00BDA5]',
            features: [
                { title: 'Theme Detection', desc: 'Automatic clustering reveals emerging topics' },
                { title: 'Sentiment Forecasting', desc: 'Predict how sentiment will trend over 7-30 days' },
                { title: 'Anomaly Alerts', desc: 'Get notified when feedback patterns shift' },
                { title: 'Weekly AI Briefings', desc: 'Audio summaries of what happened this week' },
                { title: 'Trend Visualization', desc: 'Charts showing theme growth and decline' },
                { title: 'Comparative Analysis', desc: 'Compare periods to spot changes' },
            ],
            metrics: [
                { value: 'Weekly', label: 'AI briefings' },
                { value: '7-30d', label: 'sentiment forecast' },
                { value: 'Real-time', label: 'anomaly detection' },
            ],
        },
        {
            id: 'advocate-hub',
            icon: '😈',
            emoji: '⚔️',
            name: 'Advocate Hub',
            tagline: 'Challenge your assumptions',
            description: "The Devil's Advocate Agent stress-tests your specs and roadmap decisions. It surfaces risks, data contradictions, and competitive threats you might have missed.",
            color: 'from-[#6A5ACD] to-[#9B8FD9]',
            features: [
                { title: "Devil's Advocate", desc: 'AI challenges your PRDs with hard questions' },
                { title: 'Risk Detection', desc: 'Surface technical, market, and execution risks' },
                { title: 'Data Contradiction Finder', desc: 'Spot when feedback conflicts with decisions' },
                { title: 'Competitive Intel', desc: 'Track competitor launches and feature gaps' },
                { title: 'Assumption Validation', desc: 'Test the hypotheses behind your roadmap' },
                { title: 'Decision Audit Trail', desc: 'Record why you made each call' },
            ],
            metrics: [
                { value: '5+', label: 'risks per spec' },
                { value: 'Real-time', label: 'competitive tracking' },
                { value: '100%', label: 'specs reviewed' },
            ],
        },
        {
            id: 'stakeholder-hub',
            icon: '👥',
            emoji: '📋',
            name: 'Stakeholder Hub',
            tagline: 'Keep everyone aligned',
            description: 'Role-based reporting for CEO, Sales, Engineering, and more. Go/No-Go dashboards, collaborative retrospectives, and real-time launch status—so stakeholders always know where things stand.',
            color: 'from-[#2E475D] to-[#516F90]',
            features: [
                { title: 'Role-Based Reports', desc: 'Custom views for CEO, Sales, Eng, Support' },
                { title: 'Go/No-Go Dashboards', desc: 'Launch readiness with stakeholder votes' },
                { title: 'AI Retrospectives', desc: 'Auto-populated insights from each release' },
                { title: 'Action Tracking', desc: 'Follow up on commitments automatically' },
                { title: 'Outcome Attribution', desc: 'Connect launches to business results' },
                { title: 'Changelog Generation', desc: 'Auto-write release notes for customers' },
            ],
            metrics: [
                { value: '4+', label: 'stakeholder roles' },
                { value: 'Real-time', label: 'status updates' },
                { value: 'Auto', label: 'changelog generation' },
            ],
        },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
            {/* Gradient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-24 -left-36 w-[500px] h-[500px] rounded-full opacity-60"
                    style={{ background: 'linear-gradient(180deg, #FFB088 0%, #FFD4BF 50%, #FFECE0 100%)', filter: 'blur(60px)' }} />
                <div className="absolute top-0 -right-24 w-[450px] h-[450px] rounded-full opacity-60"
                    style={{ background: 'linear-gradient(180deg, #FFE082 0%, #FFF3C4 50%, #FFFBEB 100%)', filter: 'blur(60px)' }} />
            </div>

            <SiteNav />

            <div className="relative z-10 pt-32 pb-20 px-6">
                {/* Header */}
                <div className="max-w-4xl mx-auto text-center mb-20">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#FF4F00]">Products</span>
                        <span className="px-2 py-0.5 bg-[#E8F0E8] rounded-full text-[10px] font-bold text-[#4A6741]">🤖 All AI-Powered</span>
                    </div>
                    <h1 className="font-[family-name:var(--font-fraunces)] font-medium text-[#2D2D2A] mb-6"
                        style={{ fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1.1 }}>
                        Seven hubs. One platform.<br />Complete product intelligence.
                    </h1>
                    <p className="text-xl text-[#5C5C57] max-w-2xl mx-auto">
                        Each hub handles a critical part of the product lifecycle—from discovering signals to predicting outcomes to shipping with confidence.
                    </p>
                </div>

                {/* CORE HUBS — YOUR COMPETITIVE ADVANTAGE */}
                <div className="max-w-7xl mx-auto mb-16">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8A8A85] mb-8 flex items-center gap-2">
                        <span>⭐</span> Core Hubs — Your Competitive Advantage
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.slice(0, 4).map((product) => (
                            <div key={product.id} className="bg-white rounded-2xl p-8 border border-black/[0.06] shadow-sm hover:shadow-lg transition-all relative">
                                <span className="absolute top-6 right-6 px-2 py-0.5 bg-[#FFECE0] rounded text-[10px] font-bold text-[#FF4F00] uppercase">Core</span>
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.color} flex items-center justify-center text-2xl mb-5`}>
                                    {product.icon}
                                </div>
                                <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-2">{product.name}</h2>
                                <p className="text-[#FF4F00] font-medium text-sm mb-3">{product.tagline}</p>
                                <p className="text-[15px] text-[#5C5C57] leading-relaxed mb-6">{product.description}</p>

                                {/* Metrics */}
                                <div className="flex gap-6 mb-6">
                                    {product.metrics.map((m, j) => (
                                        <div key={j}>
                                            <div className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">{m.value}</div>
                                            <div className="text-xs text-[#8A8A85]">{m.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <Link href={`/products/${product.id}`} className="inline-flex items-center gap-1 text-[#FF4F00] font-semibold text-sm hover:gap-2 transition-all">
                                    Learn more <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SUPPORTING HUBS */}
                <div className="max-w-7xl mx-auto mb-16">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8A8A85] mb-6">Supporting Hubs</p>
                    <div className="grid md:grid-cols-3 gap-4">
                        {products.slice(4).map((product) => (
                            <div key={product.id} className="bg-white rounded-xl p-5 border border-black/[0.06] hover:shadow-md transition-all flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center text-xl flex-shrink-0`}>
                                    {product.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#2D2D2A] mb-1">{product.name}</h3>
                                    <p className="text-sm text-[#5C5C57] mb-2">{product.tagline}</p>
                                    <Link href={`/products/${product.id}`} className="inline-flex items-center gap-1 text-[#FF4F00] font-medium text-sm hover:gap-2 transition-all">
                                        Learn more <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Works for teams banner */}
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFFAF5] rounded-full border border-black/[0.06]">
                        <span className="text-[#4A6741]">✓</span>
                        <span className="text-[15px] text-[#5C5C57]">Works for teams of <strong className="text-[#2D2D2A]">1 to 100</strong> . Start free, scale when ready.</span>
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-3xl mx-auto text-center mt-28 p-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-medium text-white mb-4">
                        Stop juggling tools.<br /><span className="text-[#FF4F00]">Start shipping features.</span>
                    </h2>
                    <p className="text-lg text-white/60 mb-8">Start free. No credit card required.</p>
                    <div className="flex justify-center gap-4">
                        <Link href="/signup" className="px-8 py-4 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all">
                            Get Started Free →
                        </Link>
                        <Link href="/pricing" className="px-8 py-4 text-[15px] font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all">
                            View pricing
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
