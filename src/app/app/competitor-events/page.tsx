'use client';

/**
 * Competitor Events Management Page
 *
 * Manual mode for Devil's Advocate - submit and view competitor intelligence.
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { ArrowLeft, Plus, ExternalLink, Sparkles, TrendingUp, Shield, Calendar } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

function CompetitorEventsContent() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [projectId, setProjectId] = useState<string>('');
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    competitor_id: '',
    title: '',
    content: '',
    url: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const id = searchParams.get('projectId');
    if (id) {
      setProjectId(id);
      fetchCompetitors(id);
      fetchEvents(id);
    }
  }, [searchParams]);

  const fetchCompetitors = async (projId: string) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase
        .from('competitors')
        .select('id, name, status')
        .eq('project_id', projId)
        .eq('status', 'active')
        .order('name');

      setCompetitors(data || []);
    } catch (error) {
      console.error('Error fetching competitors:', error);
    }
  };

  const fetchEvents = async (projId: string) => {
    setLoadingData(true);
    try {
      const response = await fetch(`/api/devils-advocate/events?projectId=${projId}&limit=100`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/devils-advocate/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_id: formData.competitor_id,
          project_id: projectId,
          raw_content: {
            title: formData.title,
            content: formData.content,
            url: formData.url || undefined,
            date: formData.date,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Competitor event analyzed and saved!');
        setFormData({
          competitor_id: '',
          title: '',
          content: '',
          url: '',
          date: new Date().toISOString().split('T')[0],
        });
        setShowForm(false);
        await fetchEvents(projectId);
      } else {
        toast.error(data.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error submitting event:', error);
      toast.error('Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const getImpactBadge = (impact: string) => {
    const colorMap: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border-red-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-blue-100 text-blue-700 border-blue-300',
      informational: 'bg-gray-100 text-gray-700 border-gray-300',
    };

    return (
      <Badge className={colorMap[impact] || colorMap.informational}>
        {impact?.toUpperCase() || 'INFO'}
      </Badge>
    );
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
            <h1 className="text-3xl font-bold mb-4">Competitor Events</h1>
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
            <h1 className="text-3xl font-bold mb-4">Competitor Events</h1>
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
            <h1 className="text-3xl font-bold mb-2">Competitor Intelligence</h1>
            <p className="text-muted-foreground">
              Track competitor updates to power Devil's Advocate analysis
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'Add Event'}
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Manual Mode - No Firecrawl Required
                </p>
                <p className="text-sm text-blue-700">
                  Submit competitor updates manually and GPT-4o will analyze them for strategic
                  implications. These events power the Devil's Advocate Red Team analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submission Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Submit Competitor Event</CardTitle>
              <CardDescription>
                Paste a changelog entry, press release, or describe what happened
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="competitor">Competitor *</Label>
                  <Select
                    value={formData.competitor_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, competitor_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select competitor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {competitors.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., 'Launched mobile offline mode'"
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Brief, descriptive title (max 100 chars)
                  </p>
                </div>

                <div>
                  <Label htmlFor="content">Event Details *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Paste changelog text, press release, or describe what happened and why it matters..."
                    required
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    GPT-4o will analyze this to extract strategic implications
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="url">Source URL (optional)</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://competitor.com/changelog"
                    />
                  </div>

                  <div>
                    <Label htmlFor="date">Event Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing with GPT-4o...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze & Save
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Competitor Events
            </CardTitle>
            <CardDescription>
              All events analyzed with GPT-4o for strategic implications
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loadingData ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking competitor updates to power your Devil's Advocate analysis
                </p>
                {competitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add competitors first in the Competitive Intelligence dashboard
                  </p>
                ) : (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Event
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event: any) => (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{event.event_title}</h3>
                            {getImpactBadge(event.impact_assessment)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {event.competitors?.name} • {new Date(event.event_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.event_type?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{event.event_summary}</p>

                      {event.strategic_implications?.threat_to_features && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-red-900 mb-1">
                            Threats to Features:
                          </p>
                          <ul className="text-xs text-red-800 list-disc list-inside space-y-1">
                            {event.strategic_implications.threat_to_features.map(
                              (threat: string, idx: number) => (
                                <li key={idx}>{threat}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {event.strategic_implications?.recommended_response && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-blue-900 mb-1">
                            Recommended Response:
                          </p>
                          <p className="text-xs text-blue-800">
                            {event.strategic_implications.recommended_response}
                          </p>
                        </div>
                      )}

                      {event.source_url && (
                        <a
                          href={event.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Source
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CompetitorEventsPage() {
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
      <CompetitorEventsContent />
    </Suspense>
  );
}
