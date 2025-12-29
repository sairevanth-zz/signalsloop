'use client';

import Link from 'next/link';
import Image from 'next/image';

const heroAgents = [
    {
        icon: '🎯',
        name: 'Hunter Agent',
        tag: 'Core Agent',
        tagColor: 'bg-[#FF4F00]/10 text-[#FF4F00]',
        bg: 'linear-gradient(135deg, #FFF8F5 0%, #FFF0E8 100%)',
        border: 'border-[#FF4F00]/15',
        description: 'Autonomously discovers feedback from 8+ platforms. Reddit, Twitter, G2, HackerNews, App Store—all scanned every 30 minutes.',
        features: [
            'Real-time monitoring across 8 platforms',
            'Auto-categorization with AI',
            'Spam & noise filtering',
            'Sentiment detection',
        ],
        stats: [
            { value: '8', label: 'platforms' },
            { value: '30min', label: 'scan interval' },
            { value: '14K+', label: 'signals/week' },
        ],
    },
    {
        icon: '✏️',
        name: 'Spec Writer Agent',
        tag: 'Core Agent',
        tagColor: 'bg-[#4A6741]/10 text-[#4A6741]',
        bg: 'linear-gradient(135deg, #F8FBF8 0%, #EDF5ED 100%)',
        border: 'border-[#4A6741]/15',
        description: 'Generates complete PRDs in 30 seconds. Problem statement, user stories, acceptance criteria—all from your data.',
        features: [
            '30-second PRD generation',
            'Auto-links related feedback',
            'One-click Jira/Linear export',
            'Evidence-backed requirements',
        ],
        stats: [
            { value: '30s', label: 'generation' },
            { value: '1-click', label: 'export' },
            { value: '93%', label: 'time saved' },
        ],
    },
];

const coreAgents = [
    {
        icon: '😈',
        name: "Devil's Advocate",
        color: '#FF4F00',
        description: 'Challenges assumptions before you waste resources. Surfaces risks, gaps, and blind spots in your PRDs.',
        preview: { type: 'alert', text: 'Competitor X launched free tier yesterday' },
    },
    {
        icon: '🔮',
        name: 'Prediction Engine',
        color: '#4A6741',
        description: 'Forecasts feature success before you build. Predicts adoption rates and revenue impact.',
        preview: { type: 'metric', value: '67%', unit: 'predicted adoption' },
    },
    {
        icon: '📡',
        name: 'Churn Radar',
        color: '#C2703D',
        description: 'Predicts at-risk customers 30 days out. Identifies churn signals before they escalate.',
        preview: { type: 'metric', value: '3', unit: 'accounts at risk' },
    },
    {
        icon: '⚔️',
        name: 'Competitive Intel',
        color: '#5C5C57',
        description: 'Tracks competitor moves and threats. Monitors launches, pricing changes, and market shifts.',
        preview: { type: 'text', text: 'Tracking 8 competitors • 1 new threat detected' },
    },
];

const newAgents = [
    {
        icon: '🧠',
        name: 'Knowledge Gap',
        color: '#FF4F00',
        description: 'Identifies missing intel in decisions. Detects blind spots in your product strategy.',
        preview: { type: 'metric', value: '3', unit: 'gaps found in Q4 roadmap' },
    },
    {
        icon: '⚡',
        name: 'Anomaly Detect',
        color: '#C2703D',
        description: 'Flags unusual patterns instantly. Spots feedback spikes and sentiment shifts.',
        preview: { type: 'alert', text: 'Feedback spike: +340% this week' },
    },
    {
        icon: '📈',
        name: 'Sentiment Forecast',
        color: '#4A6741',
        description: 'Predicts sentiment 30 days ahead. Forecast customer satisfaction trends.',
        preview: { type: 'metric', value: '+12%', unit: 'sentiment improvement' },
    },
    {
        icon: '🔄',
        name: 'Strategy Shifts',
        color: '#5C5C57',
        description: 'Detects market & competitor pivots. Identifies emerging trends early.',
        preview: { type: 'text', text: '2 market shifts detected' },
    },
    {
        icon: '🏷️',
        name: 'Theme Detector',
        color: '#4A6741',
        description: 'Clusters feedback into actionable themes. Groups signals by topic automatically.',
        preview: { type: 'text', text: 'Top: Performance (34) • Mobile (28)' },
    },
    {
        icon: '📋',
        name: 'Triager',
        color: '#C2703D',
        description: 'Auto-categorizes and routes feedback. Ensures nothing falls through the cracks.',
        preview: { type: 'text', text: '127 processed • 98% auto-tagged' },
    },
];

