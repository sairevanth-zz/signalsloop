'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBadge } from '@/components/CategoryBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Send, 
  ThumbsUp, 
  MessageSquare, 
  User, 
  Calendar,
  CheckCircle,
  X,
  Loader2,
  Sparkles,
  Heart
} from 'lucide-react';

interface WidgetFrameProps {
  apiKey: string;
}

interface Post {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  user_voted?: boolean;
  category?: string | null;
  ai_categorized?: boolean;
  ai_confidence?: number;
  ai_reasoning?: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
}

interface ApiKeyData {
  id: string;
  project_id: string;
  name: string;
  projects: Project;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Status configurations
const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
  planned: { label: 'Planned', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
  done: { label: 'Done', color: 'bg-green-100 text-green-800' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800' }
};

export default function WidgetFrame({ apiKey }: WidgetFrameProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'submit' | 'success'>('list');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author_email: '',
    category: 'feature'
  });

  // URL theme parameter
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Get theme from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme');
    if (themeParam === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }

    loadWidgetData();
  }, [apiKey]);

  const loadWidgetData = async () => {
    try {
      setLoading(true);

      // Validate API key and get project
      const { data: apiKeyData, error: keyError } = await supabase
        .from('api_keys')
        .select(`
          *,
          projects!inner(*)
        `)
        .eq('key_hash', btoa(apiKey)) // Simple base64 encoding
        .single();

      if (keyError || !apiKeyData) {
        console.error('Invalid API key');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectData = (apiKeyData as any).projects;
      setProject(projectData);

      // Get board for this project
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('project_id', projectData.id)
        .single();

      if (boardError || !boardData) {
        console.error('Board not found');
        return;
      }

      // Get recent posts (last 10)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          vote_count:votes(count)
        `)
        .eq('board_id', boardData.id)
        .is('duplicate_of', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsError) {
        console.error('Error loading posts:', postsError);
        return;
      }

      // Process posts
      const processedPosts = postsData?.map(post => ({
        id: post.id,
        title: post.title,
        description: post.description,
        author_email: post.author_email,
        status: post.status,
        created_at: post.created_at,
        vote_count: post.vote_count?.[0]?.count || 0,
        user_voted: false
      })) || [];

      setPosts(processedPosts);

    } catch (error) {
      console.error('Error loading widget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || submitting) return;

    try {
      setSubmitting(true);

      // Get board ID again
      const { data: boardData } = await supabase
        .from('boards')
        .select('id')
        .eq('project_id', project?.id)
        .single();

      if (!boardData) {
        throw new Error('Board not found');
      }

      // Create post using the API route (includes automatic AI categorization)
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project?.id,
          board_id: boardData.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          author_email: formData.author_email.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit post');
      }

      const result = await response.json();
      const newPost = result.post;

      // Add to local state
      setPosts(prev => [{ 
        ...newPost, 
        vote_count: 0, 
        user_voted: false 
      }, ...prev.slice(0, 9)]);

      // Reset form
      setFormData({
        title: '',
        description: '',
        author_email: '',
        category: 'feature'
      });

      setSubmitted(true);
      setCurrentView('success');

      // Send message to parent window
      window.parent.postMessage({
        type: 'signalloop_submitted',
        post: newPost
      }, '*');

      // Send confirmation email if email provided
      if (formData.author_email.trim()) {
        try {
          await fetch('/api/send-confirmation-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.author_email,
              postTitle: formData.title,
              postId: newPost.id,
              projectSlug: project?.slug
            }),
          });
        } catch (emailError) {
          console.log('Email sending failed:', emailError);
        }
      }

    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (postId: string) => {
    try {
      // Simple voting for widget (no duplicate prevention for now)
      const voterHash = `widget_${Date.now()}_${Math.random()}`;

      const { error } = await supabase
        .from('votes')
        .insert([{
          post_id: postId,
          voter_hash: voterHash
        }]);

      if (error && error.code !== '23505') {
        console.error('Error voting:', error);
        return;
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, vote_count: post.vote_count + 1, user_voted: true }
          : post
      ));

    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const closeWidget = () => {
    window.parent.postMessage({ type: 'signalloop_close' }, '*');
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading feedback board...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <X className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Widget Not Found</h2>
          <p className="text-gray-600">This feedback widget is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      {/* Header */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{project.name} Feedback</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Share your ideas and help us improve
            </p>
          </div>
          <button
            onClick={closeWidget}
            className={`p-2 rounded-full hover:bg-gray-100 ${theme === 'dark' ? 'hover:bg-gray-800' : ''}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-4`}>
        <div className="flex gap-2">
          <Button
            variant={currentView === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('list')}
            className="flex-1"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Recent Feedback
          </Button>
          <Button
            variant={currentView === 'submit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('submit')}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Idea
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {currentView === 'list' && (
          <div className="p-4 space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No feedback yet. Be the first to share your ideas!
                </p>
                <Button 
                  onClick={() => setCurrentView('submit')}
                  className="mt-3"
                >
                  Submit First Idea
                </Button>
              </div>
            ) : (
              posts.map((post) => (
                <Card 
                  key={post.id} 
                  className={`hover:shadow-md transition-shadow ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Vote Button */}
                      <div className="flex flex-col items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(post.id)}
                          disabled={post.user_voted}
                          className={`flex flex-col h-auto py-2 px-2 ${
                            post.user_voted 
                              ? 'text-blue-600' 
                              : theme === 'dark' 
                                ? 'text-gray-400 hover:text-blue-400' 
                                : 'text-gray-500 hover:text-blue-600'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4 mb-1" />
                          <span className="text-xs font-medium">{post.vote_count}</span>
                        </Button>
                      </div>

                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className={`font-medium line-clamp-2 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {post.title}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`${statusConfig[post.status].color} flex-shrink-0`}
                          >
                            {statusConfig[post.status].label}
                          </Badge>
                        </div>

                        {/* AI Category Badge */}
                        {post.category && (
                          <div className="mb-2">
                            <CategoryBadge 
                              category={post.category} 
                              aiCategorized={post.ai_categorized}
                              confidence={post.ai_confidence}
                              size="sm"
                            />
                          </div>
                        )}

                        {post.description && (
                          <p className={`text-sm line-clamp-2 mb-2 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {post.description}
                          </p>
                        )}

                        <div className={`flex items-center gap-3 text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>
                              {post.author_email 
                                ? post.author_email.split('@')[0] 
                                : 'Anonymous'
                              }
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatRelativeTime(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {currentView === 'submit' && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  What&apos;s your idea? <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Briefly describe your suggestion..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={200}
                  disabled={submitting}
                />
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {formData.title.length}/200 characters
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Category
                </label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">✨ Feature Request</SelectItem>
                    <SelectItem value="bug">🐛 Bug Report</SelectItem>
                    <SelectItem value="improvement">🚀 Improvement</SelectItem>
                    <SelectItem value="question">❓ Question</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Details (Optional)
                </label>
                <Textarea
                  placeholder="Provide more details about your suggestion..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.author_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, author_email: e.target.value }))}
                  disabled={submitting}
                />
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  We&apos;ll notify you about updates
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!formData.title.trim() || submitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {currentView === 'success' && (
          <div className="p-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Thanks for your feedback!
              </h3>
              <p className={`mb-4 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                We&apos;ve received your suggestion and our team will review it soon.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentView('list')}
                  className="flex-1"
                >
                  View Feedback
                </Button>
                <Button
                  onClick={() => {
                    setCurrentView('submit');
                    setSubmitted(false);
                  }}
                  className="flex-1"
                >
                  Submit Another
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-3`}>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Heart className="w-3 h-3" />
          <span>Powered by</span>
          <a 
            href="https://signalsloop.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            SignalsLoop
          </a>
        </div>
      </div>
    </div>
  );
}