'use client';

/**
 * Surveys List Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ClipboardList,
    Plus,
    Search,
    Loader2,
    Users,
    Clock,
    MoreVertical,
    Trash2,
    Share2,
    ExternalLink,
    BarChart3
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { SurveyWithQuestions } from '@/types/polls';

export default function SurveysListPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [surveys, setSurveys] = useState<SurveyWithQuestions[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'closed'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (slug) loadProject();
    }, [slug]);

    useEffect(() => {
        if (projectId) loadSurveys();
    }, [projectId, filter]);

    const loadProject = async () => {
        try {
            const res = await fetch('/api/projects?all=true');
            if (!res.ok) throw new Error('Failed to load projects');
            const data = await res.json();
            const project = data.projects?.find((p: any) => p.slug === slug);
            if (project) setProjectId(project.id);
        } catch (error) {
            toast.error('Failed to load project');
        }
    };

    const loadSurveys = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ projectId: projectId! });
            if (filter !== 'all') params.set('status', filter);

            const res = await fetch(`/api/surveys?${params}`);
            if (!res.ok) throw new Error('Failed to load surveys');

            const data = await res.json();
            setSurveys(data.surveys || []);
        } catch (error) {
            toast.error('Failed to load surveys');
        } finally {
            setLoading(false);
        }
    };

    const deleteSurvey = async (surveyId: string) => {
        if (!confirm('Are you sure you want to delete this survey?')) return;

        try {
            const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete survey');

            toast.success('Survey deleted');
            loadSurveys();
        } catch (error) {
            toast.error('Failed to delete survey');
        }
    };

    const copyShareLink = (surveyId: string) => {
        const url = `${window.location.origin}/${slug}/surveys/${surveyId}/respond`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
    };

    const filteredSurveys = surveys.filter(survey =>
        survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        survey.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-teal-500';
            case 'closed': return 'bg-slate-500';
            case 'draft': return 'bg-amber-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: '#1a1d23' }}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-teal-400" />
                            Surveys
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Create multi-question surveys for detailed feedback
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push(`/${slug}/surveys/new`)}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Survey
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search surveys..."
                            className="pl-10 bg-slate-800 border-slate-700 text-white"
                        />
                    </div>
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                        <TabsList className="bg-slate-800">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="draft">Drafts</TabsTrigger>
                            <TabsTrigger value="closed">Closed</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Surveys List */}
                {loading ? (
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="py-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-400" />
                            <p className="mt-2 text-slate-400">Loading surveys...</p>
                        </CardContent>
                    </Card>
                ) : filteredSurveys.length === 0 ? (
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="py-12 text-center">
                            <ClipboardList className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">No surveys yet</h3>
                            <p className="text-slate-400 mb-4">
                                Create your first survey to start gathering detailed feedback
                            </p>
                            <Button
                                onClick={() => router.push(`/${slug}/surveys/new`)}
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Survey
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSurveys.map((survey) => (
                            <Card
                                key={survey.id}
                                className="border-slate-700 bg-slate-800/50 hover:border-teal-500/50 transition-colors"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-white text-lg truncate">
                                                {survey.title}
                                            </CardTitle>
                                            {survey.description && (
                                                <CardDescription className="line-clamp-2 mt-1">
                                                    {survey.description}
                                                </CardDescription>
                                            )}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="text-slate-400">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                                <DropdownMenuItem
                                                    onClick={() => router.push(`/${slug}/surveys/${survey.id}`)}
                                                    className="text-slate-200"
                                                >
                                                    <BarChart3 className="w-4 h-4 mr-2" />
                                                    View Results
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => copyShareLink(survey.id)}
                                                    className="text-slate-200"
                                                >
                                                    <Share2 className="w-4 h-4 mr-2" />
                                                    Copy Share Link
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => window.open(`/${slug}/surveys/${survey.id}/respond`, '_blank')}
                                                    className="text-slate-200"
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Open Survey
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => deleteSurvey(survey.id)}
                                                    className="text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            {survey.response_count || 0} responses
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            {survey.questions?.length || 0} questions
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Badge className={getStatusColor(survey.status)}>
                                            {survey.status}
                                        </Badge>
                                        {survey.closes_at && (
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(survey.closes_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
