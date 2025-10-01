'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { 
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Calendar,
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
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import SmartReplies from './SmartReplies';

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  custom_domain?: string;
  is_private: boolean;
  plan: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  description: string;
  category: string;
  vote_count: number;
  created_at: string;
  author_email?: string;
  status: string;
  project_id: string;
}

interface PublicPostDetailsProps {
  project: Project;
  post: Post;
  relatedPosts: Post[];
}

export default function PublicPostDetails({ project, post, relatedPosts }: PublicPostDetailsProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(post.vote_count);
  const [isVoting, setIsVoting] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [analyzingPriority, setAnalyzingPriority] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState<any>(null);
  const [priorityResults, setPriorityResults] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Load voted status from localStorage
  useEffect(() => {
    const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
    setHasVoted(voted.includes(post.id));
  }, [post.id, project.id]);

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      try {
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
    loadComments();
  }, [post.id]);

  const handleVote = async () => {
    if (isVoting) return;
    
    setIsVoting(true);
    const wasVoted = hasVoted;
    
    try {
      const response = await fetch(`/api/posts/${post.id}/vote`, {
        method: wasVoted ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update vote');
      }

      // Update local state
      setHasVoted(!wasVoted);
      setVoteCount(prev => wasVoted ? prev - 1 : prev + 1);

      // Update localStorage
      const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
      if (wasVoted) {
        const newVoted = voted.filter((id: string) => id !== post.id);
        localStorage.setItem(`voted_posts_${project.id}`, JSON.stringify(newVoted));
      } else {
        voted.push(post.id);
        localStorage.setItem(`voted_posts_${project.id}`, JSON.stringify(voted));
      }

      toast.success(wasVoted ? 'Vote removed' : 'Vote added');
    } catch (error) {
      console.error('Voting error:', error);
      toast.error('Failed to update vote');
    } finally {
      setIsVoting(false);
    }
  };

  const handleCheckDuplicates = async () => {
    setCheckingDuplicates(true);
    setDuplicateResults(null);
    try {
      const response = await fetch('/api/ai/duplicate-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          projectId: project.id,
          title: post.title,
          description: post.description
        })
      });

      const data = await response.json();
      if (response.ok) {
        setDuplicateResults(data);
      } else {
        toast.error(data.error || 'Failed to check duplicates');
      }
    } catch (error) {
      toast.error('Failed to check duplicates');
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleAnalyzePriority = async () => {
    setAnalyzingPriority(true);
    setPriorityResults(null);
    try {
      const response = await fetch('/api/ai/priority-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          projectId: project.id,
          title: post.title,
          description: post.description,
          voteCount: voteCount
        })
      });

      const data = await response.json();
      if (response.ok) {
        setPriorityResults(data.priority);
      } else {
        toast.error(data.error || 'Failed to analyze priority');
      }
    } catch (error) {
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
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!commentName.trim()) {
      toast.error('Please enter your name');
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
        toast.success('Comment posted successfully');
        setCommentText('');
        setCommentName('');
        setCommentEmail('');
        // Add the new comment to the list
        setComments([...comments, data.comment]);
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
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    if (!replyName.trim()) {
      toast.error('Please enter your name');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Breadcrumb */}
      <div className="border-b bg-white/50 backdrop-blur-sm py-3">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center text-sm text-gray-600">
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
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/${project.slug}/board`} className="flex items-center text-gray-700 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Board
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="max-w-4xl">
          {/* Main Post Card */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <CategoryBadge category={post.category} />
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {post.status === 'in_progress' ? 'In Progress' : post.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(post.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    {post.author_email && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {post.author_email}
                      </div>
                    )}
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {post.title}
                  </h1>
                  
                  <p className="text-gray-700 leading-relaxed">
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
                
                <div className="flex flex-col items-center">
                  <Button
                    variant={hasVoted ? "default" : "outline"}
                    size="lg"
                    onClick={handleVote}
                    disabled={isVoting}
                    className={`min-w-[80px] ${
                      hasVoted 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'hover:bg-blue-50 border-2'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <ChevronUp className="h-5 w-5" />
                      <span className="text-lg font-bold">{voteCount}</span>
                    </div>
                  </Button>
                  <span className="text-xs text-gray-500 mt-1">votes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Replies Section */}
          <div className="mb-6">
            <SmartReplies 
              postId={post.id}
              postTitle={post.title}
              postDescription={post.description}
              onReplySelect={(reply) => {
                // Auto-fill the comment form with the smart reply
                setCommentText(reply);
                
                // Scroll to the comment form
                setTimeout(() => {
                  commentFormRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                  
                  // Focus on the textarea
                  const textarea = commentFormRef.current?.querySelector('textarea');
                  textarea?.focus();
                }, 100);
                
                toast.success('Reply added to comment form! Edit if needed and post.');
              }}
            />
          </div>
            
            {/* AI Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* AI Duplicate Detection */}
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      ⚠
                    </div>
                    <h3 className="font-semibold text-gray-900">AI Duplicate Detection</h3>
                  </div>
                  <Button 
                    variant="default" 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={handleCheckDuplicates}
                    disabled={checkingDuplicates}
                  >
                    {checkingDuplicates ? 'Checking...' : 'Check for Duplicates'}
                  </Button>
                  <p className="text-xs text-gray-600 mt-3 text-center">
                    AI will analyze this post against all other posts in your project
                  </p>
                  
                  {duplicateResults && (
                    <div className="mt-4 p-3 bg-white rounded-lg border">
                      {duplicateResults.duplicates && duplicateResults.duplicates.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            Found {duplicateResults.duplicates.length} similar post(s)
                          </p>
                          {duplicateResults.duplicates.map((dup: any) => (
                            <div key={dup.id} className="text-xs text-gray-600 mb-1">
                              • {dup.title} ({dup.similarity}% similar)
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-green-600">✓ No duplicates found</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
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
                    disabled={analyzingPriority}
                  >
                    <span className="mr-2">✨</span>
                    {analyzingPriority ? 'Analyzing...' : 'Analyze Priority'}
                  </Button>
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
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-gray-900">
                                {comment.author_name || 'Anonymous'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReplyingTo(comment.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
                            >
                              Reply
                            </Button>
                            
                            {/* Reply Form */}
                            {replyingTo === comment.id && (
                              <div className="mt-3 ml-0 p-3 bg-gray-50 rounded-lg border">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write your reply..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                                  rows={2}
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
                                  placeholder="Your email (optional)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleSubmitReply(comment.id)}
                                    disabled={isSubmittingReply || !replyText.trim() || !replyName.trim()}
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
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-xs text-gray-900">
                                          {reply.author_name || 'Anonymous'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(reply.created_at).toLocaleDateString()}
                                        </span>
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
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  rows={3}
                  required
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
                  placeholder="Your email (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2 text-sm"
                />
                <Button 
                  onClick={handleSubmitComment}
                  disabled={isSubmittingComment || !commentText.trim() || !commentName.trim()}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  size="sm"
                >
                  <MessageSquare className="h-3 w-3 mr-2" />
                  {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
