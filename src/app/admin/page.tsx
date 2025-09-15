'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Filter, 
  Search, 
  ThumbsUp, 
  MessageSquare, 
  Calendar,
  User,
  Edit,
  Trash2,
  Tag,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  BarChart3,
  Loader2
} from 'lucide-react';

interface AdminPost {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  comment_count: number;
  tags?: string[];
  duplicate_of?: string;
  board_id: string;
  board_name: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface AdminDashboardProps {
  projectSlug: string;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const statusConfig = {
  open: { 
    label: 'Open', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'New feedback that needs review'
  },
  planned: { 
    label: 'Planned', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Approved for future development'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Currently being worked on'
  },
  done: { 
    label: 'Done', 
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Completed and shipped'
  },
  declined: { 
    label: 'Declined', 
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Will not be implemented'
  }
};

export default function AdminDashboard({ projectSlug, onShowNotification }: AdminDashboardProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalPosts: 0,
    openPosts: 0,
    completedPosts: 0,
    totalVotes: 0
  });

  // Moderation state
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null);
  const [bulkAction, setBulkAction] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, [projectSlug]);

  useEffect(() => {
    filterAndSortPosts();
  }, [posts, searchTerm, statusFilter, sortBy]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .single();

      if (projectError || !projectData) {
        onShowNotification?.('Project not found', 'error');
        return;
      }

      setProject(projectData);

      // Get all posts for this project with additional data
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          vote_count:votes(count),
          comment_count:comments(count),
          boards!inner(name, project_id)
        `)
        .eq('boards.project_id', projectData.id)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error loading posts:', postsError);
        onShowNotification?.('Error loading posts', 'error');
        return;
      }

      // Process posts data
      const processedPosts = postsData?.map(post => ({
        id: post.id,
        title: post.title,
        description: post.description,
        author_email: post.author_email,
        status: post.status,
        created_at: post.created_at,
        vote_count: post.vote_count?.[0]?.count || 0,
        comment_count: post.comment_count?.[0]?.count || 0,
        tags: [], // TODO: Add tags functionality
        duplicate_of: post.duplicate_of,
        board_id: post.board_id,
        board_name: post.boards?.name || 'Unknown'
      })) || [];

      setPosts(processedPosts);

      // Calculate stats
      const totalPosts = processedPosts.length;
      const openPosts = processedPosts.filter(p => p.status === 'open').length;
      const completedPosts = processedPosts.filter(p => p.status === 'done').length;
      const totalVotes = processedPosts.reduce((sum, p) => sum + p.vote_count, 0);

      setStats({
        totalPosts,
        openPosts,
        completedPosts,
        totalVotes
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      onShowNotification?.('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPosts = () => {
    let filtered = [...posts];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(post => post.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return b.vote_count - a.vote_count;
        case 'comments':
          return b.comment_count - a.comment_count;
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredPosts(filtered);
  };

  const handleStatusChange = async (postId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', postId);

      if (error) {
        console.error('Error updating status:', error);
        onShowNotification?.('Error updating status', 'error');
        return;
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, status: newStatus as 'done' | 'open' | 'planned' | 'in_progress' | 'declined' } : post
      ));

      onShowNotification?.('Status updated successfully', 'success');

      // TODO: Send status change email to author

    } catch (error) {
      console.error('Error updating status:', error);
      onShowNotification?.('Something went wrong', 'error');
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkAction || selectedPosts.length === 0) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: bulkAction })
        .in('id', selectedPosts);

      if (error) {
        console.error('Error bulk updating:', error);
        onShowNotification?.('Error updating posts', 'error');
        return;
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        selectedPosts.includes(post.id) ? { ...post, status: bulkAction as 'done' | 'open' | 'planned' | 'in_progress' | 'declined' } : post
      ));

      setSelectedPosts([]);
      setBulkAction('');
      onShowNotification?.(
        `Updated ${selectedPosts.length} posts to ${bulkAction}`, 
        'success'
      );

    } catch (error) {
      console.error('Error bulk updating:', error);
      onShowNotification?.('Something went wrong', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        onShowNotification?.('Error deleting post', 'error');
        return;
      }

      // Update local state
      setPosts(prev => prev.filter(post => post.id !== postId));
      setSelectedPosts(prev => prev.filter(id => id !== postId));
      
      onShowNotification?.('Post deleted successfully', 'success');

    } catch (error) {
      console.error('Error deleting post:', error);
      onShowNotification?.('Something went wrong', 'error');
    }
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const selectAllPosts = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(post => post.id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage feedback for {project?.name}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={loadDashboardData}>
                <Settings className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Open Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.openPosts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedPosts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Votes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalVotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Bulk Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="votes">Most Votes</SelectItem>
                  <SelectItem value="comments">Most Comments</SelectItem>
                </SelectContent>
              </Select>

              {/* Bulk Actions */}
              <div className="flex gap-2">
                <input
                  type="checkbox"
                  checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                  onChange={selectAllPosts}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  {selectedPosts.length} selected
                </span>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedPosts.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedPosts.length} posts selected
                </span>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Choose action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Mark as Planned</SelectItem>
                    <SelectItem value="in_progress">Mark as In Progress</SelectItem>
                    <SelectItem value="done">Mark as Done</SelectItem>
                    <SelectItem value="declined">Mark as Declined</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkStatusChange}
                  disabled={!bulkAction}
                  size="sm"
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPosts([])}
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No posts found
                </h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters to see more posts.'
                    : 'No feedback has been submitted yet.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post.id)}
                      onChange={() => togglePostSelection(post.id)}
                      className="mt-1 rounded border-gray-300"
                    />

                    {/* Post Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {post.title}
                          </h3>
                          
                          {post.description && (
                            <p className="text-gray-600 line-clamp-2 mb-3">
                              {post.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>
                                {post.author_email 
                                  ? post.author_email.split('@')[0] 
                                  : 'Anonymous'
                                }
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              <span>{post.vote_count} votes</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              <span>{post.comment_count} comments</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={statusConfig[post.status].color}
                          >
                            {statusConfig[post.status].label}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <Select
                          value={post.status}
                          onValueChange={(value) => handleStatusChange(post.id, value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPost(post)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{post.title}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePost(post.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More */}
        {filteredPosts.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline">
              Load More Posts
            </Button>
          </div>
        )}
      </div>

      {/* Edit Post Dialog */}
      {editingPost && (
        <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
              <DialogDescription>
                Make changes to the post details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={editingPost.title}
                  onChange={(e) => setEditingPost(prev => 
                    prev ? { ...prev, title: e.target.value } : null
                  )}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={editingPost.description || ''}
                  onChange={(e) => setEditingPost(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingPost(null)}
                >
                  Cancel
                </Button>
                <Button onClick={() => {
                  // TODO: Implement save changes
                  setEditingPost(null);
                  onShowNotification?.('Changes saved', 'success');
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}