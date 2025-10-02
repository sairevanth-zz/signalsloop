'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap,
  Map,
  BarChart3,
  Settings,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Eye,
  Code,
  Globe,
  Mail,
  Crown,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('feedback');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('votes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', description: '' });
  const [showDemoLimitBanner, setShowDemoLimitBanner] = useState(true);

  // Load demo data from API
  useEffect(() => {
    const loadDemoData = async () => {
      try {
        const response = await fetch('/api/demo/posts');
        if (!response.ok) {
          throw new Error('Failed to fetch demo posts');
        }
        
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Error loading demo data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDemoData();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Demo Limit Banner */}
      {showDemoLimitBanner && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              <span><strong>Demo Mode:</strong> Try all features with daily limits • AI features: 3-10 uses/day • Resets at midnight UTC</span>
            </div>
            <button onClick={() => setShowDemoLimitBanner(false)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SignalsLoop Demo</h1>
                <p className="text-sm text-gray-600">Experience the complete dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/">← Back to Home</Link>
              </Button>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Crown className="h-3 w-3 mr-1" />
                Pro Demo
              </Badge>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Demo Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mx-auto">
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Roadmap
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            {/* Filters and Search */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search feedback..."
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
                        className={`flex items-center gap-2 ${
                          statusFilter === option.value 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                            : ''
                        }`}
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
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">Submit New Feedback</CardTitle>
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
                    <Button 
                      onClick={handleSubmitPost}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Submit Post
                    </Button>
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-transparent bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading demo data...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No posts found. Try adjusting your filters.</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg hover:shadow-blue-100/50 transition-all cursor-pointer border border-gray-200 hover:border-blue-300 bg-white/80 backdrop-blur-sm" onClick={() => handlePostClick(post.id)}>
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
                              ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <svg className="w-4 h-4 mb-1" fill={post.user_voted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                          </svg>
                          <span className="font-medium text-sm">{post.vote_count}</span>
                          {post.user_voted && (
                            <div className="text-xs text-white mt-1 flex items-center gap-1">
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
              <div className="mt-12 text-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-8">
                  <Button
                    onClick={() => setShowNewPostForm(true)}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Your Feedback
                  </Button>
                  <p className="text-gray-600 mt-4">
                    This demo shows real data from our seeded demo project. <Link href="/login" className="text-blue-600 hover:underline font-medium">Create your own board</Link> to get started.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    All posts, votes, and comments above are real data stored in our database.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Roadmap Tab */}
          <TabsContent value="roadmap" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Planned */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-yellow-600" />
                    Planned
                    <Badge variant="outline" className="ml-auto">12</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-sm">Dark Mode Support</h4>
                    <p className="text-xs text-gray-600 mt-1">Allow users to switch between light and dark themes</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Feature</Badge>
                      <span className="text-xs text-gray-500">Q2 2024</span>
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-sm">Mobile App</h4>
                    <p className="text-xs text-gray-600 mt-1">Native iOS and Android applications</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Feature</Badge>
                      <span className="text-xs text-gray-500">Q3 2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* In Progress */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-orange-600" />
                    In Progress
                    <Badge variant="outline" className="ml-auto">8</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-sm">Advanced Analytics</h4>
                    <p className="text-xs text-gray-600 mt-1">Detailed insights and reporting dashboard</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Analytics</Badge>
                      <span className="text-xs text-gray-500">75%</span>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-sm">API v2</h4>
                    <p className="text-xs text-gray-600 mt-1">Enhanced API with better performance</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Infrastructure</Badge>
                      <span className="text-xs text-gray-500">60%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Done */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Done
                    <Badge variant="outline" className="ml-auto">24</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-sm">Widget Integration</h4>
                    <p className="text-xs text-gray-600 mt-1">Embeddable feedback widget for websites</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Feature</Badge>
                      <span className="text-xs text-gray-500">✓ Done</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-sm">Email Notifications</h4>
                    <p className="text-xs text-gray-600 mt-1">Automated email updates for feedback</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Integration</Badge>
                      <span className="text-xs text-gray-500">✓ Done</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                      <p className="text-2xl font-bold text-gray-900">1,247</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-xs text-green-600 mt-2">+12% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">892</p>
                    </div>
                    <User className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-green-600 mt-2">+8% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">73%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-green-600 mt-2">+5% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                      <p className="text-2xl font-bold text-gray-900">4.8</p>
                    </div>
                    <Sparkles className="h-8 w-8 text-yellow-600" />
                  </div>
                  <p className="text-xs text-green-600 mt-2">+0.2 from last month</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Feedback Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Interactive chart showing feedback trends over time</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Top Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Feature Requests</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-3/4 h-full bg-blue-600 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bug Reports</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/2 h-full bg-red-600 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">32%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Improvements</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/4 h-full bg-yellow-600 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">23%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Board Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Public Board</p>
                      <p className="text-sm text-gray-600">Anyone can view and submit feedback</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Get notified of new feedback</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-categorization</p>
                      <p className="text-sm text-gray-600">AI-powered feedback categorization</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Widget Code</p>
                      <p className="text-sm text-gray-600">Embed on your website</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">API Access</p>
                      <p className="text-sm text-gray-600">Connect with external tools</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/docs/api">
                        <Code className="h-4 w-4 mr-2" />
                        View Docs
                      </Link>
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Webhook</p>
                      <p className="text-sm text-gray-600">Real-time updates</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Coming Soon
                      </Badge>
                      <Button variant="outline" size="sm" disabled>
                        <Mail className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                Pro Features
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium">Private Boards</h4>
                  <p className="text-sm text-gray-600">Create private feedback boards</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <Globe className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-medium">Custom Domain</h4>
                  <p className="text-sm text-gray-600">Use your own domain</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-medium">Advanced Analytics</h4>
                  <p className="text-sm text-gray-600">Detailed insights and reports</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Interactive Roadmap CTA */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 p-6 text-center">
              <Map className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Interactive Roadmap</h3>
              <p className="text-gray-600 mb-4">Explore our public roadmap with real-time updates, voting, AI analysis, and more.</p>
              <Button 
                onClick={() => setActiveTab('roadmap')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Public Roadmap
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                <Sparkles className="h-3 w-3 inline mr-1" />
                Try AI features with demo limits • Vote on features • Post comments
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
