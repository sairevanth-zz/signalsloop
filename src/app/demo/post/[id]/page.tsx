'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, Clock, MessageSquare } from 'lucide-react';

// Demo post data
const demoPosts = {
  '1': {
    id: '1',
    title: 'Dark mode support',
    description: 'Add a dark mode toggle to the application. Many users have requested this feature.',
    status: 'done',
    vote_count: 127,
    user_voted: false,
    author: 'Sarah Chen',
    created_at: '2024-01-15T10:30:00Z',
    comments: [
      {
        id: '1',
        body: 'This would be amazing! I work late hours and the bright interface strains my eyes.',
        author: 'John Doe',
        created_at: '2024-01-16T09:15:00Z'
      },
      {
        id: '2', 
        body: 'Completely agree! Dark mode is essential for modern applications.',
        author: 'Jane Smith',
        created_at: '2024-01-16T14:22:00Z'
      },
      {
        id: '3',
        body: 'I\'ve been waiting for this feature for months. Please prioritize this!',
        author: 'Mike Johnson',
        created_at: '2024-01-17T11:45:00Z'
      }
    ]
  },
  '2': {
    id: '2',
    title: 'Mobile app for iOS',
    description: 'Create a native iOS app to complement the web platform.',
    status: 'in_progress',
    vote_count: 89,
    user_voted: true,
    author: 'Mike Johnson',
    created_at: '2024-01-20T16:45:00Z',
    comments: [
      {
        id: '4',
        body: 'This would be perfect for on-the-go feedback management!',
        author: 'Alice Brown',
        created_at: '2024-01-21T10:30:00Z'
      },
      {
        id: '5',
        body: 'Please make sure it has all the same features as the web version.',
        author: 'Bob Wilson',
        created_at: '2024-01-21T15:12:00Z'
      }
    ]
  }
};

export default function DemoPostPage() {
  const params = useParams();
  const postId = params.id as string;
  const [voteCount, setVoteCount] = useState(0);
  const [userVoted, setUserVoted] = useState(false);
  const [newComment, setNewComment] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [comments, setComments] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const post = demoPosts[postId as keyof typeof demoPosts];

  React.useEffect(() => {
    if (post) {
      setVoteCount(post.vote_count);
      setUserVoted(post.user_voted);
      setComments(post.comments || []);
    }
  }, [post]);

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

  const handleCommentSubmit = () => {
    if (!newComment.trim()) {
      setMessage('Please enter a comment!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const comment = {
      id: Date.now().toString(),
      body: newComment,
      author: 'Demo User',
      created_at: new Date().toISOString()
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
    setMessage('Comment added!');
    setTimeout(() => setMessage(''), 3000);
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
