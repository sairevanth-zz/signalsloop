'use client';

/**
 * Competitor Management Page
 *
 * Add and manage competitors for Devil's Advocate intelligence.
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import GlobalBanner from '@/components/GlobalBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { ArrowLeft, Plus, ExternalLink, Trash2, Shield, Building2, Edit } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

function CompetitorsContent() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [projectId, setProjectId] = useState<string>('');
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    category: '',
    description: '',
    changelog_url: '',
  });

  useEffect(() => {
    const id = searchParams.get('projectId');
    if (id) {
      setProjectId(id);
      fetchCompetitors(id);
    }
  }, [searchParams]);

  const fetchCompetitors = async (projId: string) => {
    setLoadingData(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase
        .from('competitors')
        .select('*')
        .eq('project_id', projId)
        .order('name');

      setCompetitors(data || []);
    } catch (error) {
      console.error('Error fetching competitors:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        toast.error('Database connection failed');
        return;
      }

      const metadata = {
        changelog_url: formData.changelog_url || null,
      };

      if (editingCompetitor) {
        // Update existing
        const { error } = await supabase
          .from('competitors')
          .update({
            name: formData.name,
            website: formData.website || null,
            category: formData.category || null,
            description: formData.description || null,
            metadata,
          })
          .eq('id', editingCompetitor.id);

        if (error) throw error;
        toast.success('Competitor updated!');
      } else {
        // Create new
        const { error } = await supabase
          .from('competitors')
          .insert({
            project_id: projectId,
            name: formData.name,
            website: formData.website || null,
            category: formData.category || null,
            description: formData.description || null,
            status: 'active',
            metadata,
          });

        if (error) throw error;
        toast.success('Competitor added!');
      }

      setFormData({
        name: '',
        website: '',
        category: '',
        description: '',
        changelog_url: '',
      });
      setShowForm(false);
      setEditingCompetitor(null);
      await fetchCompetitors(projectId);
    } catch (error: any) {
      console.error('Error saving competitor:', error);
      toast.error(error.message || 'Failed to save competitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (competitor: any) => {
    setEditingCompetitor(competitor);
    setFormData({
      name: competitor.name,
      website: competitor.website || '',
      category: competitor.category || '',
      description: competitor.description || '',
      changelog_url: competitor.metadata?.changelog_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (competitorId: string) => {
    if (!confirm('Are you sure? This will delete all associated competitor events.')) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', competitorId);

      if (error) throw error;

      toast.success('Competitor deleted');
      await fetchCompetitors(projectId);
    } catch (error) {
      console.error('Error deleting competitor:', error);
      toast.error('Failed to delete competitor');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingCompetitor(null);
    setFormData({
      name: '',
      website: '',
      category: '',
      description: '',
      changelog_url: '',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalBanner />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalBanner />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Competitor Management</h1>
            <p className="text-gray-600 mb-8">Please sign in to access this feature</p>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalBanner />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Competitor Management</h1>
            <p className="text-gray-600 mb-8">Please select a project</p>
            <Button asChild>
              <Link href="/app">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalBanner showBackButton={true} backLabel="Back to Dashboard" />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Competitors</h1>
            <p className="text-muted-foreground">
              Manage competitors to track for Devil's Advocate intelligence
            </p>
          </div>
          <div className="flex gap-2">
            {competitors.length > 0 && (
              <Button asChild variant="outline">
                <Link href={`/app/competitor-events?projectId=${projectId}`}>
                  <Shield className="w-4 h-4 mr-2" />
                  Track Events
                </Link>
              </Button>
            )}
            <Button onClick={() => setShowForm(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Competitor
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Add Your Competitors
                </p>
                <p className="text-sm text-blue-700">
                  Add competitors you want to monitor. You can then track their updates
                  (features, pricing, news) which powers the Devil's Advocate Red Team analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competitors List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Competitors ({competitors.length})</CardTitle>
            <CardDescription>
              Track competitors to power intelligent PRD analysis
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loadingData ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading competitors...</p>
              </div>
            ) : competitors.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Competitors Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first competitor to start tracking their moves
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Competitor
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {competitors.map((competitor) => (
                  <Card key={competitor.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{competitor.name}</h3>
                            <Badge variant="outline" className={
                              competitor.status === 'active'
                                ? 'border-green-300 text-green-700'
                                : 'border-gray-300 text-gray-700'
                            }>
                              {competitor.status}
                            </Badge>
                            {competitor.category && (
                              <Badge variant="secondary">{competitor.category}</Badge>
                            )}
                          </div>

                          {competitor.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {competitor.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {competitor.website && (
                              <a
                                href={competitor.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Website
                              </a>
                            )}
                            {competitor.metadata?.changelog_url && (
                              <a
                                href={competitor.metadata.changelog_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Changelog
                              </a>
                            )}
                            <span>
                              {competitor.total_mentions || 0} mentions tracked
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(competitor)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(competitor.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCompetitor ? 'Edit Competitor' : 'Add Competitor'}
            </DialogTitle>
            <DialogDescription>
              Add details about the competitor you want to track
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Competitor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Acme Corp"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://competitor.com"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Direct Competitor"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="changelog_url">Changelog URL (optional)</Label>
              <Input
                id="changelog_url"
                type="url"
                value={formData.changelog_url}
                onChange={(e) => setFormData({ ...formData, changelog_url: e.target.value })}
                placeholder="https://competitor.com/changelog"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for future automated tracking (currently manual mode)
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this competitor and why they matter..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingCompetitor ? 'Update' : 'Add Competitor'}
              </Button>
              <Button type="button" variant="outline" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CompetitorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <GlobalBanner />
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <CompetitorsContent />
    </Suspense>
  );
}
