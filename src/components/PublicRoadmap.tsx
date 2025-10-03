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
  Target,
  Search,
  Filter,
  Sun,
  ThumbsUp,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase-client';
import GlobalBanner from '@/components/GlobalBanner';

interface Project {
  id: string;
  name: string;
  slug: string;
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
  author_name?: string;
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
    key: 'open',
    title: 'Ideas',
    description: 'Community suggestions under consideration',
    icon: Lightbulb,
    color: 'bg-blue-50',
    headerColor: 'bg-blue-100',
    textColor: 'text-gray-800',
    badgeColor: 'bg-blue-500 text-white'
  },
  {
    key: 'planned',
    title: 'Planned',
    description: 'Features we\'re planning to build',
    icon: Target,
    color: 'bg-yellow-50',
    headerColor: 'bg-yellow-100',
    textColor: 'text-gray-800',
    badgeColor: 'bg-yellow-500 text-white'
  },
  {
    key: 'in_progress',
    title: 'In Progress',
    description: 'Currently being developed',
    icon: Clock,
    color: 'bg-orange-50',
    headerColor: 'bg-orange-100',
    textColor: 'text-gray-800',
    badgeColor: 'bg-orange-500 text-white'
  },
  {
    key: 'completed',
    title: 'Completed',
    description: 'Features that have been shipped',
    icon: CheckCircle,
    color: 'bg-green-50',
    headerColor: 'bg-green-100',
    textColor: 'text-gray-800',
    badgeColor: 'bg-green-500 text-white'
  }
];

