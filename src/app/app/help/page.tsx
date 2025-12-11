'use client';

/**
 * Help Center - Unified Onboarding and Documentation Hub
 * Features categorized guides with links to detailed help pages
 */

import Link from 'next/link';
import GlobalBanner from '@/components/GlobalBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Sparkles,
    MessageSquare,
    TrendingUp,
    Map,
    Brain,
    Zap,
    Target,
    Users,
    Bell,
    FileText,
    ArrowRight,
    Play,
    BookOpen,
    HelpCircle,
    Search
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface FeatureGuide {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    category: 'collect' | 'understand' | 'plan' | 'track';
    videoUrl?: string;
}

const featureGuides: FeatureGuide[] = [
    // Collect
    {
        title: 'Feedback Board',
        description: 'Collect and organize customer feedback with voting and comments',
        icon: MessageSquare,
        href: '/docs/widget',
        category: 'collect'
    },
    {
        title: 'Widget Integration',
        description: 'Embed the feedback widget on your website or app',
        icon: Zap,
        href: '/docs/widget',
        category: 'collect'
    },
    {
        title: 'Call Intelligence',
        description: 'AI-powered analysis of customer call transcripts',
        icon: Users,
        href: '/app/calls',
        category: 'collect'
    },
    // Understand
    {
        title: 'Mission Control',
        description: 'AI-powered executive dashboard with real-time insights',
        icon: Sparkles,
        href: '/app/mission-control-help',
        category: 'understand'
    },
    {
        title: 'AI Insights',
        description: 'Automatic theme detection and sentiment analysis',
        icon: Brain,
        href: '/app/mission-control',
        category: 'understand'
    },
    {
        title: 'Feature Predictions',
        description: 'Predict feature success before building',
        icon: TrendingUp,
        href: '/app/predictions',
        category: 'understand'
    },
    // Plan
    {
        title: 'Roadmap',
        description: 'Visual roadmap with prioritization and status tracking',
        icon: Map,
        href: '/app/roadmap',
        category: 'plan'
    },
    {
        title: 'Specs & PRDs',
        description: 'AI-generated specifications from feedback themes',
        icon: FileText,
        href: '/app/user-stories',
        category: 'plan'
    },
    // Track
    {
        title: 'Feature Outcomes',
        description: 'Track impact of shipped features on customer sentiment',
        icon: Target,
        href: '/app/outcomes',
        category: 'track'
    },
    {
        title: 'Notifications',
        description: 'Configure email, push, Slack, and Discord alerts',
        icon: Bell,
        href: '/settings?tab=notifications',
        category: 'track'
    }
];

const categories = [
    { id: 'collect', label: 'Collect', icon: MessageSquare, color: 'bg-teal-500' },
    { id: 'understand', label: 'Understand', icon: Brain, color: 'bg-emerald-500' },
    { id: 'plan', label: 'Plan', icon: Map, color: 'bg-amber-500' },
    { id: 'track', label: 'Track', icon: Target, color: 'bg-rose-500' }
];

export default function HelpCenterPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const filteredGuides = featureGuides.filter(guide => {
        const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guide.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || guide.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-slate-950">
            <GlobalBanner />
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-5xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
                            <BookOpen className="w-4 h-4 text-teal-400" />
                            <span className="text-sm text-teal-400 font-medium">Help Center</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-4">
                            Welcome to SignalsLoop
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            Get started with our feature guides and learn how to transform customer feedback into product decisions.
                        </p>
                    </div>

                    {/* Quick Start */}
                    <Card className="bg-gradient-to-r from-teal-900/30 to-emerald-900/30 border-teal-700/50 mb-8">
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="flex-shrink-0">
                                    <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                                        <Play className="w-8 h-8 text-teal-400" />
                                    </div>
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <h2 className="text-xl font-semibold text-white mb-2">Quick Start Guide</h2>
                                    <p className="text-slate-400 mb-4">
                                        New to SignalsLoop? Start here for a 5-minute overview of the platform.
                                    </p>
                                    <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                                        <Button asChild className="bg-teal-600 hover:bg-teal-700">
                                            <Link href="/app/mission-control">
                                                Go to Mission Control
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                            <Link href="/app/mission-control-help">
                                                <HelpCircle className="w-4 h-4 mr-2" />
                                                Setup Guide
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search features..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {categories.map((category) => {
                                const Icon = category.icon;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === category.id
                                                ? `${category.color} text-white`
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {category.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Feature Guides Grid */}
                    <div className="grid md:grid-cols-2 gap-4 mb-12">
                        {filteredGuides.map((guide) => {
                            const Icon = guide.icon;
                            const category = categories.find(c => c.id === guide.category);
                            return (
                                <Link
                                    key={guide.title}
                                    href={guide.href}
                                    className="group block"
                                >
                                    <Card className="bg-slate-900/50 border-slate-800 hover:border-teal-500/50 transition-all h-full">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-lg ${category?.color || 'bg-teal-500'}/20`}>
                                                    <Icon className="w-5 h-5 text-teal-400" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-white group-hover:text-teal-400 transition-colors text-lg">
                                                        {guide.title}
                                                    </CardTitle>
                                                    <CardDescription className="text-slate-400 text-sm mt-1">
                                                        {guide.description}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="flex items-center text-teal-400 text-sm font-medium">
                                                Learn more
                                                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Support Section */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-6 text-center">
                            <HelpCircle className="w-10 h-10 text-slate-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">Need more help?</h3>
                            <p className="text-slate-400 mb-4">
                                Can't find what you're looking for? Reach out to our support team.
                            </p>
                            <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                <Link href="/support">Contact Support</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Back link */}
                    <div className="mt-8 text-center">
                        <Link href="/app" className="text-slate-400 hover:text-white transition-colors">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
