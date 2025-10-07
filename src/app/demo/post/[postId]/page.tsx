'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  User,
  Clock,
  MessageSquare,
  Sparkles,
  Brain,
  AlertTriangle,
  TrendingUp,
  Loader2,
  CheckCircle,
  Smile,
  Layers,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import AIWritingAssistant from '@/components/AIWritingAssistant';

const POST_FEATURE_LIMITS = {
  sentiment: { limit: 10, label: 'sentiment analyses' },
  categorize: { limit: 10, label: 'AI categorizations' },
  priority: { limit: 10, label: 'priority scorings' },
  duplicate: { limit: 5, label: 'duplicate checks' },
  writingAssistant: { limit: 10, label: 'AI writing improvements' },
  comment: { limit: 10, label: 'new comments' },
  vote: { limit: 20, label: 'vote actions' }
} as const;

type PostFeatureKey = keyof typeof POST_FEATURE_LIMITS;

type PostFeatureUsage = Record<PostFeatureKey, { used: number; limit: number }>;

interface DemoPost {
  id: string;
  title: string;
  description: string;
  status: string;
  vote_count: number;
  user_voted: boolean;
  author: string;
  created_at: string;
  comments_count: number;
}

interface DemoComment {
  id: string;
  body: string;
  author: string;
  created_at: string;
}

const DEFAULT_COMMENTS: DemoComment[] = [
  {
    id: 'demo-comment-1',
    author: 'designer',
    body: 'This would be fantastic! Dark mode is essential for developer tools. I\'d love to help with the design if needed.',
    created_at: '2025-09-10T10:00:00Z'
  },
  {
    id: 'demo-comment-2',
    author: 'dev',
    body: 'Agreed! My eyes would thank you for this feature 😊',
    created_at: '2025-09-11T14:30:00Z'
  },
  {
    id: 'demo-comment-3',
    author: 'support lead',
    body: 'We receive 8+ tickets a week asking for a dark theme. This should reduce support volume immediately.',
    created_at: '2025-09-12T09:15:00Z'
  },
  {
    id: 'demo-comment-4',
    author: 'pm',
    body: 'Let\'s pair this with accessibility improvements so we hit AA contrast requirements.',
    created_at: '2025-09-13T16:45:00Z'
  }
];

