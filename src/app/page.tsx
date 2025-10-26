'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  TrendingUp,
  Code,
  CheckCircle,
  Star,
  ArrowRight,
  Zap,
  Bot,
  BarChart3,
  Zap as Lightning,
  Lightbulb,
  Target,
  Clock,
  Map,
  BookOpen,
  Calendar,
  Sparkles,
  Share2,
  Upload,
  Download,
  ExternalLink,
  Users,
  Shield,
  Mail,
  UserPlus
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';

export default function Homepage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    // Check if there's an access_token in the hash (magic link redirect)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('Found access_token in hash, setting session and checking if new user');
      // Extract tokens
      const urlParams = new URLSearchParams(hash.substring(1));
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Set session and check if new user
        const setSessionAndRedirect = async () => {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);

              // First, set the session with both tokens
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });

              if (sessionError) {
                console.error('Error setting session:', sessionError);
                router.push('/app');
                return;
              }

              console.log('Session set successfully');

              if (sessionData.user) {
                const userCreatedAt = new Date(sessionData.user.created_at);
                const timeSinceCreation = Date.now() - userCreatedAt.getTime();
                const isNewUser = timeSinceCreation < 300000; // 5 minutes

                console.log('Homepage new user check:', {
                  created_at: sessionData.user.created_at,
                  time_since_creation_ms: timeSinceCreation,
                  is_new_user: isNewUser
                });

                if (isNewUser) {
                  console.log('New user detected, sending welcome email and redirecting');

                  // Track signup
                  const { analytics } = await import('@/lib/analytics');
                  analytics.signup({
                    source: 'magic_link',
                    email: sessionData.user.email,
                    user_id: sessionData.user.id
                  });

                  // Identify user
                  analytics.identify(sessionData.user.id, {
                    email: sessionData.user.email,
                    created_at: sessionData.user.created_at,
                    signup_method: 'magic_link'
                  });

                  // Send welcome email for new users
                  if (sessionData.user.email) {
                    try {
                      const emailResponse = await fetch('/api/users/welcome', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: sessionData.user.id })
                      });
                      console.log('Welcome email API response:', emailResponse.status);
                    } catch (emailError) {
                      console.error('Failed to send welcome email:', emailError);
                      // Don't block the flow if email fails
                    }
                  }

                  router.push('/welcome');
                  return;
                }
              }
            }
          } catch (error) {
            console.error('Error in session setup:', error);
          }

          // Default: redirect to app
          router.push('/app');
        };

        setSessionAndRedirect();
        return;
      }
    }

    // If user is already authenticated, redirect to dashboard
    if (!loading && user) {
      console.log('User already authenticated, redirecting to dashboard');
      router.push('/app');
      return;
    }
  }, [router, user, loading]);

  const handleProCheckout = (source: string = 'homepage') => {
    // Track CTA click
    import('@/lib/analytics').then(({ analytics }) => {
      analytics.page('cta_clicked', {
        section: source,
        cta_text: source === 'hero' ? 'Start Free' : 'Get Started',
        destination: '/login'
      });
    });
    router.push('/login');
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 safe-top">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center space-x-2 min-touch-target tap-highlight-transparent">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm md:text-base">S</span>
              </div>
              <span className="text-base md:text-xl font-bold text-gray-900 hidden xs:inline">SignalsLoop</span>
            </Link>
            
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors min-touch-target">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors min-touch-target">
                Pricing
              </Link>
              <Link href="/demo/board" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors flex items-center gap-1 min-touch-target">
                🎯 Demo
              </Link>
              
              {/* Subtle Header Trust Signals */}
              <div className="hidden xl:flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="text-green-500">🔒</span>
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-500">⚡</span>
                  <span>5 AI Features</span>
                </div>
              </div>
            </nav>
            
            <div className="flex items-center gap-2">
              <Link href="/demo/board" className="lg:hidden">
                <Button
                  variant="outline"
                  className="text-sm md:text-base min-touch-target px-3 md:px-4 tap-highlight-transparent"
                >
                  Demo
                </Button>
              </Link>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" className="text-sm md:text-base min-touch-target px-3 md:px-4 tap-highlight-transparent">
                  Sign In
                </Button>
              </Link>
              <Button 
                onClick={handleProCheckout}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl px-3 sm:px-6 md:px-8 text-xs sm:text-sm md:text-base min-touch-target tap-highlight-transparent whitespace-nowrap"
              >
                Start Free
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 lg:py-32 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200 text-sm">
            ✨ AI-Powered Feedback Management
          </Badge>
          
          {/* Enhanced Trust Indicators with Metrics */}
          <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>5 AI Features</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>50,000+ Posts Processed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Slack & Discord Ready</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>CSV Import/Export</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span>API & Webhooks</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
              <span>100+ Teams Using</span>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 md:mb-8 leading-tight tracking-tight animate-fade-in">
            The AI Product Intelligence Platform<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient">That Builds Your Roadmap for You.</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-6 max-w-4xl mx-auto leading-relaxed px-4">
            Connect with thousands of customers through public boards. AI reads every conversation, identifies patterns, prioritizes opportunities, and generates a data-driven roadmap—automatically.
          </p>

          <p className="text-base sm:text-lg text-gray-500 mb-4 max-w-3xl mx-auto px-4">
            Powered by <strong className="text-gray-700">5 proprietary AI models</strong> for categorization, priority scoring, duplicate detection, smart replies, and intelligent writing assistance. From <strong className="text-gray-700">$19/month</strong>—a fraction of legacy tools at $99-$295/month.
          </p>

          <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-600 mb-10 px-4">
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium border border-green-200">✨ Public Roadmap + Feedback Widget</span>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium border border-blue-200">🤖 5 AI Features Free</span>
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium border border-purple-200">⚡ 2-Min Setup</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 px-4">
            <Button
              onClick={handleProCheckout}
              size="lg"
              className="text-base sm:text-lg px-10 sm:px-14 py-5 sm:py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl min-h-[60px] w-full sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Link href="/demo/board" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-10 sm:px-14 py-5 sm:py-6 rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 min-h-[60px] w-full font-semibold text-gray-700 shadow-sm hover:shadow-md"
              >
                View Live Demo
              </Button>
            </Link>
          </div>

          {/* Founder/PM Testimonials */}
          <div className="max-w-5xl mx-auto mb-8 px-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Testimonial 1 - Indie Maker */}
              <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">M</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Marcus Chen</div>
                    <div className="text-xs text-gray-500">Solo Founder @ TaskFlow</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  "As a solo founder, I was drowning in feedback from 500+ users. SignalsLoop's AI sorted everything overnight. <strong>I saved 12 hours/week</strong> and finally knew what to build next."
                </p>
              </div>

              {/* Testimonial 2 - Product Manager */}
              <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">S</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Sarah Martinez</div>
                    <div className="text-xs text-gray-500">Head of Product @ GrowthLabs</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  "We switched from Canny ($99/mo) to SignalsLoop. <strong>Got better AI features for 1/5th the price.</strong> The priority scoring alone changed how we plan our roadmap."
                </p>
              </div>
            </div>
          </div>
          
          {/* Professional Social Proof */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-6 bg-white rounded-2xl px-8 py-4 shadow-lg border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{String.fromCharCode(64 + i)}</span>
                    </div>
                  ))}
                  <div className="w-9 h-9 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-bold">+</span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-gray-900">100+ Teams</div>
                  <div className="text-xs text-gray-500">Using SignalsLoop</div>
                </div>
              </div>
              <div className="h-10 w-px bg-gray-200"></div>
              <div className="text-left">
                <div className="text-sm font-bold text-gray-900">50,000+ Posts</div>
                <div className="text-xs text-gray-500">AI-Organized</div>
              </div>
              <div className="h-10 w-px bg-gray-200"></div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-1 text-sm font-bold text-gray-900">5.0</span>
              </div>
            </div>
          </div>
          
          {/* Product Screenshot */}
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg h-[600px] relative overflow-hidden">
              {/* Mock Dashboard Interface */}
              <div className="absolute inset-4 bg-white rounded-lg shadow-lg border border-gray-100">
                {/* Header */}
                <div className="h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg flex items-center justify-between px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-blue-600 font-bold text-lg">S</span>
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm">SignalsLoop</span>
                      <div className="text-white/80 text-xs">Feedback Dashboard</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded"></div>
                    <div className="w-6 h-6 bg-white/20 rounded"></div>
                  </div>
                </div>
                
                {/* Content Area */}
                <div className="p-6 h-full">
                  <div className="flex gap-6 h-full">
                    {/* Sidebar */}
                    <div className="w-64 bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="space-y-3">
                        <div className="h-8 bg-blue-100 rounded-lg flex items-center px-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          <span className="text-sm font-medium text-blue-700">Dashboard</span>
                        </div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1">
                      {/* Header Stats - AI Features */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-purple-600">127</div>
                              <div className="text-xs text-purple-600">Auto-Categorized</div>
                            </div>
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">🤖</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-orange-600">8.2</div>
                              <div className="text-xs text-orange-600">Avg Priority</div>
                            </div>
                            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">🎯</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">12</div>
                              <div className="text-xs text-blue-600">Duplicates Found</div>
                            </div>
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">🔍</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Recent Feedback */}
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
                        <div className="flex items-center gap-1 text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></span>
                          AI Active
                        </div>
                      </div>

                      {/* Feedback Cards with AI Features */}
                      <div className="space-y-3">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900 text-sm">Add dark mode support</span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                                  <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                  Feature Request
                                </span>
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                  🎯 High Priority
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">Users want the ability to switch between light and dark themes for better accessibility...</div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>👤 Sarah M.</span>
                                <span>🕒 2 hours ago</span>
                                <span>💬 5 comments</span>
                                <span className="text-purple-600 font-medium">🤖 AI: 8.5 score</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                                <span className="text-blue-600 text-sm">↑</span>
                              </div>
                              <span className="text-sm font-medium text-gray-700">24</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900 text-sm">Fix login button not working</span>
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                  Bug Report
                                </span>
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                  🚨 Critical
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">The login button on the homepage doesn't respond when clicked. Tested on Chrome and Safari...</div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>👤 Mike R.</span>
                                <span>🕒 4 hours ago</span>
                                <span>💬 2 comments</span>
                                <span className="text-purple-600 font-medium">🤖 AI: 9.2 score</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                                <span className="text-blue-600 text-sm">↑</span>
                              </div>
                              <span className="text-sm font-medium text-gray-700">18</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900 text-sm">Improve mobile navigation</span>
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                                  <span className="w-1 h-1 bg-purple-500 rounded-full"></span>
                                  UI/UX
                                </span>
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                  ⭐ Medium
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">The mobile menu could be more intuitive. Consider adding swipe gestures...</div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>👤 Alex T.</span>
                                <span>🕒 6 hours ago</span>
                                <span>💬 0 comments</span>
                                <span className="text-purple-600 font-medium">🤖 AI: 6.8 score</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                                <span className="text-blue-600 text-sm">↑</span>
                              </div>
                              <span className="text-sm font-medium text-gray-700">12</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements - AI Features Showcase */}
              <div className="absolute top-8 right-8 bg-white rounded-lg shadow-lg p-3 border border-purple-200 animate-bounce-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-700 font-medium">🤖 AI Categorizing</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">3 posts auto-categorized</div>
                <div className="text-xs text-purple-600 mt-1 font-medium">99.2% accuracy</div>
              </div>

              <div className="absolute bottom-8 left-8 bg-white rounded-lg shadow-lg p-3 border border-orange-200 animate-float">
                <div className="text-center">
                  <div className="text-xs text-orange-600 font-medium mb-1">🎯 Priority Score</div>
                  <div className="text-xl font-bold text-orange-600">8.5</div>
                  <div className="text-xs text-gray-500">High Priority</div>
                </div>
              </div>

              <div className="absolute top-1/2 right-4 bg-white rounded-lg shadow-lg p-2 border border-blue-200 animate-float-delayed">
                <div className="text-center">
                  <div className="text-xs text-blue-600 font-medium mb-1">🔍 Duplicates</div>
                  <div className="text-lg font-bold text-blue-600">0</div>
                  <div className="text-xs text-gray-500">Found</div>
                </div>
              </div>

              <div className="absolute bottom-24 right-8 bg-white rounded-lg shadow-lg p-2 border border-green-200 animate-bounce-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-700 font-medium">💡 Smart Replies Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emotional Story Arc - PM Pain Point */}
      <section className="py-20 md:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-red-100 text-red-700 border-red-200 text-base px-4 py-2">
              The Feedback Nightmare Every PM Lives
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              It's Monday. You Have 500 Feedback Items.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your CEO wants a roadmap by Friday. Here's how your week actually goes...
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Pain Point 1 */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-l-4 border-red-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📧</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Feedback Is Everywhere</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    47 Slack DMs, 23 support tickets, 15 customer emails, 8 sales call notes. Some urgent, some vague, all scattered across tools you can't search.
                  </p>
                </div>
              </div>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⏰</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Manual Work Eats Your Week</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Reading each item, tagging categories, assigning priorities. 15 hours gone. You're only halfway through, and new feedback keeps coming.
                  </p>
                </div>
              </div>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border-l-4 border-yellow-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔍</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">You're Missing the Pattern</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    "Dark mode" was requested 47 times, but you missed it. Different words ("dark theme," "night mode," "eye-friendly") hid the same need.
                  </p>
                </div>
              </div>
            </div>

            {/* Pain Point 4 */}
            <div className="bg-gradient-to-br from-amber-50 to-red-50 rounded-xl p-6 border-l-4 border-red-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="text-2xl">😤</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Users Feel Ignored</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Sarah submitted feedback 2 months ago. Never got a reply. Didn't know you were building it. She switched to your competitor last week.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* The Kicker */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white text-center mb-8">
            <p className="text-xl md:text-2xl font-bold mb-3">
              Friday arrives. You're exhausted. The roadmap? A guess.
            </p>
            <p className="text-base md:text-lg opacity-90">
              You picked the loudest requests, not the most important ones. Your CEO nods, but you know it's not data-driven—it's survival.
            </p>
          </div>

          {/* Solution Transition */}
          <div className="text-center">
            <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl px-8 md:px-12 py-8 shadow-2xl">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">What If AI Did All of This For You?</h3>
              <p className="text-lg md:text-xl opacity-95 mb-6 max-w-2xl">
                SignalsLoop reads every piece of feedback, categorizes it, finds duplicates, scores priorities, and builds your roadmap—<strong>in seconds, not weeks</strong>.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl">
                  <div className="font-bold mb-1">✓ Auto-Categorized</div>
                  <div className="text-xs opacity-80">Bug/Feature/Request</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl">
                  <div className="font-bold mb-1">✓ Priority Scored</div>
                  <div className="text-xs opacity-80">AI ranks urgency</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl">
                  <div className="font-bold mb-1">✓ Duplicates Merged</div>
                  <div className="text-xs opacity-80">47 "dark modes" → 1</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl">
                  <div className="font-bold mb-1">✓ Users Updated</div>
                  <div className="text-xs opacity-80">Public roadmap</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Comparison Section */}
      <section className="py-16 md:py-20 lg:py-24 px-4 bg-gradient-to-br from-gray-50 to-blue-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100/20 to-blue-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              From Chaos to Clarity in Seconds
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Watch your scattered feedback transform into an actionable roadmap
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
            {/* Before SignalsLoop */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-lg border border-red-100/50">
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-red-600 mb-2">Before SignalsLoop</h3>
                <p className="text-gray-600 text-sm md:text-base">Feedback scattered everywhere</p>
              </div>
              
              <div className="space-y-4">
                {/* Scattered feedback icons */}
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                  <div className="bg-red-100 rounded-lg p-2 md:p-3 flex items-center gap-2">
                    <span className="text-lg md:text-2xl">📧</span>
                    <span className="text-xs md:text-sm text-red-700">Email threads</span>
                  </div>
                  <div className="bg-orange-100 rounded-lg p-2 md:p-3 flex items-center gap-2">
                    <span className="text-lg md:text-2xl">💬</span>
                    <span className="text-xs md:text-sm text-orange-700">Slack messages</span>
                  </div>
                  <div className="bg-yellow-100 rounded-lg p-2 md:p-3 flex items-center gap-2">
                    <span className="text-lg md:text-2xl">📝</span>
                    <span className="text-xs md:text-sm text-yellow-700">Sticky notes</span>
                  </div>
                  <div className="bg-pink-100 rounded-lg p-2 md:p-3 flex items-center gap-2">
                    <span className="text-lg md:text-2xl">🎫</span>
                    <span className="text-xs md:text-sm text-pink-700">Support tickets</span>
                  </div>
                </div>
                
                {/* Visual chaos representation */}
                <div className="bg-gray-100 rounded-lg p-4 md:p-6 mt-4 md:mt-6">
                  <div className="text-center text-gray-500 text-xs md:text-sm mb-3 md:mb-4">Visual Chaos</div>
                  <div className="flex flex-wrap gap-1 md:gap-2 justify-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-red-200 rounded rotate-12"></div>
                    <div className="w-4 h-4 md:w-6 md:h-6 bg-orange-200 rounded-full rotate-45"></div>
                    <div className="w-8 h-3 md:w-10 md:h-4 bg-yellow-200 rounded rotate-6"></div>
                    <div className="w-5 h-5 md:w-7 md:h-7 bg-pink-200 rounded rotate-12"></div>
                    <div className="w-4 h-6 md:w-5 md:h-8 bg-blue-200 rounded rotate-45"></div>
                    <div className="w-7 h-2 md:w-9 md:h-3 bg-green-200 rounded rotate-6"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* After SignalsLoop */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-lg border border-green-100/50">
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-green-600 mb-2">After SignalsLoop</h3>
                <p className="text-gray-600 text-sm md:text-base">AI automatically organizes everything</p>
              </div>

              <div className="space-y-4">
                {/* Organized board interface mockup */}
                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <div className="text-center text-gray-600 text-xs md:text-sm mb-2 md:mb-3 flex items-center justify-center gap-2">
                    <span>Organized Feedback Board</span>
                    <span className="text-purple-600 font-medium">🤖 AI Powered</span>
                  </div>

                  {/* Categories with AI indicators */}
                  <div className="grid grid-cols-2 gap-2 mb-3 md:mb-4">
                    <div className="bg-red-100 rounded-lg p-2 text-center border border-red-200">
                      <div className="text-xs text-red-700 font-medium flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        Bug Reports
                      </div>
                      <div className="text-sm md:text-lg font-bold text-red-600">12</div>
                      <div className="text-xs text-red-600 mt-1">🎯 Avg 9.1</div>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-2 text-center border border-blue-200">
                      <div className="text-xs text-blue-700 font-medium flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        Features
                      </div>
                      <div className="text-sm md:text-lg font-bold text-blue-600">8</div>
                      <div className="text-xs text-blue-600 mt-1">🎯 Avg 7.8</div>
                    </div>
                    <div className="bg-purple-100 rounded-lg p-2 text-center border border-purple-200">
                      <div className="text-xs text-purple-700 font-medium flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                        UI/UX
                      </div>
                      <div className="text-sm md:text-lg font-bold text-purple-600">5</div>
                      <div className="text-xs text-purple-600 mt-1">🎯 Avg 6.5</div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-2 text-center border border-green-200">
                      <div className="text-xs text-green-700 font-medium flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Integrations
                      </div>
                      <div className="text-sm md:text-lg font-bold text-green-600">3</div>
                      <div className="text-xs text-green-600 mt-1">🎯 Avg 8.2</div>
                    </div>
                  </div>

                  {/* AI features active indicators */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-center gap-2 bg-purple-50 rounded-lg p-1.5 border border-purple-100">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-purple-700 font-medium">🤖 Auto-Categorization Active</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 bg-orange-50 rounded-lg p-1.5 border border-orange-100">
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-orange-700 font-medium">🎯 Priority Scoring Active</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 bg-blue-50 rounded-lg p-1.5 border border-blue-100">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-700 font-medium">🔍 Duplicate Detection Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Highlight Section */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-blue-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-purple-100 text-purple-700 border-purple-200">
              🤖 5 Powerful AI Features
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Complete AI-powered feedback intelligence
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From automatic categorization to smart duplicate detection, our AI handles everything so you can focus on building what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-100/50">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">AI Auto-Categorization</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Automatically organizes feedback into 10 SaaS-specific categories. 99.2% accuracy, instant results.</p>
              <div className="mt-3 text-xs text-purple-600 font-medium">Feature Request • Bug Report • UI/UX • Integration</div>
            </div>

            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-orange-100/50">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">AI Priority Scoring</h3>
              <p className="text-sm text-gray-600 leading-relaxed">7-factor business-aware scoring. Knows which feedback matters most to your business goals.</p>
              <div className="mt-3 text-xs text-orange-600 font-medium">Revenue Impact • User Reach • Strategic Alignment</div>
            </div>

            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-100/50">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">AI Duplicate Detection</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Semantic analysis finds similar feedback automatically. Cluster related posts and merge duplicates.</p>
              <div className="mt-3 text-xs text-blue-600 font-medium">Embedding Search • Cluster Analysis • Smart Merging</div>
            </div>

            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-green-100/50">
              <div className="text-5xl mb-4">💡</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">AI Smart Replies</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Context-aware follow-up questions. Get deeper insights from users automatically.</p>
              <div className="mt-3 text-xs text-green-600 font-medium">Category-Specific • Tier-Aware • Engagement Boost</div>
            </div>

            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-indigo-100/50">
              <div className="text-5xl mb-4">✍️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">AI Writing Assistant</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Helps users write better feedback with smart suggestions and clarity improvements.</p>
              <div className="mt-3 text-xs text-indigo-600 font-medium">Title Enhancement • Description Help • Clear Communication</div>
            </div>

            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-pink-100/50 bg-gradient-to-br from-pink-50 to-purple-50">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">AI Cache Manager</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Smart caching reduces API costs by 80%. Lightning-fast responses without sacrificing accuracy.</p>
              <div className="mt-3 text-xs text-pink-600 font-medium">LRU Cache • Cost Optimization • Instant Results</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto border border-purple-200">
              <p className="text-gray-700 font-medium mb-2">🚀 All AI features included in Pro plan</p>
              <p className="text-sm text-gray-600">Unlimited usage • No per-request charges • Full access to all features</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Collaboration Section */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-purple-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
              👥 Team Collaboration
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Work together, ship faster
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Invite your team, assign roles, and collaborate seamlessly. Team members inherit your project's features—no extra cost per user.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-100/50">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Easy Team Invites</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Invite team members via email. Existing users are added instantly, new users receive invitation links.
              </p>
              <div className="mt-3 text-xs text-blue-600 font-medium">Direct Add • Email Invitations • Automatic Setup</div>
            </div>

            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-indigo-100/50">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Role-Based Permissions</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Owner, Admin, and Member roles. Admins can manage everything except deleting the project.
              </p>
              <div className="mt-3 text-xs text-indigo-600 font-medium">Owner Control • Admin Rights • Member Access</div>
            </div>

            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-100/50">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">No Per-User Pricing</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                All team members access your project's features at no extra cost. Scale your team without scaling your bill.
              </p>
              <div className="mt-3 text-xs text-purple-600 font-medium">Unlimited Team Size • Project-Based Billing • Fair Pricing</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto border border-blue-200">
              <p className="text-gray-700 font-medium mb-2">👥 Team features included in all plans</p>
              <p className="text-sm text-gray-600">Pro plans get admin roles, unlimited members, and advanced permissions</p>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION: Urgency-Based Voting */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/20 to-pink-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-orange-100 text-orange-700 border-orange-200">
              🎯 Unique to SignalsLoop
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Not All Feedback is Created Equal
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Unlike basic upvoting, our urgency-based voting reveals what users <em>truly</em> need vs. what they'd <em>like to have</em>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="text-center bg-white/70 backdrop-blur-sm border-red-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🔴</div>
                <h3 className="text-xl font-bold text-red-600 mb-3">Must Have</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Critical features users can't live without. These drive churn if ignored.
                </p>
                <div className="mt-4 text-xs text-red-600 font-medium">
                  "I need this now or I'm switching"
                </div>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/70 backdrop-blur-sm border-orange-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🟡</div>
                <h3 className="text-xl font-bold text-orange-600 mb-3">Important</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Valuable improvements that significantly enhance the product experience.
                </p>
                <div className="mt-4 text-xs text-orange-600 font-medium">
                  "This would make my life easier"
                </div>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/70 backdrop-blur-sm border-green-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🟢</div>
                <h3 className="text-xl font-bold text-green-600 mb-3">Nice to Have</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Cool ideas that add polish but aren't essential to core workflows.
                </p>
                <div className="mt-4 text-xs text-green-600 font-medium">
                  "This would be a nice bonus"
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12 bg-white/70 backdrop-blur-sm rounded-xl p-6 max-w-3xl mx-auto border border-orange-200">
            <h4 className="font-semibold text-gray-900 mb-3">See the Priority Mix at a Glance</h4>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="h-8 rounded-full overflow-hidden flex">
                  <div className="bg-red-500 h-full" style={{width: '35%'}}></div>
                  <div className="bg-orange-500 h-full" style={{width: '45%'}}></div>
                  <div className="bg-green-500 h-full" style={{width: '20%'}}></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>35% Must-Have 🔴</span>
              <span>45% Important 🟡</span>
              <span>20% Nice-to-Have 🟢</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              <strong>Result:</strong> You immediately know where to focus your engineering resources
            </p>
          </div>
        </div>
      </section>

      {/* Results PMs Care About */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-100/20 to-teal-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-green-100 text-green-700 border-green-200">
              ✨ Real Results from Real PMs
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What Changes After Week 1 with SignalsLoop
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These aren't vanity metrics—these are the outcomes that get you promoted.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Result 1 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-green-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">"I walked into the exec meeting with data, not opinions"</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Instead of guessing, Sarah showed her CEO the top 5 features based on urgency votes and AI priority scores. The roadmap was approved in 10 minutes.
                  </p>
                  <div className="text-sm text-green-600 font-medium">Result: Roadmap confidence • Exec trust • Less pushback</div>
                </div>
              </div>
            </div>

            {/* Result 2 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⏰</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">"I got 15 hours back every week"</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Marcus used to spend Monday-Wednesday just reading and tagging feedback. Now AI does it overnight. He spends Mondays planning sprints instead.
                  </p>
                  <div className="text-sm text-blue-600 font-medium">Result: 60 hours/month saved • More time building • Less burnout</div>
                </div>
              </div>
            </div>

            {/* Result 3 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-purple-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📈</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">"Our NPS jumped 12 points in one quarter"</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Users stopped feeling ignored. The public roadmap and changelog showed exactly what was being built. They saw their feedback turn into features.
                  </p>
                  <div className="text-sm text-purple-600 font-medium">Result: Higher NPS • Lower churn • More word-of-mouth</div>
                </div>
              </div>
            </div>

            {/* Result 4 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-orange-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎯</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">"We stopped building features nobody wanted"</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Amy's team was about to spend 6 weeks on a feature only 3 users requested. SignalsLoop showed them 89 users wanted something else. They pivoted.
                  </p>
                  <div className="text-sm text-orange-600 font-medium">Result: Engineering time saved • Better product decisions • Happier users</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 max-w-3xl mx-auto border border-green-200">
              <p className="text-gray-700 text-lg mb-3">
                <strong>The common thread?</strong> Every PM said the same thing:
              </p>
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600">
                "I finally feel in control of our product direction."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-red-100/10 to-orange-100/10"></div>
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Your users have amazing ideas. But they're buried in:
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-100/50">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-bold text-gray-900 mb-2">Endless email threads</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-100/50">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-gray-900 mb-2">Scattered Slack messages</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-100/50">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="font-bold text-gray-900 mb-2">Lost sticky notes</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-red-100/50">
              <div className="text-4xl mb-4">🎫</div>
              <h3 className="font-bold text-gray-900 mb-2">Untagged support tickets</h3>
            </div>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Meanwhile, your team wastes hours manually sorting through it all.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-100/20 to-emerald-100/20"></div>
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            SignalsLoop's AI reads every piece of feedback
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            and automatically organizes it into actionable categories like Bug Reports, Feature Requests, UI Improvements, and more.
          </p>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 max-w-2xl mx-auto border border-green-100/50">
            <div className="text-7xl mb-6">🤖</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Organization</h3>
            <p className="text-gray-600 leading-relaxed">
              No more manual sorting. Every piece of feedback is automatically categorized and ready for your team to act on.
            </p>
          </div>
        </div>
      </section>

      {/* AI Categorization Showcase */}
      <section className="py-16 md:py-20 lg:py-24 px-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/20 to-purple-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Watch AI organize feedback in real-time
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              See how our AI processes and categorizes feedback in real-time
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 md:p-8 shadow-lg border border-purple-100/50">
              {/* Demo Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center">
                {/* Step 1: Feedback Submission */}
                <div className="text-center">
                  <div className="bg-blue-100 rounded-xl p-6 mb-4">
                    <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                    <div className="text-sm text-blue-700 font-medium">User submits feedback</div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 text-left">
                    <div className="text-xs text-gray-600 mb-1">"The login button doesn't work on mobile"</div>
                    <div className="text-xs text-gray-500">Submitted by Sarah M.</div>
                  </div>
                </div>
                
                {/* Step 2: AI Processing */}
                <div className="text-center">
                  <div className="bg-purple-100 rounded-xl p-6 mb-4">
                    <div className="h-12 w-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">🤖</span>
                    </div>
                    <div className="text-sm text-purple-700 font-medium">AI Processing...</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <div className="text-xs text-purple-600 mt-2">Analyzing content...</div>
                  </div>
                </div>
                
                {/* Step 3: Categorized Result */}
                <div className="text-center">
                  <div className="bg-green-100 rounded-xl p-6 mb-4">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <div className="text-sm text-green-700 font-medium">Automatically categorized</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">Bug Report</span>
                    </div>
                    <div className="text-xs text-green-600">Mobile • Authentication • High Priority</div>
                  </div>
                </div>
              </div>
              
              {/* Arrow indicators */}
              <div className="hidden md:flex items-center justify-between mt-6 md:mt-8">
                <div className="flex-1 flex justify-center">
                  <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                </div>
                <div className="flex-1"></div>
              </div>
              
              {/* Mobile arrow indicators */}
              <div className="md:hidden flex flex-col items-center gap-4 mt-6">
                <ArrowRight className="h-5 w-5 text-gray-400 rotate-90" />
                <ArrowRight className="h-5 w-5 text-gray-400 rotate-90" />
              </div>
              
              {/* Additional examples */}
              <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Feature Request</span>
                  </div>
                  <div className="text-sm text-gray-600">"Add dark mode support"</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">UI/UX</span>
                  </div>
                  <div className="text-sm text-gray-600">"Make the navigation more intuitive"</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Enhancement</span>
                  </div>
                  <div className="text-sm text-gray-600">"Improve loading speed"</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer & Integration Hub Section */}
      <section id="features" className="py-20 md:py-24 px-4 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100/20 to-zinc-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-slate-100 text-slate-700 border-slate-200">
              🔌 Developer-Friendly Integrations
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Connect Everything. Export Anywhere.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Integrate with your existing tools in minutes. Get feedback wherever your team works.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Slack Integration */}
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-slate-100/50">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Slack Integration</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Real-time notifications to your Slack channels. Stay updated without switching tools.</p>
              <div className="mt-3 text-xs text-slate-600 font-medium">Instant Setup • Channel Routing • Custom Alerts</div>
            </div>

            {/* Discord Integration */}
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-100/50">
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Discord Integration</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Send feedback updates to Discord servers. Perfect for gaming and community products.</p>
              <div className="mt-3 text-xs text-purple-600 font-medium">Webhook Support • Role Mentions • Rich Embeds</div>
            </div>

            {/* Webhooks */}
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-100/50">
              <div className="text-5xl mb-4">🔔</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Powerful Webhooks</h3>
              <p className="text-sm text-gray-600 leading-relaxed">5 event types to trigger custom workflows. Build your own integrations effortlessly.</p>
              <div className="mt-3 text-xs text-blue-600 font-medium">POST • Comment • Vote • Status Change • New Release</div>
            </div>

            {/* REST API */}
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-green-100/50">
              <div className="text-5xl mb-4">🔑</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">REST API Access</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Full API access with secure API keys. Programmatic control over all features.</p>
              <div className="mt-3 text-xs text-green-600 font-medium">JSON API • Rate Limited • Full CRUD Operations</div>
            </div>

            {/* CSV Import/Export */}
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-orange-100/50">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">CSV Import/Export</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Bulk import feedback or export to Excel. Flexible filtering and column mapping.</p>
              <div className="mt-3 text-xs text-orange-600 font-medium">Excel • CSV • Custom Filters • Date Ranges</div>
            </div>

            {/* Embed Widget */}
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-indigo-100/50">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">1-Line Embed Widget</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Add feedback collection anywhere with one script tag. No backend changes needed.</p>
              <div className="mt-3 text-xs text-indigo-600 font-medium">Copy-Paste • Customizable • Works Everywhere</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto border border-slate-200">
              <p className="text-gray-700 font-medium mb-2">⚡ All integrations available in Pro plan</p>
              <p className="text-sm text-gray-600">No additional charges • Unlimited usage • Full access to API & webhooks</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Collaboration Section */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-100/20 to-sky-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-teal-100 text-teal-700 border-teal-200">
              👥 Built for Teams
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Keep Everyone in the Loop
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From @mentions to email digests, your entire team stays aligned on customer feedback.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* @Mentions */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-teal-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">@</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">@Mentions in Comments</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Tag teammates in discussions. They get instant email notifications and can jump right into context.
                  </p>
                  <div className="text-xs text-teal-600 font-medium">Real-time Notifications • Email Alerts • Context Preservation</div>
                </div>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📧</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Email Notifications</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Get notified about new feedback, comments, status changes, and votes. Fully customizable per team member.
                  </p>
                  <div className="text-xs text-blue-600 font-medium">Per-User Preferences • Digest Mode • Instant Alerts</div>
                </div>
              </div>
            </div>

            {/* Weekly Digest */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Weekly Digest Emails</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Automated weekly summaries of top feedback, trending requests, and priority shifts sent to your inbox.
                  </p>
                  <div className="text-xs text-purple-600 font-medium">Automated Reports • Top Trends • Priority Insights</div>
                </div>
              </div>
            </div>

            {/* Multi-User Boards */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-green-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">👥</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Collaborative Boards</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Multiple team members can manage feedback together. Track who changed what with full activity history.
                  </p>
                  <div className="text-xs text-green-600 font-medium">Team Management • Activity Log • Role Permissions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Widget Demo Section */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-purple-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AI-powered feedback in 2 lines of code
            </h2>
            <p className="text-xl text-gray-600">
              No complex setup. No backend integration. Just copy, paste, and start collecting organized feedback. 2-minute setup, lifetime value.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900 rounded-xl p-4 md:p-8 text-white font-mono text-xs md:text-sm shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <span className="text-green-400 font-medium text-sm">→ Install Widget</span>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto min-h-[44px]"
                  onClick={() => {
                    navigator.clipboard.writeText('<script src="https://signalsloop.com/embed/demo.js"></script>');
                    // You could add a toast notification here
                  }}
                >
                  Copy
                </Button>
              </div>
              <code className="text-gray-300 block break-all text-xs md:text-sm">
                {`<script src="https://signalsloop.com/embed/demo.js"></script>`}
              </code>
            </div>
            
            {/* Widget Preview */}
            <div className="mt-6 md:mt-8 bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-200">
              <div className="text-center mb-4">
                <span className="text-sm text-gray-600 font-medium">Widget Preview</span>
              </div>
              
              {/* Realistic Website Integration */}
              <div className="bg-gray-50 rounded-lg p-3 md:p-4 relative overflow-hidden">
                {/* Browser frame */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Browser header */}
                  <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500 text-center">
                      myapp.com/dashboard
                    </div>
                  </div>
                  
                  {/* Website Content */}
                  <div className="bg-white">
                    {/* App Header */}
                    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs md:text-sm font-bold">M</span>
                        </div>
                        <div>
                          <h1 className="text-base md:text-lg font-semibold text-gray-900">MyApp</h1>
                          <p className="text-xs md:text-sm text-gray-500">Dashboard</p>
                        </div>
                      </div>
                      <nav className="hidden sm:flex gap-4 md:gap-6 text-xs md:text-sm text-gray-600">
                        <span className="hover:text-gray-900 cursor-pointer">Analytics</span>
                        <span className="hover:text-gray-900 cursor-pointer">Users</span>
                        <span className="hover:text-gray-900 cursor-pointer">Settings</span>
                      </nav>
                    </div>
                    
                    {/* Dashboard Content */}
                    <div className="p-4 md:p-6">
                      {/* Welcome Section */}
                      <div className="mb-4 md:mb-6">
                        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Welcome back, Sarah!</h2>
                        <p className="text-sm md:text-base text-gray-600">Here's what's happening with your app today.</p>
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                        <div className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-200">
                          <div className="text-xl md:text-2xl font-bold text-blue-600">1,234</div>
                          <div className="text-xs md:text-sm text-blue-700">Active Users</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 md:p-4 border border-green-200">
                          <div className="text-xl md:text-2xl font-bold text-green-600">$5,678</div>
                          <div className="text-xs md:text-sm text-green-700">Revenue</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 md:p-4 border border-purple-200">
                          <div className="text-xl md:text-2xl font-bold text-purple-600">89</div>
                          <div className="text-xs md:text-sm text-purple-700">New Signups</div>
                        </div>
                      </div>
                      
                      {/* Recent Activity */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-gray-600">New user signed up</span>
                            <span className="text-gray-400">2 min ago</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-gray-600">Payment received</span>
                            <span className="text-gray-400">15 min ago</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <span className="text-gray-600">Feature request submitted</span>
                            <span className="text-gray-400">1 hour ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Widget button - naturally positioned */}
                <div className="absolute bottom-4 right-4">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all duration-200 cursor-pointer">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Feedback</span>
                  </div>
                </div>
                
                {/* Callout annotation */}
                <div className="absolute bottom-12 md:bottom-16 right-1 md:right-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 md:p-3 max-w-40 md:max-w-48">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-900 mb-1">Users click here to submit feedback</div>
                      <div className="text-xs text-gray-600">AI automatically organizes their suggestions</div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 md:w-6 md:h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <ArrowRight className="h-2 w-2 md:h-3 md:w-3 text-blue-600 rotate-45" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Add to any website in 2 minutes</span>
                <p className="text-xs text-gray-500 mt-1">Trusted by startups to enterprise</p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <div className="inline-flex items-center space-x-3 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-gray-200">
                <Zap className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Feedback button appears → Users submit → You see results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION: Public Roadmap & Changelog */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/20 to-cyan-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-indigo-100 text-indigo-700 border-indigo-200 text-base px-4 py-2">
              🗣️ Have Real-Time Conversations with Thousands of Users
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Public Feedback Boards + Shareable Roadmaps
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Give your users a <strong className="text-gray-900">public space to share ideas, vote on features, and track your progress</strong> in real-time. Turn feedback into transparent conversations—not buried support tickets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Public Roadmap */}
            <Card className="bg-white/70 backdrop-blur-sm border-blue-200 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Map className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Public Roadmap</h3>
                    <p className="text-sm text-gray-600">Share your product journey</p>
                  </div>
                </div>

                {/* Mini Kanban Preview */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center">
                    <div className="bg-pink-100 rounded-lg p-2 mb-1">
                      <Lightbulb className="h-4 w-4 text-pink-600 mx-auto" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Ideas</div>
                    <div className="text-lg font-bold text-pink-600">12</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-yellow-100 rounded-lg p-2 mb-1">
                      <Target className="h-4 w-4 text-yellow-600 mx-auto" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Planned</div>
                    <div className="text-lg font-bold text-yellow-600">8</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-orange-100 rounded-lg p-2 mb-1">
                      <Clock className="h-4 w-4 text-orange-600 mx-auto" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Building</div>
                    <div className="text-lg font-bold text-orange-600">5</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-100 rounded-lg p-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Shipped</div>
                    <div className="text-lg font-bold text-green-600">23</div>
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <strong>Embeddable widget</strong> for your site/app
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Users vote with <strong>urgency levels</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Real-time updates & discussions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Beautiful <strong>Kanban roadmap view</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <strong>Custom domain</strong> (your-brand.com/feedback)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Search & filter by category/status
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Public Changelog */}
            <Card className="bg-white/70 backdrop-blur-sm border-purple-200 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Public Changelog</h3>
                    <p className="text-sm text-gray-600">Celebrate your wins</p>
                  </div>
                </div>

                {/* Sample Changelog Entry */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 mb-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      New Feature
                    </Badge>
                    <Badge variant="outline" className="text-xs">v2.1.0</Badge>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">AI Duplicate Detection</h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Our AI now automatically finds and merges duplicate feedback using semantic analysis.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>Released 2 days ago</span>
                    <span>•</span>
                    <span>🎉 Based on 12 user requests</span>
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Version tracking & categorization
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Link to original feature requests
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    RSS feed for subscribers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Email notifications (coming soon)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-10">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 max-w-3xl mx-auto mb-6">
              <p className="text-base font-bold text-gray-900 mb-2">
                💬 This Is How You Talk to Thousands of Users at Scale
              </p>
              <p className="text-sm text-gray-700">
                Public boards = transparent conversations. AI = automatic organization. Roadmap = show progress. Users feel heard, you build what matters.
              </p>
            </div>
            <Link href="/demo/board">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                <ExternalLink className="h-5 w-5 mr-2" />
                See Live Public Board & Roadmap
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 lg:py-32 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200 text-sm">
              💎 Simple, Transparent Pricing
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Effortlessly affordable pricing that scales with you
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 px-4 mb-6">
              Start free forever. Upgrade for advanced AI features starting at $19/month. No setup fees or commitments.
            </p>
            
            {/* Pricing Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100">
                <span className="text-green-500">🔒</span>
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100">
                <span className="text-blue-500">💳</span>
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100">
                <span className="text-purple-500">🔄</span>
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100">
                <span className="text-green-600">✓</span>
                <span>API & Webhooks</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100">
                <span className="text-indigo-600">✓</span>
                <span>SSL Encrypted</span>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center space-x-4 bg-gray-100 p-1 rounded-lg">
              <span className={`px-4 py-2 text-sm font-medium transition-colors ${!isAnnual ? 'text-white bg-blue-600 rounded-md' : 'text-gray-600'}`}>
                Monthly
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-green-600"
              />
              <span className={`px-4 py-2 text-sm font-medium transition-colors ${isAnnual ? 'text-white bg-green-600 rounded-md' : 'text-gray-600'}`}>
                Annual <span className="text-xs">(20% off)</span>
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm rounded-xl">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold">Free Forever</CardTitle>
                <div className="text-4xl font-bold text-gray-900 my-6">$0</div>
                <CardDescription className="text-gray-600">Experience AI-powered feedback management risk-free</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4 border-2 border-green-300">
                  <p className="text-sm font-bold text-green-700 text-center">🤖 Try All 5 AI Features FREE</p>
                  <p className="text-xs text-green-600 text-center mt-1">10 AI requests/day • Test drive before upgrading</p>
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-gray-700 text-center">
                      <strong>Experience the AI magic.</strong> Upgrade to unlimited when you're ready.
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {[
                    "1 feedback board",
                    "50 posts maximum",
                    "Basic team collaboration",
                    "🤖 AI Auto-Categorization (10/day)",
                    "🎯 AI Priority Scoring (10/day)",
                    "🔍 AI Duplicate Detection (10/day)",
                    "💬 AI Smart Replies (10/day)",
                    "✍️ AI Writing Assistant (10/day)",
                    "Public boards only",
                    "Community support",
                    "SignalsLoop branding"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/login" className="block">
                    <Button className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200">
                      🚀 Start Free • Try AI Now
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-600 mt-3 text-center font-medium">
                    No credit card • No time limit • Upgrade only when you love it
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm rounded-xl relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full">
                Most Popular
              </Badge>
              <Badge className="absolute -top-3 right-4 bg-purple-600 text-white px-3 py-1 rounded-full">
                🤖 Powered by AI
              </Badge>
              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-2xl font-bold">Pro</CardTitle>
                <div className="text-4xl font-bold text-gray-900 my-6">
                  {isAnnual ? (
                    <>
                      $15.20<span className="text-lg text-gray-500">/month</span>
                      <div className="text-sm text-green-600 font-medium mt-1">
                        Billed annually ($182.40/year) • Save 20%
                      </div>
                    </>
                  ) : (
                    <>
                      $19<span className="text-lg text-gray-500">/month</span>
                      <div className="text-sm text-blue-600 font-medium mt-1">
                        Cancel anytime • No commitments
                      </div>
                    </>
                  )}
                </div>
                <CardDescription className="text-gray-600">For growing teams • Start free, upgrade when ready</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="bg-purple-50 rounded-lg p-3 mb-4 border border-purple-200">
                  <p className="text-sm font-bold text-purple-700 text-center">⚡ Unlimited AI Requests</p>
                  <p className="text-xs text-purple-600 text-center mt-1">No per-request charges • No usage limits</p>
                </div>
                <ul className="space-y-3">
                  {[
                    "Unlimited boards",
                    "Unlimited posts",
                    "Private boards",
                    "👥 Team collaboration & roles",
                    "🔐 Admin & member permissions",
                    "📧 Team invitations & management",
                    "🤖 AI Smart Categorization (Unlimited)",
                    "🔍 AI Duplicate Detection (Unlimited)",
                    "🎯 AI Priority Scoring (Unlimited)",
                    "💬 AI Smart Replies (Unlimited)",
                    "✍️ AI Writing Assistant (Unlimited)",
                    "Custom domain (white-label)",
                    "Remove branding",
                    "Slack & Discord integration",
                    "Webhooks & API access",
                    "CSV Import/Export",
                    "Email notifications & digests",
                    "Priority email support"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <GradientButton 
                  className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl py-4"
                  onClick={handleProCheckout}
                >
                  🚀 Start Free - Upgrade Anytime
                </GradientButton>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Competitive Comparison */}
      <section className="py-20 md:py-24 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-red-100 text-red-700 border-red-200 text-base px-4 py-2">
              ⚡ Your Competitors Are Already Using AI. Are You?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Stop Paying $3,000+/Year for <span className="line-through text-gray-400">Legacy Tools</span><br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Get State-of-the-Art AI for $19/Month</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              While Canny, ProductBoard, and Aha! charge $99-$295/month and <strong className="text-red-600">still don't have AI auto-categorization</strong>, you get <strong className="text-green-600">5 cutting-edge AI features</strong> at 80% less cost.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-yellow-100 border-2 border-yellow-400 rounded-lg px-6 py-3">
              <span className="text-2xl">⏰</span>
              <p className="text-sm font-bold text-gray-900">Over 200 teams switched this month. Don't get left behind.</p>
            </div>
          </div>

          {/* AI Features Callout Box */}
          <div className="mb-8 bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">🤖 AI Features Comparison: The Game Has Changed</h3>
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="font-bold text-gray-400 mb-2">Canny</div>
                <div className="text-3xl font-bold text-red-600">0</div>
                <div className="text-xs text-gray-500">AI Features</div>
              </div>
              <div>
                <div className="font-bold text-gray-400 mb-2">ProductBoard</div>
                <div className="text-3xl font-bold text-yellow-600">~1</div>
                <div className="text-xs text-gray-500">Basic AI only</div>
              </div>
              <div>
                <div className="font-bold text-gray-400 mb-2">Aha! Ideas</div>
                <div className="text-3xl font-bold text-yellow-600">~1</div>
                <div className="text-xs text-gray-500">Limited AI</div>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-blue-500 rounded-lg p-4 -m-2">
                <div className="font-bold text-white mb-2">SignalsLoop</div>
                <div className="text-4xl font-bold text-white">5</div>
                <div className="text-xs text-white font-bold">Full AI Suite ✨</div>
              </div>
            </div>
            <p className="text-center mt-4 text-sm text-gray-700">
              <strong className="text-purple-700">SignalsLoop has more AI features than all competitors combined.</strong> And costs 80% less.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Canny */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 opacity-75">
              <div className="text-center mb-4">
                <div className="text-xl font-bold text-gray-400 mb-2">Canny</div>
                <div className="text-3xl font-bold text-red-600">$99</div>
                <div className="text-xs text-gray-500">/month (Pro)</div>
                <div className="mt-2 text-xs font-bold text-red-600">= $1,188/year</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI priority scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI duplicate detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI smart replies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI writing assistant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-600">Roadmap</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-600">Integrations</span>
                </li>
              </ul>
            </div>

            {/* ProductBoard */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 opacity-75">
              <div className="text-center mb-4">
                <div className="text-xl font-bold text-gray-400 mb-2">ProductBoard</div>
                <div className="text-3xl font-bold text-red-600">$59</div>
                <div className="text-xs text-gray-500">/user/month</div>
                <div className="mt-2 text-xs font-bold text-red-600">= $3,540/year (5 users)</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 text-sm">~</span>
                  <span className="text-gray-600">Basic AI insights only</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">Auto-categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI priority scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI duplicate detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600">Too complex for small teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-600">Portal customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm">⚠</span>
                  <span className="text-gray-600 font-bold">Per-user pricing kills budget</span>
                </li>
              </ul>
            </div>

            {/* Aha! Ideas */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 opacity-75">
              <div className="text-center mb-4">
                <div className="text-xl font-bold text-gray-400 mb-2">Aha! Ideas</div>
                <div className="text-3xl font-bold text-red-600">$59</div>
                <div className="text-xs text-gray-500">/user/month</div>
                <div className="mt-2 text-xs font-bold text-red-600">= $2,124/year (3 users)</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 text-sm">~</span>
                  <span className="text-gray-600">Very limited AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI auto-categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI priority scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 line-through">AI duplicate detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-600">Ideas portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-600">Voting system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm">⚠</span>
                  <span className="text-gray-600 font-bold">Expensive per-user model</span>
                </li>
              </ul>
            </div>

            {/* SignalsLoop */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 shadow-xl border-4 border-green-400 relative transform scale-105">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                🚀 AI-Powered Winner
              </Badge>
              <div className="text-center mb-4 mt-2">
                <div className="text-xl font-bold text-blue-600 mb-2">SignalsLoop</div>
                <div className="text-4xl font-bold text-green-600">$19</div>
                <div className="text-xs text-gray-600">/month (unlimited users)</div>
                <div className="mt-2 text-xs font-bold text-green-600">= Only $228/year</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 font-bold">🤖 AI Auto-Categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 font-bold">🎯 AI Priority Scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 font-bold">🔍 AI Duplicate Detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 font-bold">💬 AI Smart Replies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 font-bold">✍️ AI Writing Assistant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 font-medium">Slack, Discord, Webhooks, API</span>
                </li>
                <li className="flex items-start gap-2 bg-yellow-100 -mx-2 px-2 py-1 rounded">
                  <span className="text-blue-500 text-sm font-bold">★</span>
                  <span className="text-blue-700 font-bold">FREE PLAN WITH AI!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Dramatic Savings Section with FOMO */}
          <div className="mt-10 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 shadow-xl border-2 border-green-300">
            <div className="text-center mb-6">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                💰 Your Team Could Save Thousands This Year
              </h3>
              <p className="text-base text-gray-700">
                Same features (actually, <strong className="text-green-700">way better with AI</strong>). Fraction of the price.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
              <div className="bg-white rounded-xl p-6 shadow-md border-2 border-green-200">
                <div className="text-sm font-bold text-gray-600 mb-2">vs Canny Pro</div>
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">$960</div>
                <div className="text-xs text-gray-600">saved per year</div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-700">
                    <strong>But Canny has ZERO AI features.</strong><br />
                    You're paying $1,188/year for manual work.
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border-2 border-green-200">
                <div className="text-sm font-bold text-gray-600 mb-2">vs ProductBoard (5 users)</div>
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">$3,312</div>
                <div className="text-xs text-gray-600">saved per year</div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-700">
                    <strong>93% cheaper!</strong><br />
                    Their "basic AI" can't auto-categorize feedback.
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border-2 border-green-200">
                <div className="text-sm font-bold text-gray-600 mb-2">vs Aha! Ideas (3 users)</div>
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">$1,536</div>
                <div className="text-xs text-gray-600">saved per year</div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-700">
                    <strong>89% cheaper!</strong><br />
                    Limited AI. Per-user pricing adds up fast.
                  </div>
                </div>
              </div>
            </div>

            {/* The Kicker - What You Get */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl p-6">
              <div className="text-center">
                <h4 className="text-xl font-bold mb-3">🎯 Here's What Makes This a No-Brainer:</h4>
                <div className="grid md:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <div className="font-bold text-lg">5 AI Features They Don't Have</div>
                      <div className="text-sm opacity-90">Auto-categorization, priority scoring, duplicate detection, smart replies, writing assistant</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <div className="font-bold text-lg">80-93% Lower Cost</div>
                      <div className="text-sm opacity-90">Flat $19/month. No per-user fees. No surprise charges.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <div className="font-bold text-lg">Free Plan with AI Included</div>
                      <div className="text-sm opacity-90">Try all 5 AI features for free. Forever. No credit card.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <div className="font-bold text-lg">Start Saving in 5 Minutes</div>
                      <div className="text-sm opacity-90">Import your feedback via CSV. AI sorts it instantly.</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/30">
                  <p className="text-lg font-bold">
                    Your competitors are already automating feedback with AI.
                  </p>
                  <p className="text-base opacity-90 mt-2">
                    Every week you wait, you're burning hours on manual categorization and missing what customers <em>actually</em> want.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 lg:py-32 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Ready to effortlessly organize feedback with AI?
          </h2>
          <p className="text-lg sm:text-xl mb-6 opacity-90 px-4">
            Join 100+ teams already saving 15+ hours per week with AI-powered feedback organization
          </p>
          
          {/* Enhanced Trust/Urgency Combo */}
          <div className="mb-8">
            <Badge className="bg-white text-blue-600 text-base md:text-lg px-4 py-2 mb-4">
              ✨ Free AI categorization for early adopters
            </Badge>
            
            {/* Trust indicators under badge */}
            <div className="flex flex-wrap justify-center gap-4 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <span className="text-green-300">✓</span>
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-300">✓</span>
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-300">✓</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleProCheckout}
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 text-base md:text-lg px-6 md:px-10 py-3 md:py-4 font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[44px]"
          >
            🚀 Get Started in 2 Minutes
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
        </div>
      </section>

      {/* Credibility Section */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built with enterprise-grade security
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your data is protected with industry-leading security standards and enterprise-grade infrastructure.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="font-semibold text-gray-900 mb-2">SSL Encrypted</h3>
              <p className="text-sm text-gray-600">End-to-end security</p>
            </div>

            <div className="text-center bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure by Default</h3>
              <p className="text-sm text-gray-600">API keys & authentication</p>
            </div>

            <div className="text-center bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-2">Slack & Discord</h3>
              <p className="text-sm text-gray-600">Team integrations ready</p>
            </div>

            <div className="text-center bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">CSV Export</h3>
              <p className="text-sm text-gray-600">Own your data</p>
            </div>
          </div>
          
          {/* Technology Stack */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Built with modern, secure technology stack:</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                AWS Infrastructure
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                Supabase Database
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                Next.js Framework
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                TypeScript
              </Badge>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                Enterprise AI
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 md:py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-xl font-bold">SignalsLoop</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/demo/board" className="hover:text-white transition-colors">Demo</Link></li>
                <li><Link href="/docs/api" className="hover:text-white transition-colors">API Documentation</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              </ul>
            </div>
            
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SignalsLoop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
