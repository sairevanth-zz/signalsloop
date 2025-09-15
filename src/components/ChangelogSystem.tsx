'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Calendar, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Rss,
  BookOpen,
  Sparkles,
  Bug,
  Zap,
  Megaphone,
  Check,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface ChangelogEntry {
  id: string;
  title: string;
  body: string;
  entry_type: 'feature' | 'improvement' | 'bugfix' | 'announcement';
  released_at: string;
  linked_posts: string[];
  version?: string;
  is_published: boolean;
  created_at: string;
}

interface LinkedPost {
  id: string;
  title: string;
  votes: number;
}

interface ChangelogSystemProps {
  projectId: string;
  projectSlug: string;
  isAdmin?: boolean;
}

export function ChangelogSystem({ 
  projectId, 
  projectSlug, 
  isAdmin = false 
}: ChangelogSystemProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [availablePosts, setAvailablePosts] = useState<LinkedPost[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    entry_type: 'feature' as ChangelogEntry['entry_type'],
    version: '',
    released_at: new Date().toISOString().split('T')[0],
    linked_posts: [] as string[],
    is_published: true
  });

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

  const loadEntries = useCallback(async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('changelog')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_published', true) // Only show published entries for public view
        .order('released_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading changelog:', error);
      toast.error('Failed to load changelog');
    } finally {
      setLoading(false);
    }
  }, [supabase, projectId]);

  const loadAvailablePosts = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          votes:votes(count)
        `)
        .eq('project_id', projectId)
        .in('status', ['done', 'in_progress']);

      if (error) throw error;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postsWithVotes = (data || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        votes: post.votes?.[0]?.count || 0
      }));

      setAvailablePosts(postsWithVotes);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    if (supabase) {
      loadEntries();
      if (isAdmin) {
        loadAvailablePosts();
      }
    }
  }, [supabase, loadEntries, loadAvailablePosts, isAdmin]);

  const saveEntry = async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('changelog')
          .update({
            title: formData.title,
            body: formData.body,
            entry_type: formData.entry_type,
            version: formData.version || null,
            released_at: formData.released_at,
            linked_posts: formData.linked_posts,
            is_published: formData.is_published
          })
          .eq('id', editingEntry.id);

        if (error) throw error;
        toast.success('Changelog entry updated!');
      } else {
        // Create new entry
        const { error } = await supabase
          .from('changelog')
          .insert({
            project_id: projectId,
            title: formData.title,
            body: formData.body,
            entry_type: formData.entry_type,
            version: formData.version || null,
            released_at: formData.released_at,
            linked_posts: formData.linked_posts,
            is_published: formData.is_published
          });

        if (error) throw error;
        toast.success('Changelog entry created!');
      }

      // Reset form and reload entries
      resetForm();
      loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry');
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    if (!confirm('Are you sure you want to delete this changelog entry?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('changelog')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      
      setEntries(entries.filter(entry => entry.id !== entryId));
      toast.success('Changelog entry deleted');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      body: '',
      entry_type: 'feature',
      version: '',
      released_at: new Date().toISOString().split('T')[0],
      linked_posts: [],
      is_published: true
    });
    setShowAddForm(false);
    setEditingEntry(null);
  };

  const startEdit = (entry: ChangelogEntry) => {
    setFormData({
      title: entry.title,
      body: entry.body,
      entry_type: entry.entry_type,
      version: entry.version || '',
      released_at: entry.released_at.split('T')[0],
      linked_posts: entry.linked_posts || [],
      is_published: entry.is_published
    });
    setEditingEntry(entry);
    setShowAddForm(true);
  };

  const getTypeIcon = (type: ChangelogEntry['entry_type']) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="h-4 w-4 text-green-500" />;
      case 'improvement':
        return <Zap className="h-4 w-4 text-blue-500" />;
      case 'bugfix':
        return <Bug className="h-4 w-4 text-red-500" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-purple-500" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: ChangelogEntry['entry_type']) => {
    const variants = {
      feature: 'default',
      improvement: 'secondary',
      bugfix: 'destructive',
      announcement: 'outline'
    } as const;

    return (
      <Badge variant={variants[type] || 'outline'} className="capitalize">
        {getTypeIcon(type)}
        <span className="ml-1">{type}</span>
      </Badge>
    );
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-16 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Changelog
          </h1>
          <p className="text-muted-foreground mt-1">
            Latest updates and improvements to {projectSlug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Rss className="h-4 w-4 mr-2" />
            RSS Feed
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingEntry ? 'Edit Changelog Entry' : 'Add New Changelog Entry'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., New Mobile App Released"
                />
              </div>
              <div>
                <Label htmlFor="type">Entry Type</Label>
                <select
                  id="type"
                  className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                  value={formData.entry_type}
                  onChange={(e) => setFormData({...formData, entry_type: e.target.value as ChangelogEntry['entry_type']})}
                >
                  <option value="feature">New Feature</option>
                  <option value="improvement">Improvement</option>
                  <option value="bugfix">Bug Fix</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="version">Version (Optional)</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({...formData, version: e.target.value})}
                  placeholder="e.g., v2.1.0"
                />
              </div>
              <div>
                <Label htmlFor="released_at">Release Date</Label>
                <Input
                  id="released_at"
                  type="date"
                  value={formData.released_at}
                  onChange={(e) => setFormData({...formData, released_at: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="body">Description</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({...formData, body: e.target.value})}
                placeholder="Describe what's new, improved, or fixed..."
                rows={4}
              />
            </div>

            <div>
              <Label>Link Related Posts (Optional)</Label>
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                {availablePosts.map(post => (
                  <div key={post.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`post-${post.id}`}
                      checked={formData.linked_posts.includes(post.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            linked_posts: [...formData.linked_posts, post.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            linked_posts: formData.linked_posts.filter(id => id !== post.id)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`post-${post.id}`} className="flex-1 text-sm">
                      {post.title} ({post.votes} votes)
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
              />
              <Label htmlFor="is_published">Publish immediately</Label>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={saveEntry} disabled={!formData.title || !formData.body}>
                <Check className="h-4 w-4 mr-2" />
                {editingEntry ? 'Update Entry' : 'Create Entry'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changelog Entries */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No changelog entries yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start documenting your product updates and improvements
            </p>
            {isAdmin && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {entries.map((entry) => (
            <Card key={entry.id} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{entry.title}</h3>
                      {getTypeBadge(entry.entry_type)}
                      {entry.version && (
                        <Badge variant="outline">{entry.version}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatRelativeTime(entry.released_at)}
                      </div>
                      {entry.linked_posts && entry.linked_posts.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {entry.linked_posts.length} related posts
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(entry)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEntry(entry.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{entry.body}</p>
                </div>

                {entry.linked_posts && entry.linked_posts.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2 text-sm">Related feature requests:</h4>
                    <div className="flex flex-wrap gap-2">
                      {entry.linked_posts.map(postId => {
                        const post = availablePosts.find(p => p.id === postId);
                        return post ? (
                          <Button
                            key={postId}
                            variant="outline"
                            size="sm"
                            className="h-8"
                            asChild
                          >
                            <a href={`/${projectSlug}/post/${postId}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {post.title}
                            </a>
                          </Button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Subscribe Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="text-center py-8">
          <h3 className="font-semibold mb-2">Stay Updated</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get notified when we ship new features and improvements
          </p>
          <div className="flex items-center gap-2 max-w-sm mx-auto">
            <Input placeholder="Enter your email" type="email" />
            <Button>Subscribe</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
