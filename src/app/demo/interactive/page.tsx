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
  commentsList?: Comment[];
}

interface Comment {
  id: string;
  author: string;
  text: string;
  time: string;
}

const INITIAL_POSTS: DemoPost[] = [
  {
    id: '1',
    title: 'Dark mode support',
    description: 'Would love to see a dark mode option to reduce eye strain during night time usage.',
    category: 'Feature',
    votes: 142,
    userVoted: false,
    comments: 2,
    status: 'planned',
    createdAt: '2 days ago',
    author: 'Sarah M.',
    commentsList: [
      { id: 'c1', author: 'Jane Doe', text: 'This would be really helpful for our team! Looking forward to it.', time: '2 hours ago' },
      { id: 'c2', author: 'Mike Johnson', text: 'Yes please! My eyes would thank you 😊', time: '5 hours ago' }
    ]
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
  
  // Submit Feedback Form
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [newFeedback, setNewFeedback] = useState({ title: '', description: '' });
  const [aiAssistant, setAiAssistant] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // AI Features
  const [aiSentiment, setAiSentiment] = useState<{
    label: string;
    emoji: string;
    color: string;
    confidence: number;
    reasoning: string;
    category: string;
    urgency: string;
    tags: string[];
  } | null>(null);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  
  const [aiPriority, setAiPriority] = useState<{
    score: number;
    level: string;
    color: string;
    bg: string;
    reasoning: string;
    action: string;
  } | null>(null);
  const [analyzingPriority, setAnalyzingPriority] = useState(false);
  
  const [aiDuplicate, setAiDuplicate] = useState<{
    found: boolean;
    duplicates: Array<{ post: { id: string; title: string; description: string }; analysis: any }>;
    metadata?: Record<string, unknown>;
  } | null>(null);
  const [analyzingDuplicate, setAnalyzingDuplicate] = useState(false);
  
  const [comment, setComment] = useState('');

  const DEMO_LIMITS = {
    sentiment: 10,
    priority: 10,
    duplicate: 5,
    assistant: 10
  } as const;

  type DemoUsageKey = keyof typeof DEMO_LIMITS;
  type UsageState = Record<DemoUsageKey, { used: number; limit: number }>;

  const buildInitialUsage = (): UsageState => ({
    sentiment: { used: 0, limit: DEMO_LIMITS.sentiment },
    priority: { used: 0, limit: DEMO_LIMITS.priority },
    duplicate: { used: 0, limit: DEMO_LIMITS.duplicate },
    assistant: { used: 0, limit: DEMO_LIMITS.assistant }
  });

  const [aiUsage, setAiUsage] = useState<UsageState>(buildInitialUsage);

  const updateUsage = (feature: DemoUsageKey, usage?: { limit?: number; remaining?: number }) => {
    if (!usage) return;
    setAiUsage(prev => {
      const limit = usage.limit ?? prev[feature].limit;
      const remaining = usage.remaining ?? Math.max(limit - prev[feature].used, 0);
      const used = Math.min(limit, limit - Math.max(remaining, 0));
      return {
        ...prev,
        [feature]: { limit, used }
      };
    });
  };

  const deriveUserTier = (post: DemoPost): 'free' | 'pro' | 'enterprise' => {
    if (post.votes >= 120) return 'enterprise';
    if (post.votes >= 60) return 'pro';
    return 'free';
  };

  const buildDemoMetrics = (post: DemoPost) => {
    const similarCount = posts.filter(p => p.id !== post.id && p.category === post.category).length;
    return {
      voteCount: post.votes,
      commentCount: post.comments,
      uniqueVoters: Math.max(1, Math.round(post.votes * 0.8)),
      percentageOfActiveUsers: Math.min(75, Math.max(5, Math.round(post.votes / 2))),
      similarPostsCount: similarCount
    };
  };

  const mapCategorizationToSentiment = (result: any) => {
    if (!result) return null;
    const urgency = result.urgencyLevel;
    let label = 'Neutral';
    let emoji = '😐';
    let color = 'text-yellow-600';

    if (urgency === 'critical' || urgency === 'high') {
      label = 'Frustrated';
      emoji = '😟';
      color = 'text-red-600';
    } else if (urgency === 'low') {
      label = 'Positive';
      emoji = '😊';
      color = 'text-green-600';
    }

    const confidence = Math.round((result.confidence || 0) * 100);

    return {
      label,
      emoji,
      color,
      confidence,
      reasoning: result.reasoning,
      category: result.primaryCategory,
      urgency: result.urgencyLevel,
      tags: result.suggestedTags || []
    };
  };

  const priorityStyles: Record<string, { color: string; bg: string }> = {
    immediate: { color: 'text-red-600', bg: 'bg-red-50' },
    'current-quarter': { color: 'text-orange-600', bg: 'bg-orange-50' },
    'next-quarter': { color: 'text-yellow-600', bg: 'bg-yellow-50' },
    backlog: { color: 'text-gray-600', bg: 'bg-gray-100' },
    declined: { color: 'text-gray-500', bg: 'bg-gray-50' }
  };

  const getPriorityStyle = (level: string) => priorityStyles[level] || priorityStyles.backlog;

  const handleVote = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, votes: p.userVoted ? p.votes - 1 : p.votes + 1, userVoted: !p.userVoted };
      }
      return p;
    }));
    toast.success(posts.find(p => p.id === postId)?.userVoted ? 'Vote removed' : 'Voted! 🎉');
  };

  const analyzeSentiment = async () => {
    if (!selectedPost) {
      toast.error('Select a feedback post to analyze');
      return;
    }

    if (aiUsage.sentiment.used >= aiUsage.sentiment.limit) {
      toast.error(`Demo limit reached (${aiUsage.sentiment.limit} per hour).`);
      return;
    }

    setAnalyzingSentiment(true);
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedPost.title,
          description: selectedPost.description,
          userTier: deriveUserTier(selectedPost),
          voteCount: selectedPost.votes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to analyze sentiment');
      }

      const sentiment = mapCategorizationToSentiment(data.result);
      if (sentiment) {
        setAiSentiment(sentiment);
        toast.success('AI Sentiment Analysis complete!');
      }

      updateUsage('sentiment', data.usage);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze sentiment');
    } finally {
      setAnalyzingSentiment(false);
    }
  };

  const analyzePriority = async () => {
    if (!selectedPost) {
      toast.error('Select a feedback post to analyze');
      return;
    }

    if (aiUsage.priority.used >= aiUsage.priority.limit) {
      toast.error(`Demo limit reached (${aiUsage.priority.limit} per hour).`);
      return;
    }

    setAnalyzingPriority(true);
    try {
      const metricsPayload = buildDemoMetrics(selectedPost);
      const response = await fetch('/api/ai/priority-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post: {
            id: selectedPost.id,
            title: selectedPost.title,
            description: selectedPost.description,
            category: selectedPost.category,
            createdAt: new Date().toISOString()
          },
          metrics: metricsPayload,
          user: {
            tier: deriveUserTier(selectedPost),
            isChampion: selectedPost.votes > 75
          },
          businessContext: {
            currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
            companyStrategy: 'retention',
            upcomingMilestone: 'Public Demo Showcase'
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to analyze priority');
      }

      const priorityLevel: string = data.score.priorityLevel;
      const styles = getPriorityStyle(priorityLevel);
      setAiPriority({
        score: Math.round(data.score.weightedScore * 10),
        level: priorityLevel,
        color: styles.color,
        bg: styles.bg,
        reasoning: data.score.businessJustification,
        action: data.score.suggestedAction
      });
      updateUsage('priority', data.usage);
      toast.success('AI Priority Scoring complete!');
    } catch (error) {
      console.error('Priority scoring error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze priority');
    } finally {
      setAnalyzingPriority(false);
    }
  };

  const checkDuplicates = async () => {
    if (!selectedPost) {
      toast.error('Select a feedback post to analyze');
      return;
    }

    if (aiUsage.duplicate.used >= aiUsage.duplicate.limit) {
      toast.error(`Demo limit reached (${aiUsage.duplicate.limit} per hour).`);
      return;
    }

    setAnalyzingDuplicate(true);
    try {
      const existingPostsPayload = posts
        .filter(p => p.id !== selectedPost.id)
        .map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          voteCount: p.votes,
          createdAt: new Date().toISOString()
        }));

      const response = await fetch('/api/ai/duplicate-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          newPost: {
            id: selectedPost.id,
            title: selectedPost.title,
            description: selectedPost.description,
            category: selectedPost.category,
            voteCount: selectedPost.votes,
            createdAt: new Date().toISOString()
          },
          existingPosts: existingPostsPayload,
          options: {
            threshold: 0.7,
            includeRelated: true,
            maxResults: 5
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to check duplicates');
      }

      setAiDuplicate({
        found: data.duplicates?.length > 0,
        duplicates: data.duplicates || [],
        metadata: data.metadata
      });
      updateUsage('duplicate', data.usage);
      toast.success('AI Duplicate Check complete!');
    } catch (error) {
      console.error('Duplicate detection error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to check duplicates');
    } finally {
      setAnalyzingDuplicate(false);
    }
  };

  const enhanceWithAI = async () => {
    if (aiUsage.assistant.used >= aiUsage.assistant.limit) {
      toast.error(`Demo limit reached (${aiUsage.assistant.limit} per hour).`);
      return;
    }

    const sourceText = comment || newFeedback.description || selectedPost?.description || '';
    if (!sourceText.trim()) {
      toast.error('Please enter some text first');
      return;
    }

    const contextTitle = selectedPost?.title || newFeedback.title || 'Feedback';
    const category = (selectedPost?.category || 'general').toLowerCase();

    try {
      setGeneratingAI(true);
      const response = await fetch('/api/ai/smart-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: contextTitle,
          description: sourceText,
          category,
          userTier: selectedPost ? deriveUserTier(selectedPost) : 'free',
          voteCount: selectedPost?.votes || 0
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to generate AI assistance');
      }

      const replies = data.replies || [];
      const enhanced = replies.map((reply: { text: string }) => `• ${reply.text}`).join('\n');
      setAiAssistant(enhanced);
      updateUsage('assistant', data.usage);
      toast.success('AI enhanced your text!');
    } catch (error) {
      console.error('Smart replies error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI assistance');
    } finally {
      setGeneratingAI(false);
    }
  };

  const useAIText = () => {
    if (selectedPost && aiAssistant) {
      setComment(aiAssistant);
    } else if (aiAssistant) {
      setNewFeedback({ ...newFeedback, description: aiAssistant });
    }
    setAiAssistant('');
    toast.success('Applied AI-enhanced text!');
  };

  const postComment = () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    if (selectedPost) {
      const newComment: Comment = {
        id: `c${Date.now()}`,
        author: 'Demo User',
        text: comment,
        time: 'Just now'
      };
      
      const updatedPost = {
        ...selectedPost,
        comments: selectedPost.comments + 1,
        commentsList: [newComment, ...(selectedPost.commentsList || [])]
      };
      
      setPosts(posts.map(p => 
        p.id === selectedPost.id ? updatedPost : p
      ));
      setSelectedPost(updatedPost);
      setComment('');
      toast.success('Comment posted!');
    }
  };

  const submitFeedback = () => {
    if (!newFeedback.title.trim() || !newFeedback.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const newPost: DemoPost = {
      id: `${Date.now()}`,
      title: newFeedback.title,
      description: newFeedback.description,
      category: 'Feature',
      votes: 1,
      userVoted: true,
      comments: 0,
      status: 'open',
      createdAt: 'Just now',
      author: 'Demo User',
      commentsList: []
    };

    setPosts([newPost, ...posts]);
    setNewFeedback({ title: '', description: '' });
    setShowSubmitForm(false);
    toast.success('Feedback submitted! 🎉');
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
                  AI Usage: Sentiment ({aiUsage.sentiment.used}/{aiUsage.sentiment.limit}) • Priority ({aiUsage.priority.used}/{aiUsage.priority.limit}) • Duplicate ({aiUsage.duplicate.used}/{aiUsage.duplicate.limit}) • Assistant ({aiUsage.assistant.used}/{aiUsage.assistant.limit})
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

      {/* Redirect hint to enhanced AI board */}
      <div className="border-y bg-blue-50/80">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-blue-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>Looking for the full AI showcase? Our new demo board has dedicated AI tabs and test lab.</span>
          </div>
          <Link href="/demo/board">
            <Button size="sm" variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-100">
              Open AI Demo Board
            </Button>
          </Link>
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
            <div className="flex gap-3">
              <Link href="/demo/board">
                <Button variant="outline" className="hidden md:inline-flex border-purple-300 text-purple-700 hover:bg-purple-50">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Demo Board
                </Button>
              </Link>
              <Button
                onClick={() => setShowSubmitForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Feedback
              </Button>
              <Link href="/">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
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
                          disabled={
                            analyzingSentiment ||
                            aiUsage.sentiment.used >= aiUsage.sentiment.limit
                          }
                        >
                          {analyzingSentiment ? (
                            <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Analyzing...</>
                          ) : (
                            <>
                              <Brain className="h-3 w-3 mr-2" />Analyze ({aiUsage.sentiment.used}/{aiUsage.sentiment.limit})
                            </>
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
                          disabled={
                            analyzingPriority ||
                            aiUsage.priority.used >= aiUsage.priority.limit
                          }
                        >
                          {analyzingPriority ? (
                            <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Analyzing...</>
                          ) : (
                            <>
                              <Brain className="h-3 w-3 mr-2" />Analyze ({aiUsage.priority.used}/{aiUsage.priority.limit})
                            </>
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
                          disabled={
                            analyzingDuplicate ||
                            aiUsage.duplicate.used >= aiUsage.duplicate.limit
                          }
                        >
                          {analyzingDuplicate ? (
                            <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Checking...</>
                          ) : (
                            <>
                              <Brain className="h-3 w-3 mr-2" />Check ({aiUsage.duplicate.used}/{aiUsage.duplicate.limit})
                            </>
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
                    <div className="relative">
                      <Textarea
                        placeholder="Add your comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="pr-12"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={enhanceWithAI}
                        disabled={
                          generatingAI ||
                          !comment.trim() ||
                          aiUsage.assistant.used >= aiUsage.assistant.limit
                        }
                        title="AI Writing Assistant"
                      >
                        {generatingAI ? (
                          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-purple-600" />
                        )}
                      </Button>
                    </div>
                    
                    {aiAssistant && selectedPost && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-semibold text-purple-900">AI Enhanced</span>
                          </div>
                          <Button size="sm" onClick={useAIText}>
                            Use This
                          </Button>
                        </div>
                        <p className="text-sm text-gray-700">{aiAssistant}</p>
                      </div>
                    )}
                    
                    <Button onClick={postComment} disabled={!comment.trim()}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Post Comment
                    </Button>
                  </div>

                  {/* All Comments */}
                  <div className="space-y-3 pt-4 border-t">
                    {selectedPost.commentsList && selectedPost.commentsList.length > 0 ? (
                      selectedPost.commentsList.map((c) => (
                        <div key={c.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                              {c.author.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{c.author}</span>
                                <span className="text-xs text-gray-500">{c.time}</span>
                              </div>
                              <p className="text-sm text-gray-700">{c.text}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No comments yet. Be the first!</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submit Feedback Modal */}
        {showSubmitForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl mt-8 mb-8">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-2">Submit Feedback</CardTitle>
                    <p className="text-sm text-gray-600">Share your ideas to improve our product</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSubmitForm(false);
                      setNewFeedback({ title: '', description: '' });
                      setAiAssistant('');
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Title *</label>
                  <Input
                    placeholder="Brief summary of your feedback..."
                    value={newFeedback.title}
                    onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold">Description *</label>
                    <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI Assistant
                    </Badge>
                  </div>
                  <div className="relative">
                    <Textarea
                      placeholder="Describe your feedback in detail..."
                      value={newFeedback.description}
                      onChange={(e) => setNewFeedback({ ...newFeedback, description: e.target.value })}
                      rows={5}
                      className="pr-12"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={enhanceWithAI}
                      disabled={
                        generatingAI ||
                        !newFeedback.description.trim() ||
                        aiUsage.assistant.used >= aiUsage.assistant.limit
                      }
                      title="Enhance with AI"
                    >
                      {generatingAI ? (
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-purple-600" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ✨ Click the sparkle icon to enhance your description with AI
                  </p>
                </div>

                {aiAssistant && !selectedPost && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-900">AI Enhanced Version</span>
                      </div>
                      <Button size="sm" onClick={useAIText}>
                        Use This
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiAssistant}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={submitFeedback}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!newFeedback.title.trim() || !newFeedback.description.trim()}
                  >
                    Submit Feedback
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSubmitForm(false);
                      setNewFeedback({ title: '', description: '' });
                      setAiAssistant('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
