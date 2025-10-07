'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  Calendar,
  User,
  LogIn,
  Settings,
  Home,
  Map,
  Share2,
  TrendingUp,
  ChevronUp,
  Heart,
  ExternalLink,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import Link from 'next/link';
import PostSubmissionForm from '@/components/PostSubmissionForm';
import posthog from 'posthog-js';
import { PriorityMixCompact } from '@/components/PriorityMix';

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  custom_domain?: string;
  is_private: boolean;
  plan: string;
  created_at: string;
  settings?: any;
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
  has_voted?: boolean;
  comment_count?: number;
  board_id?: string | null;
  must_have_votes?: number;
  important_votes?: number;
  nice_to_have_votes?: number;
  total_priority_score?: number;
}

interface PublicBoardHomepageProps {
  project: Project;
  posts: Post[];
  boardId?: string | null;
}

export default function PublicBoardHomepage({ project, posts: initialPosts, boardId }: PublicBoardHomepageProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>(initialPosts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'votes'>('newest');
  const [showPostForm, setShowPostForm] = useState(false);
  const [votedPosts, setVotedPosts] = useState<Set<string>>(new Set());
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => {
    if (boardId) return boardId;
    const firstPostBoardId = initialPosts.find(post => post.board_id)?.board_id;
    return firstPostBoardId ?? null;
  });

  useEffect(() => {
    if (boardId && boardId !== activeBoardId) {
      setActiveBoardId(boardId);
    }
  }, [boardId, activeBoardId]);

  // Load voted posts from cookies/localStorage
  useEffect(() => {
    const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
    setVotedPosts(new Set(voted));
  }, [project.id]);

  // Filter and sort posts
  useEffect(() => {
    let filtered = [...posts];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    // Sort posts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return b.vote_count - a.vote_count;
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredPosts(filtered);
  }, [posts, searchTerm, selectedCategory, sortBy]);

  const handleVote = async (postId: string) => {
    const isVoted = votedPosts.has(postId);
    
    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: isVoted ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 409) {
        // Already voted on another session/device (IP match)
        toast.info('You have already voted on this post');
        const updated = new Set(votedPosts);
        updated.add(postId);
        setVotedPosts(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`voted_posts_${project.id}`, JSON.stringify([...updated]));
        }
        await loadLatestPosts();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update vote');
      }

      const data = await response.json().catch(() => ({}));
      const newVoteCount = typeof data.new_vote_count === 'number' ? data.new_vote_count : undefined;

      // Update local state with authoritative count when available
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? {
                ...post,
                vote_count:
                  typeof newVoteCount === 'number'
                    ? newVoteCount
                    : isVoted
                      ? Math.max(0, post.vote_count - 1)
                      : post.vote_count + 1,
              }
            : post
        )
      );

      // Update voted posts
      const newVotedPosts = new Set(votedPosts);
      if (isVoted) {
        newVotedPosts.delete(postId);
      } else {
        newVotedPosts.add(postId);
      }
      setVotedPosts(newVotedPosts);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(`voted_posts_${project.id}`, JSON.stringify([...newVotedPosts]));
      }

      toast.success(isVoted ? 'Vote removed' : 'Vote added');
    } catch (error) {
      console.error('Voting error:', error);
      toast.error('Failed to update vote');
    }
  };

  const loadLatestPosts = useCallback(async () => {
    if (!activeBoardId) {
      return;
    }

    try {
      const params = new URLSearchParams({ project_id: project.id, board_id: activeBoardId });
      const response = await fetch(`/api/posts?${params.toString()}`, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      const fetchedPosts: Post[] = (data.posts || []).map((post: Record<string, unknown>) => {
        const asArray = (value: unknown): number => {
          if (Array.isArray(value)) {
            return (value[0] as { count?: number })?.count || 0;
          }
          return typeof value === 'number' ? value : 0;
        };

        return {
          id: post.id as string,
          title: post.title as string,
          description: (post.description as string) || '',
          category: (post.category as string) || 'general',
          vote_count: asArray(post.vote_count),
          created_at: post.created_at as string,
          author_email: post.author_email as string,
          status: post.status as string,
          has_voted: false,
          comment_count: asArray(post.comment_count),
          board_id: (post.board_id as string) || null,
        };
      });

      setPosts(fetchedPosts);
      if (!activeBoardId && fetchedPosts.length > 0) {
        setActiveBoardId(fetchedPosts[0].board_id || null);
      }
    } catch (error) {
      console.error('Error refreshing posts:', error);
      toast.error('Failed to refresh feedback list');
    }
  }, [activeBoardId, project.id]);

  const handleOpenPostForm = () => {
    if (!activeBoardId) {
      toast.error('Feedback submissions are not available right now. Please contact the board owner.');
      return;
    }
    setShowPostForm(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCategories = () => {
    const categories = new Set(posts.map(post => post.category).filter(Boolean));
    return Array.from(categories);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900">SignalsLoop</span>
              </Link>
              <div className="hidden md:block w-px h-6 bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://signalsloop.com/${project.slug}/roadmap`, '_blank')}
              >
                <Map className="h-4 w-4 mr-2" />
                Roadmap
              </Button>
              
              <Link href={`/${project.slug}/settings`}>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
              
              <Link href="/login">
                <Button variant="outline" size="sm">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {project.name} Feedback Board
          </h1>
          {project.description && (
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {project.description}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleOpenPostForm}
              disabled={!activeBoardId}
            >
              <Plus className="h-5 w-5 mr-2" />
              Submit Feedback
            </Button>
            
            <Link href="/">
              <Button variant="outline" size="lg">
                <ExternalLink className="h-5 w-5 mr-2" />
                Create Your Own Board
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {posts.length}
              </div>
              <div className="text-gray-600">Total Feedback</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {posts.reduce((sum, post) => sum + post.vote_count, 0)}
              </div>
              <div className="text-gray-600">Total Votes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {getCategories().length}
              </div>
              <div className="text-gray-600">Categories</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getCategories().map(category => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="votes">Most Votes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid gap-6">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || selectedCategory !== 'all' ? 'No matching feedback found' : 'No feedback yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filters.'
                    : 'Be the first to share your feedback!'
                  }
                </p>
                <Button onClick={handleOpenPostForm} disabled={!activeBoardId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Feedback
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        <Link 
                          href={`/${project.slug}/post/${post.id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {post.description}
                      </p>
                    </div>
                    
                    <div className="ml-4 flex min-w-[72px] flex-col items-end gap-1">
                      <Button
                        variant={votedPosts.has(post.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleVote(post.id)}
                        className={
                          votedPosts.has(post.id) 
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'hover:bg-blue-50'
                        }
                      >
                        <ChevronUp className="h-4 w-4 mr-1" />
                        {post.vote_count}
                      </Button>
                      <PriorityMixCompact
                        mustHave={post.must_have_votes ?? 0}
                        important={post.important_votes ?? 0}
                        niceToHave={post.nice_to_have_votes ?? 0}
                        className="w-full justify-end text-[11px] leading-tight"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <CategoryBadge category={post.category} />
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(post.created_at)}
                      </div>
                      
                      {post.author_email && (
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="h-4 w-4 mr-1" />
                          {post.author_email}
                        </div>
                      )}

                      <div className="flex items-center text-sm text-gray-500">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        <span>{post.comment_count ?? 0}</span>
                        <span className="hidden sm:inline">comments</span>
                      </div>
                    </div>
                    
                    <Link href={`/${project.slug}/post/${post.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if ((post.must_have_votes ?? 0) > 0) {
                            posthog.capture('signal_mix_click', {
                              post_id: post.id,
                              project_id: project.id,
                              must_have_votes: post.must_have_votes ?? 0,
                              important_votes: post.important_votes ?? 0,
                              nice_to_have_votes: post.nice_to_have_votes ?? 0,
                              source: 'board_card',
                            });
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-500 mb-4">
            <span>Powered by</span>
            <Link href="/" className="font-semibold text-blue-600 hover:text-blue-700">
              SignalsLoop
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Create your own feedback board in minutes. 
            <Link href="/" className="text-blue-600 hover:text-blue-700 ml-1">
              Get started free →
            </Link>
          </p>
        </div>
      </main>

      {showPostForm && activeBoardId && (
        <PostSubmissionForm
          isOpen={showPostForm}
          onClose={() => setShowPostForm(false)}
          projectId={project.id}
          boardId={activeBoardId}
          onPostSubmitted={loadLatestPosts}
        />
      )}
    </div>
  );
}
