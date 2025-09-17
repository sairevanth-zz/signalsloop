'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, Clock, MessageSquare } from 'lucide-react';

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

export default function DemoPostPage() {
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = useState<DemoPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteCount, setVoteCount] = useState(0);
  const [userVoted, setUserVoted] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<DemoComment[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadPostData = async () => {
      try {
        // Fetch the post data
        const postsResponse = await fetch('/api/demo/posts');
        if (!postsResponse.ok) {
          throw new Error('Failed to fetch posts');
        }
        
        const postsData = await postsResponse.json();
        const foundPost = postsData.posts?.find((p: DemoPost) => p.id === postId);
        
        if (foundPost) {
          setPost(foundPost);
          setVoteCount(foundPost.vote_count);
          setUserVoted(foundPost.user_voted);
          
          // Fetch comments for this post
          const commentsResponse = await fetch(`/api/demo/posts/${postId}/comments`);
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            setComments(commentsData.comments || []);
          }
        }
      } catch (error) {
        console.error('Error loading post data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadPostData();
    }
  }, [postId]);

  const handleVote = () => {
    if (userVoted) {
      setVoteCount(prev => prev - 1);
      setUserVoted(false);
      setMessage('Vote removed!');
    } else {
      setVoteCount(prev => prev + 1);
      setUserVoted(true);
      setMessage('Vote added!');
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) {
      setMessage('Please enter a comment!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch(`/api/demo/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();
      setComments(prev => [data.comment, ...prev]);
      setNewComment('');
      setMessage('Comment added!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding comment:', error);
      setMessage('Failed to add comment. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
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
        {/* Status Messages */}
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        {/* Post Content */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-semibold text-gray-900">{post.title}</h2>
                  <Badge className={getStatusColor(post.status)}>
                    {post.status}
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
                  {comments.length} comments
                </div>
              </div>

              <button
                onClick={handleVote}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-md transition-colors ${
                  userVoted 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
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
              <Button onClick={handleCommentSubmit} disabled={!newComment.trim()}>
                Post Comment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
          {comments.length === 0 ? (
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => (
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
