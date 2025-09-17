'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Plus,
  Filter,
  Search,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';

interface DemoPost {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'planned' | 'in_progress' | 'done';
  vote_count: number;
  user_voted: boolean;
  author: string;
  created_at: string;
  comments_count: number;
}

export default function DemoBoard() {
  const router = useRouter();
  const [posts, setPosts] = useState<DemoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('votes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', description: '' });

  // Load demo data from database
  useEffect(() => {
    const loadDemoData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        // Fetch demo posts from the seeded demo project
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            description,
            status,
            author_email,
            created_at
          `)
          .eq('board_id', '00000000-0000-0000-0000-000000000001')
          .order('created_at', { ascending: false });

        if (postsError) {
          console.error('Error fetching demo posts:', postsError);
          setLoading(false);
          return;
        }

        // Fetch vote counts for each post
        const postsWithVotes = await Promise.all(
          (postsData || []).map(async (post) => {
            const { data: votesData } = await supabase
              .from('votes')
              .select('id')
              .eq('post_id', post.id);

            const { data: commentsData } = await supabase
              .from('comments')
              .select('id')
              .eq('post_id', post.id);

            return {
              id: post.id,
              title: post.title,
              description: post.description,
              status: post.status as 'open' | 'planned' | 'in_progress' | 'done',
              vote_count: votesData?.length || 0,
              user_voted: false, // Demo mode - no real voting
              author: post.author_email?.split('@')[0] || 'Demo User',
              created_at: post.created_at,
              comments_count: commentsData?.length || 0
            };
          })
        );

        setPosts(postsWithVotes);
      } catch (error) {
        console.error('Error loading demo data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDemoData();
  }, [supabase]);

  const statusOptions = [
    { value: 'all', label: 'All Status', icon: Filter },
    { value: 'open', label: 'Open', icon: AlertCircle },
    { value: 'planned', label: 'Planned', icon: Calendar },
    { value: 'in_progress', label: 'In Progress', icon: Zap },
    { value: 'done', label: 'Done', icon: CheckCircle }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-3 w-3" />;
      case 'in_progress': return <Zap className="h-3 w-3" />;
      case 'planned': return <Calendar className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const filteredPosts = posts
    .filter(post => {
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           post.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'votes': return b.vote_count - a.vote_count;
        default: return b.vote_count - a.vote_count;
      }
    });

  const handleSubmitPost = () => {
    if (!newPost.title.trim() || !newPost.description.trim()) {
      alert('Please fill in both title and description');
      return;
    }

    const post: DemoPost = {
      id: Date.now().toString(),
      title: newPost.title,
      description: newPost.description,
      status: 'open',
      vote_count: 0,
      user_voted: false,
      author: 'Demo User',
      created_at: new Date().toISOString(),
      comments_count: 0
    };

    setPosts(prev => [post, ...prev]);
    setNewPost({ title: '', description: '' });
    setShowNewPostForm(false);
    alert('Post submitted successfully!');
  };

  const handlePostClick = (postId: string) => {
    console.log('Post clicked:', postId);
    // Navigate directly to the demo post details page
    router.push(`/demo/post/${postId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SignalsLoop Demo</h1>
            <p className="text-gray-600 mt-1">See how feedback boards work in action</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/">← Back to Home</Link>
            </Button>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              Demo Mode
            </Badge>
            <Button asChild>
              <Link href="/app/create">Create Your Own</Link>
            </Button>
          </div>
        </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant={statusFilter === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(option.value)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-3 w-3" />
                    {option.label}
                  </Button>
                );
              })}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="votes">Most Voted</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {/* New Post Form */}
        {showNewPostForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Submit New Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <Input
                  placeholder="What would you like to see?"
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  placeholder="Tell us more about your idea..."
                  value={newPost.description}
                  onChange={(e) => setNewPost(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitPost}>Submit Post</Button>
                <Button variant="outline" onClick={() => setShowNewPostForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading demo data...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No posts found. Try adjusting your filters.</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-md hover:bg-blue-50 transition-all cursor-pointer border-2 hover:border-blue-200" onClick={() => handlePostClick(post.id)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                      <Badge className={getStatusColor(post.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(post.status)}
                          {post.status.replace('_', ' ')}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3">{post.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(post.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {post.comments_count} comments
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setPosts(prev => prev.map(p =>
                          p.id === post.id
                            ? { 
                                ...p, 
                                vote_count: p.user_voted ? p.vote_count - 1 : p.vote_count + 1,
                                user_voted: !p.user_voted
                              }
                            : p
                        ));
                        alert(post.user_voted ? 'Vote removed!' : 'Vote added!');
                      }}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors ${
                        post.user_voted 
                          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                          : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <svg className="w-4 h-4 mb-1" fill={post.user_voted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                      </svg>
                      <span className="font-medium text-sm">{post.vote_count}</span>
                      {post.user_voted && (
                        <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <span>Voted</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>

        {/* Call to Action */}
        {!showNewPostForm && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => setShowNewPostForm(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Submit Your Feedback
            </Button>
            <p className="text-gray-600 mt-2">
              This demo shows real data from our seeded demo project. <Link href="/app/create" className="text-blue-600 hover:underline">Create your own board</Link> to get started.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              All posts, votes, and comments above are real data stored in our database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
