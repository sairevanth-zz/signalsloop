'use client';

import React, { useState } from 'react';
import { MobileLayout } from '@/components/ui/mobile-layout';
import { MobileBoard } from '@/components/board/mobile-board';
import { Button } from '@/components/ui/button';

// Sample data for demonstration
const samplePosts = [
  {
    id: '1',
    title: 'Add dark mode support to the dashboard',
    description: 'It would be great to have a dark mode option for users who prefer it, especially for late-night usage.',
    votes: 24,
    status: 'open' as const,
    author_email: 'user@example.com',
    comments_count: 8,
    created_at: '2024-01-15T10:30:00Z',
    user_voted: false
  },
  {
    id: '2',
    title: 'Improve mobile responsiveness',
    description: 'The current mobile experience could be enhanced with better touch targets and improved navigation.',
    votes: 18,
    status: 'planned' as const,
    author_email: 'mobile@example.com',
    comments_count: 12,
    created_at: '2024-01-14T15:45:00Z',
    user_voted: true
  },
  {
    id: '3',
    title: 'Add keyboard shortcuts',
    description: 'Power users would benefit from keyboard shortcuts for common actions like creating new posts.',
    votes: 31,
    status: 'in_progress' as const,
    author_email: 'poweruser@example.com',
    comments_count: 5,
    created_at: '2024-01-13T09:20:00Z',
    user_voted: false
  },
  {
    id: '4',
    title: 'Export feedback to CSV',
    description: 'Allow users to export their feedback data to CSV format for analysis.',
    votes: 15,
    status: 'done' as const,
    author_email: 'analyst@example.com',
    comments_count: 3,
    created_at: '2024-01-12T14:10:00Z',
    user_voted: false
  },
  {
    id: '5',
    title: 'Add emoji reactions',
    description: 'Let users react with emojis to posts for quick feedback without comments.',
    votes: 42,
    status: 'open' as const,
    author_email: 'emoji@example.com',
    comments_count: 19,
    created_at: '2024-01-11T16:30:00Z',
    user_voted: true
  },
  {
    id: '6',
    title: 'Integration with Slack',
    description: 'Connect the feedback system with Slack to notify team members of new posts.',
    votes: 8,
    status: 'declined' as const,
    author_email: 'slack@example.com',
    comments_count: 6,
    created_at: '2024-01-10T11:15:00Z',
    user_voted: false
  }
];

export default function MobileBoardDemoPage() {
  const [posts, setPosts] = useState(samplePosts);

  const handleVote = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newVoted = !post.user_voted;
        return {
          ...post,
          user_voted: newVoted,
          votes: newVoted ? post.votes + 1 : post.votes - 1
        };
      }
      return post;
    }));
  };

  const handleNewPost = () => {
    setShowNewPostForm(true);
    // In a real app, this would open a modal or navigate to a form
    alert('This would open the new post form!');
  };

  const handlePostClick = (postId: string) => {
    // In a real app, this would navigate to the post detail page
    alert(`This would navigate to post ${postId}`);
  };

  return (
    <MobileLayout title="Mobile Board Demo" showNavigation={true}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            📱 Mobile Board Component
          </h1>
          <p className="text-gray-600">
            Touch-optimized feedback board for mobile devices
          </p>
        </div>

        {/* Demo Controls */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">🎮 Demo Controls:</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setPosts([...samplePosts])}
            >
              Reset Posts
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setPosts(posts.slice(0, 3))}
            >
              Show 3 Posts
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setPosts([])}
            >
              Empty State
            </Button>
          </div>
        </div>

        {/* Mobile Board Component */}
        <MobileBoard
          posts={posts}
          onVote={handleVote}
          onNewPost={handleNewPost}
          onPostClick={handlePostClick}
        />

        {/* Features List */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-800 mb-4">✨ Features:</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Touch-friendly vote buttons</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Responsive search and filters</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Status badges with colors</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Collapsible filter panel</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Text truncation with line-clamp</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Empty state with call-to-action</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Author and comment indicators</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Hover effects and transitions</span>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
