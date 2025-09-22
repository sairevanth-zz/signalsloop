'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Save, 
  Trash2, 
  Eye, 
  Shield, 
  Palette,
  Users,
  Lock,
  Crown,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface BoardSettingsProps {
  projectSlug: string;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  userPlan?: 'free' | 'pro';
}

interface BoardConfig {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  allow_anonymous_posts: boolean;
  require_approval: boolean;
  auto_close_days?: number;
  custom_css?: string;
  welcome_message?: string;
  sort_default: 'votes' | 'newest' | 'oldest';
  posts_per_page: number;
  show_author_emails: boolean;
  enable_comments: boolean;
  enable_voting: boolean;
  custom_statuses?: string[];
}

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
}

export default function BoardSettings({ 
  projectSlug, 
  onShowNotification,
  userPlan = 'free'
}: BoardSettingsProps) {
  const router = useRouter();
  
  const [project, setProject] = useState<Project | null>(null);
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<BoardConfig>>({});

  const loadBoardSettings = useCallback(async () => {
    if (!supabase) {
      onShowNotification?.('Database connection not available. Please refresh the page.', 'error');
      setLoading(false);
      return;
    }

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

      // Get board settings
      console.log('🔍 Loading board for project:', projectData.id);
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('project_id', projectData.id)
        .single();

      console.log('🔍 Board query result:', { boardData, boardError });

      if (boardError || !boardData) {
        console.error('❌ Board not found:', { boardError, boardData });
        onShowNotification?.('Board not found', 'error');
        return;
      }

      // Set default values for missing properties
      const boardConfig: BoardConfig = {
        id: boardData.id,
        name: boardData.name || 'Feedback Board',
        description: boardData.description || '',
        is_private: boardData.is_private || false,
        allow_anonymous_posts: boardData.allow_anonymous_posts ?? true,
        require_approval: boardData.require_approval || false,
        auto_close_days: boardData.auto_close_days,
        custom_css: boardData.custom_css || '',
        welcome_message: boardData.welcome_message || '',
        sort_default: boardData.sort_default || 'votes',
        posts_per_page: boardData.posts_per_page || 20,
        show_author_emails: boardData.show_author_emails ?? true,
        enable_comments: boardData.enable_comments ?? true,
        enable_voting: boardData.enable_voting ?? true,
        custom_statuses: boardData.custom_statuses || []
      };

      setBoard(boardConfig);
      setFormData(boardConfig);

    } catch (error) {
      console.error('Error loading board settings:', error);
      onShowNotification?.('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, projectSlug, onShowNotification]);

  // Initialize Supabase client safely
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      setSupabase(client);
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      loadBoardSettings();
    }
  }, [projectSlug, supabase, loadBoardSettings]);

  useEffect(() => {
    // Check if form data differs from original board config
    if (board && Object.keys(formData).length > 0) {
      const hasChanges = Object.keys(formData).some(key => {
        return formData[key as keyof BoardConfig] !== board[key as keyof BoardConfig];
      });
      setHasChanges(hasChanges);
    }
  }, [formData, board]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (field: keyof BoardConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!board || !project || !supabase) {
      onShowNotification?.('Database connection not available. Please refresh the page.', 'error');
      return;
    }

    try {
      setSaving(true);

      // Check Pro feature restrictions
      if (userPlan === 'free' || project.plan === 'free') {
        if (formData.is_private) {
          onShowNotification?.(
            'Private boards are only available on Pro plans. Upgrade to enable this feature.', 
            'error'
          );
          return;
        }
        
        if (formData.custom_css) {
          onShowNotification?.(
            'Custom CSS is only available on Pro plans. Upgrade to enable this feature.', 
            'error'
          );
          return;
        }
      }

      const { error } = await supabase
        .from('boards')
        .update({
          name: formData.name,
          description: formData.description,
          is_private: formData.is_private,
          allow_anonymous_posts: formData.allow_anonymous_posts,
          require_approval: formData.require_approval,
          auto_close_days: formData.auto_close_days,
          custom_css: formData.custom_css,
          welcome_message: formData.welcome_message,
          sort_default: formData.sort_default,
          posts_per_page: formData.posts_per_page,
          show_author_emails: formData.show_author_emails,
          enable_comments: formData.enable_comments,
          enable_voting: formData.enable_voting,
          custom_statuses: formData.custom_statuses,
          updated_at: new Date().toISOString()
        })
        .eq('id', board.id);

      if (error) {
        console.error('Error saving settings:', error);
        onShowNotification?.('Error saving settings', 'error');
        return;
      }

      // Update local state
      setBoard({ ...board, ...formData });
      setHasChanges(false);
      
      onShowNotification?.('Settings saved successfully', 'success');

    } catch (error) {
      console.error('Error saving settings:', error);
      onShowNotification?.('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (board) {
      setFormData(board);
      setHasChanges(false);
    }
  };

  const handleDeleteBoard = async () => {
    alert('DELETE BOARD FUNCTION CALLED!');
    console.log('🚨🚨🚨 DELETE BOARD FUNCTION CALLED! 🚨🚨🚨');
    console.log('🚨 Current state:', { board, project, supabase: !!supabase });
    console.log('🗑️ Delete board clicked:', { 
      board: board ? { id: board.id, name: board.name } : null, 
      supabase: !!supabase, 
      project: project ? { id: project.id, slug: project.slug } : null 
    });
    
    if (!board || !supabase || !project) {
      console.error('❌ Missing required data:', { 
        board: board ? { id: board.id, name: board.name } : null, 
        supabase: !!supabase, 
        project: project ? { id: project.id, slug: project.slug } : null 
      });
      onShowNotification?.('Database connection not available. Please refresh the page.', 'error');
      return;
    }

    if (!board.id) {
      console.error('❌ Board ID is missing:', board);
      onShowNotification?.('Board ID is missing. Please refresh the page.', 'error');
      return;
    }

    try {
      console.log('🗑️ Attempting to delete board via API:', { boardId: board.id, boardName: board.name });
      
      // Get auth session
      const { data: session } = await supabase.auth.getSession();
      console.log('🔐 Auth session:', { hasSession: !!session.session, hasToken: !!session.session?.access_token });
      
      // Use API route with service role key to bypass RLS
      const response = await fetch('/api/boards/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token || 'no-token'}`
        },
        body: JSON.stringify({ boardId: board.id })
      });

      console.log('📡 API Response status:', response.status);
      const result = await response.json();
      console.log('🗑️ API Delete result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete board');
      }

      console.log('✅ Board deleted successfully');
      onShowNotification?.('Board deleted successfully', 'success');
      
      // Close dialog and navigate
      setShowDeleteDialog(false);
      router.push(`/${project.slug}/board`);

    } catch (error) {
      console.error('Error deleting board:', error);
      onShowNotification?.(`Something went wrong: ${error.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!board || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Board not found</h2>
          <p className="text-gray-600">The feedback board you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const isPro = userPlan === 'pro' || project.plan === 'pro';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Board Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure your feedback board for {project.name}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Basic Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="board-name">Board Name</Label>
                <Input
                  id="board-name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Feature Requests"
                />
              </div>
              
              <div>
                <Label htmlFor="sort-default">Default Sort Order</Label>
                <Select
                  value={formData.sort_default || 'votes'}
                  onValueChange={(value) => handleInputChange('sort_default', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="votes">Most Votes</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Board Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this board is for..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="welcome-message">Welcome Message</Label>
              <Textarea
                id="welcome-message"
                value={formData.welcome_message || ''}
                onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                placeholder="Message shown to users when they visit the board..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {formData.is_private ? (
                  <Lock className="w-5 h-5 text-orange-600" />
                ) : (
                  <Eye className="w-5 h-5 text-green-600" />
                )}
                <div>
                  <Label htmlFor="is-private">Private Board</Label>
                  <p className="text-sm text-gray-600">
                    Only team members can view this board
                  </p>
                  {!isPro && (
                    <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                      <Crown className="w-3 h-3" />
                      Pro feature
                    </p>
                  )}
                </div>
              </div>
              <Switch
                id="is-private"
                checked={formData.is_private || false}
                onCheckedChange={(checked) => handleInputChange('is_private', checked)}
                disabled={!isPro}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <Label htmlFor="allow-anonymous">Allow Anonymous Posts</Label>
                  <p className="text-sm text-gray-600">
                    Users can submit feedback without providing email
                  </p>
                </div>
              </div>
              <Switch
                id="allow-anonymous"
                checked={formData.allow_anonymous_posts ?? true}
                onCheckedChange={(checked) => handleInputChange('allow_anonymous_posts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <div>
                  <Label htmlFor="require-approval">Require Post Approval</Label>
                  <p className="text-sm text-gray-600">
                    All posts must be approved before appearing publicly
                  </p>
                </div>
              </div>
              <Switch
                id="require-approval"
                checked={formData.require_approval || false}
                onCheckedChange={(checked) => handleInputChange('require_approval', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Display Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="posts-per-page">Posts Per Page</Label>
                <Select
                  value={String(formData.posts_per_page || 20)}
                  onValueChange={(value) => handleInputChange('posts_per_page', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 posts</SelectItem>
                    <SelectItem value="20">20 posts</SelectItem>
                    <SelectItem value="50">50 posts</SelectItem>
                    <SelectItem value="100">100 posts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="auto-close">Auto-close Posts After (days)</Label>
                <Input
                  id="auto-close"
                  type="number"
                  value={formData.auto_close_days || ''}
                  onChange={(e) => handleInputChange('auto_close_days', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Never"
                  min="1"
                  max="365"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-emails">Show Author Emails</Label>
                  <p className="text-sm text-gray-600">
                    Display email addresses on posts and comments
                  </p>
                </div>
                <Switch
                  id="show-emails"
                  checked={formData.show_author_emails ?? true}
                  onCheckedChange={(checked) => handleInputChange('show_author_emails', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-comments">Enable Comments</Label>
                  <p className="text-sm text-gray-600">
                    Allow users to comment on posts
                  </p>
                </div>
                <Switch
                  id="enable-comments"
                  checked={formData.enable_comments ?? true}
                  onCheckedChange={(checked) => handleInputChange('enable_comments', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-voting">Enable Voting</Label>
                  <p className="text-sm text-gray-600">
                    Allow users to vote on posts
                  </p>
                </div>
                <Switch
                  id="enable-voting"
                  checked={formData.enable_voting ?? true}
                  onCheckedChange={(checked) => handleInputChange('enable_voting', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customization (Pro Only) */}
        <Card className={!isPro ? 'opacity-60' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Customization
              {!isPro && (
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                  Pro Only
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="custom-css">Custom CSS</Label>
              <Textarea
                id="custom-css"
                value={formData.custom_css || ''}
                onChange={(e) => handleInputChange('custom_css', e.target.value)}
                placeholder="/* Custom styles for your board */
.board-header { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}"
                rows={6}
                disabled={!isPro}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-600 mt-1">
                Add custom CSS to style your feedback board
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h3 className="font-medium text-red-900">Delete Board</h3>
                <p className="text-sm text-red-600">
                  Permanently delete this board and all its posts, comments, and votes.
                </p>
                
                {/* Test button outside dialog */}
                <Button 
                  onClick={() => {
                    alert('TEST BUTTON CLICKED!');
                    console.log('🧪 TEST BUTTON CLICKED!');
                  }}
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                >
                  Test Button (Should Show Alert)
                </Button>
              </div>
              
              <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
                if (!open) {
                  setShowDeleteDialog(false);
                }
              }}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Board
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Board</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{board.name}&quot;? This will permanently delete:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All feedback posts</li>
                        <li>All comments and votes</li>
                        <li>All board settings</li>
                      </ul>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button
                      onClick={handleDeleteBoard}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete Board
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
