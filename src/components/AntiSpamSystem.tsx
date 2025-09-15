'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  Ban, 
  Eye, 
  MessageSquare,
  ThumbsUp,
  Filter,
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface SpamSettings {
  posts_per_hour_per_ip: number;
  posts_per_hour_per_email: number;
  votes_per_hour_per_ip: number;
  comments_per_hour_per_ip: number;
  min_submission_time: number; // seconds
  honeypot_enabled: boolean;
  content_filters_enabled: boolean;
  max_links_per_post: number;
  blocked_keywords: string[];
  auto_approve_posts: boolean;
  require_email_verification: boolean;
}

interface RateLimitStats {
  blocked_submissions_today: number;
  blocked_votes_today: number;
  blocked_comments_today: number;
  top_blocked_ips: Array<{ ip: string; count: number }>;
  honeypot_catches_today: number;
  keyword_blocks_today: number;
}

interface BlockedContent {
  id: string;
  type: 'post' | 'comment' | 'vote';
  content: string;
  reason: string;
  ip_address: string;
  blocked_at: string;
  user_agent: string;
}

interface AntiSpamSystemProps {
  projectId: string;
}

export function AntiSpamSystem({ projectId }: AntiSpamSystemProps) {
  const [settings, setSettings] = useState<SpamSettings>({
    posts_per_hour_per_ip: 5,
    posts_per_hour_per_email: 10,
    votes_per_hour_per_ip: 50,
    comments_per_hour_per_ip: 20,
    min_submission_time: 2,
    honeypot_enabled: true,
    content_filters_enabled: true,
    max_links_per_post: 2,
    blocked_keywords: ['spam', 'casino', 'viagra', 'bitcoin'],
    auto_approve_posts: true,
    require_email_verification: false
  });

  const [stats, setStats] = useState<RateLimitStats>({
    blocked_submissions_today: 0,
    blocked_votes_today: 0,
    blocked_comments_today: 0,
    top_blocked_ips: [],
    honeypot_catches_today: 0,
    keyword_blocks_today: 0
  });

  const [blockedContent, setBlockedContent] = useState<BlockedContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

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

  const loadSettings = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('spam_settings')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading spam settings:', error);
    }
  }, [supabase, projectId]);

  const loadStats = useCallback(async () => {
    if (!supabase) return;

    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Load blocked submissions stats
      const { data: blockedStats, error: statsError } = await supabase
        .from('rate_limit_violations')
        .select('type, ip_address')
        .eq('project_id', projectId)
        .gte('created_at', today);

      if (statsError) throw statsError;

      // Process stats
      const stats = (blockedStats || []).reduce((acc: RateLimitStats, violation: { type: string; ip_address: string }) => {
        switch (violation.type) {
          case 'post':
            acc.blocked_submissions_today++;
            break;
          case 'vote':
            acc.blocked_votes_today++;
            break;
          case 'comment':
            acc.blocked_comments_today++;
            break;
        }
        return acc;
      }, {
        blocked_submissions_today: 0,
        blocked_votes_today: 0,
        blocked_comments_today: 0,
        honeypot_catches_today: 0,
        keyword_blocks_today: 0,
        top_blocked_ips: []
      });

      // Calculate top blocked IPs
      const ipCounts = (blockedStats || []).reduce((acc: { [key: string]: number }, violation: { ip_address: string }) => {
        acc[violation.ip_address] = (acc[violation.ip_address] || 0) + 1;
        return acc;
      }, {});

      stats.top_blocked_ips = Object.entries(ipCounts)
        .map(([ip, count]) => ({ ip, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [supabase, projectId]);

  const loadBlockedContent = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('blocked_content')
        .select('*')
        .eq('project_id', projectId)
        .order('blocked_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBlockedContent(data || []);
    } catch (error) {
      console.error('Error loading blocked content:', error);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    if (supabase) {
      loadSettings();
      loadStats();
      loadBlockedContent();
    }
  }, [supabase, loadSettings, loadStats, loadBlockedContent]);

  const saveSettings = async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('spam_settings')
        .upsert({
          project_id: projectId,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Anti-spam settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !settings.blocked_keywords.includes(newKeyword.trim().toLowerCase())) {
      setSettings({
        ...settings,
        blocked_keywords: [...settings.blocked_keywords, newKeyword.trim().toLowerCase()]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setSettings({
      ...settings,
      blocked_keywords: settings.blocked_keywords.filter(k => k !== keyword)
    });
  };

  const testSpamFilter = async (content: string) => {
    const blockedKeywords = settings.blocked_keywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    const hasExcessiveLinks = linkCount > settings.max_links_per_post;
    
    if (blockedKeywords.length > 0) {
      toast.error(`Content blocked: Contains blocked keywords: ${blockedKeywords.join(', ')}`);
    } else if (hasExcessiveLinks) {
      toast.error(`Content blocked: Too many links (${linkCount}/${settings.max_links_per_post})`);
    } else {
      toast.success('Content would be approved!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Anti-Spam Protection
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure rate limiting and content filters to prevent abuse
          </p>
        </div>
        <Button onClick={loadStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.blocked_submissions_today}</p>
                <p className="text-xs text-muted-foreground">Blocked Posts</p>
              </div>
              <MessageSquare className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.blocked_votes_today}</p>
                <p className="text-xs text-muted-foreground">Blocked Votes</p>
              </div>
              <ThumbsUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.blocked_comments_today}</p>
                <p className="text-xs text-muted-foreground">Blocked Comments</p>
              </div>
              <MessageSquare className="h-4 w-4 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.honeypot_catches_today}</p>
                <p className="text-xs text-muted-foreground">Bot Catches</p>
              </div>
              <Filter className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limiting Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Rate Limiting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="posts_per_hour_per_ip">Posts per hour (per IP)</Label>
                <Input
                  id="posts_per_hour_per_ip"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.posts_per_hour_per_ip}
                  onChange={(e) => setSettings({
                    ...settings,
                    posts_per_hour_per_ip: parseInt(e.target.value) || 5
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum posts from the same IP address per hour
                </p>
              </div>

              <div>
                <Label htmlFor="posts_per_hour_per_email">Posts per hour (per email)</Label>
                <Input
                  id="posts_per_hour_per_email"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.posts_per_hour_per_email}
                  onChange={(e) => setSettings({
                    ...settings,
                    posts_per_hour_per_email: parseInt(e.target.value) || 10
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum posts from the same email per hour
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="votes_per_hour_per_ip">Votes per hour (per IP)</Label>
                <Input
                  id="votes_per_hour_per_ip"
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.votes_per_hour_per_ip}
                  onChange={(e) => setSettings({
                    ...settings,
                    votes_per_hour_per_ip: parseInt(e.target.value) || 50
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum votes from the same IP address per hour
                </p>
              </div>

              <div>
                <Label htmlFor="comments_per_hour_per_ip">Comments per hour (per IP)</Label>
                <Input
                  id="comments_per_hour_per_ip"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.comments_per_hour_per_ip}
                  onChange={(e) => setSettings({
                    ...settings,
                    comments_per_hour_per_ip: parseInt(e.target.value) || 20
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum comments from the same IP address per hour
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="min_submission_time">Minimum submission time (seconds)</Label>
            <Input
              id="min_submission_time"
              type="number"
              min="0"
              max="60"
              value={settings.min_submission_time}
              onChange={(e) => setSettings({
                ...settings,
                min_submission_time: parseInt(e.target.value) || 2
              })}
            />
            <p className="text-xs text-muted-foreground">
              Minimum time users must spend on the form before submitting
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Content Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Content Filtering
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="honeypot_enabled">Honeypot Protection</Label>
              <p className="text-xs text-muted-foreground">
                Add hidden fields to catch automated bots
              </p>
            </div>
            <Switch
              id="honeypot_enabled"
              checked={settings.honeypot_enabled}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                honeypot_enabled: checked
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="content_filters_enabled">Content Filters</Label>
              <p className="text-xs text-muted-foreground">
                Block posts containing spam keywords or excessive links
              </p>
            </div>
            <Switch
              id="content_filters_enabled"
              checked={settings.content_filters_enabled}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                content_filters_enabled: checked
              })}
            />
          </div>

          {settings.content_filters_enabled && (
            <>
              <div>
                <Label htmlFor="max_links_per_post">Maximum links per post</Label>
                <Input
                  id="max_links_per_post"
                  type="number"
                  min="0"
                  max="10"
                  value={settings.max_links_per_post}
                  onChange={(e) => setSettings({
                    ...settings,
                    max_links_per_post: parseInt(e.target.value) || 2
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Posts with more links will be automatically blocked
                </p>
              </div>

              <div>
                <Label>Blocked Keywords</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add keyword to block..."
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button onClick={addKeyword} disabled={!newKeyword.trim()}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {settings.blocked_keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeKeyword(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click on a keyword to remove it
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Moderation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Moderation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto_approve_posts">Auto-approve posts</Label>
              <p className="text-xs text-muted-foreground">
                Posts appear immediately without manual review
              </p>
            </div>
            <Switch
              id="auto_approve_posts"
              checked={settings.auto_approve_posts}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                auto_approve_posts: checked
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="require_email_verification">Require email verification</Label>
              <p className="text-xs text-muted-foreground">
                Users must verify email before posting
              </p>
            </div>
            <Switch
              id="require_email_verification"
              checked={settings.require_email_verification}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                require_email_verification: checked
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Test Spam Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test_content">Test Content</Label>
            <Textarea
              id="test_content"
              placeholder="Enter content to test against your spam filters..."
              rows={3}
            />
          </div>
          <Button 
            onClick={() => {
              const textarea = document.getElementById('test_content') as HTMLTextAreaElement;
              if (textarea.value.trim()) {
                testSpamFilter(textarea.value);
              } else {
                toast.error('Please enter some content to test');
              }
            }}
            variant="outline"
          >
            Test Filter
          </Button>
        </CardContent>
      </Card>

      {/* Top Blocked IPs */}
      {stats.top_blocked_ips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Top Blocked IPs (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.top_blocked_ips.map((ip) => (
                <div key={ip.ip} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-mono text-sm">{ip.ip}</span>
                  <Badge variant="destructive">{ip.count} blocks</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Blocked Content */}
      {blockedContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recent Blocked Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockedContent.slice(0, 5).map((content) => (
                <div key={content.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="destructive">{content.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(content.blocked_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Reason:</strong> {content.reason}
                  </p>
                  <p className="text-sm bg-muted p-2 rounded">
                    {content.content.substring(0, 100)}
                    {content.content.length > 100 && '...'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button onClick={saveSettings} disabled={loading}>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Settings
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
