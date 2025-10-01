'use client';

import React, { useState, useEffect } from 'react';
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

  // Load voted status from localStorage
  useEffect(() => {
    const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
    setHasVoted(voted.includes(post.id));
  }, [post.id, project.id]);

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

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = post.title;
    const text = post.description.substring(0, 100) + '...';

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
        break;
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900">SignalsLoop</span>
              </Link>
              <div className="hidden md:block w-px h-6 bg-gray-300"></div>
              <Link href={`/${project.slug}`} className="text-gray-600 hover:text-gray-900">
                {project.name}
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href={`/${project.slug}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Board
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Post Content */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
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
                    </div>
                    
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                      {post.title}
                    </h1>
                    
                    <div className="prose prose-lg max-w-none text-gray-700">
                      {post.description.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  <div className="ml-6 flex flex-col items-center">
                    <Button
                      variant={hasVoted ? "default" : "outline"}
                      size="lg"
                      onClick={handleVote}
                      disabled={isVoting}
                      className={`mb-2 ${
                        hasVoted 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'hover:bg-blue-50'
                      }`}
                    >
                      <ChevronUp className="h-5 w-5 mr-2" />
                      {voteCount}
                    </Button>
                    <span className="text-sm text-gray-500">votes</span>
                  </div>
                </div>

                {/* Status Info */}
                {post.status && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Status:</span> This feedback is currently being worked on
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
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
                  <Button variant="default" className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                    Check for Duplicates
                  </Button>
                  <p className="text-xs text-gray-600 mt-3 text-center">
                    AI will analyze this post against all other posts in your project
                  </p>
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
                  <Button variant="default" className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                    <span className="mr-2">✨</span>
                    Analyze Priority
                  </Button>
                  <p className="text-xs text-gray-600 mt-3 text-center">
                    AI will analyze urgency, impact, and engagement to score this post
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Comments Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <MessageSquare className="h-5 w-5 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">Comments (0)</h3>
                </div>
                
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
                </div>
                
                {/* Add Comment Form */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Add a comment</h4>
                  <textarea
                    placeholder="Share your thoughts..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
                    rows={4}
                  />
                  <input
                    type="email"
                    placeholder="Your email (optional)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-3 text-gray-900"
                  />
                  <Button 
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Post Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Related Feedback
                  </h3>
                  <div className="space-y-4">
                    {relatedPosts.map((relatedPost) => (
                      <div key={relatedPost.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <Link 
                          href={`/${project.slug}/post/${relatedPost.id}`}
                          className="block hover:bg-gray-50 p-2 rounded-md -m-2"
                        >
                          <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {relatedPost.title}
                          </h4>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{relatedPost.vote_count} votes</span>
                            <span>{formatDate(relatedPost.created_at)}</span>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Board Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  About {project.name}
                </h3>
                {project.description && (
                  <p className="text-gray-600 mb-4">
                    {project.description}
                  </p>
                )}
                <div className="space-y-3">
                  <Link href={`/${project.slug}`}>
                    <Button variant="outline" className="w-full">
                      <Home className="h-4 w-4 mr-2" />
                      View All Feedback
                    </Button>
                  </Link>
                  
                  <Link href={`/${project.slug}/roadmap`}>
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Roadmap
                    </Button>
                  </Link>
                  
                  <Link href="/">
                    <Button variant="ghost" className="w-full">
                      <Heart className="h-4 w-4 mr-2" />
                      Create Your Own Board
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Powered by SignalsLoop */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center space-x-2 text-gray-500 mb-2">
                  <span>Powered by</span>
                  <Link href="/" className="font-semibold text-blue-600 hover:text-blue-700">
                    SignalsLoop
                  </Link>
                </div>
                <p className="text-sm text-gray-500">
                  Create your own feedback board in minutes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
