'use client';

/**
 * Specs List Page
 * Shows all specs for a project with filtering and search
 */

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSpecs, useDeleteSpec, useChangeSpecStatus } from '@/hooks/use-specs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  FileText,
  Calendar,
  MessageSquare,
  Download,
  Trash2,
  MoreVertical,
  Sparkles,
  AlertTriangle,
  Rocket,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Spec, SpecStatus } from '@/types/specs';
import { getStatusColorScheme, SPEC_STATUS_LABELS } from '@/types/specs';

export default function SpecsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SpecStatus | 'all'>('all');

  // Load project data
  React.useEffect(() => {
    async function loadProject() {
      if (!params.slug) return;

      try {
        const { getSupabaseClient } = await import('@/lib/supabase-client');
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
          .from('projects')
          .select('id, name, slug')
          .eq('slug', params.slug as string)
          .single();

        if (error) {
          console.error('Error loading project:', error);
          router.push('/app');
          return;
        }

        setProject(data);
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setProjectLoading(false);
      }
    }

    loadProject();
  }, [params.slug, router]);

  // Memoize filter to prevent infinite re-renders
  const filter = useMemo(() => ({
    search,
    status: statusFilter !== 'all' ? [statusFilter] : undefined,
  }), [search, statusFilter]);

  // Only fetch specs when we have a valid project ID
  const hasProject = !!project?.id;
  const { specs, loading, error, refetch } = useSpecs(hasProject ? project.id : '', filter);

  const { deleteSpec, deleting } = useDeleteSpec();
  const { changeStatus } = useChangeSpecStatus();

  const handleDelete = async (specId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    const success = await deleteSpec(specId);

    if (success) {
      toast.success('Spec deleted successfully');
      refetch();
    } else {
      toast.error('Failed to delete spec');
    }
  };

  const handleStatusChange = async (specId: string, newStatus: SpecStatus) => {
    const result = await changeStatus(specId, newStatus);

    if (result) {
      toast.success(`Spec status changed to ${SPEC_STATUS_LABELS[newStatus]}`);
      refetch();
    } else {
      toast.error('Failed to change spec status');
    }
  };

  const handleExport = (spec: Spec) => {
    router.push(`/${params.slug}/specs/${spec.id}?action=export`);
  };

  // Show loading while project is loading OR specs are loading (but only if we have a project)
  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Project not found</p>
      </div>
    );
  }

  // Calculate stats
  const stats = specs.reduce(
    (acc, spec) => {
      acc.total++;
      acc.byStatus[spec.status]++;
      acc.totalFeedback += spec.linked_feedback_ids.length;
      return acc;
    },
    {
      total: 0,
      byStatus: { draft: 0, review: 0, approved: 0, archived: 0 } as Record<SpecStatus, number>,
      totalFeedback: 0,
    }
  );

  const timeSavedHours = stats.total * 4; // Assume 4 hours saved per spec

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <Sparkles className="h-8 w-8 text-purple-500" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Spec Writer
                </h1>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Transform ideas into comprehensive PRDs in minutes, not hours.
              </p>
            </div>
            <Link href={`/${params.slug}/specs/new`}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Spec
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Specs Created</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{timeSavedHours} hrs</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time Saved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalFeedback}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Feedback Addressed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {stats.total > 0
                    ? Math.round((stats.byStatus.approved / stats.total) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Approval Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search specs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SpecStatus | 'all')}
              className="px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Specs Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading specs...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : specs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No specs yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by creating your first spec
            </p>
            <Link href={`/${params.slug}/specs/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Spec
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specs.map((spec) => (
              <Card key={spec.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {spec.title}
                      </h3>
                      <Badge
                        className={`${getStatusColorScheme(spec.status).bg} ${getStatusColorScheme(spec.status).text
                          }`}
                      >
                        {SPEC_STATUS_LABELS[spec.status]}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport(spec)}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(spec.id, 'review')}>
                          Change Status
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(spec.id, spec.title)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(spec.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {spec.linked_feedback_ids.length} feedback items
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4">
                    <Link href={`/${params?.slug}/specs/${spec.id}?action=premortem`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-600 dark:hover:bg-orange-950"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Pre-Mortem
                      </Button>
                    </Link>
                    <Link href={`/${params?.slug}/specs/${spec.id}?action=prototype`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-600 dark:hover:bg-purple-950"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Prototype
                      </Button>
                    </Link>
                  </div>

                  {/* Make It Real */}
                  <Link href={`/${params?.slug}/specs/${spec.id}?action=makeitreal`} className="block mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-950"
                    >
                      <Rocket className="h-3 w-3 mr-1" />
                      Make It Real
                    </Button>
                  </Link>

                  <Link href={`/${params?.slug}/specs/${spec.id}`}>
                    <Button variant="outline" className="w-full mt-2">
                      View Spec
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
