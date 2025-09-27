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
  AlertCircle,
  Mail,
  Bell,
  Tag,
  Target,
  TrendingUp,
  Users,
  Star,
  Zap,
  Eye,
  ThumbsUp,
  MessageCircle,
  Globe,
  Palette,
  Download,
  Filter,
  Search,
  X,
  Plus,
  Edit3,
  BarChart3
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
  roadmap_title?: string;
  roadmap_description?: string;
  roadmap_logo_url?: string;
  roadmap_brand_color?: string;
  roadmap_show_progress?: boolean;
  roadmap_show_effort?: boolean;
  roadmap_show_timeline?: boolean;
  roadmap_allow_anonymous_votes?: boolean;
  roadmap_subscribe_emails?: boolean;
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
  priority?: string;
  effort_estimate?: string;
  progress_percentage?: number;
  estimated_timeline?: string;
  completion_date?: string;
  tags?: string[];
  last_updated?: string;
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

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
};

const effortSizes = {
  'XS': 'Extra Small',
  'S': 'Small',
  'M': 'Medium',
  'L': 'Large',
  'XL': 'Extra Large'
};

export default function EnhancedPublicRoadmap({ project, roadmapData }: PublicRoadmapProps) {
  const [votedPosts, setVotedPosts] = useState<Set<string>>(new Set());
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [showSubscribeForm, setShowSubscribeForm] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState<string | null>(null);
  const [feedbackContent, setFeedbackContent] = useState('');

  // Load voted posts from localStorage
  useEffect(() => {
    const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
    setVotedPosts(new Set(voted));
  }, [project.id]);

  const handleVote = async (postId: string) => {
    if (!project.roadmap_allow_anonymous_votes) {
      toast.error('Voting requires sign in');
      return;
    }

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

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail || !project.roadmap_subscribe_emails) return;

    try {
      const response = await fetch(`/api/roadmap/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          email: subscribeEmail
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setShowSubscribeForm(false);
        toast.success('Successfully subscribed to updates!');
      } else {
        throw new Error('Failed to subscribe');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to subscribe');
    }
  };

  const handleSubmitFeedback = async (postId: string) => {
    if (!feedbackContent.trim()) return;

    try {
      const response = await fetch(`/api/roadmap/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content: feedbackContent,
          isAnonymous: true
        }),
      });

      if (response.ok) {
        setFeedbackContent('');
        setShowFeedbackForm(null);
        toast.success('Feedback submitted successfully!');
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const handleShare = (post: Post) => {
    const url = `${window.location.origin}/${project.slug}/post/${post.id}`;
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.description,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
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

  // Get all unique tags from posts
  const allTags = Array.from(new Set(
    Object.values(roadmapData).flatMap(posts => 
      posts.flatMap(post => post.tags || [])
    )
  ));

  // Filter posts based on search and tags
  const filterPosts = (posts: Post[]) => {
    return posts.filter(post => {
      const matchesSearch = !searchTerm || 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => post.tags?.includes(tag));
      
      return matchesSearch && matchesTags;
    });
  };

  const totalPosts = Object.values(roadmapData).reduce((sum, posts) => sum + posts.length, 0);
  const totalVotes = Object.values(roadmapData).reduce((sum, posts) => 
    sum + posts.reduce((postSum, post) => postSum + post.vote_count, 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {project.roadmap_logo_url ? (
                <img 
                  src={project.roadmap_logo_url} 
                  alt={project.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {project.roadmap_title || `${project.name} Roadmap`}
                </h1>
                <p className="text-sm text-gray-500">
                  Last updated {formatDate(new Date().toISOString())}
                </p>
              </div>
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
        {/* Enhanced Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {project.roadmap_title || `${project.name} Roadmap`}
          </h1>
          {(project.roadmap_description || project.description) && (
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {project.roadmap_description || project.description}
            </p>
          )}
          
          {/* Subscribe to Updates */}
          {project.roadmap_subscribe_emails && !isSubscribed && (
            <div className="mb-8">
              {!showSubscribeForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowSubscribeForm(true)}
                  className="mb-4"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Subscribe to Updates
                </Button>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2 justify-center max-w-md mx-auto">
                  <input
                    type="email"
                    value={subscribeEmail}
                    onChange={(e) => setSubscribeEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <Button type="submit" size="sm">Subscribe</Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowSubscribeForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>
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

        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-blue-50 border-blue-200 border-2">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-blue-800 mb-2">{totalPosts}</div>
              <div className="text-sm font-medium text-blue-800">Total Items</div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200 border-2">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-800 mb-2">{totalVotes}</div>
              <div className="text-sm font-medium text-green-800">Total Votes</div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200 border-2">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-purple-800 mb-2">
                {roadmapData.completed.length}
              </div>
              <div className="text-sm font-medium text-purple-800">Completed</div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200 border-2">
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-orange-800 mb-2">
                {roadmapData.in_progress.length}
              </div>
              <div className="text-sm font-medium text-orange-800">In Progress</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search roadmap items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Filter className="h-4 w-4 text-gray-500 mt-2" />
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      selectedTags.includes(tag) ? 'bg-blue-600' : ''
                    }`}
                    onClick={() => {
                      setSelectedTags(prev => 
                        prev.includes(tag) 
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Roadmap Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roadmapColumns.map((column) => {
            const posts = filterPosts(roadmapData[column.key as keyof RoadmapData]);
            const Icon = column.icon;
            
            return (
              <div key={column.key} className="space-y-4">
                {/* Enhanced Column Header */}
                <div className={`${column.color} border-2 rounded-lg p-4`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className={`h-5 w-5 ${column.textColor}`} />
                    <h3 className={`font-semibold ${column.textColor}`}>
                      {column.title}
                    </h3>
                  </div>
                  <p className={`text-sm ${column.textColor} opacity-80 mb-2`}>
                    {column.description}
                  </p>
                  <Badge className={`${column.badgeColor}`}>
                    {posts.length} items
                  </Badge>
                </div>

                {/* Enhanced Posts */}
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Icon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          {searchTerm || selectedTags.length > 0 ? 'No matching items' : 'No items yet'}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    posts.map((post) => (
                      <Card key={post.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          {/* Priority and Tags Row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              {post.priority && (
                                <Badge className={priorityColors[post.priority as keyof typeof priorityColors]}>
                                  {post.priority}
                                </Badge>
                              )}
                              {post.tags?.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShare(post)}
                                className="h-6 w-6 p-0"
                              >
                                <Share2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowFeedbackForm(post.id)}
                                className="h-6 w-6 p-0"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Title and Description */}
                          <div className="mb-3">
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

                          {/* Progress Bar for In Progress Items */}
                          {column.key === 'in_progress' && project.roadmap_show_progress && post.progress_percentage !== undefined && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{post.progress_percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${post.progress_percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* Effort and Timeline */}
                          <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                            <div className="flex items-center space-x-3">
                              {project.roadmap_show_effort && post.effort_estimate && (
                                <div className="flex items-center">
                                  <Target className="h-3 w-3 mr-1" />
                                  {effortSizes[post.effort_estimate as keyof typeof effortSizes]}
                                </div>
                              )}
                              {project.roadmap_show_timeline && post.estimated_timeline && (
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {post.estimated_timeline}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(post.created_at)}
                            </div>
                          </div>

                          {/* Vote Button and Category */}
                          <div className="flex items-center justify-between">
                            <CategoryBadge category={post.category} />
                            
                            <Button
                              variant={votedPosts.has(post.id) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleVote(post.id)}
                              disabled={!project.roadmap_allow_anonymous_votes}
                              className={`${
                                votedPosts.has(post.id) 
                                  ? 'bg-blue-600 hover:bg-blue-700' 
                                  : 'hover:bg-blue-50'
                              }`}
                            >
                              <ChevronUp className="h-3 w-3 mr-1" />
                              {post.vote_count}
                            </Button>
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

        {/* Enhanced Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Stay Updated</h3>
              <p className="text-sm text-gray-600 mb-4">
                Get notified when we ship new features and updates.
              </p>
              {project.roadmap_subscribe_emails && !isSubscribed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubscribeForm(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Subscribe to Updates
                </Button>
              )}
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Have Feedback?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Share your thoughts and help us prioritize what to build next.
              </p>
              <Link href={`/${project.slug}`}>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Submit Feedback
                </Button>
              </Link>
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Powered by</h3>
              <p className="text-sm text-gray-600 mb-4">
                Create your own professional roadmap in minutes.
              </p>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Heart className="h-4 w-4 mr-2" />
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <Link href="/" className="font-semibold text-blue-600 hover:text-blue-700">
              SignalsLoop
            </Link>
            <span className="mx-2">•</span>
            <span>Professional roadmap management for modern teams</span>
          </div>
        </div>
      </main>

      {/* Feedback Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Feedback</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFeedbackForm(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <textarea
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              placeholder="Share your thoughts on this roadmap item..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
            />
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowFeedbackForm(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmitFeedback(showFeedbackForm)}
                disabled={!feedbackContent.trim()}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
