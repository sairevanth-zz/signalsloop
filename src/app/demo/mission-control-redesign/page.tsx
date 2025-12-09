'use client';

/**
 * Mission Control Redesign Mockup - Final Hybrid Design
 * 
 * Combines Design 1 (Command Center) structure with Design 2's warmth:
 * - Horizontal metrics strip at top
 * - Command bar for feature navigation
 * - AI Briefing hero (60%) + Attention Stack (40%)
 * - Tabbed deep-dive sections
 * - Floating Ask AI button
 */

import { useState } from 'react';
import {
    Heart, Zap, Activity, AlertTriangle, Play, Pause, RefreshCw,
    ChevronRight, BarChart3, Target, Shield, Brain, Radio,
    CheckCircle2, Clock, TrendingUp, FileBarChart, Bell,
    MessageSquare, Map, Users, Sparkles, Inbox, Swords,
    TrendingDown, Minus, Send, Loader2, X
} from 'lucide-react';

// Metric Strip Component
function MetricStrip() {
    const metrics = [
        { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20', label: 'Sentiment', value: '72', trend: 'up', change: '+5%' },
        { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Feedback/wk', value: '42', trend: 'up', change: '12/wk' },
        { icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Health Score', value: '85', trend: 'stable', change: '' },
        { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Active Alerts', value: '2', trend: 'down', change: '' },
    ];

    return (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 backdrop-blur-sm overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-slate-800/50">
                {metrics.map((metric, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                        <div className={`w-12 h-12 rounded-xl ${metric.bg} flex items-center justify-center`}>
                            <metric.icon className={`w-6 h-6 ${metric.color}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-white">{metric.value}</span>
                                {metric.trend === 'up' && <span className="text-green-400 text-xs flex items-center"><TrendingUp className="w-3 h-3" />{metric.change}</span>}
                                {metric.trend === 'down' && <span className="text-red-400 text-xs flex items-center"><TrendingDown className="w-3 h-3" /></span>}
                                {i === 0 && <Radio className="w-3 h-3 text-green-500 animate-pulse ml-1" />}
                            </div>
                            <span className="text-sm text-slate-400">{metric.label}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Command Bar Component
function CommandBar() {
    const items = [
        { icon: MessageSquare, label: 'Feedback Board', color: 'text-green-400' },
        { icon: Map, label: 'Roadmap', color: 'text-blue-400' },
        { icon: Users, label: 'Stakeholder Intel', color: 'text-purple-400', badge: 'NEW' },
        { icon: Sparkles, label: 'Predictions', color: 'text-pink-400' },
        { icon: Inbox, label: 'Inbox', color: 'text-green-400' },
        { icon: AlertTriangle, label: 'Churn Radar', color: 'text-red-400' },
        { icon: Swords, label: 'War Room', color: 'text-orange-400' },
        { icon: Shield, label: 'Competitive', color: 'text-purple-400' },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {items.map((item, i) => (
                <button
                    key={i}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-all group"
                >
                    <item.icon className={`w-4 h-4 ${item.color} group-hover:text-white transition-colors`} />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                    {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-500 text-white">
                            {item.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// AI Briefing Hero Component
function BriefingHero() {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800/50 to-slate-900 border border-slate-700/50 p-6 h-full flex flex-col">
            {/* Header with warm greeting */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Good evening, Revanth 👋</h2>
                        <p className="text-sm text-slate-400">Daily Intelligence Briefing • December 8, 2024</p>
                    </div>
                </div>
                <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {/* Briefing Summary */}
            <div className="mb-6 flex-1">
                <p className="text-slate-300 leading-relaxed">
                    <span className="text-blue-400 font-medium">Strong week overall.</span> Customer sentiment is up 5% driven by the new onboarding flow.
                    Two feature requests emerged as high-priority: dark mode support and API rate limiting improvements.
                    The competitive landscape shifted with Competitor A releasing a similar feature.
                </p>
            </div>

            {/* Key Highlights */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">Top Win</span>
                    </div>
                    <p className="text-sm text-white">Onboarding NPS hit 72</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-blue-400">Focus</span>
                    </div>
                    <p className="text-sm text-white">Dark mode request surge</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-orange-400">Watch</span>
                    </div>
                    <p className="text-sm text-white">Competitor A launch</p>
                </div>
            </div>

            {/* Audio Player - Design 2 style (more prominent) */}
            <div className="relative rounded-2xl bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 border border-purple-500/30 p-5 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
                <div className="relative flex items-center gap-5">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/25 hover:scale-105 transition-transform"
                    >
                        {isPlaying ? (
                            <Pause className="w-6 h-6 text-white" />
                        ) : (
                            <Play className="w-6 h-6 text-white ml-0.5" />
                        )}
                    </button>
                    <div className="flex-1">
                        <div className="text-white font-medium mb-2">Listen to your briefing</div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full w-1/4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
                            </div>
                            <span className="text-sm text-slate-500">2:15</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Attention Stack Component
function AttentionStack() {
    const items = [
        { type: 'critical', category: 'Critical', title: '2 High-Priority Threats', desc: 'Login failures up 40% in last 2 hours', time: '2 min ago' },
        { type: 'warning', category: 'Actions Due', title: '3 Items in Action Queue', desc: 'Review and prioritize user feedback', time: 'Due today' },
        { type: 'info', category: 'Ready', title: 'Weekly Insight Report', desc: 'New patterns detected in user behavior', time: 'Generated today' },
    ];

    const styles: Record<string, { bg: string; border: string; dot: string; label: string }> = {
        critical: { bg: 'bg-red-950/30', border: 'border-red-500/30 hover:border-red-500/50', dot: 'bg-red-500 animate-pulse', label: 'text-red-400' },
        warning: { bg: 'bg-amber-950/20', border: 'border-amber-500/20 hover:border-amber-500/40', dot: 'bg-amber-500', label: 'text-amber-400' },
        info: { bg: 'bg-blue-950/20', border: 'border-blue-500/20 hover:border-blue-500/40', dot: 'bg-blue-500', label: 'text-blue-400' },
    };

    return (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/50 p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400" />
                    Needs Attention
                </h3>
                <span className="text-xs text-slate-500">3 items</span>
            </div>

            <div className="space-y-3 flex-1">
                {items.map((item, i) => {
                    const style = styles[item.type];
                    return (
                        <div key={i} className={`p-4 rounded-xl ${style.bg} border ${style.border} transition-colors cursor-pointer group`}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                                <span className={`text-xs font-medium ${style.label} uppercase tracking-wide`}>{item.category}</span>
                            </div>
                            <h4 className="text-white font-medium mb-1">{item.title}</h4>
                            <p className="text-sm text-slate-400 mb-2">{item.desc}</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {item.time}
                                </div>
                                <ChevronRight className={`w-4 h-4 text-slate-500 group-hover:${style.label.replace('text-', 'text-')} transition-colors`} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <button className="w-full mt-4 py-3 text-sm text-slate-400 hover:text-white transition-colors border border-slate-800 rounded-xl hover:bg-slate-800/50">
                View All Notifications →
            </button>
        </div>
    );
}

// Dashboard Tabs Component
function DashboardTabs() {
    const [activeTab, setActiveTab] = useState('insights');

    const tabs = [
        { id: 'insights', label: 'Insights', icon: FileBarChart },
        { id: 'roadmap', label: 'Roadmap', icon: BarChart3 },
        { id: 'threats', label: 'Threats', icon: Shield },
        { id: 'competitive', label: 'Competitive', icon: Target },
    ];

    return (
        <div className="mt-6">
            {/* Tab Navigation */}
            <div className="border-b border-slate-800 mb-6">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content Preview */}
            <div className="grid grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50">
                    <div className="flex items-center gap-2 mb-4">
                        <FileBarChart className="w-5 h-5 text-blue-400" />
                        <h4 className="font-medium text-white">Weekly Report</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">AI-generated insights from your data</p>
                    <div className="text-xs text-slate-500">Last updated 2h ago</div>
                </div>
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <h4 className="font-medium text-white">Sentiment Forecast</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">7-day predictive analysis</p>
                    <div className="text-xs text-slate-500">Updated hourly</div>
                </div>
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <h4 className="font-medium text-white">Signal Correlations</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">Cross-data pattern analysis</p>
                    <div className="text-xs text-slate-500">3 new patterns found</div>
                </div>
            </div>
        </div>
    );
}

// Floating Ask AI Button
function FloatingAskAI() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 max-h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-purple-500/10 z-50 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-purple-600/20 to-blue-600/20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Ask AI</h3>
                                <p className="text-xs text-slate-400">Powered by GPT-4</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                    <div className="flex-1 p-4 min-h-[200px]">
                        <div className="text-center py-8">
                            <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">Ask me anything about your product</p>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Ask a question..."
                                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                            <button className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 z-50 group">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="relative w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                        {isOpen ? <X className="w-6 h-6 text-white" /> : <Brain className="w-6 h-6 text-white" />}
                    </div>
                    {!isOpen && <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 animate-ping opacity-30" />}
                </div>
            </button>
        </>
    );
}

// Main Page Component
export default function MissionControlRedesignPage() {
    return (
        <div className="min-h-screen bg-[#0a0e1a] p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    Mission Control
                    <span className="ml-auto text-sm font-normal text-slate-400">Hybrid Design Preview</span>
                </h1>
            </div>

            <div className="space-y-6">
                {/* Row 1: Metric Strip */}
                <MetricStrip />

                {/* Row 2: Command Bar */}
                <CommandBar />

                {/* Row 3: Hero Zone - Briefing + Attention Stack */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <BriefingHero />
                    </div>
                    <div className="lg:col-span-2">
                        <AttentionStack />
                    </div>
                </div>

                {/* Row 4: Dashboard Tabs */}
                <DashboardTabs />
            </div>

            {/* Floating Ask AI */}
            <FloatingAskAI />
        </div>
    );
}