export default function DemoPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const [post, setPost] = useState<DemoPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteCount, setVoteCount] = useState(0);
  const [userVoted, setUserVoted] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<DemoComment[]>([]);
  const [allPosts, setAllPosts] = useState<DemoPost[]>([]);

  const [aiCategory, setAiCategory] = useState<{ category: string; confidence: number; reasoning?: string } | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [aiPriority, setAiPriority] = useState<{ score: number; level: string; reasoning: string; action?: string; color?: string; bg?: string } | null>(null);
  const [isAnalyzingPriority, setIsAnalyzingPriority] = useState(false);
  const [aiDuplicates, setAiDuplicates] = useState<Array<{ id: string; title: string; similarity: number; reason?: string }>>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicatesAnalyzed, setDuplicatesAnalyzed] = useState(false);
  const [aiSentiment, setAiSentiment] = useState<{
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    score: number;
    summary: string;
    emotion: string;
    impact: string;
    urgency: string;
  } | null>(null);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);

  const createUsage = (): PostFeatureUsage => {
    const entries = Object.entries(POST_FEATURE_LIMITS).map(([key, config]) => [key, { used: 0, limit: config.limit }]);
    return Object.fromEntries(entries) as PostFeatureUsage;
  };

  const [featureUsage, setFeatureUsage] = useState<PostFeatureUsage>(() => createUsage());

  const checkLimit = (feature: PostFeatureKey) => {
    const usage = featureUsage[feature];
    if (!usage) return true;
    if (usage.used >= usage.limit) {
      toast.error(`Demo limit reached for ${POST_FEATURE_LIMITS[feature].label}. Please try again later.`);
      return false;
    }
    return true;
  };

  const recordUsage = (feature: PostFeatureKey, amount = 1) => {
    setFeatureUsage(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        used: Math.min(prev[feature].used + amount, prev[feature].limit)
      }
    }));
  };

  const uniqueComments = useMemo(() => {
    const seen = new Set<string>();
    return comments.filter((comment) => {
      const key = `${comment.author}-${comment.body}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [comments]);

  const getPriorityStyle = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
      case 'high':
      case 'high priority':
        return { color: 'text-red-600', bg: 'bg-red-50 border border-red-200' };
      case 'medium':
      case 'medium priority':
        return { color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-200' };
      default:
        return { color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-200' };
    }
  };

  useEffect(() => {
    const loadPostData = async () => {
      try {
        // Fetch the post data
        const postsResponse = await fetch('/api/demo/posts');
        if (!postsResponse.ok) {
          throw new Error('Failed to fetch posts');
        }
        
        const postsData = await postsResponse.json();
        const demoPosts = postsData.posts || [];
        setAllPosts(demoPosts);

        const foundPost = demoPosts.find((p: DemoPost) => p.id === postId);
        
        if (foundPost) {
          setPost(foundPost);
          setVoteCount(foundPost.vote_count);
          setUserVoted(foundPost.user_voted);
          
          // Fetch comments for this post (fallback to seeded demo data)
          try {
            const commentsResponse = await fetch(`/api/demo/posts/${postId}/comments`);
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json();
              if (commentsData.comments?.length) {
                setComments(commentsData.comments);
              } else {
                setComments(DEFAULT_COMMENTS);
              }
            } else {
              setComments(DEFAULT_COMMENTS);
            }
          } catch (error) {
            console.error('Error loading demo comments:', error);
            setComments(DEFAULT_COMMENTS);
          }
        }
      } catch (error) {
        console.error('Error loading post data:', error);
        setComments(DEFAULT_COMMENTS);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadPostData();
    }
  }, [postId]);

  const runSentimentAnalysis = () => {
    if (!post) return;

    if (!checkLimit('sentiment')) {
      return;
    }

    setIsAnalyzingSentiment(true);
    const text = `${post.title} ${post.description}`.toLowerCase();

    const positiveWords = ['love', 'great', 'amazing', 'thank', 'awesome', 'excited', 'delight', 'helpful'];
    const negativeWords = ['crash', 'broken', 'hate', 'pain', 'urgent', 'issue', 'problem', 'hard'];
    const urgencyWords = ['urgent', 'critical', 'blocker', 'important', 'now'];

    const scoreFor = (words: string[]) =>
      words.reduce((score, word) => (text.includes(word) ? score + 1 : score), 0);

    const positiveScore = scoreFor(positiveWords);
    const negativeScore = scoreFor(negativeWords);
    const urgencyScore = scoreFor(urgencyWords);

    const rawScore = 60 + positiveScore * 12 - negativeScore * 15 + urgencyScore * 5;
    const normalized = Math.max(0, Math.min(100, rawScore));

    let sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' = 'neutral';
    if (positiveScore > negativeScore + 1) sentiment = 'positive';
    else if (negativeScore > positiveScore + 1) sentiment = 'negative';
    else if (positiveScore > 0 && negativeScore > 0) sentiment = 'mixed';

    if (sentiment === 'neutral' && normalized >= 70) sentiment = 'positive';
    if (sentiment === 'neutral' && normalized <= 40) sentiment = 'negative';

    const emotion = sentiment === 'positive'
      ? 'Excitement'
      : sentiment === 'negative'
        ? 'Frustration'
        : sentiment === 'mixed'
          ? 'Conflicted'
          : 'Curiosity';

    const impact = post.vote_count >= 40
      ? 'High impact (40+ votes)'
      : post.vote_count >= 20
        ? 'Moderate impact'
        : 'Early traction';

    const urgency = urgencyScore >= 2
      ? 'Action needed this sprint'
      : urgencyScore === 1
        ? 'Review before next release'
        : 'Schedule in roadmap review';

    setTimeout(() => {
      setAiSentiment({
        sentiment,
        score: Math.round(normalized),
        summary: sentiment === 'positive'
          ? 'Customers are excited about this improvement and view it as a quality-of-life enhancement.'
          : sentiment === 'negative'
            ? 'Feedback feels urgent—users experience friction and are eager for relief.'
            : sentiment === 'mixed'
              ? 'There is enthusiasm, but users also highlight pain points to address.'
              : 'Tone is neutral—use this as an opportunity to delight users with polish.',
        emotion,
        impact,
        urgency
      });
      recordUsage('sentiment');
      setIsAnalyzingSentiment(false);
      toast.success('AI sentiment analysis complete');
    }, 600);
  };

  const runCategorization = async () => {
    if (!post) return;
    if (!checkLimit('categorize')) {
      return;
    }
    setIsCategorizing(true);
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: post.title,
          description: post.description,
          projectId: null,
          userTier: 'pro'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Categorization failed');
      }

      const data = await response.json();
      setAiCategory(data.result);
      recordUsage('categorize');
      toast.success(`AI categorized this as ${data.result.category}`);
    } catch (error) {
      console.error('Categorization error:', error);
      toast.error(error instanceof Error ? error.message : 'AI categorization unavailable');
    } finally {
      setIsCategorizing(false);
    }
  };

  const runPriorityScoring = async () => {
    if (!post) return;
    if (!checkLimit('priority')) {
      return;
    }
    setIsAnalyzingPriority(true);
    try {
      const metricsPayload = {
        voteCount: post.vote_count,
        commentCount: uniqueComments.length,
        uniqueVoters: Math.max(1, Math.round(post.vote_count * 0.8)),
        percentageOfActiveUsers: Math.min(75, Math.max(5, Math.round(post.vote_count / 2))),
        similarPostsCount: Math.max(aiDuplicates.length, 2)
      };

      const response = await fetch('/api/ai/priority-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post: {
            id: post.id,
            title: post.title,
            description: post.description,
            status: post.status,
            createdAt: post.created_at,
            category: 'feature'
          },
          metrics: metricsPayload,
          user: {
            tier: 'pro',
            companySize: '50-200',
            isChampion: true
          },
          businessContext: {
            currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
            companyStrategy: 'retention',
            upcomingMilestone: 'Pro launch demo'
          }
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Priority scoring failed');
      }

      const priorityLevel: string = data.score.priorityLevel;
      const styles = getPriorityStyle(priorityLevel);

      setAiPriority({
        score: Math.round((data.score.weightedScore || 0) * 10),
        level: priorityLevel,
        reasoning: data.score.businessJustification,
        action: data.score.suggestedAction,
        color: styles.color,
        bg: styles.bg
      });

      recordUsage('priority');
      toast.success('AI priority scoring complete');
    } catch (error) {
      console.error('Priority scoring error:', error);
      toast.error(error instanceof Error ? error.message : 'Priority scoring unavailable');
    } finally {
      setIsAnalyzingPriority(false);
    }
  };

  const runDuplicateCheck = async () => {
    if (!post) return;
    if (!checkLimit('duplicate')) {
      return;
    }
    setIsCheckingDuplicates(true);
    try {
      const existingPostsPayload = allPosts
        .filter(p => p.id !== post.id)
        .map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          voteCount: p.vote_count,
          createdAt: p.created_at
        }))
        .slice(0, 15);

      const response = await fetch('/api/ai/duplicate-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'single',
          newPost: {
            id: post.id,
            title: post.title,
            description: post.description,
            voteCount: post.vote_count,
            createdAt: post.created_at
          },
          existingPosts: existingPostsPayload,
          options: {
            threshold: 0.7,
            includeRelated: true,
            maxResults: 4
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Duplicate detection failed');
      }

      const mapped = (data.duplicates || []).map((dup: any, index: number) => ({
        id: dup.id || dup.postId || `dup-${index}`,
        title: dup.title,
        similarity: Math.round((dup.similarity || dup.similarityScore || 0) * 100),
        reason: dup.reason || dup.summary || 'Similar keywords and user intent'
      }));

      setAiDuplicates(mapped);
      setDuplicatesAnalyzed(true);
      recordUsage('duplicate');
      toast.success(mapped.length ? `Found ${mapped.length} potential duplicates` : 'No duplicates detected');
    } catch (error) {
      console.error('Duplicate detection error:', error);
      toast.error(error instanceof Error ? error.message : 'Duplicate detection unavailable');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleVote = () => {
    if (userVoted) {
      setVoteCount(prev => Math.max(0, prev - 1));
      setUserVoted(false);
      toast.success('Vote removed');
    } else {
      if (!checkLimit('vote')) {
        return;
      }
      setVoteCount(prev => prev + 1);
      setUserVoted(true);
      recordUsage('vote');
      toast.success('Thanks for voting!');
    }
  };

  const handleCommentSubmit = () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment before posting');
      return;
    }

    if (!checkLimit('comment')) {
      return;
    }

    const comment: DemoComment = {
      id: `local-${Date.now()}`,
      author: 'You',
      body: newComment.trim(),
      created_at: new Date().toISOString()
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
    recordUsage('comment');
    toast.success('Comment added');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
            <p className="text-gray-600 mb-6">The requested post could not be found.</p>
            <Button asChild>
              <Link href="/demo/board">← Back to Demo Board</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/demo/board">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Board
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Demo Post Details</h1>
                <p className="text-gray-600 mt-1">Interactive demo of post comments and voting</p>
              </div>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              Demo Mode
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Post Content */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-semibold text-gray-900">{post.title}</h2>
                  <Badge className={getStatusColor(post.status)}>
                    {post.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4 text-lg">{post.description}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-500">
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
                  {uniqueComments.length} comments
                </div>
              </div>

              <button
                onClick={handleVote}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-md transition-colors ${
                  userVoted 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
                disabled={!userVoted && featureUsage.vote.used >= featureUsage.vote.limit}
              >
                <svg className="w-5 h-5 mb-1" fill={userVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
                <span className="font-medium">{voteCount}</span>
                {userVoted && (
                  <div className="text-xs text-blue-600 mt-1">Voted</div>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* AI Command Center */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">AI control room</h2>
            <span className="text-sm text-gray-500">Run the exact automations your admins see in production.</span>
          </div>
          <div className="text-xs text-gray-500 bg-white/70 border border-gray-200 rounded-lg px-4 py-2 flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-semibold text-gray-700">Demo limits</span>
            <span>Sentiment ({featureUsage.sentiment.used}/{featureUsage.sentiment.limit})</span>
            <span>Categorize ({featureUsage.categorize.used}/{featureUsage.categorize.limit})</span>
            <span>Priority ({featureUsage.priority.used}/{featureUsage.priority.limit})</span>
            <span>Duplicates ({featureUsage.duplicate.used}/{featureUsage.duplicate.limit})</span>
            <span>AI writing ({featureUsage.writingAssistant.used}/{featureUsage.writingAssistant.limit})</span>
            <span>Comments ({featureUsage.comment.used}/{featureUsage.comment.limit})</span>
            <span>Votes ({featureUsage.vote.used}/{featureUsage.vote.limit})</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Sentiment Card */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <Smile className="h-4 w-4 text-purple-600" />
                  Sentiment & emotion analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={runSentimentAnalysis}
                  disabled={isAnalyzingSentiment || featureUsage.sentiment.used >= featureUsage.sentiment.limit}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {isAnalyzingSentiment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing feedback tone…
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Run sentiment intelligence ({featureUsage.sentiment.used}/{featureUsage.sentiment.limit})
                    </>
                  )}
                </Button>

                {aiSentiment ? (
                  <div className="rounded-lg border border-purple-200 bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-purple-100 text-purple-700">{aiSentiment.sentiment.toUpperCase()}</Badge>
                      <span className="text-sm font-semibold text-purple-700">{aiSentiment.score}/100</span>
                    </div>
                    <p className="text-sm text-gray-700">{aiSentiment.summary}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="rounded-md bg-purple-50 px-3 py-2">
                        <p className="font-semibold text-purple-700">Emotion</p>
                        <p>{aiSentiment.emotion}</p>
                      </div>
                      <div className="rounded-md bg-blue-50 px-3 py-2">
                        <p className="font-semibold text-blue-700">Impact</p>
                        <p>{aiSentiment.impact}</p>
                      </div>
                      <div className="rounded-md bg-amber-50 px-3 py-2">
                        <p className="font-semibold text-amber-700">Urgency</p>
                        <p>{aiSentiment.urgency}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Discover how users feel about this request, which emotion it triggers, and where it fits in your roadmap.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Categorization Card */}
            <Card className="border-indigo-200 bg-indigo-50/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  Auto-categorization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={runCategorization}
                  disabled={isCategorizing || featureUsage.categorize.used >= featureUsage.categorize.limit}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {isCategorizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Thinking like your PM…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Categorize with AI ({featureUsage.categorize.used}/{featureUsage.categorize.limit})
                    </>
                  )}
                </Button>

                {aiCategory ? (
                  <div className="rounded-lg border border-indigo-200 bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-indigo-100 text-indigo-700">{aiCategory.category}</Badge>
                      <span className="text-sm text-indigo-700 font-medium">{(aiCategory.confidence * 100).toFixed(0)}% confidence</span>
                    </div>
                    {aiCategory.reasoning && (
                      <p className="text-sm text-gray-700">{aiCategory.reasoning}</p>
                    )}
                    <p className="text-xs text-gray-500">This drives routing rules, ownership, and analytics.</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">AI instantly matches feedback to one of your SaaS categories and explains why, so the right squad picks it up.</p>
                )}
              </CardContent>
            </Card>

            {/* Priority Scoring */}
            <Card className="border-amber-200 bg-amber-50/60 md:col-span-2">
              <CardHeader className="pb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <Target className="h-4 w-4 text-amber-600" />
                  Priority scoring (7-factor)
                </CardTitle>
                <Button
                  onClick={runPriorityScoring}
                  disabled={isAnalyzingPriority || featureUsage.priority.used >= featureUsage.priority.limit}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  {isAnalyzingPriority ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Calculating weighted score…
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analyze priority ({featureUsage.priority.used}/{featureUsage.priority.limit})
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiPriority ? (
                  <div className={`rounded-lg p-4 ${aiPriority.bg ?? 'bg-white border border-amber-200'}`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Suggested action</p>
                        <p className="text-lg font-bold text-gray-900 capitalize">{aiPriority.action || 'investigate'}</p>
                        <Badge variant="outline" className="mt-2 text-xs uppercase tracking-wide text-gray-600">
                          {aiPriority.level.replace(/-/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${aiPriority.color ?? 'text-amber-600'}`}>{aiPriority.score}</p>
                        <p className="text-xs text-gray-500">Composite score / 100</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mt-3">{aiPriority.reasoning}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">AI looks at revenue impact, reach, strategic alignment, effort, competition, risk, and satisfaction—then tells you where to slot this work.</p>
                )}
              </CardContent>
            </Card>

            {/* Duplicate Detection */}
            <Card className="border-blue-200 bg-blue-50/60 md:col-span-2">
              <CardHeader className="pb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  Duplicate detection
                </CardTitle>
                <Button
                  onClick={runDuplicateCheck}
                  disabled={isCheckingDuplicates || featureUsage.duplicate.used >= featureUsage.duplicate.limit}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {isCheckingDuplicates ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching related feedback…
                    </>
                  ) : (
                    <>
                      <Layers className="h-4 w-4 mr-2" />
                      Check for duplicates ({featureUsage.duplicate.used}/{featureUsage.duplicate.limit})
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiDuplicates.length > 0 ? (
                  <div className="space-y-3">
                    {aiDuplicates.map(dup => (
                      <div key={dup.id} className="rounded-lg border border-blue-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">{dup.title}</h4>
                          <Badge className="bg-blue-100 text-blue-700">{dup.similarity}% match</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{dup.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : duplicatesAnalyzed ? (
                  <div className="rounded-lg border border-blue-200 bg-white p-4 text-sm text-blue-700">
                    <CheckCircle className="inline h-4 w-4 mr-2 text-blue-600" />
                    No close duplicates detected. Great job keeping your board tidy!
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Spot similar requests instantly and merge them in one click. Helps consolidate votes and keep customers aligned.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Comment */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Add a Comment</h3>
            <div className="space-y-4">
              <Textarea
                placeholder="Share your thoughts on this post..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <AIWritingAssistant
                currentText={newComment}
                context={`Post title: ${post.title}. Sentiment score: ${aiSentiment?.score ?? 'pending'}. Priority: ${aiPriority?.level ?? 'unknown'}`}
                onTextImprove={setNewComment}
                usage={featureUsage.writingAssistant}
                onCheckLimit={() => checkLimit('writingAssistant')}
                onUsage={() => recordUsage('writingAssistant')}
              />
              <Button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || featureUsage.comment.used >= featureUsage.comment.limit}
              >
                Post Comment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Comments ({uniqueComments.length})</h3>
          {uniqueComments.length === 0 ? (
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          ) : (
            uniqueComments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-gray-700">{comment.body}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
