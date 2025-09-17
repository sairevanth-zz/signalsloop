'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Checkbox,
} from "@/components/ui/checkbox";
import { 
  Settings, 
  Move, 
  Calendar,
  CheckCircle,
  Target,
  Zap,
  Clock,
  Users,
  ArrowRight,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface RoadmapPost {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  vote_count: number;
  comment_count: number;
  estimated_completion?: string;
  completion_date?: string;
}

interface RoadmapPhaseManagerProps {
  posts: Record<string, RoadmapPost[]>;
  onPostUpdate: (postId: string, updates: any) => void;
  onBulkUpdate: (postIds: string[], updates: any) => void;
  projectSlug: string;
}

const statusConfig = {
  open: { title: 'Ideas', color: 'bg-gray-100 text-gray-800', icon: <Users className="w-4 h-4" /> },
  planned: { title: 'Planned', color: 'bg-blue-100 text-blue-800', icon: <Target className="w-4 h-4" /> },
  in_progress: { title: 'In Progress', color: 'bg-orange-100 text-orange-800', icon: <Zap className="w-4 h-4" /> },
  done: { title: 'Completed', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
  declined: { title: 'Declined', color: 'bg-red-100 text-red-800', icon: <Clock className="w-4 h-4" /> }
};

export default function RoadmapPhaseManager({ 
  posts, 
  onPostUpdate, 
  onBulkUpdate,
  projectSlug 
}: RoadmapPhaseManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkEstimatedCompletion, setBulkEstimatedCompletion] = useState<string>('');
  const [bulkCompletionDate, setBulkCompletionDate] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Flatten all posts for selection
  const allPosts = Object.values(posts).flat();

  const handlePostSelect = (postId: string, selected: boolean) => {
    if (selected) {
      setSelectedPosts(prev => [...prev, postId]);
    } else {
      setSelectedPosts(prev => prev.filter(id => id !== postId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPosts(allPosts.map(post => post.id));
    } else {
      setSelectedPosts([]);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedPosts.length === 0) {
      toast.error('Please select posts to update');
      return;
    }

    if (!bulkStatus) {
      toast.error('Please select a status');
      return;
    }

    setIsUpdating(true);

    try {
      const updates: any = { status: bulkStatus };

      if (bulkEstimatedCompletion) {
        updates.estimated_completion = bulkEstimatedCompletion;
      }

      if (bulkStatus === 'done' && bulkCompletionDate) {
        updates.completion_date = bulkCompletionDate;
      }

      const response = await fetch('/api/posts/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postIds: selectedPosts,
          updates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update posts');
      }

      const result = await response.json();
      
      // Update local state
      onBulkUpdate(selectedPosts, updates);

      toast.success(`Successfully updated ${result.updatedCount} posts`);
      setSelectedPosts([]);
      setBulkStatus('');
      setBulkEstimatedCompletion('');
      setBulkCompletionDate('');
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update posts');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIndividualUpdate = async (postId: string, updates: any) => {
    try {
      const response = await fetch(`/api/posts/${postId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update post');
      }

      const result = await response.json();
      onPostUpdate(postId, updates);
      toast.success('Post updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update post');
    }
  };

  const getPostStatus = (postId: string) => {
    for (const [status, statusPosts] of Object.entries(posts)) {
      if (statusPosts.find(post => post.id === postId)) {
        return status;
      }
    }
    return 'open';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
        >
          <Settings className="w-4 h-4" />
          Manage Phases
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Roadmap Phase Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selection Controls */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedPosts.length === allPosts.length && allPosts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="font-medium">
                  Select All ({allPosts.length} posts)
                </Label>
              </div>
              {selectedPosts.length > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {selectedPosts.length} selected
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPosts([])}
              disabled={selectedPosts.length === 0}
            >
              Clear Selection
            </Button>
          </div>

          {/* Posts by Status */}
          <div className="space-y-6">
            {Object.entries(posts).map(([status, statusPosts]) => (
              <Card key={status} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {statusConfig[status as keyof typeof statusConfig]?.icon}
                      <CardTitle className="text-lg">
                        {statusConfig[status as keyof typeof statusConfig]?.title}
                      </CardTitle>
                      <Badge className={statusConfig[status as keyof typeof statusConfig]?.color}>
                        {statusPosts.length} posts
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {statusPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No posts in this phase</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {statusPosts.map((post) => (
                        <div key={post.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                          <Checkbox
                            id={`post-${post.id}`}
                            checked={selectedPosts.includes(post.id)}
                            onCheckedChange={(checked) => handlePostSelect(post.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{post.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>👍 {post.vote_count} votes</span>
                              <span>💬 {post.comment_count} comments</span>
                              {post.estimated_completion && (
                                <span>📅 ETA: {post.estimated_completion}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={status}
                              onValueChange={(newStatus) => {
                                if (newStatus !== status) {
                                  handleIndividualUpdate(post.id, { status: newStatus });
                                }
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([statusKey, config]) => (
                                  <SelectItem key={statusKey} value={statusKey}>
                                    <div className="flex items-center gap-2">
                                      {config.icon}
                                      {config.title}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bulk Actions */}
          {selectedPosts.length > 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Move className="w-5 h-5" />
                  Bulk Actions ({selectedPosts.length} posts selected)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bulk-status" className="text-sm font-medium">
                      New Status
                    </Label>
                    <Select value={bulkStatus} onValueChange={setBulkStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([statusKey, config]) => (
                          <SelectItem key={statusKey} value={statusKey}>
                            <div className="flex items-center gap-2">
                              {config.icon}
                              {config.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(bulkStatus === 'planned' || bulkStatus === 'in_progress') && (
                    <div>
                      <Label htmlFor="bulk-eta" className="text-sm font-medium">
                        Estimated Completion
                      </Label>
                      <Input
                        id="bulk-eta"
                        placeholder="e.g., Q1 2024"
                        value={bulkEstimatedCompletion}
                        onChange={(e) => setBulkEstimatedCompletion(e.target.value)}
                      />
                    </div>
                  )}

                  {bulkStatus === 'done' && (
                    <div>
                      <Label htmlFor="bulk-completion" className="text-sm font-medium">
                        Completion Date
                      </Label>
                      <Input
                        id="bulk-completion"
                        type="date"
                        value={bulkCompletionDate}
                        onChange={(e) => setBulkCompletionDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleBulkUpdate}
                    disabled={isUpdating || !bulkStatus}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Update {selectedPosts.length} Posts
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPosts([]);
                      setBulkStatus('');
                      setBulkEstimatedCompletion('');
                      setBulkCompletionDate('');
                    }}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(posts).map(([status, statusPosts]) => (
              <div key={status} className="text-center p-4 bg-white border rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {statusPosts.length}
                </div>
                <div className="text-sm text-gray-600">
                  {statusConfig[status as keyof typeof statusConfig]?.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
