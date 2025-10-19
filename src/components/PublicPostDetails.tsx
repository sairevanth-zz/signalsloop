'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/CategoryBadge';
import {
  MessageSquare,
  Calendar,
  Clock,
  User,
  LogIn,
  Settings,
  Home,
  Share2,
  Heart,
  ExternalLink,
  ArrowLeft,
  Twitter,
  Facebook,
  Link as LinkIcon,
  UserPlus,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import AIWritingAssistant from './AIWritingAssistant';
import MentionTextarea from './MentionTextarea';
import AIPostIntelligence from './AIPostIntelligence';
import AIAutoResponse from './AIAutoResponse';
import VoteOnBehalfModal from './VoteOnBehalfModal';
import { AIDuplicateDetection } from '@/components/AIDuplicateDetection';
import { useAuth } from '@/hooks/useAuth';
import { useAIUsage } from '@/hooks/useAIUsage';
import { getSupabaseClient } from '@/lib/supabase-client';
import VoteButton, { VoteStats, VoteStatsSnapshot } from '@/components/VoteButton';
import { PriorityMixCompact } from '@/components/PriorityMix';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  custom_domain?: string;
  is_private?: boolean;
  plan: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  description: string;
  category: string;
  vote_count: number;
  must_have_votes?: number;
  important_votes?: number;
  nice_to_have_votes?: number;
  created_at: string;
  author_email?: string;
  status: string;
  project_id: string;
  duplicate_of?: string | null;
}

interface PublicPostDetailsProps {
  project: Project;
  post: Post;
  relatedPosts: Post[];
  mergedDuplicates?: Array<{
    id: string;
    title: string;
    status: string;
    vote_count: number | null;
    created_at: string;
  }>;
  canonicalPost?: {
    id: string;
    title: string;
    status: string;
    vote_count: number | null;
    created_at: string;
  } | null;
}

