'use client';

/**
 * Polls List Page
 * Displays all polls for a project with filtering
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BarChart3,
    Plus,
    Search,
    Loader2,
    Vote,
    Users,
    Clock,
    MoreVertical,
    Trash2,
    Edit,
    Share2,
    ExternalLink,
    AlertCircle,
    ClipboardList
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { PollWithOptions } from '@/types/polls';

export default function PollsListPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [polls, setPolls] = useState<PollWithOptions[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'closed'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Load project and polls
    useEffect(() => {
        if (slug) {
            loadProject();
        }
    }, [slug]);

    useEffect(() => {
        if (projectId) {
            loadPolls();
        }
    }, [projectId, filter]);

    const loadProject = async () => {
        try {
            const res = await fetch('/api/projects?all=true', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load projects');
            const data = await res.json();
            const project = data.projects?.find((p: any) => p.slug === slug);
            if (project) {
                setProjectId(project.id);
            }
        } catch (error) {
            toast.error('Failed to load project');
        }
    };

    const loadPolls = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ projectId: projectId! });
            if (filter !== 'all') {
                params.set('status', filter);
            }

            const res = await fetch(`/api/polls?${params}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load polls');

            const data = await res.json();
            setPolls(data.polls || []);
        } catch (error) {
            toast.error('Failed to load polls');
        } finally {
            setLoading(false);
        }
    };

    const deletePoll = async (pollId: string) => {
        if (!confirm('Are you sure you want to delete this poll?')) return;

        try {
            const res = await fetch(`/api/polls/${pollId}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) throw new Error('Failed to delete poll');

            toast.success('Poll deleted');
            loadPolls();
        } catch (error) {
            toast.error('Failed to delete poll');
        }
    };

    const copyShareLink = (pollId: string) => {
        const url = `${window.location.origin}/${slug}/polls/${pollId}/vote`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
    };

    // Filter by search
    const filteredPolls = polls.filter(poll =>
        poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poll.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="min-h-screen p-6 bg-background">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-teal-500" />
                            Polls & Surveys
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Gather structured feedback from your users
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/${slug}/surveys`)}
                        >
                            <ClipboardList className="w-4 h-4 mr-2" />
                            View Surveys
                        </Button>
                        <Button
                            onClick={() => router.push(`/${slug}/polls/new`)}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Poll
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search polls..."
                            className="pl-10"
                        />
                    </div>
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="draft">Drafts</TabsTrigger>
                            <TabsTrigger value="closed">Closed</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Polls List */}
                {loading ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-500" />
                            <p className="mt-2 text-muted-foreground">Loading polls...</p>
                        </CardContent>
                    </Card>
                ) : filteredPolls.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">No polls yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Create your first poll to start gathering feedback
                            </p>
                            <Button
                                onClick={() => router.push(`/${slug}/polls/new`)}
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Poll
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPolls.map((poll) => (
                            <Card
                                key={poll.id}
                                className="hover:border-teal-500/50 transition-colors"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-foreground text-lg truncate">
                                                {poll.title}
                                            </CardTitle>
                                            {poll.description && (
                                                <CardDescription className="line-clamp-2 mt-1">
                                                    {poll.description}
                                                </CardDescription>
                                            )}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="text-muted-foreground">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => router.push(`/${slug}/polls/${poll.id}`)}
                                                >
                                                    <BarChart3 className="w-4 h-4 mr-2" />
                                                    View Results
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => copyShareLink(poll.id)}
                                                >
                                                    <Share2 className="w-4 h-4 mr-2" />
                                                    Copy Share Link
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => window.open(`/${slug}/polls/${poll.id}/vote`, '_blank')}
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Open Voting Page
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => deletePoll(poll.id)}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                        <span className="flex items-center gap-1">
                                            <Vote className="w-3.5 h-3.5" />
                                            {poll.vote_count} votes
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            {poll.options?.length || 0} options
                                        </span>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between">
                                        <Badge className={getStatusColor(poll.status)}>
                                            {poll.status}
                                        </Badge>
                                        {poll.closes_at && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(poll.closes_at).toLocaleDateString()}
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