export default function AgentsPage() {
    return (
        <div className="min-h-screen" style={{ background: 'var(--cream, #FFFAF5)' }}>
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFAF5]/90 backdrop-blur-lg border-b border-black/[0.03]">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <Image src="/signalsloop-logo-v2.png" alt="SignalsLoop" width={32} height={32} />
                        <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#2D2D2A]">SignalsLoop</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <Link href="/products" className="text-[#5C5C57] hover:text-[#2D2D2A] transition-colors">Products</Link>
                        <Link href="/agents" className="text-[#FF4F00] font-semibold">Agents</Link>
                        <Link href="/solutions" className="text-[#5C5C57] hover:text-[#2D2D2A] transition-colors">Solutions</Link>
                        <Link href="/pricing" className="text-[#5C5C57] hover:text-[#2D2D2A] transition-colors">Pricing</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm font-medium text-[#5C5C57] hover:text-[#2D2D2A] transition-colors">Sign In</Link>
                        <Link href="/signup" className="btn-orange px-5 py-2.5 text-sm text-white rounded-xl font-semibold">Start Free</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF4F00]/10 text-[#FF4F00] text-sm font-semibold mb-6">
                        <span className="w-1.5 h-1.5 bg-[#FF4F00] rounded-full animate-pulse"></span>
                        12 AI Agents Working 24/7
                    </span>
                    <h1 className="font-[family-name:var(--font-fraunces)] font-bold text-[#2D2D2A] mb-6"
                        style={{ fontSize: 'clamp(40px, 6vw, 64px)', lineHeight: 1.1 }}>
                        Your Autonomous<br />
                        <span className="text-[#FF4F00]">Product Intelligence Team</span>
                    </h1>
                    <p className="text-xl text-[#5C5C57] max-w-2xl mx-auto leading-relaxed">
                        Each agent specializes in a critical PM task—hunting signals, writing specs, predicting outcomes, and catching risks before they become problems.
                    </p>
                </div>
            </section>

            {/* Hero Agents */}
            <section className="pb-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-8 text-center">Hero Agents</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {heroAgents.map((agent, i) => (
                            <div key={i} className={`p-8 rounded-3xl border ${agent.border}`} style={{ background: agent.bg }}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="text-5xl">{agent.icon}</div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${agent.tagColor}`}>{agent.tag}</span>
                                </div>
                                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-3">{agent.name}</h3>
                                <p className="text-[15px] text-[#5C5C57] leading-relaxed mb-6">{agent.description}</p>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-[#8A8A85] uppercase tracking-wider mb-3">Key Features</h4>
                                    <ul className="space-y-2">
                                        {agent.features.map((f, j) => (
                                            <li key={j} className="flex items-center gap-2 text-sm text-[#5C5C57]">
                                                <span className="w-1.5 h-1.5 bg-[#4A6741] rounded-full"></span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex gap-6 pt-4 border-t border-black/[0.05]">
                                    {agent.stats.map((s, j) => (
                                        <div key={j}>
                                            <span className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">{s.value}</span>
                                            <span className="text-xs text-[#8A8A85] ml-1">{s.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core Agents */}
            <section className="py-20 px-6" style={{ background: 'linear-gradient(180deg, #FFF5EB 0%, #FFFAF5 100%)' }}>
                <div className="max-w-6xl mx-auto">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-8 text-center">Core Agents</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {coreAgents.map((agent, i) => (
                            <div key={i} className="agent-card bg-white p-6 rounded-2xl shadow-sm">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: agent.color }}>
                                    <span className="text-xl">{agent.icon}</span>
                                </div>
                                <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">{agent.name}</h3>
                                <p className="text-sm text-[#5C5C57] leading-relaxed">{agent.description}</p>
                                <div className="agent-preview">
                                    <div className="preview-label">Live Output</div>
                                    {agent.preview.type === 'metric' && (
                                        <div className="preview-metric">
                                            <span className="preview-metric-value" style={{ color: agent.color }}>{agent.preview.value}</span>
                                            <span className="preview-metric-unit">{agent.preview.unit}</span>
                                        </div>
                                    )}
                                    {agent.preview.type === 'alert' && (
                                        <div className="preview-alert">
                                            <span className="preview-alert-icon">⚠️</span>
                                            <span className="preview-alert-text">{agent.preview.text}</span>
                                        </div>
                                    )}
                                    {agent.preview.type === 'text' && (
                                        <div style={{ fontSize: '12px', color: '#5C5C57', fontWeight: 500 }}>{agent.preview.text}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* New Agents */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                        <span className="inline-block px-4 py-2 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-sm font-semibold mb-4">Recently Added</span>
                        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A]">New Agents</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newAgents.map((agent, i) => (
                            <div key={i} className="agent-card bg-[#E8F0E8]/30 border border-[#4A6741]/10 p-6 rounded-2xl">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: agent.color }}>
                                        <span className="text-xl">{agent.icon}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-[#4A6741]/20 text-[#4A6741] text-[10px] font-bold uppercase">New</span>
                                </div>
                                <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">{agent.name}</h3>
                                <p className="text-sm text-[#5C5C57] leading-relaxed">{agent.description}</p>
                                <div className="agent-preview">
                                    <div className="preview-label">Live Output</div>
                                    {agent.preview.type === 'metric' && (
                                        <div className="preview-metric">
                                            <span className="preview-metric-value" style={{ color: agent.color }}>{agent.preview.value}</span>
                                            <span className="preview-metric-unit">{agent.preview.unit}</span>
                                        </div>
                                    )}
                                    {agent.preview.type === 'alert' && (
                                        <div className="preview-alert" style={{ background: `${agent.color}10`, borderColor: `${agent.color}20` }}>
                                            <span className="preview-alert-icon">📈</span>
                                            <span className="preview-alert-text" style={{ color: agent.color }}>{agent.preview.text}</span>
                                        </div>
                                    )}
                                    {agent.preview.type === 'text' && (
                                        <div style={{ fontSize: '12px', color: '#5C5C57', fontWeight: 500 }}>{agent.preview.text}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6" style={{ background: 'linear-gradient(180deg, #FFFAF5 0%, #FFF5EB 100%)' }}>
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-3xl md:text-4xl font-bold text-[#2D2D2A] mb-6">
                        Put Your AI Team to Work
                    </h2>
                    <p className="text-lg text-[#5C5C57] mb-8">
                        Start with 3 agents on the free plan. Unlock all 12 with Pro.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/signup" className="btn-orange px-8 py-4 text-white rounded-xl font-semibold text-lg">
                            Start Free — No Credit Card
                        </Link>
                        <Link href="/pricing" className="btn-orange-outline px-8 py-4 rounded-xl font-semibold text-lg border-2 border-[#E8E8E6] hover:border-[#FF4F00]">
                            View Pricing
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 px-6 bg-[#2D2D2A]">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2.5">
                            <Image src="/signalsloop-logo-v2.png" alt="SignalsLoop" width={32} height={32} />
                            <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-white">SignalsLoop</span>
                        </div>
                        <p className="text-[#8A8A85] text-sm">© 2025 SignalsLoop. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