export default function PublicPostDetails({
  project,
  post,
  relatedPosts,
  mergedDuplicates = [],
  canonicalPost = null
}: PublicPostDetailsProps) {
  const { user, loading: authLoading } = useAuth();
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(post.vote_count);
  const [priorityMix, setPriorityMix] = useState({
    mustHave: post.must_have_votes ?? 0,
    important: post.important_votes ?? 0,
    niceToHave: post.nice_to_have_votes ?? 0,
  });
  const handlePriorityStatsChange = useCallback((next: VoteStatsSnapshot) => {
    setPriorityMix({
      mustHave: next.mustHave,
      important: next.important,
      niceToHave: next.niceToHave,
    });
    setVoteCount((prev) => (prev === next.totalVotes ? prev : next.totalVotes));
  }, []);
  const [analyzingPriority, setAnalyzingPriority] = useState(false);
  const [priorityResults, setPriorityResults] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isVoteOnBehalfModalOpen, setIsVoteOnBehalfModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerCheckLoading, setOwnerCheckLoading] = useState(true);

  const {
    usageInfo: priorityUsage,
    refreshUsage: refreshPriorityUsage,
    setUsageInfo: setPriorityUsageInfo
  } = useAIUsage(project.id, 'priority_scoring');
  const priorityLimitReached = Boolean(priorityUsage && !priorityUsage.isPro && priorityUsage.remaining <= 0);
  const createdDate = new Date(post.created_at);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
  const statusLabel = post.status === 'in_progress'
    ? 'In Progress'
    : post.status.charAt(0).toUpperCase() + post.status.slice(1);
  const mergedDuplicatePosts = mergedDuplicates || [];
  const isMergedDuplicate = Boolean(post.duplicate_of);
  const canonicalLink = canonicalPost ? `/${project.slug}/post/${canonicalPost.id}` : null;

  // Load voted status from localStorage
  useEffect(() => {
    const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
    setHasVoted(voted.includes(post.id));
  }, [post.id, project.id]);

  // Check if current user is project owner using direct Supabase query
  useEffect(() => {
    const checkOwner = async () => {
      try {
        setOwnerCheckLoading(true);
        
        if (!user) {
          setIsOwner(false);
          setOwnerCheckLoading(false);
          return;
        }

        // Query Supabase directly to check if user is owner
        const supabase = getSupabaseClient();
        const { data: projectData, error } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('slug', project.slug)
          .single();

        if (error) {
          console.error('Error fetching project:', error);
          setIsOwner(false);
        } else {
          const isProjectOwner = projectData?.owner_id === user.id;
          setIsOwner(isProjectOwner);
        }
      } catch (error) {
        console.error('Owner check error:', error);
        setIsOwner(false);
      } finally {
        setOwnerCheckLoading(false);
      }
    };

    if (!authLoading) {
      checkOwner();
    }
  }, [user, project.slug, authLoading]);

  // Load comments function
  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const response = await fetch(`/api/posts/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [post.id]);

  const handleAnalyzePriority = async () => {
    if (isMergedDuplicate) {
      toast.info('AI analysis is disabled for merged posts.');
      return;
    }

    setAnalyzingPriority(true);
    setPriorityResults(null);
    try {
      const usage = await refreshPriorityUsage({ silent: true });
      if (usage && !usage.allowed) {
        toast.error('Free tier limit reached. Upgrade to Pro for unlimited priority analyses!');
        return;
      }

      const response = await fetch('/api/ai/priority-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          projectId: project.id,
          post: {
            id: post.id,
            title: post.title,
            description: post.description || '',
            category: post.category || null,
            createdAt: post.created_at
          }
        })
      });

      const data = await response.json();
      if (response.ok) {
        const score = data.score;
        setPriorityResults({
          score: Math.round(score.weightedScore * 10),
          level: score.priorityLevel,
          reasoning: score.businessJustification
        });
        await refreshPriorityUsage({ silent: true });
      } else {
        if (response.status === 429) {
          setPriorityUsageInfo({ ...data, allowed: false });
          toast.error(
            data.message || 'You have reached the monthly limit for priority analyses.'
          );
          return;
        }
        toast.error(data.message || data.error || 'Failed to analyze priority');
      }
    } catch (error) {
      console.error('Priority analysis error:', error);
      toast.error('Failed to analyze priority');
    } finally {
      setAnalyzingPriority(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [commentText, setCommentText] = useState('');
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentFormRef = useRef<HTMLDivElement>(null);

  const handleSubmitComment = async () => {
    if (isMergedDuplicate) {
      toast.info('Comments are disabled for merged posts.');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!commentName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!commentEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentText,
          name: commentName,
          email: commentEmail || null,
          parent_id: null
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newComment = data.comment;

        // Process mentions
        try {
          const mentionsResponse = await fetch('/api/comments/mentions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              commentId: newComment.id,
              commentText: commentText,
              postId: post.id,
              projectId: project.id
            })
          });

          if (mentionsResponse.ok) {
            const mentionsData = await mentionsResponse.json();

            // Send email notifications to mentioned users
            if (mentionsData.mentions && mentionsData.mentions.length > 0) {
              for (const mention of mentionsData.mentions) {
                await fetch('/api/emails/mention-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    mentionedEmail: mention.mentioned_user_email,
                    mentionedName: mention.mentioned_user_name,
                    commenterName: commentName,
                    commentText: commentText,
                    postTitle: post.title,
                    postUrl: `${window.location.origin}/${project.slug}/post/${post.id}`,
                    projectName: project.name
                  })
                });
              }
            }
          }
        } catch (error) {
          console.error('Error processing mentions:', error);
          // Don't fail the comment if mentions fail
        }

        toast.success('Comment posted successfully');
        setCommentText('');
        setCommentName('');
        setCommentEmail('');
        // Add the new comment to the list
        setComments([...comments, newComment]);
      } else {
        toast.error('Failed to post comment');
      }
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (isMergedDuplicate) {
      toast.info('Replies are disabled for merged posts.');
      return;
    }

    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    if (!replyName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!replyEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText,
          name: replyName,
          email: replyEmail || null,
          parent_id: parentId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newReply = data.comment;

        // Process mentions in reply
        try {
          const mentionsResponse = await fetch('/api/comments/mentions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              commentId: newReply.id,
              commentText: replyText,
              postId: post.id,
              projectId: project.id
            })
          });

          if (mentionsResponse.ok) {
            const mentionsData = await mentionsResponse.json();

            // Send email notifications to mentioned users
            if (mentionsData.mentions && mentionsData.mentions.length > 0) {
              for (const mention of mentionsData.mentions) {
                await fetch('/api/emails/mention-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    mentionedEmail: mention.mentioned_user_email,
                    mentionedName: mention.mentioned_user_name,
                    commenterName: replyName,
                    commentText: replyText,
                    postTitle: post.title,
                    postUrl: `${window.location.origin}/${project.slug}/post/${post.id}`,
                    projectName: project.name
                  })
                });
              }
            }
          }
        } catch (error) {
          console.error('Error processing mentions:', error);
          // Don't fail the reply if mentions fail
        }

        toast.success('Reply posted successfully');
        setReplyText('');
        setReplyName('');
        setReplyEmail('');
        setReplyingTo(null);
        // Reload comments to show the reply
        const commentsResponse = await fetch(`/api/posts/${post.id}/comments`);
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData.comments || []);
        }
      } else {
        toast.error('Failed to post reply');
      }
    } catch (error) {
      toast.error('Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone and will also delete all replies.')) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/delete-comment', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          commentId,
          projectId: project.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      toast.success('Comment deleted successfully');

      // Remove the comment and its replies from the list
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Breadcrumb */}
      <div className="border-b bg-white/50 backdrop-blur-sm py-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-1 text-xs text-gray-600 sm:text-sm">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <span className="mx-2">→</span>
            <Link href={`/${project.slug}/board`} className="hover:text-gray-900">{project.slug}</Link>
            <span className="mx-2">→</span>
            <span className="text-gray-900">Feedback Board</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link 
              href={`/${project.slug}/board`} 
              className="flex items-center text-sm text-gray-700 hover:text-gray-900 sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Board
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-4xl">
          {/* Main Post Card */}
          <Card className="mb-6">
              <CardContent className="p-5 sm:p-8">
              {isMergedDuplicate && canonicalPost && (
                <Alert className="mb-6 border border-orange-200 bg-orange-50 text-orange-900">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <p className="font-semibold">
                      This post has been merged into{' '}
                      {canonicalLink ? (
                        <Link href={canonicalLink} className="underline underline-offset-4">
                          {canonicalPost.title}
                        </Link>
                      ) : (
                        canonicalPost.title
                      )}
                      .
                    </p>
                    <p className="mt-1 text-sm text-orange-700">
                      Votes and comments should be tracked on the original post.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              {isOwner && mergedDuplicatePosts.length > 0 && (
                <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm font-semibold">
                      Merged duplicates ({mergedDuplicatePosts.length})
                    </p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-orange-900">
                    {mergedDuplicatePosts.map((duplicate) => {
                      const statusText = (duplicate.status || 'open').replace(/_/g, ' ');
                      const duplicateVoteCount = duplicate.vote_count ?? 0;
                      return (
                        <li key={duplicate.id} className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/${project.slug}/post/${duplicate.id}`}
                            className="font-medium underline underline-offset-4"
                          >
                            {duplicate.title}
                          </Link>
                          <span className="text-xs text-orange-700">
                            · {statusText} · {duplicateVoteCount} votes
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                      <CategoryBadge category={post.category} />
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {statusLabel}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-600 sm:text-sm mb-4">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formattedDate}</span>
                    </div>
                    <span className="hidden text-gray-300 sm:inline">•</span>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>{formattedTime}</span>
                    </div>
                      {post.author_email && (
                      <>
                        <span className="hidden text-gray-300 sm:inline">•</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate max-w-[160px] sm:max-w-[220px]">
                            {post.author_email}
                          </span>
                        </div>
                      </>
                      )}
                    </div>
                    
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                      {post.title}
                    </h1>
                  
                  <PriorityMixCompact
                    mustHave={priorityMix.mustHave}
                    important={priorityMix.important}
                    niceToHave={priorityMix.niceToHave}
                    align="start"
                    className="mt-2 gap-3 text-sm text-gray-600"
                  />
                  
                  <p className="mt-4 text-gray-700 leading-relaxed">
                    {post.description}
                  </p>
                  
                  {post.status === 'in_progress' && (
                    <div className="mt-6 p-4 bg-orange-50 border-l-4 border-orange-400 rounded">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Status:</span> This feedback is currently being worked on
                      </p>
                    </div>
                  )}
                  </div>
                  
                <div
                  className="flex flex-col items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <VoteButton
                    postId={post.id}
                    initialVoteCount={voteCount}
                    initialUserVoted={hasVoted}
                    disabled={isMergedDuplicate}
                    disabledReason="Voting is disabled for merged posts."
                    onVoteChange={(newCount, userVoted) => {
                      setVoteCount(newCount);
                      setHasVoted(userVoted);
                      if (typeof window !== 'undefined') {
                        const voted = JSON.parse(window.localStorage.getItem(`voted_posts_${project.id}`) || '[]');
                        if (userVoted) {
                          if (!voted.includes(post.id)) {
                            voted.push(post.id);
                          }
                        } else {
                          const index = voted.indexOf(post.id);
                          if (index >= 0) {
                            voted.splice(index, 1);
                          }
                        }
                        window.localStorage.setItem(`voted_posts_${project.id}`, JSON.stringify(voted));
                      }
                    }}
                    onShowNotification={(message, type) => {
                      if (type === 'success') toast.success(message);
                      else if (type === 'error') toast.error(message);
                      else toast.info(message);
                    }}
                  />

                  {/* Vote on Behalf Button (Admin Only) */}
                  {isOwner && !isMergedDuplicate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsVoteOnBehalfModalOpen(true)}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all"
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Vote on Behalf
                    </Button>
                  )}
                </div>
                </div>
              </CardContent>
            </Card>

            <details className="mb-6 rounded-lg border border-gray-200 bg-white/70 shadow-sm">
              <summary className="cursor-pointer list-none rounded-lg px-4 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50">
                View full breakdown
              </summary>
              <div className="px-4 pb-4">
                <VoteStats
                  postId={post.id}
                  refreshToken={voteCount}
                  onShowNotification={(message, type) => {
                    if (type === 'success') toast.success(message);
                    else if (type === 'error') toast.error(message);
                    else toast.info(message);
                  }}
                  onStatsChange={handlePriorityStatsChange}
                />
              </div>
            </details>

            {/* AI Auto-Response - Owner/Admin Only */}
            {isOwner && user && !isMergedDuplicate && (
              <div className="mb-6">
                <AIAutoResponse 
                  postId={post.id}
                  postTitle={post.title}
                  postDescription={post.description}
                  postType="feature"
                  authorName={post.author_email || 'User'}
                  projectId={project.id}
                  onResponsePosted={loadComments}
                />
              </div>
            )}

            {/* AI Post Intelligence - Owner/Admin Only */}
            {isOwner && user && !isMergedDuplicate && (
              <div className="mb-6">
                <AIPostIntelligence 
                  title={post.title}
                  description={post.description}
                  postType="feature"
                  projectId={project.id}
                />
              </div>
            )}

            {/* AI Features Section - Owner/Admin Only */}
            {isOwner && user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {!isMergedDuplicate ? (
                <div className="h-full">
                  <AIDuplicateDetection
                    postId={post.id}
                    projectId={project.id}
                    userPlan={{ plan: project.plan === 'pro' ? 'pro' : 'free', features: [] }}
                    onShowNotification={(message, type) => {
                      if (type === 'success') toast.success(message);
                      else if (type === 'error') toast.error(message);
                      else toast(message);
                    }}
                  />
                </div>
              ) : (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-6 text-sm text-orange-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Duplicate already merged</p>
                        <p className="mt-1">
                          This post is linked to{' '}
                          {canonicalLink ? (
                            <Link href={canonicalLink} className="underline underline-offset-4">
                              {canonicalPost?.title}
                            </Link>
                          ) : (
                            canonicalPost?.title
                          )}
                          . Manage the canonical post to continue updating feedback.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Priority Scoring */}
              <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      🎯
                    </div>
                    <h3 className="font-semibold text-gray-900">AI Priority Scoring</h3>
                  </div>
                  <Button 
                    variant="default" 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={handleAnalyzePriority}
                    disabled={analyzingPriority || priorityLimitReached || isMergedDuplicate}
                  >
                    <span className="mr-2">✨</span>
                    {isMergedDuplicate ? 'Unavailable' : priorityLimitReached ? 'Limit Reached' : analyzingPriority ? 'Analyzing...' : 'Analyze Priority'}
                  </Button>
                  {isMergedDuplicate ? (
                    <p className="mt-2 text-xs text-orange-700 text-center">
                      Priority analysis is disabled for merged posts.
                    </p>
                  ) : (
                    <>
                      {priorityUsage && !priorityUsage.isPro && (
                        <p className="mt-2 text-xs text-blue-700 text-center">
                          Used {Math.max(priorityUsage.limit - priorityUsage.remaining, 0)}/{priorityUsage.limit} • {priorityUsage.remaining} left this month
                        </p>
                      )}
                      {priorityLimitReached && (
                        <p className="text-xs text-red-600 text-center mt-1">
                          Upgrade to Pro for unlimited priority scoring.
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-xs text-gray-600 mt-3 text-center">
                    AI will analyze urgency, impact, and engagement to score this post
                  </p>
                  
                  {priorityResults && (
                    <div className="mt-4 p-3 bg-white rounded-lg border">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 mb-1">
                          {priorityResults.score}/100
                        </p>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          {priorityResults.level}
                        </p>
                        <p className="text-xs text-gray-600">
                          {priorityResults.reasoning}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            )}

          {/* Comments Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Comments ({comments.length})</h3>
              </div>
              
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {comments.filter(c => !c.parent_id).map((comment) => {
                    const replies = comments.filter(c => c.parent_id === comment.id);
                    return (
                      <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">
                                  {comment.author_name || 'Anonymous'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              {isOwner && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                            {!isMergedDuplicate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(comment.id)}
                                className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
                              >
                                Reply
                              </Button>
                            )}
                            
                            {/* Reply Form */}
                            {replyingTo === comment.id && !isMergedDuplicate && (
                              <div className="mt-3 ml-0 p-3 bg-gray-50 rounded-lg border">
                                <MentionTextarea
                                  value={replyText}
                                  onChange={setReplyText}
                                  postId={post.id}
                                  placeholder="Write your reply... (use @ to mention someone)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-2"
                                  minRows={3}
                                  maxRows={8}
                                />

                                {/* AI Writing Assistant */}
                                <AIWritingAssistant
                                  currentText={replyText}
                                  context={comment.content}
                                  onTextImprove={(improved) => setReplyText(improved)}
                                  placeholder="Write your reply..."
                                />
                                <input
                                  type="text"
                                  value={replyName}
                                  onChange={(e) => setReplyName(e.target.value)}
                                  placeholder="Your name *"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                                  required
                                />
                                <input
                                  type="email"
                                  value={replyEmail}
                                  onChange={(e) => setReplyEmail(e.target.value)}
                                  placeholder="Your email *"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                                  required
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleSubmitReply(comment.id)}
                                    disabled={isSubmittingReply || !replyText.trim() || !replyName.trim() || !replyEmail.trim()}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {isSubmittingReply ? 'Posting...' : 'Post Reply'}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                      setReplyName('');
                                      setReplyEmail('');
                                    }}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Cancel
                    </Button>
                                </div>
                              </div>
                            )}
                            
                            {/* Replies */}
                            {replies.length > 0 && (
                              <div className="mt-3 ml-8 space-y-3">
                                {replies.map((reply) => (
                                  <div key={reply.id} className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <User className="h-3 w-3 text-gray-600" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-xs text-gray-900">
                                            {reply.author_name || 'Anonymous'}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {new Date(reply.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        {isOwner && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteComment(reply.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                                            title="Delete reply"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-700">{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Add Comment Form */}
              <div ref={commentFormRef} className="mt-6 pt-6 border-t scroll-mt-20">
                <h4 className="font-medium text-gray-900 mb-3">Add a comment</h4>

                {isMergedDuplicate ? (
                  <Alert className="border border-orange-200 bg-orange-50 text-orange-900">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription>
                      Comments are disabled for posts that have been merged into another thread.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <MentionTextarea
                      value={commentText}
                      onChange={setCommentText}
                      postId={post.id}
                      placeholder="Share your thoughts... (use @ to mention someone)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-2"
                      minRows={4}
                      maxRows={10}
                    />
                    
                    {/* AI Writing Assistant */}
                    <AIWritingAssistant
                      currentText={commentText}
                      context={`${post.title}${post.description ? ': ' + post.description : ''}`}
                      onTextImprove={(improved) => setCommentText(improved)}
                      placeholder="Share your thoughts..."
                    />
                    <input
                      type="text"
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      placeholder="Your name *"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2 text-sm"
                      required
                    />
                    <input
                      type="email"
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      placeholder="Your email *"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2 text-sm"
                      required
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={isSubmittingComment || !commentText.trim() || !commentName.trim() || !commentEmail.trim()}
                      className="mt-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      size="sm"
                    >
                      <MessageSquare className="h-3 w-3 mr-2" />
                      {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </>
                )}
                </div>
              </CardContent>
            </Card>
        </div>
      </main>

      {/* Vote on Behalf Modal */}
      <VoteOnBehalfModal
        isOpen={isVoteOnBehalfModalOpen}
        onClose={() => setIsVoteOnBehalfModalOpen(false)}
        postId={post.id}
        postTitle={post.title}
        projectId={project.id}
        onSuccess={() => {
          setVoteCount(prev => prev + 1);
          loadComments(); // Reload in case auto-response was posted
        }}
      />
    </div>
  );
}
