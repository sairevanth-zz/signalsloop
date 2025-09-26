'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { 
  ChevronUp,
  MessageSquare,
  Calendar,
  User,
  LogIn,
  Settings,
  Home,
  Map,
  Share2,
  Heart,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  Clock,
  Lightbulb,
  AlertCircle
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
}

interface RoadmapData {
  planned: Post[];
  in_progress: Post[];
  completed: Post[];
  open: Post[];
}

interface PublicRoadmapProps {
  project: Project;
  roadmapData: RoadmapData;
}

const roadmapColumns = [
  {
    key: 'planned',
    title: 'Planned',
    description: 'Features we plan to build',
    icon: Lightbulb,
    color: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-800',
    badgeColor: 'bg-yellow-100 text-yellow-800'
  },
  {
    key: 'in_progress',
    title: 'In Progress',
    description: 'Currently being developed',
    icon: Clock,
    color: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    key: 'completed',
    title: 'Completed',
    description: 'Recently shipped features',
    icon: CheckCircle,
    color: 'bg-green-50 border-green-200',
    textColor: 'text-green-800',
    badgeColor: 'bg-green-100 text-green-800'
  },
  {
    key: 'open',
    title: 'Under Review',
    description: 'Feedback being evaluated',
    icon: AlertCircle,
    color: 'bg-gray-50 border-gray-200',
    textColor: 'text-gray-800',
    badgeColor: 'bg-gray-100 text-gray-800'
  }
];

export default function PublicRoadmap({ project, roadmapData }: PublicRoadmapProps) {
  const [votedPosts, setVotedPosts] = useState<Set<string>>(new Set());

  // Load voted posts from localStorage
  useEffect(() => {
    const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
    setVotedPosts(new Set(voted));
  }, [project.id]);

  const handleVote = async (postId: string) => {
    const isVoted = votedPosts.has(postId);
    
    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: isVoted ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update vote');
      }

      // Update local state
      setVotedPosts(prev => {
        const newVoted = new Set(prev);
        if (isVoted) {
          newVoted.delete(postId);
        } else {
          newVoted.add(postId);
        }
        return newVoted;
      });
      
      // Save to localStorage
      const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
      if (isVoted) {
        const newVoted = voted.filter((id: string) => id !== postId);
        localStorage.setItem(`voted_posts_${project.id}`, JSON.stringify(newVoted));
      } else {
        voted.push(postId);
        localStorage.setItem(`voted_posts_${project.id}`, JSON.stringify(voted));
      }

      toast.success(isVoted ? 'Vote removed' : 'Vote added');
    } catch (error) {
      console.error('Voting error:', error);
      toast.error('Failed to update vote');
    }
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

  const totalPosts = Object.values(roadmapData).reduce((sum, posts) => sum + posts.length, 0);

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {project.name} Roadmap
          </h1>
          {project.description && (
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {project.description}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/${project.slug}`}>
              <Button variant="outline" size="lg">
                <MessageSquare className="h-5 w-5 mr-2" />
                View All Feedback
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="ghost" size="lg">
                <Heart className="h-5 w-5 mr-2" />
                Create Your Own Board
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {roadmapColumns.map((column) => {
            const count = roadmapData[column.key as keyof RoadmapData].length;
            const Icon = column.icon;
            return (
              <Card key={column.key} className={`${column.color} border-2`}>
                <CardContent className="p-6 text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${column.textColor}`} />
                  <div className={`text-3xl font-bold mb-2 ${column.textColor}`}>
                    {count}
                  </div>
                  <div className={`text-sm font-medium ${column.textColor}`}>
                    {column.title}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Roadmap Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roadmapColumns.map((column) => {
            const posts = roadmapData[column.key as keyof RoadmapData];
            const Icon = column.icon;
            
            return (
              <div key={column.key} className="space-y-4">
                {/* Column Header */}
                <div className={`${column.color} border-2 rounded-lg p-4`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className={`h-5 w-5 ${column.textColor}`} />
                    <h3 className={`font-semibold ${column.textColor}`}>
                      {column.title}
                    </h3>
                  </div>
                  <p className={`text-sm ${column.textColor} opacity-80`}>
                    {column.description}
                  </p>
                  <Badge className={`mt-2 ${column.badgeColor}`}>
                    {posts.length} items
                  </Badge>
                </div>

                {/* Posts */}
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Icon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No items yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    posts.map((post) => (
                      <Card key={post.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                                <Link 
                                  href={`/${project.slug}/post/${post.id}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {post.title}
                                </Link>
                              </h4>
                              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                                {post.description}
                              </p>
                            </div>
                            
                            <Button
                              variant={votedPosts.has(post.id) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleVote(post.id)}
                              className={`ml-2 ${
                                votedPosts.has(post.id) 
                                  ? 'bg-blue-600 hover:bg-blue-700' 
                                  : 'hover:bg-blue-50'
                              }`}
                            >
                              <ChevronUp className="h-3 w-3 mr-1" />
                              {post.vote_count}
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CategoryBadge category={post.category} />
                            </div>
                            
                            <div className="flex items-center text-xs text-gray-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(post.created_at)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
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
            Create your own feedback board and roadmap in minutes. 
            <Link href="/" className="text-blue-600 hover:text-blue-700 ml-1">
              Get started free →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
