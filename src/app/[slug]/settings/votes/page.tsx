'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, User, Calendar, Tag, FileText, Check, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface VoteMetadata {
  id: string;
  vote_id: string;
  voted_by_admin_email: string;
  voted_by_admin_name: string;
  customer_email: string;
  customer_name: string;
  customer_company: string | null;
  priority: string;
  vote_source: string;
  internal_note: string | null;
  customer_notified: boolean;
  created_at: string;
  post: {
    id: string;
    title: string;
  };
}

export default function VotesAdminPage() {
  const params = useParams();
  const [votes, setVotes] = useState<VoteMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadVotes();
  }, [params.slug]);

  const loadVotes = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      // Get project ID
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', params.slug as string)
        .single();

      if (!project) {
        toast.error('Project not found');
        return;
      }

      setProjectId(project.id);

      // Get all vote metadata for this project
      const { data: votesData, error } = await supabase
        .from('vote_metadata')
        .select(`
          *,
          votes!inner(
            post_id,
            posts!inner(
              id,
              title,
              project_id
            )
          )
        `)
        .eq('votes.posts.project_id', project.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading votes:', error);
        toast.error('Failed to load votes');
        return;
      }

      // Transform the data
      const transformedVotes = votesData.map((vote: any) => ({
        ...vote,
        post: {
          id: vote.votes.posts.id,
          title: vote.votes.posts.title,
        },
      }));

      setVotes(transformedVotes);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'must_have':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'important':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'nice_to_have':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'must_have':
        return '🔴 Must Have';
      case 'important':
        return '🟡 Important';
      case 'nice_to_have':
        return '🟢 Nice to Have';
      default:
        return priority;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading votes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Votes on Behalf</h1>
          <p className="text-gray-600">
            View all votes submitted on behalf of customers, including internal notes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Total Votes</div>
              <div className="text-2xl font-bold text-gray-900">{votes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Must Have</div>
              <div className="text-2xl font-bold text-red-600">
                {votes.filter(v => v.priority === 'must_have').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Important</div>
              <div className="text-2xl font-bold text-yellow-600">
                {votes.filter(v => v.priority === 'important').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Customers Notified</div>
              <div className="text-2xl font-bold text-green-600">
                {votes.filter(v => v.customer_notified).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Votes List */}
        {votes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No votes on behalf yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {votes.map((vote) => (
              <Card key={vote.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{vote.post.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getPriorityColor(vote.priority)}>
                          {getPriorityLabel(vote.priority)}
                        </Badge>
                        <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {vote.vote_source.replace('_', ' ')}
                        </Badge>
                        {vote.customer_notified ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            Notified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            <X className="h-3 w-3 mr-1" />
                            Not Notified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Customer Info */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Customer Information</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{vote.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{vote.customer_email}</span>
                      </div>
                      {vote.customer_company && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{vote.customer_company}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Info */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Submitted By</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{vote.voted_by_admin_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{vote.voted_by_admin_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {new Date(vote.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Internal Note */}
                  {vote.internal_note && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-yellow-900 mb-1">
                            Internal Note (Admin Only)
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {vote.internal_note}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

