'use client';

import React, { useState } from 'react';
import { Search, Filter, Plus, ChevronUp, MessageSquare, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Post {
  id: string;
  title: string;
  description: string;
  votes: number;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  author_email?: string;
  comments_count: number;
  created_at: string;
  user_voted?: boolean;
}

interface MobileBoardProps {
  posts: Post[];
  onVote: (postId: string) => void;
  onNewPost: () => void;
  onPostClick: (postId: string) => void;
}

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  planned: 'bg-yellow-100 text-yellow-800', 
  in_progress: 'bg-purple-100 text-purple-800',
  done: 'bg-green-100 text-green-800',
  declined: 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In Progress', 
  done: 'Done',
  declined: 'Declined'
};

export function MobileBoard({ posts, onVote, onNewPost, onPostClick }: MobileBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Mobile Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        
        {/* Filter Toggle (Mobile) */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>

        {/* New Post Button */}
        <Button 
          onClick={onNewPost}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Post</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Filter Options */}
      <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Posts' },
            { key: 'open', label: 'Open' },
            { key: 'planned', label: 'Planned' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'done', label: 'Done' },
            { key: 'declined', label: 'Declined' }
          ].map(filter => (
            <Button
              key={filter.key}
              variant={statusFilter === filter.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.key)}
              className="text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="space-y-3">
        {filteredPosts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No feedback yet</p>
                <p className="text-sm">Be the first to share your ideas!</p>
                <Button onClick={onNewPost} className="mt-4">
                  Submit First Post
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card 
              key={post.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onPostClick(post.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Vote Button */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onVote(post.id);
                      }}
                      className={`flex flex-col items-center p-2 rounded-lg min-w-[48px] transition-colors ${
                        post.user_voted 
                          ? 'bg-blue-100 text-blue-600 border-2 border-blue-200' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <ChevronUp className="w-4 h-4" />
                      <span className="text-xs font-medium">{post.votes}</span>
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
                        {post.title}
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className={`${statusColors[post.status]} text-xs flex-shrink-0`}
                      >
                        {statusLabels[post.status]}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {post.description}
                    </p>
                    
                    {/* Post Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        {post.author_email && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="hidden sm:inline">
                              {post.author_email.split('@')[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{post.comments_count}</span>
                        </div>
                      </div>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More Button (if needed) */}
      {filteredPosts.length > 0 && (
        <div className="text-center py-4">
          <Button variant="outline" className="w-full sm:w-auto">
            Load More Posts
          </Button>
        </div>
      )}
    </div>
  );
}

// Utility classes for line-clamp (add to your global CSS)
/* 
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
*/