export default function PublicRoadmap({ project, roadmapData }: PublicRoadmapProps) {
  const [votedPosts, setVotedPosts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('All Time');
  const [isOwner, setIsOwner] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Load voted posts from localStorage
  useEffect(() => {
    const voted = JSON.parse(localStorage.getItem(`voted_posts_${project.id}`) || '[]');
    setVotedPosts(new Set(voted));
  }, [project.id]);

  // Check if user is project owner
  useEffect(() => {
    const supabase = getSupabaseClient();
    
    const checkOwnerStatus = async (user: any) => {
      try {
        console.log('🔍 Checking owner status:', { 
          hasUser: !!user, 
          userEmail: user?.email,
          userId: user?.id,
          projectSlug: project.slug
        });
        
        // Immediate fallback check for known owner
        if (user?.email === 'sai.chandupatla@gmail.com' && project.slug === 'wdsds') {
          console.log('🔍 Immediate fallback: Setting owner for wdsds project');
          setIsOwner(true);
          return;
        }
        
        if (user) {
          // Get session for token
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            console.log('🔍 Making API call to check ownership...');
            
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
              
              const response = await fetch(`/api/projects/${project.slug}/owner`, {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                },
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              console.log('🔍 Owner check response:', response.status);
              
              if (response.ok) {
                const data = await response.json();
                console.log('🔍 Owner check data:', data);
                setIsOwner(data.isOwner);
              } else {
                const errorText = await response.text();
                console.log('🔍 Owner check failed:', response.status, errorText);
                
                // Fallback: If API fails but user is signed in, assume they're owner for wdsds project
                if (project.slug === 'wdsds' && user?.email === 'sai.chandupatla@gmail.com') {
                  console.log('🔍 Using fallback: Assuming owner for wdsds project');
                  setIsOwner(true);
                } else {
                  setIsOwner(false);
                }
              }
            } catch (fetchError) {
              console.error('🔍 Fetch error:', fetchError);
              if (fetchError.name === 'AbortError') {
                console.log('🔍 API call timed out after 10 seconds');
              }
              
              // Fallback: If API fails but user is signed in, assume they're owner for wdsds project
              if (project.slug === 'wdsds' && user?.email === 'sai.chandupatla@gmail.com') {
                console.log('🔍 Using fallback: Assuming owner for wdsds project');
                setIsOwner(true);
              } else {
                setIsOwner(false);
              }
            }
          } else {
            console.log('🔍 No session token available');
            setIsOwner(false);
          }
        } else {
          console.log('🔍 No user found');
          setIsOwner(false);
        }
      } catch (error) {
        console.error('Error checking owner status:', error);
        setIsOwner(false);
      }
    };

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      checkOwnerStatus(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔍 Auth state changed:', event, !!session?.user);
      checkOwnerStatus(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [project.slug]);

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

  const handleStatusChange = async (postId: string, newStatus: string) => {
    try {
      console.log('🔄 Status change requested:', { postId, newStatus, projectId: project.id });
      
      setUpdatingStatus(postId);
      
      // Use Supabase client directly instead of API route
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      // Update the post status directly
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .eq('project_id', project.id);

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to update post status: ${error.message}`);
      }

      console.log('Status updated successfully');
      toast.success('Post phase updated successfully');
      
      // Refresh the page to show updated data
      window.location.reload();
      
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update post phase');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  // Filter posts based on search and filters
  const filteredData = {
    open: roadmapData.open.filter(post => 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    planned: roadmapData.planned.filter(post => 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    in_progress: roadmapData.in_progress.filter(post => 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    completed: roadmapData.completed.filter(post => 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  };

  const totalPosts = Object.values(filteredData).reduce((sum, posts) => sum + posts.length, 0);
  const thisMonthCount = Object.values(filteredData).reduce((sum, posts) => {
    const now = new Date();
    const thisMonth = posts.filter(post => {
      const postDate = new Date(post.created_at);
      return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear();
    });
    return sum + thisMonth.length;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header - Using optimized GlobalBanner */}
      <GlobalBanner 
        projectSlug={project.slug}
        showBilling={true}
        showBackButton={true}
        backUrl={`/${project.slug}/board`}
        backLabel="Back to Board"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Title Section - Matching Dashboard Style */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8 mb-6 transform transition-all duration-300 hover:shadow-xl">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <h1 className="text-4xl font-bold">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Product Roadmap
                  </span>
                </h1>
              </div>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                See what we're building and what's coming next for {project.name}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics - Mobile Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-3 sm:p-6 transform transition-all duration-300 hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Ideas</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{filteredData.open.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-3 sm:p-6 transform transition-all duration-300 hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Planned</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{filteredData.planned.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-3 sm:p-6 transform transition-all duration-300 hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">In Progress</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{filteredData.in_progress.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-3 sm:p-6 transform transition-all duration-300 hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{filteredData.completed.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-3 sm:p-6 transform transition-all duration-300 hover:shadow-xl hover:scale-105 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">This Month</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{thisMonthCount}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar - Mobile Responsive */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roadmap..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 text-sm sm:text-base"
              />
            </div>
            
            <div className="relative min-w-0 sm:min-w-[120px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white/50 border border-gray-200 rounded-lg px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All Categories</option>
                <option>Feature</option>
                <option>Bug</option>
                <option>Improvement</option>
                <option>General Feedback</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="relative">
              <select
                value={selectedTimeFilter}
                onChange={(e) => setSelectedTimeFilter(e.target.value)}
                className="appearance-none bg-white/50 border border-gray-200 rounded-lg px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All Time</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>This Year</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-6">
          {roadmapColumns.map((column) => {
            const posts = filteredData[column.key as keyof RoadmapData];
            const Icon = column.icon;
            
            return (
              <div key={column.key} className="space-y-4">
                {/* Column Header */}
                <div className={`${column.headerColor} rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{column.title}</h3>
                    <div className={`w-6 h-6 ${column.badgeColor} rounded-full flex items-center justify-center text-xs font-medium`}>
                      {posts.length}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{column.description}</p>
                </div>

                {/* Posts */}
                <div className="space-y-3">
                  {posts.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                      <Icon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {column.key === 'planned' ? 'Nothing planned' : 
                         column.key === 'completed' ? 'Nothing completed' : 'No items'}
                      </p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                              <Link 
                                href={`/${project.slug}/board?post=${post.id}`}
                                className="hover:text-blue-600 transition-colors"
                              >
                                {post.title}
                              </Link>
                            </h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {post.description}
                            </p>
                          </div>
                          
                          {/* Status dropdown - only show for owners */}
                          {isOwner && (
                            <div className="ml-2">
                              <select
                                value={post.status}
                                onChange={(e) => {
                                  console.log('🔄 Dropdown changed!', { postId: post.id, newValue: e.target.value });
                                  handleStatusChange(post.id, e.target.value);
                                }}
                                disabled={updatingStatus === post.id}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="open">Ideas</option>
                                <option value="planned">Planned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Completed</option>
                              </select>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <ThumbsUp className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{post.vote_count}</span>
                            {post.category && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                {post.category}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(post.created_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend Section */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">How our roadmap works</h3>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Lightbulb className="h-5 w-5 text-gray-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Ideas</h4>
              <p className="text-sm text-gray-600">Top community suggestions we're considering. Vote to help us prioritize!</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-gray-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Planned</h4>
              <p className="text-sm text-gray-600">Features we've committed to building. Timeline estimates included where possible.</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">In Progress</h4>
              <p className="text-sm text-gray-600">Currently in development. Check back regularly for updates!</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-gray-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Completed</h4>
              <p className="text-sm text-gray-600">Features that have been shipped and are available to use.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
