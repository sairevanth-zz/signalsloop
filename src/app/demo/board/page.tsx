'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Filter,
  Search,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Map,
  BarChart3,
  Settings,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Eye,
  Code,
  Globe,
  Mail,
  Crown,
  ArrowRight,
  ExternalLink,
  Bot,
  Loader2,
  Brain,
  Copy,
  Lightbulb,
  Bug,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import AIWritingAssistant from '@/components/AIWritingAssistant';

const BOARD_FEATURE_LIMITS = {
  submit: { limit: 5, label: 'feedback submissions' },
  categorize: { limit: 10, label: 'AI categorizations' },
  writingAssistant: { limit: 10, label: 'AI writing improvements' },
  vote: { limit: 20, label: 'vote actions' }
} as const;

type BoardFeatureKey = keyof typeof BOARD_FEATURE_LIMITS;

type FeatureUsageMap = Record<BoardFeatureKey, { used: number; limit: number }>;

interface DemoPost {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'planned' | 'in_progress' | 'done';
  vote_count: number;
  user_voted: boolean;
  author: string;
  created_at: string;
  comments_count: number;
}

interface DemoProFeedbackFormProps {
  onSubmit: (post: DemoPost) => void;
  usage: FeatureUsageMap;
  checkLimit: (feature: BoardFeatureKey) => boolean;
  recordUsage: (feature: BoardFeatureKey, amount?: number) => void;
}

const demoPostTypes = [
  { value: 'feature', label: 'Feature Request', icon: Star, description: 'Suggest a new capability' },
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Something is broken' },
  { value: 'improvement', label: 'Improvement', icon: Lightbulb, description: 'Enhance an existing flow' },
  { value: 'general', label: 'General Feedback', icon: MessageSquare, description: 'Open-ended idea or thought' }
];

const demoPriorities = [
  { value: 'low', label: 'Nice to have', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'medium', label: 'Important', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'high', label: 'Critical', color: 'text-rose-600 bg-rose-50 border-rose-200' }
];

