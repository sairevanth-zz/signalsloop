'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, User, Calendar, Tag, FileText, Check, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface FeedbackMetadata {
  id: string;
  post_id: string;
  submitted_by_admin_email: string;
  submitted_by_admin_name: string;
  customer_email: string;
  customer_name: string;
  customer_company: string | null;
  priority: string;
  feedback_source: string;
  internal_note: string | null;
  customer_notified: boolean;
  created_at: string;
  post: {
    id: string;
    title: string;
    description: string;
    status: string;
  };
}

export default function FeedbackAdminPage() {
  const params = useParams();
  const [feedbackItems, setFeedbackItems] = useState<FeedbackMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadFeedback();
  }, [params.slug]);

  const loadFeedback = async () => {
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

      // First, get all posts for this project
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, title, description, status')
        .eq('project_id', project.id);

      if (postsError) {
        console.error('Error loading posts:', postsError);
        toast.error('Failed to load posts');
        return;
      }

      if (!postsData || postsData.length === 0) {
        setFeedbackItems([]);
        return;
      }

      const postIds = postsData.map((p: any) => p.id);

      // Get all feedback metadata for these posts
      const { data: feedbackData, error } = await supabase
        .from('feedback_metadata')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading feedback:', error);
        toast.error('Failed to load feedback');
        return;
      }

      // Transform the data by joining with posts
      const transformedFeedback = (feedbackData || []).map((item: any) => {
        const post = postsData.find((p: any) => p.id === item.post_id);
        return {
          ...item,
          post: {
            id: post?.id || '',
            title: post?.title || 'Unknown Post',
            description: post?.description || '',
            status: post?.status || 'open',
          },
        };
      });

      setFeedbackItems(transformedFeedback);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading feedback...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Submitted on Behalf</h1>
          <p className="text-gray-600">
            View all feedback submitted on behalf of customers, including internal notes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Total Feedback</div>
              <div className="text-2xl font-bold text-gray-900">{feedbackItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Must Have</div>
              <div className="text-2xl font-bold text-red-600">
                {feedbackItems.filter(f => f.priority === 'must_have').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Important</div>
              <div className="text-2xl font-bold text-yellow-600">
                {feedbackItems.filter(f => f.priority === 'important').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Customers Notified</div>
              <div className="text-2xl font-bold text-green-600">
                {feedbackItems.filter(f => f.customer_notified).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback List */}
        {feedbackItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No feedback submitted on behalf yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedbackItems.map((feedback) => (
              <Card key={feedback.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{feedback.post.title}</CardTitle>
                      {feedback.post.description && (
                        <p className="text-sm text-gray-600 mb-3">{feedback.post.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getPriorityColor(feedback.priority)}>
                          {getPriorityLabel(feedback.priority)}
                        </Badge>
                        <Badge className={getStatusColor(feedback.post.status)}>
                          {feedback.post.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {feedback.feedback_source.replace('_', ' ')}
                        </Badge>
                        {feedback.customer_notified ? (
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
                        <span className="text-gray-900">{feedback.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{feedback.customer_email}</span>
                      </div>
                      {feedback.customer_company && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{feedback.customer_company}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Info */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Submitted By</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{feedback.submitted_by_admin_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{feedback.submitted_by_admin_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {new Date(feedback.created_at).toLocaleDateString('en-US', {
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
                  {feedback.internal_note && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-yellow-900 mb-1">
                            Internal Note (Admin Only)
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {feedback.internal_note}
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
