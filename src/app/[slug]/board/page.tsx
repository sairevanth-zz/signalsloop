'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// GlobalBanner removed - layout already provides it
import { CategoryBadge } from '@/components/CategoryBadge';
import BoardShare from '@/components/BoardShare';
import FeedbackExport from '@/components/FeedbackExport';
import { AIPriorityScoring } from '@/components/AIPriorityScoring';
import { DebugAIFeatures } from '@/components/DebugAIFeatures';
import {
  Search,
  Plus,
  MessageSquare,
  Calendar,
  User,
  LogOut,
  Settings,
  Home,
  Map,
  Sparkles,
  Share2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Trash2,
  AlertTriangle,
  Wand2,
  Loader2,
  Target,
  Download,
  GitMerge,
  Brain,
  FlaskConical,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import PostSubmissionForm from '@/components/PostSubmissionForm';
import VoteButton from '@/components/VoteButton';
import { AIInsightsSlideout } from '@/components/AIInsightsSlideout';
import FeedbackOnBehalfModal from '@/components/FeedbackOnBehalfModal';
import { SentimentWidget, SentimentTrendChart } from '@/components/sentiment';
// SpecsDashboardWidget removed - not needed on board page

interface Post {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  comment_count: number;
  user_voted: boolean;
  category?: string | null;
  ai_categorized?: boolean;
  ai_confidence?: number;
  ai_reasoning?: string;
  duplicate_of?: string | null;
  mergedDuplicates?: Array<{ id: string; title: string }>;
  mergedDuplicateCount?: number;
  priority_score?: number;
  priority_reason?: string | null;
  ai_analyzed_at?: string | null;
  total_priority_score?: number;
  sentiment_analysis?: Array<{
    sentiment_category: 'positive' | 'negative' | 'neutral' | 'mixed';
    sentiment_score: number;
    emotional_tone: string;
    confidence_score: number;
  }>;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Board {
  id: string;
  name: string;
  description?: string;
  welcome_message?: string;
  custom_css?: string;
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  planned: { label: 'Planned', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  done: { label: 'Done', color: 'bg-green-100 text-green-800 border-green-200' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200' }
};

const categoryConfig = {
  'Bug': { icon: '🐛', color: 'bg-red-100 text-red-800 border-red-200' },
  'Feature Request': { icon: '✨', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Improvement': { icon: '⚡', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'UI/UX': { icon: '🎨', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'Integration': { icon: '🔗', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  'Performance': { icon: '🚀', color: 'bg-green-100 text-green-800 border-green-200' },
  'Documentation': { icon: '📚', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  'Other': { icon: '📝', color: 'bg-gray-100 text-gray-800 border-gray-200' }
};

const PRIORITY_LEVEL_STYLES: Record<string, string> = {
  Immediate: 'bg-red-100 text-red-800 border-red-200',
  'Current Quarter': 'bg-orange-100 text-orange-800 border-orange-200',
  'Next Quarter': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Backlog: 'bg-blue-100 text-blue-800 border-blue-200',
  Low: 'bg-gray-100 text-gray-700 border-gray-200',
};

const getPriorityLevelLabel = (score?: number | null): string | null => {
  if (typeof score !== 'number') return null;
  if (score >= 8.5) return 'Immediate';
  if (score >= 7) return 'Current Quarter';
  if (score >= 5) return 'Next Quarter';
  if (score >= 3) return 'Backlog';
  return 'Low';
};

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const supabase = getSupabaseClient();

  const [project, setProject] = useState<Project | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('votes');
  const [showPostForm, setShowPostForm] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [priorityVoteCounts, setPriorityVoteCounts] = useState({ must_have: 0, important: 0, nice_to_have: 0 });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [memberRole, setMemberRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [showFeedbackOnBehalfModal, setShowFeedbackOnBehalfModal] = useState(false);
  const [autoCategorizing, setAutoCategorizing] = useState(false);
  const [autoPrioritizing, setAutoPrioritizing] = useState(false);
  const [findingDuplicates, setFindingDuplicates] = useState(false);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  const [expandedPriorityCards, setExpandedPriorityCards] = useState<Record<string, boolean>>({});
  const exportTriggerRef = useRef<(() => void) | null>(null);

  // Derived permission check: user is owner or admin
  const isOwnerOrAdmin = isProjectOwner || memberRole === 'admin';

  // Initialize filters from URL parameters
  useEffect(() => {
    const status = searchParams?.get('status') || 'all';
    const category = searchParams?.get('category') || 'all';
    const priority = searchParams?.get('priority') || 'all';
    const sort = searchParams?.get('sort') || 'votes';
    const search = searchParams?.get('search') || '';

    setStatusFilter(status);
    setCategoryFilter(category);
    setPriorityFilter(priority);
    setSortBy(sort);
    setSearchTerm(search);
  }, [searchParams]);

  // Update URL when filters change
  const updateURL = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === 'votes' || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newURL);
  }, [searchParams]);

  // Filter change handlers
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    updateURL({ status: value });
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    updateURL({ category: value });
  };

  const handlePriorityFilterChange = (value: string) => {
    setPriorityFilter(value);
    updateURL({ priority: value });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    updateURL({ sort: value });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updateURL({ search: value });
  };

  const handleSentimentFilterChange = (category: string | null) => {
    setSentimentFilter(category);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone and will delete all comments and votes associated with it.')) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const response = await fetch('/api/admin/delete-post', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          postId,
          projectId: project?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      toast.success('Post deleted successfully');
      // Remove the post from the list
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const loadUserPlan = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      const [{ data: userData, error: userError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase
          .from('users')
          .select('plan')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('account_billing_profiles')
          .select('plan')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (userError) {
        console.log('User plan query error (defaulting to account profile):', userError);
      }

      if (profileError) {
        console.log('Account billing profile query error:', profileError);
      }

      if (!userData) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            plan: profileData?.plan || 'free',
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.log('Could not create user record (this is OK):', insertError);
        }
      }

      const resolvedPlan = profileData?.plan || userData?.plan || 'free';
      setUserPlan(resolvedPlan);

      if (resolvedPlan === 'pro' && userData?.plan !== 'pro') {
        const { error: updateUserPlanError } = await supabase
          .from('users')
          .update({ plan: 'pro', updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (updateUserPlanError) {
          console.log('Failed to update users.plan to pro:', updateUserPlanError);
        }
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
    }
  }, [supabase, user]);

  const handleAdminExport = useCallback(() => {
    if (exportTriggerRef.current) {
      exportTriggerRef.current();
    } else {
      toast.error('Export is currently unavailable. Please try again.');
    }
  }, []);

  const togglePriorityDetails = useCallback((postId: string) => {
    setExpandedPriorityCards((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }, []);

  const loadProjectAndPosts = useCallback(async () => {
    if (!supabase) {
      setError('Database connection not available. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get project by slug
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', params?.slug as string)
        .single();

      if (projectError) {
        toast.error('Project not found');
        router.push('/');
        return;
      }

      setProject(projectData);

      // Check if current user is the project owner
      if (user && projectData.owner_id === user.id) {
        setIsProjectOwner(true);
        setMemberRole('owner');
      } else {
        setIsProjectOwner(false);

        // Check if user is an admin or member
        if (user) {
          const { data: memberData } = await supabase
            .from('members')
            .select('role')
            .eq('project_id', projectData.id)
            .eq('user_id', user.id)
            .single();

          if (memberData) {
            setMemberRole(memberData.role);
          } else {
            setMemberRole(null);
          }
        } else {
          setMemberRole(null);
        }
      }

      // Get board for this project
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id, name, description, welcome_message, custom_css')
        .eq('project_id', projectData.id)
        .single();

      if (boardError || !boardData) {
        toast.error('Board not found');
        return;
      }

      setBoardId(boardData.id);
      setBoard({
        id: boardData.id,
        name: boardData.name || 'Feedback Board',
        description: boardData.description || undefined,
        welcome_message: boardData.welcome_message || undefined,
        custom_css: boardData.custom_css || undefined
      });

      // Build query for posts with sentiment data
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          vote_summary:votes(count),
          comment_summary:comments(count),
          sentiment_analysis(sentiment_category, sentiment_score, emotional_tone, confidence_score)
        `)
        .eq('board_id', boardData.id)
        .is('duplicate_of', null); // Don't show duplicate posts

      // Apply status filter
      if (statusFilter !== 'all') {
        postsQuery = postsQuery.eq('status', statusFilter);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        postsQuery = postsQuery.eq('category', categoryFilter);
      }

      // Apply sorting
      if (sortBy === 'votes') {
        postsQuery = postsQuery.order('vote_count', { ascending: false });
      } else if (sortBy === 'newest') {
        postsQuery = postsQuery.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        postsQuery = postsQuery.order('created_at', { ascending: true });
      }

      const { data: postsData, error: postsError } = await postsQuery;

      if (postsError) {
        console.error('Error loading posts:', postsError);
        toast.error('Error loading posts');
        return;
      }

      const { data: mergedDuplicatesData, error: mergedDuplicatesError } = await supabase
        .from('posts')
        .select('id, title, duplicate_of')
        .eq('board_id', boardData.id)
        .not('duplicate_of', 'is', null);

      if (mergedDuplicatesError) {
        console.error('Error loading merged duplicates:', mergedDuplicatesError);
      }

      const duplicatesByTarget: Record<string, Array<{ id: string; title: string }>> = {};

      mergedDuplicatesData?.forEach((dup: Record<string, unknown>) => {
        const targetId = dup.duplicate_of as string | null;
        if (!targetId) return;
        duplicatesByTarget[targetId] = duplicatesByTarget[targetId] || [];
        duplicatesByTarget[targetId].push({
          id: dup.id as string,
          title: (dup.title as string) || 'Merged post'
        });
      });

      // Process posts data
      const normalizeCount = (value: unknown): number => {
        if (Array.isArray(value) && value.length > 0) {
          const first = value[0] as { count?: unknown };
          if (first && typeof first === 'object' && 'count' in first) {
            return normalizeCount(first.count);
          }
          return normalizeCount(first);
        }
        if (value === null || value === undefined) {
          return 0;
        }
        if (typeof value === 'number') {
          return Number.isFinite(value) ? value : 0;
        }
        if (typeof value === 'string') {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        if (typeof value === 'object' && 'count' in (value as Record<string, unknown>)) {
          return normalizeCount((value as { count?: unknown }).count);
        }
        return 0;
      };

      const processedPosts = postsData?.map((post: Record<string, unknown>) => {
        // Use the authoritative vote_count column from posts table (maintained by RPC functions with service role)
        // Do NOT use vote_summary:votes(count) as primary source - it's RLS-filtered and unreliable for anonymous users
        const storedVoteCount = normalizeCount(post.vote_count);
        const aggregatedVotes = normalizeCount((post as Record<string, unknown>).vote_summary);
        const finalVoteCount = storedVoteCount > 0 ? storedVoteCount : aggregatedVotes;

        // Same for comments - prefer stored count
        const storedCommentCount = normalizeCount(post.comment_count);
        const aggregatedComments = normalizeCount((post as Record<string, unknown>).comment_summary);
        const finalCommentCount = storedCommentCount > 0 ? storedCommentCount : aggregatedComments;

        // Handle sentiment data - Supabase returns it as an array even for 1-to-1 relationships
        const sentimentArray = post.sentiment_analysis as any;
        const sentimentData = Array.isArray(sentimentArray) && sentimentArray.length > 0
          ? sentimentArray
          : sentimentArray
            ? [sentimentArray]
            : undefined;

        return {
          id: post.id as string,
          title: post.title as string,
          description: post.description as string,
          author_email: post.author_email as string,
          status: post.status as 'open' | 'planned' | 'in_progress' | 'done' | 'declined',
          created_at: post.created_at as string,
          vote_count: finalVoteCount,
          comment_count: finalCommentCount,
          user_voted: false, // TODO: Check if current user voted
          category: post.category as string | null,
          ai_categorized: post.ai_categorized as boolean,
          ai_confidence: post.ai_confidence as number,
          ai_reasoning: post.ai_reasoning as string,
          duplicate_of: post.duplicate_of as string | null,
          mergedDuplicates: duplicatesByTarget[post.id as string] || [],
          mergedDuplicateCount: (duplicatesByTarget[post.id as string] || []).length,
          priority_score: typeof post.priority_score === 'number' ? Number(post.priority_score) : undefined,
          priority_reason: (post.priority_reason as string) || null,
          ai_analyzed_at: (post.ai_analyzed_at as string) || null,
          total_priority_score: typeof post.total_priority_score === 'number' ? Number(post.total_priority_score) : undefined,
          sentiment_analysis: sentimentData,
        };
      }) || [];

      setPosts(processedPosts);

      // Calculate category counts for all posts (not filtered)
      const allPostsQuery = supabase
        .from('posts')
        .select('category')
        .eq('board_id', boardData.id)
        .is('duplicate_of', null);

      const { data: allPostsData } = await allPostsQuery;

      const counts: Record<string, number> = {};
      allPostsData?.forEach((post: Record<string, unknown>) => {
        const category = post.category as string;
        if (category) {
          counts[category] = (counts[category] || 0) + 1;
        }
      });

      setCategoryCounts(counts);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [params?.slug, statusFilter, categoryFilter, sortBy, supabase, router, user]);

  const registerExportTrigger = useCallback((handler: (() => void) | null) => {
    exportTriggerRef.current = handler;
  }, []);

  const handleAutoCategorize = useCallback(async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    try {
      setAutoCategorizing(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        toast.error('Please sign in to use AI auto-categorization.');
        return;
      }

      const response = await fetch(`/api/projects/${params?.slug}/auto-categorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ confidenceThreshold: 0.6 }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to auto-categorize feedback');
      }

      const { updatedCount = 0, processedCount = 0, errors = [], remaining = 0 } = payload;

      if (processedCount === 0) {
        toast.info('Nothing to categorize—everything already looks good!');
      } else {
        const details = remaining > 0
          ? `AI categorized ${updatedCount} posts (more remain, run again if needed).`
          : `AI categorized ${updatedCount} of ${processedCount} posts.`;
        toast.success(details);
        if (errors.length > 0) {
          console.error('Auto-categorize errors:', errors);
          toast.warning(`${errors.length} post(s) could not be categorized. Check the console for details.`);
        }
      }

      await loadProjectAndPosts();
    } catch (error) {
      console.error('Auto-categorize error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to auto-categorize posts');
    } finally {
      setAutoCategorizing(false);
    }
  }, [supabase, params?.slug, loadProjectAndPosts]);

  const handleAutoPrioritize = useCallback(async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    try {
      setAutoPrioritizing(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        toast.error('Please sign in to use AI auto-prioritization.');
        return;
      }

      const response = await fetch(`/api/projects/${params?.slug}/auto-prioritize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ limit: 10 }), // Process 10 at a time to avoid timeout
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to auto-prioritize feedback');
      }

      const {
        updatedCount = 0,
        processedCount = 0,
        remaining = 0,
        errors = [],
      } = payload;

      if (processedCount === 0) {
        toast.info('All posts already prioritized!');
      } else {
        const summary = remaining > 0
          ? `AI prioritized ${updatedCount} posts. ${remaining} more to go - click again to continue.`
          : `AI prioritized ${updatedCount} posts. All done!`;

        toast.success(summary);

        if (errors.length > 0) {
          console.error('Auto-prioritize errors:', errors);
          toast.warning(`${errors.length} post(s) could not be prioritized. Check the console for details.`);
        }
      }

      await loadProjectAndPosts();
    } catch (error) {
      console.error('Auto-prioritize error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to auto-prioritize posts');
    } finally {
      setAutoPrioritizing(false);
    }
  }, [supabase, params?.slug, loadProjectAndPosts]);

  const handleFindDuplicates = useCallback(async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    try {
      setFindingDuplicates(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        toast.error('Please sign in to use AI duplicate detection.');
        return;
      }

      const response = await fetch(`/api/projects/${params?.slug}/find-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ limit: 50, threshold: 0.75 }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to find duplicates');
      }

      const {
        processedCount = 0,
        clustersFound = 0,
        duplicatesMarked = 0,
        errors = [],
      } = payload;

      if (clustersFound === 0) {
        toast.info('No duplicates found. All feedback appears unique!');
      } else {
        toast.success(
          `Found ${clustersFound} duplicate group(s) and merged ${duplicatesMarked} posts. Refresh to see changes.`
        );

        if (errors.length > 0) {
          console.error('Duplicate detection errors:', errors);
          toast.warning(`${errors.length} post(s) could not be merged. Check the console for details.`);
        }
      }

      // Reload posts to show changes
      await loadProjectAndPosts();
    } catch (error) {
      console.error('Find duplicates error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to find duplicates');
    } finally {
      setFindingDuplicates(false);
    }
  }, [supabase, params?.slug, loadProjectAndPosts]);

  const handleAnalyzeSentiment = useCallback(async () => {
    if (!supabase || !project) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    try {
      setAnalyzingSentiment(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        toast.error('Please sign in to use AI sentiment analysis.');
        return;
      }

      // First, get posts that don't have sentiment analysis yet
      const { data: postsWithoutSentiment, error: queryError } = await supabase
        .from('posts')
        .select('id')
        .eq('project_id', project.id)
        .is('duplicate_of', null)
        .order('created_at', { ascending: false })
        .limit(100); // Analyze up to 100 posts at a time

      if (queryError) {
        throw new Error('Failed to fetch posts');
      }

      if (!postsWithoutSentiment || postsWithoutSentiment.length === 0) {
        toast.info('No posts available to analyze.');
        return;
      }

      // Check which posts already have sentiment analysis
      const postIds = postsWithoutSentiment.map((p: any) => p.id);
      const { data: existingAnalysis } = await supabase
        .from('sentiment_analysis')
        .select('post_id')
        .in('post_id', postIds);

      const analyzedIds = new Set(existingAnalysis?.map((a: { post_id: string }) => a.post_id) || []);
      const postsToAnalyze = postIds.filter((id: string) => !analyzedIds.has(id));

      if (postsToAnalyze.length === 0) {
        toast.success('All posts already have sentiment analysis!');
        return;
      }

      toast.info(`Analyzing ${postsToAnalyze.length} post(s)...`);

      const response = await fetch('/api/analyze-sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          postIds: postsToAnalyze,
          projectId: project.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to analyze sentiment');
      }

      const { processed = 0, failed = 0 } = data;

      if (processed > 0) {
        toast.success(`AI analyzed sentiment for ${processed} post(s)!`);
        if (failed > 0) {
          toast.warning(`${failed} post(s) could not be analyzed.`);
        }
        // Reload to show updated sentiment data
        await loadProjectAndPosts();
      } else {
        toast.info('No posts were analyzed.');
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze sentiment');
    } finally {
      setAnalyzingSentiment(false);
    }
  }, [supabase, project, loadProjectAndPosts]);

  // Load project and posts
  useEffect(() => {
    loadProjectAndPosts();
  }, [loadProjectAndPosts]);

  // Load user plan
  useEffect(() => {
    loadUserPlan();
  }, [loadUserPlan]);

  // Filter posts by search term and sentiment
  const filteredPosts = posts.filter(post => {
    // Search filter
    const matchesSearch = !searchTerm ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Sentiment filter - handle both array and object formats
    let matchesSentiment = true;
    if (sentimentFilter) {
      const sentimentData = post.sentiment_analysis;
      if (Array.isArray(sentimentData) && sentimentData.length > 0) {
        matchesSentiment = sentimentData[0]?.sentiment_category === sentimentFilter;
      } else if (sentimentData && !Array.isArray(sentimentData)) {
        matchesSentiment = (sentimentData as any).sentiment_category === sentimentFilter;
      } else {
        matchesSentiment = false; // No sentiment data
      }
    }

    return matchesSearch && matchesSentiment;
  });


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#13151a] safe-top safe-bottom">
      {/* Custom CSS */}
      {board?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: board.custom_css }} />
      )}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex gap-4 lg:gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Header */}
            <div className="mb-8">
              {/* Breadcrumb Navigation - Mobile Optimized */}
              <div className="mb-4">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 overflow-x-auto hide-scrollbar">
                  <Link href="/app" className="hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 whitespace-nowrap">
                    <Home className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                  <span className="flex-shrink-0">→</span>
                  <span className="truncate max-w-[100px] sm:max-w-none">{board?.name || project?.name}</span>
                  <span className="hidden sm:inline flex-shrink-0">→</span>
                  <span className="hidden sm:inline whitespace-nowrap">Feedback Board</span>
                </div>

                {/* User Email - Mobile: Hidden, shown in GlobalBanner dropdown */}
                {user && (
                  <div className="hidden sm:flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {board?.name || project?.name}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                    {board?.description || 'Share your ideas and help us build better features'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-1 min-touch-target tap-highlight-transparent"
                      >
                        <span className="text-sm font-semibold">
                          {isOwnerOrAdmin ? 'Admin Actions' : 'Board Actions'}
                        </span>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
                      {/* Quick Actions Group */}
                      <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onSelect={() => {
                          setShowShareModal(true);
                        }}
                        className="flex items-start gap-3 py-2"
                      >
                        <Share2 className="h-4 w-4 text-green-600" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">Share board</span>
                          <span className="text-xs text-gray-500">
                            Get a link to invite contributors
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          setShowPostForm(true);
                        }}
                        className="flex items-start gap-3 py-2"
                      >
                        <Plus className="h-4 w-4 text-blue-600" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">Submit feedback</span>
                          <span className="text-xs text-gray-500">
                            Share a new idea or report an issue
                          </span>
                        </div>
                      </DropdownMenuItem>
                      {isOwnerOrAdmin && project && (
                        <DropdownMenuItem
                          onSelect={() => {
                            setShowFeedbackOnBehalfModal(true);
                          }}
                          className="flex items-start gap-3 py-2"
                        >
                          <FileText className="h-4 w-4 text-green-700" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">Submit on behalf</span>
                            <span className="text-xs text-gray-500">
                              Record feedback you&apos;ve collected elsewhere
                            </span>
                          </div>
                        </DropdownMenuItem>
                      )}

                      {/* Note: Navigate section removed - links already available in sidebar */}

                      {/* AI Actions Group (Admin Only) */}
                      {isOwnerOrAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled={autoPrioritizing}
                            onSelect={(event) => {
                              event.preventDefault();
                              if (!autoPrioritizing) {
                                handleAutoPrioritize();
                              }
                            }}
                            className="flex items-start gap-3 py-2"
                          >
                            {autoPrioritizing ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            ) : (
                              <Target className="h-4 w-4 text-blue-600" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">Auto-prioritize</span>
                              <span className="text-xs text-gray-500">
                                Generate AI priority scores
                              </span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={autoCategorizing}
                            onSelect={(event) => {
                              event.preventDefault();
                              if (!autoCategorizing) {
                                handleAutoCategorize();
                              }
                            }}
                            className="flex items-start gap-3 py-2"
                          >
                            {autoCategorizing ? (
                              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            ) : (
                              <Wand2 className="h-4 w-4 text-indigo-600" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">Smart Categorize</span>
                              <span className="text-xs text-gray-500">
                                AI organizes feedback by category
                              </span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={findingDuplicates}
                            onSelect={(event) => {
                              event.preventDefault();
                              if (!findingDuplicates) {
                                handleFindDuplicates();
                              }
                            }}
                            className="flex items-start gap-3 py-2"
                          >
                            {findingDuplicates ? (
                              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                            ) : (
                              <GitMerge className="h-4 w-4 text-orange-600" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">Find Duplicates</span>
                              <span className="text-xs text-gray-500">
                                AI merges duplicate feedback
                              </span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={analyzingSentiment}
                            onSelect={(event) => {
                              event.preventDefault();
                              if (!analyzingSentiment) {
                                handleAnalyzeSentiment();
                              }
                            }}
                            className="flex items-start gap-3 py-2"
                          >
                            {analyzingSentiment ? (
                              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-purple-600" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">Analyze Sentiment</span>
                              <span className="text-xs text-gray-500">
                                AI analyzes emotional tone
                              </span>
                            </div>
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* Note: Export removed - available in Settings → Export tab */}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Share modal portal */}
                  {showShareModal && typeof window !== 'undefined' && (
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 99999999,
                        display: 'block',
                        padding: '0',
                        overflow: 'auto'
                      }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          setShowShareModal(false);
                        }
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
                          maxWidth: '800px',
                          width: '90%',
                          maxHeight: '90vh',
                          overflow: 'hidden',
                          position: 'relative',
                          margin: '50px auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Share {project?.name} Board</h2>
                          <button
                            onClick={() => setShowShareModal(false)}
                            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
                          >
                            ×
                          </button>
                        </div>
                        <div style={{ padding: '20px', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
                          {project && (
                            <BoardShare
                              projectSlug={params?.slug as string}
                              projectName={project.name}
                              boardUrl={`${window.location.origin}/${params?.slug}/board`}
                              isPublic={true}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback export modal trigger (hidden for admins) */}
                  <FeedbackExport
                    projectSlug={params?.slug as string}
                    projectName={project?.name || ''}
                    hideTriggerButton={isOwnerOrAdmin}
                    registerTrigger={registerExportTrigger}
                  />

                  {/* Roadmap Button - Visible on all devices */}
                  <Link href={`/${params?.slug}/roadmap`}>
                    <Button variant="outline" className="flex items-center gap-1 min-touch-target tap-highlight-transparent">
                      <Map className="w-4 h-4" />
                      <span className="hidden md:inline">Roadmap</span>
                    </Button>
                  </Link>

                  {/* User Stories Button - Visible for logged-in users */}
                  {user && project && (
                    <Link href={`/app/user-stories?projectId=${project.id}`}>
                      <Button variant="outline" className="flex items-center gap-1 min-touch-target tap-highlight-transparent bg-blue-50 hover:bg-blue-100 border-blue-200">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="hidden md:inline">User Stories</span>
                      </Button>
                    </Link>
                  )}

                  {/* Settings Button - Visible for logged-in users on all devices */}
                  {user && (
                    <Link href={`/${params?.slug}/settings`}>
                      <Button variant="outline" className="flex items-center gap-1 min-touch-target tap-highlight-transparent">
                        <Settings className="w-4 h-4" />
                        <span className="hidden md:inline">Settings</span>
                      </Button>
                    </Link>
                  )}

                </div>
              </div>
            </div >

            {/* Welcome Message */}
            {
              board?.welcome_message && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 sm:mb-6">
                  <p className="text-sm sm:text-base text-blue-900 whitespace-pre-wrap">
                    {board.welcome_message}
                  </p>
                </div>
              )
            }

            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 mb-4 sm:mb-6">
              {/* Mobile Filter Toggle */}
              <div className="lg:hidden mb-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="w-full justify-between min-touch-target"
                >
                  <span>Filters & Search</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showMobileFilters ? 'rotate-90' : ''}`} />
                </Button>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${showMobileFilters ? 'block' : 'hidden lg:grid'}`}>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <Input
                    placeholder="Search feedback..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 min-touch-target text-base"
                    type="search"
                  />
                </div>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                  <SelectTrigger className="min-touch-target">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span>📋</span>
                        <span>All Categories</span>
                        <span className="text-gray-500 text-sm">({Object.values(categoryCounts).reduce((a, b) => a + b, 0)})</span>
                      </div>
                    </SelectItem>
                    {Object.entries(categoryConfig).map(([category, config]) => (
                      <SelectItem key={category} value={category}>
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{category}</span>
                          <span className="text-gray-500 text-sm">({categoryCounts[category] || 0})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="min-touch-target">
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
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="min-touch-target">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="votes">Most Votes</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Debug AI Features - Only show when DEBUG_AI_FEATURES is enabled */}
            {
              process.env.NEXT_PUBLIC_DEBUG_AI_FEATURES === 'true' && (
                <DebugAIFeatures projectSlug={params?.slug as string} />
              )
            }

            {/* Sentiment Analysis Dashboard - Only show for project owners/admins */}
            {
              isOwnerOrAdmin && project && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h2 className="text-xl font-bold text-gray-900">Sentiment Analysis</h2>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      AI-Powered
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SentimentWidget
                      projectId={project.id}
                      defaultTimeRange={30}
                      onFilterChange={handleSentimentFilterChange}
                    />
                    <SentimentTrendChart
                      projectId={project.id}
                      defaultTimeRange={30}
                    />
                  </div>
                  {sentimentFilter && (
                    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-purple-900">
                          Filtering by sentiment: <strong className="capitalize">{sentimentFilter}</strong>
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSentimentFilterChange(null)}
                        className="text-purple-700 hover:text-purple-900"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </div>
              )
            }

            {/* Spec Writer Dashboard removed - available from sidebar */}

            {/* Posts List */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No feedback yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Be the first to share your ideas and help shape the future of this product.
                    </p>
                    <Button
                      onClick={() => setShowPostForm(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Submit First Feedback
                    </Button>
                  </div>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const priorityLevelLabel = getPriorityLevelLabel(post.priority_score);
                  const priorityBadgeClass = priorityLevelLabel
                    ? PRIORITY_LEVEL_STYLES[priorityLevelLabel] || PRIORITY_LEVEL_STYLES.Low
                    : '';
                  const priorityReasonDescription = post.priority_reason
                    ? post.priority_reason.replace(/^[^:]+:\s*/, '')
                    : null;
                  const priorityScoreDisplay = typeof post.priority_score === 'number'
                    ? post.priority_score.toFixed(1)
                    : null;
                  const priorityAnalyzedOn = post.ai_analyzed_at
                    ? new Date(post.ai_analyzed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    : null;
                  const priorityIndexDisplay = typeof post.total_priority_score === 'number'
                    ? post.total_priority_score
                    : null;
                  const hasAISuggestion = Boolean(post.ai_analyzed_at);
                  const isPriorityExpanded = expandedPriorityCards[post.id] ?? false;
                  const summaryMessage = priorityLevelLabel
                    ? `Suggested: ${priorityLevelLabel}`
                    : 'AI-generated planning guidance';
                  const summaryScoreDisplay = hasAISuggestion && priorityScoreDisplay ? `${priorityScoreDisplay}/10` : null;
                  const hasMergedDuplicates = (post.mergedDuplicateCount ?? 0) > 0;

                  return (
                    <Card
                      key={post.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/${params?.slug}/post/${post.id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Vote Button */}
                          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                            <VoteButton
                              postId={post.id}
                              initialVoteCount={post.vote_count}
                              initialUserVoted={post.user_voted}
                              onVoteChange={(newCount, userVoted) => {
                                // Update the post in the local state
                                setPosts(prev => prev.map(p =>
                                  p.id === post.id
                                    ? { ...p, vote_count: newCount, user_voted: userVoted }
                                    : p
                                ));
                              }}
                              onShowNotification={(message, type) => {
                                if (type === 'success') {
                                  toast.success(message);
                                } else if (type === 'error') {
                                  toast.error(message);
                                } else {
                                  toast.info(message);
                                }
                              }}
                              size="md"
                              variant="default"
                            />
                          </div>

                          {/* Post Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                {post.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge
                                  variant="outline"
                                  className={statusConfig[post.status].color}
                                >
                                  {statusConfig[post.status].label}
                                </Badge>
                                {hasMergedDuplicates && (
                                  <Badge
                                    variant="outline"
                                    className="border-orange-300 bg-orange-50 text-orange-700"
                                  >
                                    {post.mergedDuplicateCount} merged
                                  </Badge>
                                )}
                                {isOwnerOrAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePost(post.id);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto cursor-pointer"
                                    title="Delete post"
                                    aria-label="Delete post"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* AI Category Badge */}
                            {post.category && (
                              <div className="mb-2">
                                <CategoryBadge
                                  category={post.category}
                                  aiCategorized={post.ai_categorized}
                                  confidence={post.ai_confidence}
                                  size="sm"
                                />
                              </div>
                            )}

                            {hasAISuggestion && (
                              <div className="mb-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePriorityDetails(post.id);
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-left transition hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                  <Badge
                                    variant="outline"
                                    className="border-blue-200 bg-white/70 text-[10px] font-semibold uppercase tracking-wide text-blue-700"
                                  >
                                    AI Suggestion
                                  </Badge>
                                  <span className="text-xs sm:text-sm text-gray-700">
                                    {summaryMessage} <span className="font-medium text-gray-800">(guidance)</span>
                                  </span>
                                  {summaryScoreDisplay && (
                                    <span className="ml-auto text-xs font-semibold text-gray-700">
                                      {summaryScoreDisplay}
                                    </span>
                                  )}
                                  <ChevronDown
                                    className={`h-4 w-4 text-gray-500 transition-transform ${isPriorityExpanded ? 'rotate-180' : ''}`}
                                  />
                                </button>

                                {isPriorityExpanded && (
                                  <div className="mt-2 rounded-lg border border-blue-200 bg-white p-3 text-xs text-gray-600 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                      <Badge
                                        variant="outline"
                                        className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${priorityBadgeClass || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                                      >
                                        <Target className="h-3 w-3" />
                                        {priorityLevelLabel || 'AI Planning Guidance'}
                                      </Badge>
                                      {priorityScoreDisplay && (
                                        <span className="text-xs font-semibold text-gray-700">
                                          {priorityScoreDisplay}
                                          <span className="ml-1 text-[11px] font-normal text-gray-500">/10</span>
                                        </span>
                                      )}
                                    </div>

                                    {priorityLevelLabel && (
                                      <p className="mt-2 text-xs text-gray-600">
                                        Suggested scheduling: <span className="font-semibold text-gray-800">{priorityLevelLabel}</span>. Treat this as AI guidance and confirm with your roadmap before committing.
                                      </p>
                                    )}

                                    {priorityReasonDescription && (
                                      <p className="mt-2 text-xs text-gray-700">
                                        {priorityReasonDescription}
                                      </p>
                                    )}

                                    {(priorityIndexDisplay !== null || priorityAnalyzedOn) && (
                                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                                        {priorityIndexDisplay !== null && (
                                          <span>Priority index {priorityIndexDisplay}</span>
                                        )}
                                        {priorityAnalyzedOn && (
                                          <span>Updated {priorityAnalyzedOn}</span>
                                        )}
                                      </div>
                                    )}

                                    <p className="mt-3 text-[11px] text-gray-500">
                                      This recommendation was generated by AI to spark planning discussions. Final prioritization decisions remain with your team.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {post.description && (
                              <p className="text-gray-600 line-clamp-3 mb-3">
                                {post.description}
                              </p>
                            )}

                            {isOwnerOrAdmin && post.mergedDuplicates && post.mergedDuplicates.length > 0 && (
                              <div className="mb-3 rounded border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
                                <div className="flex items-center gap-1 font-semibold mb-2">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Merged duplicates</span>
                                </div>
                                <div className="space-y-1">
                                  {post.mergedDuplicates.map((duplicate) => (
                                    <button
                                      key={duplicate.id}
                                      type="button"
                                      className="underline underline-offset-2 hover:text-orange-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/${project?.slug || params?.slug}/post/${duplicate.id}`);
                                      }}
                                    >
                                      {duplicate.title}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate max-w-[80px] sm:max-w-[120px]">
                                  {post.author_email ?
                                    post.author_email.split('@')[0] :
                                    'Anonymous'
                                  }
                                </span>
                              </div>

                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>
                                  {new Date(post.created_at).toLocaleDateString('en-US', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    year: '2-digit'
                                  })}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>{post.comment_count}</span>
                                <span className="hidden sm:inline">comments</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Show more button if needed */}
            {
              filteredPosts.length > 0 && (
                <div className="text-center mt-8">
                  <Button variant="outline">
                    Load More Feedback
                  </Button>
                </div>
              )
            }
          </div >

          {/* AI Insights Sidebar - Only show for Pro users */}
          {
            user && userPlan === 'pro' && (
              <div className={`hidden lg:block ${sidebarCollapsed ? 'w-12' : 'w-80'} flex-shrink-0 transition-all duration-300`}>
                <div className="sticky top-8">
                  {/* Toggle Button */}
                  <div className="flex items-center justify-between mb-4">
                    {!sidebarCollapsed && (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h2 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h2>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Pro Feature
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="p-2 hover:bg-purple-50"
                    >
                      {sidebarCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-purple-600" />
                      ) : (
                        <ChevronLeft className="h-4 w-4 text-purple-600" />
                      )}
                    </Button>
                  </div>

                  {/* Collapsed State - Show AI icon */}
                  {sidebarCollapsed && (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  )}

                  {!sidebarCollapsed && (
                    <div className="space-y-4">
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Sparkles className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">AI Features</h3>
                              <p className="text-sm text-gray-600">Available on individual posts</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                              <span>Duplicate Detection</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              <span>Priority Scoring</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span>Smart Categorization</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            Click on any post to access AI-powered analysis and insights.
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">Smart Analytics</h3>
                              <p className="text-sm text-gray-600">AI-powered insights</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                              <span>Automatic categorization</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                              <span>Duplicate detection</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span>Priority scoring</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            AI automatically analyzes your feedback for better organization.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            )
          }
        </div >
      </div >

      {/* Post Submission Modal */}
      {
        showPostForm && project && (
          <PostSubmissionForm
            isOpen={showPostForm}
            onClose={() => setShowPostForm(false)}
            projectId={project.id}
            boardId={boardId || ''}
            onPostSubmitted={loadProjectAndPosts}
          />
        )
      }

      {/* Feedback on Behalf Modal */}
      {
        showFeedbackOnBehalfModal && project && (
          <FeedbackOnBehalfModal
            isOpen={showFeedbackOnBehalfModal}
            onClose={() => setShowFeedbackOnBehalfModal(false)}
            projectId={project.id}
            projectSlug={project.slug}
            onSuccess={loadProjectAndPosts}
          />
        )
      }

      {/* AI Insights Slideout */}
      {
        showAIInsights && (
          <AIInsightsSlideout
            projectSlug={params?.slug as string}
            isOpen={showAIInsights}
            onClose={() => setShowAIInsights(false)}
          />
        )
      }
    </div >
  );
}
