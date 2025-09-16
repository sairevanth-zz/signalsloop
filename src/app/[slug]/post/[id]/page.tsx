'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Calendar, 
  User, 
  ArrowLeft,
  Send,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import VoteButton from '@/components/VoteButton';

interface Post {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  user_voted: boolean;
}

interface Comment {
  id: number;
  body: string;
  author_email?: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

const statusConfig = {
  open: { 
    label: 'Open', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'This feedback is being considered'
  },
  planned: { 
    label: 'Planned', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'This feedback is planned for development'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'This feedback is currently being worked on'
  },
  done: { 
    label: 'Done', 
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'This feedback has been implemented'
  },
  declined: { 
    label: 'Declined', 
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'This feedback will not be implemented'
  }
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  const [project, setProject] = useState<Project | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commenting, setCommenting] = useState(false);
  
  // Comment form state
  const [commentForm, setCommentForm] = useState({
    body: '',
    author_email: ''
  });

  const loadPostData = useCallback(async () => {
    if (!supabase) {
      setError('Database connection not available. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', params.slug)
        .single();

      if (projectError) {
        toast.error('Project not found');
        router.push('/');
        return;
      }

      setProject(projectData);

      // Get post with vote count
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          vote_count:votes(count),
          boards!inner(project_id)
        `)
        .eq('id', params.id)
        .eq('boards.project_id', projectData.id)
        .single();

      if (postError || !postData) {
        toast.error('Post not found');
        router.push(`/${params.slug}/board`);
        return;
      }

      // Process post data
      const processedPost: Post = {
        id: postData.id,
        title: postData.title,
        description: postData.description,
        author_email: postData.author_email,
        status: postData.status,
        created_at: postData.created_at,
        vote_count: postData.vote_count?.[0]?.count || 0,
        user_voted: false // TODO: Check if current user voted
      };

      setPost(processedPost);

      // Get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', params.id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
      } else {
        setComments(commentsData || []);
      }

    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [params.slug, params.id, supabase, router]);

  // Load post and comments
  useEffect(() => {
    loadPostData();
  }, [loadPostData]);


  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (!post || !commentForm.body.trim() || commenting || !supabase) return;

    try {
      setCommenting(true);

      const { data: newComment, error } = await supabase
        .from('comments')
        .insert([{
          post_id: post.id,
          body: commentForm.body.trim(),
          author_email: commentForm.author_email.trim() || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        toast.error('Error posting comment');
        return;
      }

      // Add to local state
      setComments(prev => [...prev, newComment]);
      
      // Reset form
      setCommentForm({ body: '', author_email: '' });
      
      toast.success('Comment posted!');

    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Error posting comment');
    } finally {
      setCommenting(false);
    }
  };

  const getAuthorInitials = (email?: string) => {
    if (!email) return 'A';
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const getAuthorName = (email?: string) => {
    if (!email) return 'Anonymous';
    return email.split('@')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              {[1,2].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Post not found</h2>
          <p className="text-gray-600 mb-4">The feedback post you&apos;re looking for doesn&apos;t exist.</p>
          <Link href={`/${params.slug}/board`}>
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Board
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">Home</Link>
          <span>→</span>
          <Link href={`/${params.slug}/board`} className="hover:text-gray-900">
            {project?.name}
          </Link>
          <span>→</span>
          <span>Feedback</span>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Back Button */}
        <div className="mb-6">
          <Link href={`/${params.slug}/board`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Board
            </Button>
          </Link>
        </div>

        {/* Post Content */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-3">{post.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{getAuthorName(post.author_email)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={statusConfig[post.status].color}
                >
                  {statusConfig[post.status].label}
                </Badge>
                
                <VoteButton
                  postId={post.id}
                  initialVoteCount={post.vote_count}
                  initialUserVoted={post.user_voted}
                  onVoteChange={(newCount, userVoted) => {
                    // Update the post in the local state
                    setPost(prev => prev ? { ...prev, vote_count: newCount, user_voted: userVoted } : null);
                  }}
                  onShowNotification={(message, type) => {
                    if (type === 'success') {
                      toast.success(message);
                    } else if (type === 'error') {
                      toast.error(message);
                    } else {
                      toast.info(message);
                    }
                  }}
                  size="md"
                  variant="compact"
                />
              </div>
            </div>
          </CardHeader>
          
          {post.description && (
            <CardContent>
              <div className="prose prose-gray max-w-none">
                <p className="whitespace-pre-wrap">{post.description}</p>
              </div>
            </CardContent>
          )}

          {/* Status Information */}
          <CardContent className="pt-0">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> {statusConfig[post.status].description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Existing Comments */}
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No comments yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getAuthorInitials(comment.author_email)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {getAuthorName(comment.author_email)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Form */}
            <div className="border-t pt-6">
              <h3 className="font-medium mb-4">Add a comment</h3>
              <div className="space-y-3">
                <Textarea
                  placeholder="Share your thoughts..."
                  value={commentForm.body}
                  onChange={(e) => setCommentForm(prev => ({ ...prev, body: e.target.value }))}
                  rows={3}
                  disabled={commenting}
                />
                
                <Input
                  type="email"
                  placeholder="Your email (optional)"
                  value={commentForm.author_email}
                  onChange={(e) => setCommentForm(prev => ({ ...prev, author_email: e.target.value }))}
                  disabled={commenting}
                />
                
                <Button
                  onClick={handleCommentSubmit}
                  disabled={!commentForm.body.trim() || commenting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {commenting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}