'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ThumbsUp, MessageSquare, Sparkles, Brain, AlertTriangle, 
  Target, ArrowLeft, Filter, Search, TrendingUp, Clock,
  Star, Smile, Meh, Frown, Loader2, Crown, Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface DemoPost {
  id: string;
  title: string;
  description: string;
  category: string;
  votes: number;
  userVoted: boolean;
  comments: number;
  status: 'open' | 'planned' | 'in_progress' | 'done';
  createdAt: string;
  author: string;
}

const INITIAL_POSTS: DemoPost[] = [
  {
    id: '1',
    title: 'Dark mode support',
    description: 'Would love to see a dark mode option to reduce eye strain during night time usage.',
    category: 'Feature',
    votes: 142,
    userVoted: false,
    comments: 8,
    status: 'planned',
    createdAt: '2 days ago',
    author: 'Sarah M.'
  },
  {
    id: '2',
    title: 'Mobile app for iOS',
    description: 'A native mobile app would make it much easier to manage feedback on the go.',
    category: 'Feature',
    votes: 89,
    userVoted: false,
    comments: 12,
    status: 'open',
    createdAt: '5 days ago',
    author: 'John D.'
  },
  {
    id: '3',
    title: 'Export feedback to CSV',
    description: 'Need ability to export all feedback data to CSV for reporting purposes.',
    category: 'Enhancement',
    votes: 67,
    userVoted: false,
    comments: 5,
    status: 'in_progress',
    createdAt: '1 week ago',
    author: 'Mike R.'
  },
  {
    id: '4',
    title: 'Slack integration',
    description: 'Get notifications in Slack when new feedback is submitted.',
    category: 'Integration',
    votes: 124,
    userVoted: false,
    comments: 15,
    status: 'open',
    createdAt: '3 days ago',
    author: 'Emma L.'
  },
  {
    id: '5',
    title: 'Custom branding options',
    description: 'Allow customization of colors, fonts, and logo to match our brand.',
    category: 'Feature',
    votes: 98,
    userVoted: false,
    comments: 7,
    status: 'planned',
    createdAt: '4 days ago',
    author: 'David K.'
  }
];