function DemoProFeedbackForm({ onSubmit, usage, checkLimit, recordUsage }: DemoProFeedbackFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature',
    priority: 'medium',
    name: 'Taylor (Product Manager)',
    email: 'taylor@signalsloop.com'
  });
  const [errors, setErrors] = useState<Partial<typeof formData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiCategory, setAiCategory] = useState<{ category: string; confidence: number; reasoning?: string } | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInput = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const categorizeWithAI = async () => {
    if (!formData.title.trim()) {
      setErrors(prev => ({ ...prev, title: 'Add a short title so AI has context' }));
      toast.error('Please add a title before running AI categorization');
      return;
    }

    if (!checkLimit('categorize')) {
      return;
    }

    setIsCategorizing(true);
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          projectId: null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Categorization failed');
      }

      const data = await response.json();
      setAiCategory(data.result);
      recordUsage('categorize');
      toast.success(`AI suggests ${data.result.category}`);
    } catch (error) {
      console.error('AI categorization error:', error);
      toast.error(error instanceof Error ? error.message : 'AI categorization unavailable');
    } finally {
      setIsCategorizing(false);
    }
  };

  const validate = () => {
    const nextErrors: Partial<typeof formData> = {};

    if (!formData.title.trim()) {
      nextErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      nextErrors.title = 'Use at least 5 characters';
    }

    if (!formData.description.trim()) {
      nextErrors.description = 'Add a short description';
    } else if (formData.description.trim().length < 15) {
      nextErrors.description = 'Tell us a bit more (15+ characters)';
    }

    if (!formData.name.trim()) {
      nextErrors.name = 'Name helps your team personalize responses';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    if (!checkLimit('submit')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const newPost: DemoPost = {
        id: `demo-${now.getTime()}`,
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: 'open',
        vote_count: 42,
        user_voted: true,
        author: formData.name.trim() || 'Demo User',
        created_at: now.toISOString(),
        comments_count: 0
      };

      onSubmit(newPost);
      setShowSuccess(true);
      toast.success('Feedback submitted! AI will analyze it instantly.');
      recordUsage('submit');

      setFormData({
        title: '',
        description: '',
        type: 'feature',
        priority: 'medium',
        name: 'Taylor (Product Manager)',
        email: 'taylor@signalsloop.com'
      });
      setAiCategory(null);
      setErrors({});

      setTimeout(() => setShowSuccess(false), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur border border-purple-100 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-xl text-gray-900">Submit New Feedback</CardTitle>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">Pro</Badge>
            </div>
            <p className="text-sm text-gray-600">
              Crafted for product teams—AI assists with writing, categorization, and prioritization instantly.
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm">
            Live AI Demo
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Feedback Type</label>
              <div className="grid grid-cols-2 gap-2">
                {demoPostTypes.map(option => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleInput('type', option.value)}
                    className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                      formData.type === option.value ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    <option.icon className={`h-4 w-4 mt-1 ${formData.type === option.value ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Business Impact</label>
              <div className="grid gap-2">
                {demoPriorities.map(option => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleInput('priority', option.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      formData.priority === option.value ? option.color : 'border-gray-200 hover:border-purple-200 text-gray-600'
                    }`}
                  >
                    <p className="text-sm font-semibold capitalize">{option.label}</p>
                    <p className="text-xs opacity-80">AI uses this to understand urgency</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => handleInput('title', e.target.value)}
                placeholder="What would you like to see?"
                className={errors.title ? 'border-red-300 focus-visible:ring-red-300' : ''}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={categorizeWithAI}
                  disabled={isCategorizing || usage.categorize.used >= usage.categorize.limit}
                >
                  {isCategorizing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-3 w-3 mr-2" />
                      Categorize with AI ({usage.categorize.used}/{usage.categorize.limit})
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInput('description', e.target.value)}
                rows={4}
                placeholder="Share the problem, context, and why it matters. AI will help polish it."
                className={errors.description ? 'border-red-300 focus-visible:ring-red-300' : ''}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}

              <AIWritingAssistant
                currentText={formData.description}
                context={`Feedback type: ${formData.type}, Priority: ${formData.priority}`}
                onTextImprove={(text) => handleInput('description', text)}
                placeholder="Describe your idea..."
                usage={usage.writingAssistant}
                onCheckLimit={() => checkLimit('writingAssistant')}
                onUsage={() => recordUsage('writingAssistant')}
              />

              {aiCategory && (
                <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">AI categorization complete</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>{aiCategory.category}</strong> &middot; Confidence {(aiCategory.confidence * 100).toFixed(0)}%
                  </p>
                  {aiCategory.reasoning && (
                    <p className="text-xs text-gray-500 mt-1">{aiCategory.reasoning}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <Input
                value={formData.name}
                onChange={(e) => handleInput('name', e.target.value)}
                placeholder="Who should we follow up with?"
                className={errors.name ? 'border-red-300 focus-visible:ring-red-300' : ''}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <Input
                value={formData.email}
                onChange={(e) => handleInput('email', e.target.value)}
                placeholder="We'll send updates to this address"
                type="email"
                className={errors.email ? 'border-red-300 focus-visible:ring-red-300' : ''}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-xs text-gray-500">
              AI will auto-detect duplicates, prioritize urgency, and notify your team immediately.
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={isSubmitting || usage.submit.used >= usage.submit.limit}
              >
                {isSubmitting ? 'Submitting...' : `Submit Feedback (${usage.submit.used}/${usage.submit.limit})`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    title: '',
                    description: '',
                    type: 'feature',
                    priority: 'medium',
                    name: 'Taylor (Product Manager)',
                    email: 'taylor@signalsloop.com'
                  });
                  setErrors({});
                  setAiCategory(null);
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          {showSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                New feedback added to the board. Scroll down to see how AI enriches it in real time.
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export default function DemoBoard() {
  const router = useRouter();
  const [posts, setPosts] = useState<DemoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feedback');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('votes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(true);
  const [showDemoLimitBanner, setShowDemoLimitBanner] = useState(true);

  const createInitialUsage = (): FeatureUsageMap => {
    const entries = Object.entries(BOARD_FEATURE_LIMITS).map(([feature, config]) => [feature, { used: 0, limit: config.limit }]);
    return Object.fromEntries(entries) as FeatureUsageMap;
  };

  const [featureUsage, setFeatureUsage] = useState<FeatureUsageMap>(() => createInitialUsage());

  const checkLimit = (feature: BoardFeatureKey) => {
    const usage = featureUsage[feature];
    if (!usage) return true;

    if (usage.used >= usage.limit) {
      toast.error(`Demo limit reached for ${BOARD_FEATURE_LIMITS[feature].label}. Please try again later.`);
      return false;
    }
    return true;
  };

  const recordUsage = (feature: BoardFeatureKey, amount = 1) => {
    setFeatureUsage(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        used: Math.min(prev[feature].used + amount, prev[feature].limit)
      }
    }));
  };

  // Load demo data from API
  useEffect(() => {
    const loadDemoData = async () => {
      try {
        const response = await fetch('/api/demo/posts');
        if (!response.ok) {
          throw new Error('Failed to fetch demo posts');
        }
        
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Error loading demo data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDemoData();
  }, []);

  const statusOptions = [
    { value: 'all', label: 'All Status', icon: Filter },
    { value: 'open', label: 'Open', icon: AlertCircle },
    { value: 'planned', label: 'Planned', icon: Calendar },
    { value: 'in_progress', label: 'In Progress', icon: Zap },
    { value: 'done', label: 'Done', icon: CheckCircle }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-3 w-3" />;
      case 'in_progress': return <Zap className="h-3 w-3" />;
      case 'planned': return <Calendar className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const filteredPosts = posts
    .filter(post => {
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           post.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'votes': return b.vote_count - a.vote_count;
        default: return b.vote_count - a.vote_count;
      }
    });

  const handlePostClick = (postId: string) => {
    console.log('Post clicked:', postId);
    // Navigate directly to the demo post details page
    router.push(`/demo/post/${postId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Demo Limit Banner */}
      {showDemoLimitBanner && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <div>
                <div className="font-bold text-sm">🎯 Interactive Demo - Explore All Features!</div>
                <div className="text-xs text-white/90">Vote on features • Try AI analysis • Post comments • Experience the full platform</div>
              </div>
            </div>
            <button onClick={() => setShowDemoLimitBanner(false)} className="text-white/80 hover:text-white text-lg">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SignalsLoop Demo</h1>
                <p className="text-sm text-gray-600">Experience the complete dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/">← Back to Home</Link>
              </Button>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Crown className="h-3 w-3 mr-1" />
                Pro Demo
              </Badge>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Demo Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:w-[900px] mx-auto gap-2">
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feedback</span>
              <span className="sm:hidden">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Roadmap</span>
              <span className="sm:hidden">Road</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="ai-features" className="flex items-center gap-2 bg-purple-50 data-[state=active]:bg-purple-100">
              <Bot className="h-4 w-4 text-purple-600" />
              <span className="hidden sm:inline text-purple-600">AI Features</span>
              <span className="sm:hidden text-purple-600">AI</span>
              <Badge variant="outline" className="ml-1 text-xs bg-purple-100 text-purple-700 border-purple-200">New</Badge>
            </TabsTrigger>
            <TabsTrigger value="ai-test" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline text-blue-600">AI Test Lab</span>
              <span className="sm:hidden text-blue-600">Lab</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Set</span>
            </TabsTrigger>
          </TabsList>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            {/* Filters and Search */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search feedback..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        variant={statusFilter === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(option.value)}
                        className={`flex items-center gap-2 ${
                          statusFilter === option.value 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                            : ''
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="votes">Most Voted</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            <div className="bg-white/70 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
              <span className="font-semibold text-gray-700">Demo limits</span>
              <span>Submit ({featureUsage.submit.used}/{featureUsage.submit.limit})</span>
              <span>AI categorize ({featureUsage.categorize.used}/{featureUsage.categorize.limit})</span>
              <span>AI writing ({featureUsage.writingAssistant.used}/{featureUsage.writingAssistant.limit})</span>
              <span>Votes ({featureUsage.vote.used}/{featureUsage.vote.limit})</span>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold uppercase tracking-wide text-purple-700">AI-powered submission</span>
                  <span className="hidden md:inline text-sm text-gray-500">Every post flows through categorization, duplicate detection, and priority scoring.</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewPostForm((prev) => !prev)}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  {showNewPostForm ? 'Hide form' : 'Open pro submission form'}
                </Button>
              </div>

              {showNewPostForm && (
                <DemoProFeedbackForm
                  onSubmit={(post) => {
                    setPosts(prev => [post, ...prev]);
                    setActiveTab('feedback');
                  }}
                  usage={featureUsage}
                  checkLimit={checkLimit}
                  recordUsage={recordUsage}
                />
              )}
            </div>

            {/* Posts List */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-transparent bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading demo data...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No posts found. Try adjusting your filters.</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg hover:shadow-blue-100/50 transition-all cursor-pointer border border-gray-200 hover:border-blue-300 bg-white/80 backdrop-blur-sm" onClick={() => handlePostClick(post.id)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                          <Badge className={getStatusColor(post.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(post.status)}
                              {post.status.replace('_', ' ')}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{post.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {post.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(post.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {post.comments_count} comments
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            const alreadyVoted = post.user_voted;
                            if (!alreadyVoted && !checkLimit('vote')) {
                              return;
                            }
                            setPosts(prev => prev.map(p =>
                              p.id === post.id
                                ? { 
                                    ...p, 
                                    vote_count: p.user_voted ? p.vote_count - 1 : p.vote_count + 1,
                                    user_voted: !p.user_voted
                                  }
                                : p
                            ));
                            if (!alreadyVoted) {
                              recordUsage('vote');
                            }
                            toast.success(alreadyVoted ? 'Vote removed' : 'Vote added');
                          }}
                          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors ${
                            post.user_voted 
                              ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          disabled={!post.user_voted && featureUsage.vote.used >= featureUsage.vote.limit}
                        >
                          <svg className="w-4 h-4 mb-1" fill={post.user_voted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                          </svg>
                          <span className="font-medium text-sm">{post.vote_count}</span>
                          {post.user_voted && (
                            <div className="text-xs text-white mt-1 flex items-center gap-1">
                              <span>Voted</span>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
              )}
            </div>

          </TabsContent>

          {/* Roadmap Tab */}
          <TabsContent value="roadmap" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Planned */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-yellow-600" />
                    Planned
                    <Badge variant="outline" className="ml-auto">12</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-sm">Dark Mode Support</h4>
                    <p className="text-xs text-gray-600 mt-1">Allow users to switch between light and dark themes</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Feature</Badge>
                      <span className="text-xs text-gray-500">Q2 2024</span>
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-sm">Mobile App</h4>
                    <p className="text-xs text-gray-600 mt-1">Native iOS and Android applications</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Feature</Badge>
                      <span className="text-xs text-gray-500">Q3 2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* In Progress */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-orange-600" />
                    In Progress
                    <Badge variant="outline" className="ml-auto">8</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-sm">Advanced Analytics</h4>
                    <p className="text-xs text-gray-600 mt-1">Detailed insights and reporting dashboard</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Analytics</Badge>
                      <span className="text-xs text-gray-500">75%</span>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-sm">API v2</h4>
                    <p className="text-xs text-gray-600 mt-1">Enhanced API with better performance</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Infrastructure</Badge>
                      <span className="text-xs text-gray-500">60%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Done */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Done
                    <Badge variant="outline" className="ml-auto">24</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-sm">Widget Integration</h4>
                    <p className="text-xs text-gray-600 mt-1">Embeddable feedback widget for websites</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Feature</Badge>
                      <span className="text-xs text-gray-500">✓ Done</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-sm">Email Notifications</h4>
                    <p className="text-xs text-gray-600 mt-1">Automated email updates for feedback</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">Integration</Badge>
                      <span className="text-xs text-gray-500">✓ Done</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                      <p className="text-2xl font-bold text-gray-900">1,247</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-xs text-green-600 mt-2">+12% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">892</p>
                    </div>
                    <User className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-green-600 mt-2">+8% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">73%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-green-600 mt-2">+5% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                      <p className="text-2xl font-bold text-gray-900">4.8</p>
                    </div>
                    <Sparkles className="h-8 w-8 text-yellow-600" />
                  </div>
                  <p className="text-xs text-green-600 mt-2">+0.2 from last month</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Feedback Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Interactive chart showing feedback trends over time</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Top Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Feature Requests</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-3/4 h-full bg-blue-600 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bug Reports</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/2 h-full bg-red-600 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">32%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Improvements</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/4 h-full bg-yellow-600 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">23%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Features Tab */}
          <TabsContent value="ai-features" className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">🤖 Enhanced AI Features Dashboard</h2>
                  <p className="text-gray-700 mb-4">Explore our 5 powerful AI features that automatically organize, prioritize, and enhance your feedback management. All features are production-ready and fully functional.</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">🤖</div>
                      <div className="text-xs font-medium text-gray-700">Auto-Categorization</div>
                      <div className="text-xs text-purple-600">99.2% accurate</div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">🎯</div>
                      <div className="text-xs font-medium text-gray-700">Priority Scoring</div>
                      <div className="text-xs text-orange-600">7-factor analysis</div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">🔍</div>
                      <div className="text-xs font-medium text-gray-700">Duplicate Detection</div>
                      <div className="text-xs text-blue-600">Semantic search</div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">💡</div>
                      <div className="text-xs font-medium text-gray-700">Smart Replies</div>
                      <div className="text-xs text-green-600">Context-aware</div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">⚡</div>
                      <div className="text-xs font-medium text-gray-700">Cache Manager</div>
                      <div className="text-xs text-pink-600">80% cost savings</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Test Section */}
              <Card className="bg-white/80 backdrop-blur-sm border border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Quick AI Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">Try the AI features with sample data. All features are live and functional!</p>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.open('/ai-test', '_blank')}
                    >
                      <Bot className="h-4 w-4 mr-2 text-purple-600" />
                      Test Auto-Categorization
                      <Badge variant="outline" className="ml-auto text-xs">Live</Badge>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setActiveTab('ai-test')}
                    >
                      <Brain className="h-4 w-4 mr-2 text-blue-600" />
                      Open AI Test Lab
                      <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-blue-700">Interactive</Badge>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* API Endpoints */}
              <Card className="bg-white/80 backdrop-blur-sm border border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-blue-600" />
                    Production API Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-purple-600">POST /api/ai/categorize</span>
                      <Badge variant="outline" className="text-xs">Live</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-orange-600">POST /api/ai/priority-scoring</span>
                      <Badge variant="outline" className="text-xs">Live</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-blue-600">POST /api/ai/duplicate-detection</span>
                      <Badge variant="outline" className="text-xs">Live</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-green-600">POST /api/ai/smart-replies</span>
                      <Badge variant="outline" className="text-xs">Live</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-pink-600">GET /api/ai/cache-stats</span>
                      <Badge variant="outline" className="text-xs">Live</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature Details Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">🤖</span>
                    Auto-Categorization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">Automatically categorizes feedback into 10 SaaS-specific categories with 99.2% accuracy.</p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <div className="font-medium text-gray-700 mb-1">Features:</div>
                      <ul className="space-y-1 text-gray-600 ml-4">
                        <li>• 10 SaaS categories</li>
                        <li>• Quick categorization for critical issues</li>
                        <li>• Business context awareness</li>
                        <li>• Tier-based scoring</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">🎯</span>
                    Priority Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">7-factor business-aware scoring that knows which feedback matters most to your goals.</p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <div className="font-medium text-gray-700 mb-1">Scoring Factors:</div>
                      <ul className="space-y-1 text-gray-600 ml-4">
                        <li>• Revenue Impact</li>
                        <li>• User Reach</li>
                        <li>• Strategic Alignment</li>
                        <li>• Implementation Effort</li>
                      </ul>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200">0-10 scale</Badge>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">🔍</span>
                    Duplicate Detection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">Semantic analysis finds similar feedback automatically with cluster analysis.</p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <div className="font-medium text-gray-700 mb-1">Capabilities:</div>
                      <ul className="space-y-1 text-gray-600 ml-4">
                        <li>• Embedding-based search</li>
                        <li>• Cluster analysis</li>
                        <li>• Smart merging</li>
                        <li>• Similarity thresholds</li>
                      </ul>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">Cosine similarity</Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Test Lab Tab */}
          <TabsContent value="ai-test" className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">🧪 AI Test Laboratory</h2>
                  <p className="text-gray-700">Interactive testing environment for all AI features. Test with real data and see instant results.</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-600" />
                    Test Individual Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open('/ai-test', '_blank')}
                  >
                    <span className="text-2xl mr-3">🤖</span>
                    <div className="text-left flex-1">
                      <div className="font-medium">Categorization Test</div>
                      <div className="text-xs text-gray-600">Test 10 SaaS categories</div>
                    </div>
                  </Button>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium mb-2">Coming Soon:</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>🎯</span> Priority Scoring Tester
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>🔍</span> Duplicate Detection Lab
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>💡</span> Smart Replies Generator
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Live Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <div className="text-xs text-purple-600 font-medium mb-1">Categorization</div>
                      <div className="text-2xl font-bold text-purple-600">99.2%</div>
                      <div className="text-xs text-gray-600">Accuracy</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                      <div className="text-xs text-orange-600 font-medium mb-1">Priority</div>
                      <div className="text-2xl font-bold text-orange-600">8.5</div>
                      <div className="text-xs text-gray-600">Avg Score</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="text-xs text-blue-600 font-medium mb-1">Duplicates</div>
                      <div className="text-2xl font-bold text-blue-600">12</div>
                      <div className="text-xs text-gray-600">Found</div>
                    </div>
                    <div className="bg-pink-50 rounded-lg p-3 border border-pink-100">
                      <div className="text-xs text-pink-600 font-medium mb-1">Cache</div>
                      <div className="text-2xl font-bold text-pink-600">80%</div>
                      <div className="text-xs text-gray-600">Savings</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-gray-700" />
                  Example API Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 rounded-lg p-4 text-white font-mono text-xs overflow-x-auto">
                  <div className="mb-2 text-green-400">// Test categorization endpoint</div>
                  <div className="mb-4">
                    <span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> <span className="text-blue-400">fetch</span>(<span className="text-yellow-400">'/api/ai/categorize'</span>, {'{'}<br />
                    &nbsp;&nbsp;method: <span className="text-yellow-400">'POST'</span>,<br />
                    &nbsp;&nbsp;headers: {'{'} <span className="text-yellow-400">'Content-Type'</span>: <span className="text-yellow-400">'application/json'</span> {'}'},<br />
                    &nbsp;&nbsp;body: <span className="text-blue-400">JSON.stringify</span>({'{'}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;title: <span className="text-yellow-400">'Add dark mode support'</span>,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;description: <span className="text-yellow-400">'Users want dark theme'</span>,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;userTier: <span className="text-yellow-400">'pro'</span><br />
                    &nbsp;&nbsp;{'}'} )<br />
                    {'}'});
                  </div>
                  <div className="mb-2 text-green-400">// Response</div>
                  <div>
                    {'{'}<br />
                    &nbsp;&nbsp;<span className="text-blue-400">success</span>: <span className="text-yellow-400">true</span>,<br />
                    &nbsp;&nbsp;<span className="text-blue-400">result</span>: {'{'}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">primaryCategory</span>: <span className="text-yellow-400">"Feature Request"</span>,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">confidence</span>: <span className="text-yellow-400">0.95</span><br />
                    &nbsp;&nbsp;{'}'}<br />
                    {'}'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Board Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Public Board</p>
                      <p className="text-sm text-gray-600">Anyone can view and submit feedback</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Get notified of new feedback</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-categorization</p>
                      <p className="text-sm text-gray-600">AI-powered feedback categorization</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Widget Code</p>
                      <p className="text-sm text-gray-600">Embed on your website</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">API Access</p>
                      <p className="text-sm text-gray-600">Connect with external tools</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/docs/api">
                        <Code className="h-4 w-4 mr-2" />
                        View Docs
                      </Link>
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Webhook</p>
                      <p className="text-sm text-gray-600">Real-time updates</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Coming Soon
                      </Badge>
                      <Button variant="outline" size="sm" disabled>
                        <Mail className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                Pro Features
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium">Private Boards</h4>
                  <p className="text-sm text-gray-600">Create private feedback boards</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <Globe className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-medium">Custom Domain</h4>
                  <p className="text-sm text-gray-600">Use your own domain</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-medium">Advanced Analytics</h4>
                  <p className="text-sm text-gray-600">Detailed insights and reports</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Interactive Roadmap CTA */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 p-6 text-center">
              <Map className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Interactive Roadmap</h3>
              <p className="text-gray-600 mb-4">Explore our public roadmap with real-time updates, voting, AI analysis, and more.</p>
              <Button 
                onClick={() => setActiveTab('roadmap')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Public Roadmap
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                <Sparkles className="h-3 w-3 inline mr-1" />
                Try AI features with demo limits • Vote on features • Post comments
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