export default function InteractiveDemoPage() {
  const [posts, setPosts] = useState<DemoPost[]>(INITIAL_POSTS);
  const [selectedPost, setSelectedPost] = useState<DemoPost | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');
  
  // AI Features
  const [aiSentiment, setAiSentiment] = useState<any>(null);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  
  const [aiPriority, setAiPriority] = useState<any>(null);
  const [analyzingPriority, setAnalyzingPriority] = useState(false);
  
  const [aiDuplicate, setAiDuplicate] = useState<any>(null);
  const [analyzingDuplicate, setAnalyzingDuplicate] = useState(false);
  
  const [comment, setComment] = useState('');
  const [aiUsage, setAiUsage] = useState({ sentiment: 0, priority: 0, duplicate: 0 });

  const handleVote = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, votes: p.userVoted ? p.votes - 1 : p.votes + 1, userVoted: !p.userVoted };
      }
      return p;
    }));
    toast.success(posts.find(p => p.id === postId)?.userVoted ? 'Vote removed' : 'Voted! 🎉');
  };

  const analyzeSentiment = () => {
    if (aiUsage.sentiment >= 5) {
      toast.error('Demo limit reached (5/day). Upgrade to Pro for unlimited!');
      return;
    }
    
    setAnalyzingSentiment(true);
    setTimeout(() => {
      const sentiments = [
        { type: 'positive', emoji: '😊', color: 'text-green-600', label: 'Positive', confidence: 92 },
        { type: 'neutral', emoji: '😐', color: 'text-gray-600', label: 'Neutral', confidence: 78 },
        { type: 'negative', emoji: '😟', color: 'text-orange-600', label: 'Frustrated', confidence: 85 },
      ];
      const result = sentiments[Math.floor(Math.random() * sentiments.length)];
      setAiSentiment(result);
      setAiUsage(prev => ({ ...prev, sentiment: prev.sentiment + 1 }));
      setAnalyzingSentiment(false);
      toast.success('AI Sentiment Analysis complete!');
    }, 2000);
  };

  const analyzePriority = () => {
    if (aiUsage.priority >= 5) {
      toast.error('Demo limit reached (5/day). Upgrade to Pro for unlimited!');
      return;
    }
    
    setAnalyzingPriority(true);
    setTimeout(() => {
      const priorities = [
        { level: 'Critical', score: 95, color: 'text-red-600', bg: 'bg-red-50' },
        { level: 'High', score: 82, color: 'text-orange-600', bg: 'bg-orange-50' },
        { level: 'Medium', score: 64, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      ];
      const result = priorities[Math.floor(Math.random() * priorities.length)];
      setAiPriority(result);
      setAiUsage(prev => ({ ...prev, priority: prev.priority + 1 }));
      setAnalyzingPriority(false);
      toast.success('AI Priority Scoring complete!');
    }, 2000);
  };

  const checkDuplicates = () => {
    if (aiUsage.duplicate >= 10) {
      toast.error('Demo limit reached (10/day). Upgrade to Pro for unlimited!');
      return;
    }
    
    setAnalyzingDuplicate(true);
    setTimeout(() => {
      const hasDuplicates = Math.random() > 0.5;
      setAiDuplicate({
        found: hasDuplicates,
        count: hasDuplicates ? Math.floor(Math.random() * 3) + 1 : 0
      });
      setAiUsage(prev => ({ ...prev, duplicate: prev.duplicate + 1 }));
      setAnalyzingDuplicate(false);
      toast.success('AI Duplicate Check complete!');
    }, 1500);
  };

  const postComment = () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    toast.success('Comment posted! (Demo mode)');
    setComment('');
    if (selectedPost) {
      setPosts(posts.map(p => 
        p.id === selectedPost.id ? { ...p, comments: p.comments + 1 } : p
      ));
      setSelectedPost({ ...selectedPost, comments: selectedPost.comments + 1 });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'planned': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredPosts = posts
    .filter(p => filter === 'all' || p.status === filter)
    .sort((a, b) => sortBy === 'votes' ? b.votes - a.votes : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 animate-pulse" />
              <div>
                <div className="font-bold text-sm">🎯 Pro Demo - Try All AI Features!</div>
                <div className="text-xs text-white/90">
                  AI Usage: Sentiment ({aiUsage.sentiment}/5) • Priority ({aiUsage.priority}/5) • Duplicate ({aiUsage.duplicate}/10)
                </div>
              </div>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                Exit Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Product Feedback Board</h1>
              <p className="text-sm text-gray-600">Experience the full Pro dashboard</p>
            </div>
            <Link href="/">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters & Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search feedback..." className="pl-10" />
                </div>
              </div>
              <div className="flex gap-2">
                <select 
                  className="px-4 py-2 border rounded-lg"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select 
                  className="px-4 py-2 border rounded-lg"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="votes">Most Votes</option>
                  <option value="recent">Most Recent</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {filteredPosts.map(post => (
            <Card 
              key={post.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Vote Button */}
                  <div className="flex flex-col items-center">
                    <Button
                      size="sm"
                      variant={post.userVoted ? "default" : "outline"}
                      className="flex flex-col h-auto py-2 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(post.id);
                      }}
                    >
                      <ThumbsUp className="h-4 w-4 mb-1" />
                      <span className="text-xs font-semibold">{post.votes}</span>
                    </Button>
                  </div>

                  {/* Post Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-base">{post.title}</h3>
                      <Badge className={getStatusColor(post.status)}>
                        {post.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{post.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Badge variant="outline">{post.category}</Badge>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.createdAt}
                      </span>
                      <span>by {post.author}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Post Detail Modal */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-3xl mt-8 mb-8">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{selectedPost.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(selectedPost.status)}>
                        {selectedPost.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">{selectedPost.category}</Badge>
                      <span className="text-sm text-gray-500">by {selectedPost.author}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPost(null);
                      setAiSentiment(null);
                      setAiPriority(null);
                      setAiDuplicate(null);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <p className="text-gray-700">{selectedPost.description}</p>
                </div>

                {/* Vote Section */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Button
                    size="lg"
                    variant={selectedPost.userVoted ? "default" : "outline"}
                    onClick={() => handleVote(selectedPost.id)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    {selectedPost.userVoted ? 'Voted' : 'Vote'} ({selectedPost.votes})
                  </Button>
                  <div className="text-sm text-gray-600">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    {selectedPost.comments} comments
                  </div>
                </div>

                {/* AI Features */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">AI-Powered Analysis</h3>
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-xs">
                      Pro Feature
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    {/* Sentiment */}
                    <Card className="border-purple-200 bg-purple-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Smile className="h-4 w-4 text-purple-600" />
                          <h4 className="text-sm font-semibold">Sentiment</h4>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-purple-600 hover:bg-purple-700 mb-3"
                          onClick={analyzeSentiment}
                          disabled={analyzingSentiment || aiUsage.sentiment >= 5}
                        >
                          {analyzingSentiment ? (
                            <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Analyzing...</>
                          ) : (
                            <><Brain className="h-3 w-3 mr-2" />Analyze ({aiUsage.sentiment}/5)</>
                          )}
                        </Button>
                        {aiSentiment && (
                          <div className="p-3 bg-white rounded border">
                            <div className="text-2xl mb-1">{aiSentiment.emoji}</div>
                            <div className={`text-sm font-semibold ${aiSentiment.color}`}>
                              {aiSentiment.label}
                            </div>
                            <div className="text-xs text-gray-600">
                              {aiSentiment.confidence}% confidence
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Priority */}
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="h-4 w-4 text-orange-600" />
                          <h4 className="text-sm font-semibold">Priority</h4>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-orange-600 hover:bg-orange-700 mb-3"
                          onClick={analyzePriority}
                          disabled={analyzingPriority || aiUsage.priority >= 5}
                        >
                          {analyzingPriority ? (
                            <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Analyzing...</>
                          ) : (
                            <><Brain className="h-3 w-3 mr-2" />Analyze ({aiUsage.priority}/5)</>
                          )}
                        </Button>
                        {aiPriority && (
                          <div className={`p-3 ${aiPriority.bg} rounded border`}>
                            <div className={`text-2xl font-bold mb-1 ${aiPriority.color}`}>
                              {aiPriority.score}
                            </div>
                            <div className={`text-sm font-semibold ${aiPriority.color}`}>
                              {aiPriority.level}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Duplicates */}
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-blue-600" />
                          <h4 className="text-sm font-semibold">Duplicates</h4>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 mb-3"
                          onClick={checkDuplicates}
                          disabled={analyzingDuplicate || aiUsage.duplicate >= 10}
                        >
                          {analyzingDuplicate ? (
                            <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Checking...</>
                          ) : (
                            <><Brain className="h-3 w-3 mr-2" />Check ({aiUsage.duplicate}/10)</>
                          )}
                        </Button>
                        {aiDuplicate && (
                          <div className="p-3 bg-white rounded border">
                            {aiDuplicate.found ? (
                              <>
                                <div className="text-sm font-semibold text-orange-600 mb-1">
                                  {aiDuplicate.count} similar found
                                </div>
                                <div className="text-xs text-gray-600">
                                  Click to merge duplicates
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-green-600">✓ No duplicates</div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comments ({selectedPost.comments})
                  </h3>

                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add your comment... (Demo mode)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={postComment} disabled={!comment.trim()}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Post Comment
                    </Button>
                  </div>

                  {/* Sample Comment */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                        JD
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">Jane Doe</span>
                          <span className="text-xs text-gray-500">2 hours ago</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          This would be really helpful for our team! Looking forward to it.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

