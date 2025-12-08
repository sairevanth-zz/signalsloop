'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
// import { GradientButton } from '@/components/ui/gradient-button';
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
  ChevronDown,
  ExternalLink,
  Users,
  Shield,
  Mail,
  UserPlus,
  Flame
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 rounded-lg shadow-sm mb-4" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 safe-top shadow-sm">
        <div className="container mx-auto px-4 py-4 md:py-5">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center space-x-3 min-touch-target tap-highlight-transparent group">
              <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex-shrink-0 shadow-soft group-hover:scale-105 transition-transform" />
              <span className="font-body text-lg md:text-2xl font-display font-bold text-gray-900 hidden xs:inline">SignalsLoop</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 font-body text-sm text-gray-700 whitespace-nowrap">
              <Link href="#features" className="hover:text-cyan-500 transition-colors min-touch-target font-medium">
                Features
              </Link>
              <Link href="#pricing" className="hover:text-cyan-500 transition-colors min-touch-target font-medium">
                Pricing
              </Link>
              <Link href="/demo/board" className="text-cyan-500 hover:text-cyan-500 font-semibold transition-colors flex items-center gap-1 min-touch-target whitespace-nowrap">
                <span className="font-body text-base">✨</span> Demo
              </Link>
              <Link href="/demo/competitive-intel" className="hover:text-cyan-500 transition-colors min-touch-target font-medium">
                Competitive Intel
              </Link>
              <Link href="/demo/feedback" className="hover:text-cyan-500 transition-colors min-touch-target font-medium">
                Feedback Analysis
              </Link>
              <Link href="/demo/roast" className="hover:text-cyan-500 transition-colors min-touch-target font-medium flex items-center gap-1">
                Roast My Roadmap <Flame className="w-4 h-4 text-orange-500" />
              </Link>
              <Link href="/demo/spec" className="hover:text-cyan-500 transition-colors min-touch-target font-medium flex items-center gap-1">
                Spec Gen ⚡
              </Link>
              <Link href="/demo/health-score" className="hover:text-cyan-500 transition-colors min-touch-target font-medium flex items-center gap-1">
                Health Score 💚
              </Link>
              <span className="hidden xl:inline-block h-4 w-px bg-gray-200"></span>
              <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                <span className="text-emerald-500">🔒</span>
                <span>SSL Encrypted</span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                <span className="text-cyan-400">⚡</span>
                <span>5 AI Features</span>
              </span>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/demo/board" className="lg:hidden">
                <Button
                  variant="outline"
                  className="font-body text-sm md:text-base min-touch-target px-4 md:px-5 tap-highlight-transparent rounded-full border-2 border-cyan-400 text-cyan-600 hover:bg-cyan-50 hover-bounce"
                >
                  Demo
                </Button>
              </Link>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" className="font-body text-sm md:text-base min-touch-target px-4 md:px-5 tap-highlight-transparent hover:text-cyan-500 rounded-full">
                  Sign In
                </Button>
              </Link>
              <Button
                onClick={() => handleProCheckout()}
                className="gradient-cyan-purple text-white font-body font-semibold rounded-3xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-multi hover:shadow-cyan px-4 sm:px-7 md:px-9 text-xs sm:text-sm md:text-base min-touch-target tap-highlight-transparent whitespace-nowrap"
              >
                Start Free
              </Button>
            </div>
          </div>
        </div>
      </header >

      {/* Hero Section */}
      < section className="py-24 md:py-32 lg:py-40 px-4 relative overflow-hidden bg-gradient-to-b from-white via-cyan-50/30 to-white" >
        {/* Animated gradient background */}
        < div className="absolute inset-0 gradient-shift-bg opacity-40" style={{
          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(14, 165, 233, 0.1) 25%, rgba(147, 51, 234, 0.08) 50%, rgba(0, 217, 255, 0.12) 75%, rgba(14, 165, 233, 0.15) 100%)'
        }
        }></div >

        {/* Grid pattern background */}
        < div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `linear-gradient(rgba(0, 217, 255, 0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0, 217, 255, 0.5) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div >

        {/* DRAMATIC Gradient orbs - Balanced on both sides */}
        < div className="absolute top-[15%] -left-[5%] w-[600px] h-[600px] bg-gradient-to-br from-cyan-400/30 to-purple-500/20 rounded-full blur-3xl animate-float pulse-glow-vibrant" ></div >
        <div className="absolute top-[20%] -right-[5%] w-[650px] h-[650px] bg-gradient-to-br from-sky-400/28 to-cyan-500/22 rounded-full blur-3xl animate-float pulse-glow-vibrant" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[10%] -left-[5%] w-[700px] h-[700px] bg-gradient-to-br from-purple-400/25 to-pink-500/18 rounded-full blur-3xl animate-float scale-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-[15%] -right-[5%] w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/26 to-blue-500/20 rounded-full blur-3xl animate-float pulse-glow-vibrant" style={{ animationDelay: '5s' }}></div>
        <div className="absolute top-[50%] left-[50%] w-[500px] h-[500px] bg-gradient-to-br from-purple-400/15 to-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '6s' }}></div>

        {/* Particle System - Subtle glowing particles */}
        <div className="absolute top-[20%] left-[15%] w-3 h-3 bg-cyan-400 rounded-full blur-sm particle-float opacity-40"></div>
        <div className="absolute top-[30%] right-[20%] w-2 h-2 bg-sky-400 rounded-full blur-sm particle-float opacity-30" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[25%] left-[25%] w-2.5 h-2.5 bg-purple-400 rounded-full blur-sm particle-float opacity-25" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[60%] right-[30%] w-2 h-2 bg-cyan-300 rounded-full blur-sm particle-float opacity-30" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-[40%] left-[40%] w-3 h-3 bg-sky-300 rounded-full blur-sm particle-float opacity-28" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-[45%] left-[10%] w-2 h-2 bg-cyan-400 rounded-full blur-sm particle-float opacity-35" style={{ animationDelay: '5s' }}></div>

        {/* Spinning accent rings - subtle */}
        <div className="absolute top-[25%] left-[20%] w-32 h-32 border-2 border-cyan-300/20 rounded-full spin-slow hidden lg:block"></div>
        <div className="absolute bottom-[30%] right-[18%] w-40 h-40 border-2 border-purple-300/15 rounded-full spin-slow hidden lg:block" style={{ animationDelay: '5s', animationDuration: '25s' }}></div>

        <div className="relative z-10">
          <div className="container mx-auto text-center max-w-6xl">

            {/* Single focused badge */}
            <div className="mb-8 flex items-center justify-center gap-3 animate-fade-in">
              <Badge className="gradient-cyan-purple text-white border-0 font-body font-semibold text-sm px-4 py-2 rounded-full shadow-depth-md hover:shadow-depth-lg transition-all hover:scale-105">
                <span className="inline-block mr-1.5">🚀</span> 5 AI Models • Auto-Categorize • Prioritize • Build Roadmaps
              </Badge>
            </div>

            {/* Simplified trust indicators */}
            <div className="flex flex-wrap justify-center gap-2 mb-10 text-xs font-medium">
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full shadow-depth-sm border border-gray-100">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                <span>Free Forever Plan</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full shadow-depth-sm border border-gray-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>$19/mo vs $99-299/mo</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full shadow-depth-sm border border-gray-100">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                <span>2-Minute Setup</span>
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display text-gray-900 mb-8 leading-tight animate-fade-in px-4">
              The AI Product Intelligence<br className="hidden sm:block" />
              <span className="relative inline-block bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 bg-clip-text text-transparent">
                Platform That Builds Your<br className="hidden sm:block" />
                Roadmap for You.
              </span>
            </h1>

            <p className="font-body-relaxed text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto px-4">
              Connect with thousands of customers through public boards. AI reads every conversation, identifies patterns, prioritizes opportunities, and generates a <strong className="text-gray-900">data-driven roadmap—automatically.</strong>
            </p>

            <p className="font-body text-base text-gray-500 mb-12 max-w-2xl mx-auto px-4">
              Powered by 5 proprietary AI models for categorization, priority scoring, duplicate detection, smart replies, and intelligent writing assistance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 px-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition duration-300 animate-pulse-slow" style={{
                  boxShadow: '0 0 60px rgba(0, 217, 255, 0.4), 0 0 100px rgba(0, 217, 255, 0.2)'
                }}></div>
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 to-sky-400 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                <Button
                  onClick={() => handleProCheckout()}
                  size="lg"
                  className="relative btn-primary-glow font-body text-lg px-12 py-6 text-white font-bold rounded-2xl min-h-[64px] w-full sm:w-auto hover:scale-105 transition-all duration-300"
                >
                  Get Started Free 🚀
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <Link href="/demo/board" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-body text-lg px-12 py-6 rounded-2xl border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50/50 transition-all duration-200 min-h-[64px] w-full font-semibold text-gray-700 hover:text-cyan-600 shadow-depth-sm hover:shadow-depth-md"
                >
                  View Live Demo 👀
                </Button>
              </Link>
            </div>

            {/* Trust Signals - Clean and Minimal */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-12 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-500" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-500" />
                <span>2-min setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-500" />
                <span>Free forever</span>
              </div>
            </div>

            {/* Founder/PM Testimonials - Professional & Refined */}
            <div className="max-w-5xl mx-auto mb-8 px-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Testimonial 1 - Indie Maker */}
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-depth-lg border border-gray-100 hover:shadow-depth-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 gradient-cyan-purple rounded-full flex items-center justify-center shadow-depth-sm">
                      <span className="text-white text-lg font-bold">V</span>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Vipin</div>
                      <div className="text-xs text-gray-500 font-medium">Solo Founder @ Apex Cloud Hub</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 font-body-relaxed leading-relaxed">
                    "As a solo founder, I was drowning in feedback from 500+ users. SignalsLoop's AI sorted everything overnight. <strong className="text-gray-900">I saved 12 hours/week</strong> and finally knew what to build next."
                  </p>
                </div>

                {/* Testimonial 2 - Product Manager */}
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-depth-lg border border-gray-100 hover:shadow-depth-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-depth-sm">
                      <span className="text-white text-lg font-bold">S</span>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Srini</div>
                      <div className="text-xs text-gray-500 font-medium">Head of Product @ Sanjeevani</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 font-body-relaxed leading-relaxed">
                    "We switched from a legacy tool (~$99/mo) to SignalsLoop. <strong className="text-gray-900">Got better AI features for 1/5th the price.</strong> The priority scoring alone changed how we plan our roadmap."
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Social Proof */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-6 bg-white rounded-3xl px-8 py-4 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-9 h-9 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{String.fromCharCode(64 + i)}</span>
                      </div>
                    ))}
                    <div className="w-9 h-9 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-gray-700 text-sm font-bold">+</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-gray-900">Product Teams</div>
                    <div className="text-xs text-gray-500">Building with SignalsLoop</div>
                  </div>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="text-left">
                  <div className="text-sm font-bold text-gray-900">AI Priorities</div>
                  <div className="text-xs text-gray-500">Refreshed daily</div>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-1 text-sm font-bold text-gray-900">5.0</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-12 text-xs text-gray-700">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                <Shield className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">SSL Encrypted</div>
                  <div className="text-xs">256-bit Security</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">GDPR Compliant</div>
                  <div className="text-xs">Data Protected</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                <Zap className="h-5 w-5 text-yellow-500" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">99.9% Uptime</div>
                  <div className="text-xs">Always Available</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                <Users className="h-5 w-5 text-cyan-400" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Customer-Driven Teams</div>
                  <div className="text-xs">Guiding the roadmap</div>
                </div>
              </div>
            </div>

            {/* Product Hunt Badge */}
            <div className="flex justify-center mb-12">
              <a
                href="https://www.producthunt.com/products/signalsloop?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-signalsloop"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1034282&theme=light&t=1762334865008"
                  alt="SignalsLoop - AI feedback management that auto-prioritizes your roadmap | Product Hunt"
                  className="h-14 w-auto"
                />
              </a>
            </div>

            {/* Product Screenshot */}
            <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-6 max-w-6xl mx-auto border border-white/60">
              <div className="relative w-full overflow-hidden rounded-3xl" style={{ paddingTop: '62.5%' }}>
                <iframe
                  title="SignalsLoop interactive demo"
                  src="https://app.supademo.com/embed/cmhkamr7w17c3u1hmtosgmqp0?embed=1"
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="flex justify-center mt-16 pb-8">
            <div className="scroll-indicator flex flex-col items-center gap-2 text-gray-400 hover:text-cyan-500 transition-colors cursor-pointer">
              <span className="text-xs font-medium uppercase tracking-wider">Scroll to Explore</span>
              <ChevronDown className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section >

      {/* Solo Founders & Indie Makers Section */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>

        {/* Floating decorative elements */}
        <div className="absolute top-20 right-10 w-16 h-16 border-2 border-cyan-300/30 rounded-full geometric-float"></div>
        <div className="absolute bottom-20 left-10 w-20 h-20 border-2 border-sky-300/25 rotate-45 geometric-float-reverse"></div>
        <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-cyan-400/10 rounded-lg geometric-float" style={{ animationDelay: '2s' }}></div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-cyan-100 text-cyan-600 border-cyan-200 text-base px-5 py-2">
              🚀 Built for Bootstrappers
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-gray-900 mb-6">
              Public feedback is your superpower.<br />
              <span className="text-pink-600 font-display">But legacy tools want ~$99-$300/month.</span>
            </h2>
            <p className="font-body-relaxed text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto">
              You're a <strong className="text-gray-900">solo founder</strong>, <strong className="text-gray-900">indie maker</strong>, or <strong className="text-gray-900">early-stage startup</strong>. Public feedback boards help you validate ideas and build what users actually want—but traditional feedback tools price you out with per-user fees and enterprise pricing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="card-glow border border-red-200">
              <div className="text-4xl mb-3">💸</div>
              <h3 className="font-body font-bold text-gray-900">Legacy Tools</h3>
              <div className="text-2xl font-bold text-red-600 mb-2">$79-299/mo</div>
              <p className="text-gray-700">Entry-level plans from established platforms. Many require annual contracts and setup fees.</p>
            </div>

            <div className="card-glow border border-red-200">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-body font-bold text-gray-900">Per-User Pricing</h3>
              <div className="text-2xl font-bold text-red-600 mb-2">$30-100/user</div>
              <p className="text-gray-700">Most tools charge per user. A team of 5 can easily cost $500+/month.</p>
            </div>

            <div className="card-glow border border-red-200">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-body font-bold text-gray-900">Limited AI</h3>
              <div className="text-2xl font-bold text-red-600 mb-2">Extra $$</div>
              <p className="text-gray-700">AI features often cost extra or require enterprise plans. Pay-per-request adds up fast.</p>
            </div>
          </div>

          <div className="bg-green-50 rounded-3xl p-8 md:p-12 shadow-xl border-2 border-green-200">
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                SignalsLoop: Enterprise AI at Indie Prices
              </h3>
              <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto mb-6">
                We believe every founder deserves powerful feedback tools. That's why SignalsLoop starts at <strong className="text-green-700">$0</strong> (forever free) and scales to just <strong className="text-green-700">$19/month</strong> for unlimited everything.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-subtle">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  What You Get (Free Forever)
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span><strong>Public feedback board</strong> - Collect unlimited ideas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span><strong>5 AI features</strong> - 10 requests/day to test everything</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span><strong>Team collaboration</strong> - Invite teammates at no cost</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span><strong>Roadmap & changelog</strong> - Keep users informed</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-3xl p-6 border-2 border-cyan-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-500" />
                  Upgrade to Pro ($19/mo)
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">★</span>
                    <span><strong>Unlimited AI</strong> - No daily limits, no per-request fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">★</span>
                    <span><strong>Private boards</strong> - Internal team discussions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">★</span>
                    <span><strong>Custom domain</strong> - feedback.yourdomain.com</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">★</span>
                    <span><strong>Unlimited team</strong> - No per-user pricing ever</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center mt-8">
              <div className="inline-flex items-center gap-3 bg-white/80 rounded-full px-6 py-3 shadow-md">
                <span className="text-2xl font-bold text-green-600">$19/mo</span>
                <span className="text-gray-400">vs</span>
                <span className="font-body text-xl text-gray-500 line-through">$79-299/mo</span>
                <Badge className="bg-green-600 text-white">Save up to 93%</Badge>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-700 text-lg mb-6">
              No setup fees. No contracts. No per-user charges. <strong>Just honest pricing for indie makers.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="gradient-cyan-purple hover:bg-blue-700 text-white font-bold px-8 py-6 rounded-3xl shadow-lg hover:shadow-xl transition-all">
                  Start Free Forever
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo/board">
                <Button size="lg" variant="outline" className="border-2 border-gray-300 hover:border-gray-400 px-8 py-6 rounded-3xl font-semibold">
                  See Live Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section >

      {/* Emotional Story Arc - PM Pain Point */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="relative z-10">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-red-100 text-red-700 border-red-200 text-base px-4 py-2">
                The Feedback Nightmare Every PM Lives
              </Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
                It's Monday. You Have 500 Feedback Items.
              </h2>
              <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto">
                Your CEO wants a roadmap by Friday. Here's how your week actually goes...
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {/* Pain Point 1 */}
              <div className="bg-red-50 rounded-3xl p-6 border-l-4 border-red-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📧</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Feedback Is Everywhere</h3>
                    <p className="text-gray-700 font-body-relaxed">
                      47 Slack DMs, 23 support tickets, 15 customer emails, 8 sales call notes. Some urgent, some vague, all scattered across tools you can't search.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pain Point 2 */}
              <div className="bg-orange-50 rounded-3xl p-6 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⏰</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Manual Work Eats Your Week</h3>
                    <p className="text-gray-700 font-body-relaxed">
                      Reading each item, tagging categories, assigning priorities. 15 hours gone. You're only halfway through, and new feedback keeps coming.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pain Point 3 */}
              <div className="bg-yellow-50 rounded-3xl p-6 border-l-4 border-yellow-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔍</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">You're Missing the Pattern</h3>
                    <p className="text-gray-700 font-body-relaxed">
                      "Dark mode" was requested 47 times, but you missed it. Different words ("dark theme," "night mode," "eye-friendly") hid the same need.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pain Point 4 */}
              <div className="bg-amber-50 rounded-3xl p-6 border-l-4 border-red-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">😤</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Users Feel Ignored</h3>
                    <p className="text-gray-700 font-body-relaxed">
                      Srini submitted feedback 2 months ago. Never got a reply. Didn't know you were building it. They switched to your competitor last week.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* The Kicker */}
            <div className="bg-gray-900 rounded-3xl p-8 text-white text-center mb-8">
              <p className="font-body text-xl md:text-2xl font-bold mb-3">
                Friday arrives. You're exhausted. The roadmap? A guess.
              </p>
              <p className="font-body text-base md:text-lg opacity-90">
                You picked the loudest requests, not the most important ones. Your CEO nods, but you know it's not data-driven—it's survival.
              </p>
            </div>

            {/* Solution Transition */}
            <div className="text-center">
              <div className="inline-block gradient-cyan-purple text-white rounded-3xl px-8 md:px-12 py-8 shadow-cyan">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">What If AI Did All of This For You?</h3>
                <p className="font-body text-lg md:text-xl opacity-95 mb-6 max-w-2xl">
                  SignalsLoop reads every piece of feedback, categorizes it, finds duplicates, scores priorities, and builds your roadmap—<strong>in seconds, not weeks</strong>.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-3xl">
                    <div className="font-bold mb-1">✓ Auto-Categorized</div>
                    <div className="text-xs opacity-80">Bug/Feature/Request</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-3xl">
                    <div className="font-bold mb-1">✓ Priority Scored</div>
                    <div className="text-xs opacity-80">AI ranks urgency</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-3xl">
                    <div className="font-bold mb-1">✓ Duplicates Merged</div>
                    <div className="text-xs opacity-80">47 "dark modes" → 1</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-3xl">
                    <div className="font-bold mb-1">✓ Users Updated</div>
                    <div className="text-xs opacity-80">Public roadmap</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Before/After Comparison Section */}
      < section className="py-16 md:py-20 lg:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              From Chaos to Clarity in Seconds
            </h2>
            <p className="font-body text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto px-4">
              Watch your scattered feedback transform into an actionable roadmap
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
            {/* Before SignalsLoop */}
            <div className="card-glow p-6 md:p-8 border border-red-100/50">
              <div className="text-center mb-6">
                <h3 className="font-body text-xl md:text-2xl font-bold text-red-600 mb-2">Before SignalsLoop</h3>
                <p className="text-gray-700 text-sm md:text-base">Feedback scattered everywhere</p>
              </div>

              <div className="space-y-4">
                {/* Scattered feedback icons */}
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                  <div className="bg-red-100 rounded-2xl p-2 md:p-3 flex items-center gap-2">
                    <span className="font-body text-lg md:text-2xl">📧</span>
                    <span className="text-xs md:text-sm text-red-700">Email threads</span>
                  </div>
                  <div className="bg-orange-100 rounded-2xl p-2 md:p-3 flex items-center gap-2">
                    <span className="font-body text-lg md:text-2xl">💬</span>
                    <span className="text-xs md:text-sm text-orange-700">Slack messages</span>
                  </div>
                  <div className="bg-yellow-100 rounded-2xl p-2 md:p-3 flex items-center gap-2">
                    <span className="font-body text-lg md:text-2xl">📝</span>
                    <span className="text-xs md:text-sm text-yellow-700">Sticky notes</span>
                  </div>
                  <div className="bg-pink-100 rounded-2xl p-2 md:p-3 flex items-center gap-2">
                    <span className="font-body text-lg md:text-2xl">🎫</span>
                    <span className="text-xs md:text-sm text-pink-700">Support tickets</span>
                  </div>
                </div>

                {/* Visual chaos representation */}
                <div className="bg-gray-100 rounded-2xl p-4 md:p-6 mt-4 md:mt-6">
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
            <div className="card-glow p-6 md:p-8 border border-green-100/50">
              <div className="text-center mb-6">
                <h3 className="font-body text-xl md:text-2xl font-bold text-green-600 mb-2">After SignalsLoop</h3>
                <p className="text-gray-700 text-sm md:text-base">AI automatically organizes everything</p>
              </div>

              <div className="space-y-4">
                {/* Organized board interface mockup */}
                <div className="bg-gray-50 rounded-2xl p-3 md:p-4">
                  <div className="text-center text-gray-700 text-xs md:text-sm mb-2 md:mb-3 flex items-center justify-center gap-2">
                    <span>Organized Feedback Board</span>
                    <span className="text-cyan-500 font-medium">🤖 AI Powered</span>
                  </div>

                  {/* Categories with AI indicators */}
                  <div className="grid grid-cols-2 gap-2 mb-3 md:mb-4">
                    <div className="bg-red-100 rounded-2xl p-2 text-center border border-red-200">
                      <div className="text-xs text-red-700 font-medium flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        Bug Reports
                      </div>
                      <div className="text-sm md:text-lg font-bold text-red-600">12</div>
                      <div className="text-xs text-red-600 mt-1">🎯 Avg 9.1</div>
                    </div>
                    <div className="bg-blue-100 rounded-2xl p-2 text-center border border-cyan-200">
                      <div className="text-xs text-blue-700 font-medium flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        Features
                      </div>
                      <div className="text-sm md:text-lg font-bold text-cyan-500">8</div>
                      <div className="text-xs text-cyan-500 mt-1">🎯 Avg 7.8</div>
                    </div>
                    <div className="bg-cyan-50 rounded-2xl p-2 text-center border border-cyan-100">
                      <div className="text-xs text-cyan-500 font-medium flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                        UI/UX
                      </div>
                      <div className="text-sm md:text-lg font-bold text-cyan-500">5</div>
                      <div className="text-xs text-cyan-500 mt-1">🎯 Avg 6.5</div>
                    </div>
                    <div className="bg-green-100 rounded-2xl p-2 text-center border border-green-200">
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
                    <div className="flex items-center justify-center gap-2 bg-cyan-50 rounded-2xl p-1.5 border border-cyan-50">
                      <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse"></div>
                      <span className="text-xs text-cyan-500 font-medium">🤖 Auto-Categorization Active</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 bg-orange-50 rounded-2xl p-1.5 border border-orange-100">
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-orange-700 font-medium">🎯 Priority Scoring Active</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 bg-blue-50 rounded-2xl p-1.5 border border-cyan-100">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-700 font-medium">🔍 Duplicate Detection Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* AI Features Highlight Section */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-cyan-50 text-cyan-500 border-cyan-100">
              🤖 5 Powerful AI Features
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Complete AI-powered feedback intelligence
            </h2>
            <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto">
              From automatic categorization to smart duplicate detection, our AI handles everything so you can focus on building what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="text-center card-float border border-cyan-100">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="font-body font-bold text-gray-900">AI Auto-Categorization</h3>
              <p className="text-gray-700 font-body-relaxed">Automatically organizes feedback into 10 SaaS-specific categories. 99.2% accuracy, instant results.</p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">Feature Request • Bug Report • UI/UX • Integration</div>
            </div>

            <div className="text-center card-float border border-orange-100">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="font-body font-bold text-gray-900">AI Priority Scoring</h3>
              <p className="text-gray-700 font-body-relaxed">7-factor business-aware scoring. Knows which feedback matters most to your business goals.</p>
              <div className="mt-3 text-xs text-orange-600 font-medium">Revenue Impact • User Reach • Strategic Alignment</div>
            </div>

            <div className="text-center card-float border border-cyan-100">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="font-body font-bold text-gray-900">AI Duplicate Detection</h3>
              <p className="text-gray-700 font-body-relaxed">Semantic analysis finds similar feedback automatically. Cluster related posts and merge duplicates.</p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">Embedding Search • Cluster Analysis • Smart Merging</div>
            </div>

            <div className="text-center card-float border border-green-100">
              <div className="text-5xl mb-4">💡</div>
              <h3 className="font-body font-bold text-gray-900">AI Smart Replies</h3>
              <p className="text-gray-700 font-body-relaxed">Context-aware follow-up questions. Get deeper insights from users automatically.</p>
              <div className="mt-3 text-xs text-green-600 font-medium">Category-Specific • Tier-Aware • Engagement Boost</div>
            </div>

            <div className="text-center card-float border border-cyan-100">
              <div className="text-5xl mb-4">✍️</div>
              <h3 className="font-body font-bold text-gray-900">AI Writing Assistant</h3>
              <p className="text-gray-700 font-body-relaxed">Helps users write better feedback with smart suggestions and clarity improvements.</p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">Title Enhancement • Description Help • Clear Communication</div>
            </div>

            <div className="text-center card-float border border-pink-100 bg-pink-50">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="font-body font-bold text-gray-900">AI Cache Manager</h3>
              <p className="text-gray-700 font-body-relaxed">Smart caching reduces API costs by 80%. Lightning-fast responses without sacrificing accuracy.</p>
              <div className="mt-3 text-xs text-pink-600 font-medium">LRU Cache • Cost Optimization • Instant Results</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="card-glow max-w-2xl mx-auto border border-cyan-100">
              <p className="text-gray-700 font-medium mb-2">🚀 All AI features included in Pro plan</p>
              <p className="text-gray-700">Unlimited usage • No per-request charges • Full access to all features</p>
            </div>
          </div>
        </div>
      </section >

      {/* Team Collaboration Section */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-cyan-100 text-cyan-600 border-cyan-200">
              👥 Team Collaboration
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Work together, ship faster
            </h2>
            <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto">
              Invite your team, assign roles, and collaborate seamlessly. Team members inherit your project's features—no extra cost per user.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="text-center card-float border border-cyan-100">
              <div className="mx-auto w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-cyan-500" />
              </div>
              <h3 className="font-body font-bold text-gray-900">Easy Team Invites</h3>
              <p className="text-gray-700 font-body-relaxed">
                Invite team members via email. Existing users are added instantly, new users receive invitation links.
              </p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">Direct Add • Email Invitations • Automatic Setup</div>
            </div>

            <div className="text-center card-float border border-cyan-100">
              <div className="mx-auto w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-cyan-500" />
              </div>
              <h3 className="font-body font-bold text-gray-900">Role-Based Permissions</h3>
              <p className="text-gray-700 font-body-relaxed">
                Owner, Admin, and Member roles. Admins can manage everything except deleting the project.
              </p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">Owner Control • Admin Rights • Member Access</div>
            </div>

            <div className="text-center card-float border border-cyan-100">
              <div className="mx-auto w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-cyan-500" />
              </div>
              <h3 className="font-body font-bold text-gray-900">No Per-User Pricing</h3>
              <p className="text-gray-700 font-body-relaxed">
                All team members access your project's features at no extra cost. Scale your team without scaling your bill.
              </p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">Unlimited Team Size • Project-Based Billing • Fair Pricing</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="card-glow max-w-2xl mx-auto border border-cyan-200">
              <p className="text-gray-700 font-medium mb-2">👥 Team features included in all plans</p>
              <p className="text-gray-700">Pro plans get admin roles, unlimited members, and advanced permissions</p>
            </div>
          </div>
        </div>
      </section >

      {/* NEW SECTION: Urgency-Based Voting */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-orange-100 text-orange-700 border-orange-200">
              🎯 Unique to SignalsLoop
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Not All Feedback is Created Equal
            </h2>
            <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto">
              Unlike basic upvoting, our urgency-based voting reveals what users <em>truly</em> need vs. what they'd <em>like to have</em>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="text-center card-float border-red-200">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🔴</div>
                <h3 className="font-body text-xl font-bold text-red-600 mb-3">Must Have</h3>
                <p className="text-gray-700 font-body-relaxed">
                  Critical features users can't live without. These drive churn if ignored.
                </p>
                <div className="mt-4 text-xs text-red-600 font-medium">
                  "I need this now or I'm switching"
                </div>
              </CardContent>
            </Card>

            <Card className="text-center card-float border-orange-200">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🟡</div>
                <h3 className="font-body text-xl font-bold text-orange-600 mb-3">Important</h3>
                <p className="text-gray-700 font-body-relaxed">
                  Valuable improvements that significantly enhance the product experience.
                </p>
                <div className="mt-4 text-xs text-orange-600 font-medium">
                  "This would make my life easier"
                </div>
              </CardContent>
            </Card>

            <Card className="text-center card-float border-green-200">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🟢</div>
                <h3 className="font-body text-xl font-bold text-green-600 mb-3">Nice to Have</h3>
                <p className="text-gray-700 font-body-relaxed">
                  Cool ideas that add polish but aren't essential to core workflows.
                </p>
                <div className="mt-4 text-xs text-green-600 font-medium">
                  "This would be a nice bonus"
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12 card-glow max-w-3xl mx-auto border border-orange-200">
            <h4 className="font-semibold text-gray-900 mb-3">See the Priority Mix at a Glance</h4>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="h-8 rounded-full overflow-hidden flex">
                  <div className="bg-red-500 h-full" style={{ width: '35%' }}></div>
                  <div className="bg-orange-500 h-full" style={{ width: '45%' }}></div>
                  <div className="bg-green-500 h-full" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-700">
              <span>35% Must-Have 🔴</span>
              <span>45% Important 🟡</span>
              <span>20% Nice-to-Have 🟢</span>
            </div>
            <p className="text-sm text-gray-700 mt-4">
              <strong>Result:</strong> You immediately know where to focus your engineering resources
            </p>
          </div>
        </div>
      </section >

      {/* Results PMs Care About */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-emerald-100 text-emerald-600 border-green-200">
              ✨ Real Results from Real PMs
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What Changes After Week 1 with SignalsLoop
            </h2>
            <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto">
              These aren't vanity metrics—these are the outcomes that get you promoted.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Result 1 */}
            <div className="card-float border border-green-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">"I walked into the exec meeting with data, not opinions"</h3>
                  <p className="text-gray-700 font-body-relaxed mb-3">
                    Instead of guessing, Srini showed their CEO the top 5 features based on urgency votes and AI priority scores. The roadmap was approved in 10 minutes.
                  </p>
                  <div className="text-sm text-green-600 font-medium">Result: Roadmap confidence • Exec trust • Less pushback</div>
                </div>
              </div>
            </div>

            {/* Result 2 */}
            <div className="card-float border border-cyan-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⏰</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">"I got 15 hours back every week"</h3>
                  <p className="text-gray-700 font-body-relaxed mb-3">
                    Vipin used to spend Monday-Wednesday just reading and tagging feedback. Now AI does it overnight. He spends Mondays planning sprints instead.
                  </p>
                  <div className="text-sm text-cyan-500 font-medium">Result: 60 hours/month saved • More time building • Less burnout</div>
                </div>
              </div>
            </div>

            {/* Result 3 */}
            <div className="card-float border border-cyan-50/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📈</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">"Our NPS jumped 12 points in one quarter"</h3>
                  <p className="text-gray-700 font-body-relaxed mb-3">
                    Users stopped feeling ignored. The public roadmap and changelog showed exactly what was being built. They saw their feedback turn into features.
                  </p>
                  <div className="text-sm text-cyan-500 font-medium">Result: Higher NPS • Lower churn • More word-of-mouth</div>
                </div>
              </div>
            </div>

            {/* Result 4 */}
            <div className="card-float border border-orange-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎯</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">"We stopped building features nobody wanted"</h3>
                  <p className="text-gray-700 font-body-relaxed mb-3">
                    Amy's team was about to spend 6 weeks on a feature only 3 users requested. SignalsLoop showed them 89 users wanted something else. They pivoted.
                  </p>
                  <div className="text-sm text-orange-600 font-medium">Result: Engineering time saved • Better product decisions • Happier users</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="card-glow max-w-3xl mx-auto border border-green-200">
              <p className="text-gray-700 text-lg mb-3">
                <strong>The common thread?</strong> Every PM said the same thing:
              </p>
              <p className="text-2xl font-bold text-green-600">
                "I finally feel in control of our product direction."
              </p>
            </div>
          </div>
        </div>
      </section >

      {/* Problem Section */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-6">
            Your users have amazing ideas. But they're buried in:
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto mb-8">
            <div className="card-float border border-red-100/50">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-bold text-gray-900 mb-2">Endless email threads</h3>
            </div>
            <div className="card-float border border-red-100/50">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-gray-900 mb-2">Scattered Slack messages</h3>
            </div>
            <div className="card-float border border-red-100/50">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="font-bold text-gray-900 mb-2">Lost sticky notes</h3>
            </div>
            <div className="card-float border border-red-100/50">
              <div className="text-4xl mb-4">🎫</div>
              <h3 className="font-bold text-gray-900 mb-2">Untagged support tickets</h3>
            </div>
          </div>
          <p className="font-body text-xl text-gray-700 max-w-2xl mx-auto">
            Meanwhile, your team wastes hours manually sorting through it all.
          </p>
        </div>
      </section >

      {/* Solution Section */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-6">
            SignalsLoop's AI reads every piece of feedback
          </h2>
          <p className="font-body text-xl text-gray-700 max-w-3xl mx-auto">
            and automatically organizes it into actionable categories like Bug Reports, Feature Requests, UI Improvements, and more.
          </p>
        </div>
      </section >

      {/* AI Categorization Showcase */}
      < section className="py-16 md:py-20 lg:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              Watch AI organize feedback in real-time
            </h2>
            <p className="font-body text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto px-4">
              See how our AI processes and categorizes feedback in real-time
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="card-glow p-4 md:p-8 border border-cyan-50/50">
              {/* Demo Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center">
                {/* Step 1: Feedback Submission */}
                <div className="text-center">
                  <div className="bg-blue-100 rounded-3xl p-6 mb-4">
                    <MessageSquare className="h-12 w-12 text-cyan-500 mx-auto mb-3" />
                    <div className="text-sm text-blue-700 font-medium">User submits feedback</div>
                  </div>
                  <div className="bg-gray-100 rounded-2xl p-3 text-left">
                    <div className="text-xs text-gray-700 mb-1">"The login button doesn't work on mobile"</div>
                    <div className="text-xs text-gray-500">Submitted by Srini</div>
                  </div>
                </div>

                {/* Step 2: AI Processing */}
                <div className="text-center">
                  <div className="bg-cyan-50 rounded-3xl p-6 mb-4">
                    <div className="h-12 w-12 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">🤖</span>
                    </div>
                    <div className="text-sm text-cyan-500 font-medium">AI Processing...</div>
                  </div>
                  <div className="bg-cyan-50 rounded-2xl p-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <div className="text-xs text-cyan-500 mt-2">Analyzing content...</div>
                  </div>
                </div>

                {/* Step 3: Categorized Result */}
                <div className="text-center">
                  <div className="bg-green-100 rounded-3xl p-6 mb-4">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <div className="text-sm text-green-700 font-medium">Automatically categorized</div>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-3">
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
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-xs rounded-full">Feature Request</span>
                  </div>
                  <div className="text-sm text-gray-700">"Add dark mode support"</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-cyan-50 text-cyan-500 text-xs rounded-full">UI/UX</span>
                  </div>
                  <div className="text-sm text-gray-700">"Make the navigation more intuitive"</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Enhancement</span>
                  </div>
                  <div className="text-sm text-gray-700">"Improve loading speed"</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Developer & Integration Hub Section */}
      < section id="features" className="py-20 md:py-24 px-4 bg-slate-50 relative" >
        <div className="absolute inset-0 bg-slate-100/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-slate-100 text-slate-700 border-slate-200">
              🔌 Developer-Friendly Integrations
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Connect Everything. Export Anywhere.
            </h2>
            <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto">
              Integrate with your existing tools in minutes. Get feedback wherever your team works.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Slack Integration */}
            <div className="text-center card-float border border-slate-100/50">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="font-body font-bold text-gray-900">Slack Integration</h3>
              <p className="text-gray-700 font-body-relaxed">Real-time notifications to your Slack channels. Stay updated without switching tools.</p>
              <div className="mt-3 text-xs text-slate-600 font-medium">Instant Setup • Channel Routing • Custom Alerts</div>
            </div>

            {/* Discord Integration */}
            <div className="text-center card-float border border-cyan-50/50">
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="font-body font-bold text-gray-900">Discord Integration</h3>
              <p className="text-gray-700 font-body-relaxed">Send feedback updates to Discord servers. Perfect for gaming and community products.</p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">Webhook Support • Role Mentions • Rich Embeds</div>
            </div>

            {/* Webhooks */}
            <div className="text-center card-float border border-cyan-100/50">
              <div className="text-5xl mb-4">🔔</div>
              <h3 className="font-body font-bold text-gray-900">Powerful Webhooks</h3>
              <p className="text-gray-700 font-body-relaxed">5 event types to trigger custom workflows. Build your own integrations effortlessly.</p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">POST • Comment • Vote • Status Change • New Release</div>
            </div>

            {/* REST API */}
            <div className="text-center card-float border border-green-100/50">
              <div className="text-5xl mb-4">🔑</div>
              <h3 className="font-body font-bold text-gray-900">REST API Access</h3>
              <p className="text-gray-700 font-body-relaxed">Full API access with secure API keys. Programmatic control over all features.</p>
              <div className="mt-3 text-xs text-green-600 font-medium">JSON API • Rate Limited • Full CRUD Operations</div>
            </div>

            {/* CSV Import/Export */}
            <div className="text-center card-float border border-orange-100/50">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="font-body font-bold text-gray-900">CSV Import/Export</h3>
              <p className="text-gray-700 font-body-relaxed">Bulk import feedback or export to Excel. Flexible filtering and column mapping.</p>
              <div className="mt-3 text-xs text-orange-600 font-medium">Excel • CSV • Custom Filters • Date Ranges</div>
            </div>

            {/* Embed Widget */}
            <div className="text-center card-float border border-cyan-100/50">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="font-body font-bold text-gray-900">1-Line Embed Widget</h3>
              <p className="text-gray-700 font-body-relaxed">Add feedback collection anywhere with one script tag. No backend changes needed.</p>
              <div className="mt-3 text-xs text-cyan-500 font-medium">Copy-Paste • Customizable • Works Everywhere</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="card-glow max-w-2xl mx-auto border border-slate-200">
              <p className="text-gray-700 font-medium mb-2">⚡ All integrations available in Pro plan</p>
              <p className="text-gray-700">No additional charges • Unlimited usage • Full access to API & webhooks</p>
            </div>
          </div>
        </div>
      </section >

      {/* Team Collaboration Section */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-teal-100 text-teal-700 border-teal-200">
              👥 Built for Teams
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Keep Everyone in the Loop
            </h2>
            <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto">
              From @mentions to email digests, your entire team stays aligned on customer feedback.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* @Mentions */}
            <div className="card-float border border-teal-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">@</div>
                <div>
                  <h3 className="font-body font-bold text-gray-900">@Mentions in Comments</h3>
                  <p className="text-sm text-gray-700 font-body-relaxed mb-3">
                    Tag teammates in discussions. They get instant email notifications and can jump right into context.
                  </p>
                  <div className="text-xs text-teal-600 font-medium">Real-time Notifications • Email Alerts • Context Preservation</div>
                </div>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="card-float border border-cyan-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📧</div>
                <div>
                  <h3 className="font-body font-bold text-gray-900">Smart Email Notifications</h3>
                  <p className="text-sm text-gray-700 font-body-relaxed mb-3">
                    Get notified about new feedback, comments, status changes, and votes. Fully customizable per team member.
                  </p>
                  <div className="text-xs text-cyan-500 font-medium">Per-User Preferences • Digest Mode • Instant Alerts</div>
                </div>
              </div>
            </div>

            {/* Weekly Digest */}
            <div className="card-float border border-cyan-50/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h3 className="font-body font-bold text-gray-900">Weekly Digest Emails</h3>
                  <p className="text-sm text-gray-700 font-body-relaxed mb-3">
                    Automated weekly summaries of top feedback, trending requests, and priority shifts sent to your inbox.
                  </p>
                  <div className="text-xs text-cyan-500 font-medium">Automated Reports • Top Trends • Priority Insights</div>
                </div>
              </div>
            </div>

            {/* Multi-User Boards */}
            <div className="card-float border border-green-100/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">👥</div>
                <div>
                  <h3 className="font-body font-bold text-gray-900">Collaborative Boards</h3>
                  <p className="text-sm text-gray-700 font-body-relaxed mb-3">
                    Multiple team members can manage feedback together. Track who changed what with full activity history.
                  </p>
                  <div className="text-xs text-green-600 font-medium">Team Management • Activity Log • Role Permissions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Widget Demo Section */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
              AI-powered feedback in 2 lines of code
            </h2>
            <p className="font-body text-xl text-gray-700">
              No complex setup. No backend integration. Just copy, paste, and start collecting organized feedback. 2-minute setup, lifetime value.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900 rounded-3xl p-4 md:p-8 text-white font-mono text-xs md:text-sm shadow-multi">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <span className="text-green-400 font-medium text-sm">→ Install Widget</span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-2xl hover:bg-gray-700 transition-colors w-full sm:w-auto min-h-[44px]"
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
            <div className="mt-6 md:mt-8 bg-white rounded-3xl p-4 md:p-6 shadow-lg border border-gray-200">
              <div className="text-center mb-4">
                <span className="text-sm text-gray-700 font-medium">Widget Preview</span>
              </div>

              {/* Realistic Website Integration */}
              <div className="bg-gray-50 rounded-2xl p-3 md:p-4 relative overflow-hidden">
                {/* Browser frame */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                        <div className="w-6 h-6 md:w-8 md:h-8 gradient-cyan-purple rounded-2xl flex items-center justify-center">
                          <span className="text-white text-xs md:text-sm font-bold">M</span>
                        </div>
                        <div>
                          <h1 className="font-body text-base md:text-lg font-semibold text-gray-900">MyApp</h1>
                          <p className="text-xs md:text-sm text-gray-500">Dashboard</p>
                        </div>
                      </div>
                      <nav className="hidden sm:flex gap-4 md:gap-6 text-xs md:text-sm text-gray-700">
                        <span className="hover:text-gray-900 cursor-pointer">Analytics</span>
                        <span className="hover:text-gray-900 cursor-pointer">Users</span>
                        <span className="hover:text-gray-900 cursor-pointer">Settings</span>
                      </nav>
                    </div>

                    {/* Dashboard Content */}
                    <div className="p-4 md:p-6">
                      {/* Welcome Section */}
                      <div className="mb-4 md:mb-6">
                        <h2 className="font-body text-lg md:text-xl font-semibold text-gray-900 mb-2">Welcome back, Srini!</h2>
                        <p className="text-sm md:text-base text-gray-700">Here's what's happening with your app today.</p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                        <div className="bg-blue-50 rounded-2xl p-3 md:p-4 border border-cyan-200">
                          <div className="font-body text-xl md:text-2xl font-bold text-cyan-500">1,234</div>
                          <div className="text-xs md:text-sm text-blue-700">Active Users</div>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-3 md:p-4 border border-green-200">
                          <div className="font-body text-xl md:text-2xl font-bold text-green-600">$5,678</div>
                          <div className="text-xs md:text-sm text-green-700">Revenue</div>
                        </div>
                        <div className="bg-cyan-50 rounded-2xl p-3 md:p-4 border border-cyan-100">
                          <div className="font-body text-xl md:text-2xl font-bold text-cyan-500">89</div>
                          <div className="text-xs md:text-sm text-cyan-500">New Signups</div>
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-gray-700">New user signed up</span>
                            <span className="text-gray-400">2 min ago</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-gray-700">Payment received</span>
                            <span className="text-gray-400">15 min ago</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <span className="text-gray-700">Feature request submitted</span>
                            <span className="text-gray-400">1 hour ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Widget button - naturally positioned */}
                <div className="absolute bottom-4 right-4">
                  <div className="gradient-cyan-purple text-white px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all duration-200 cursor-pointer">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Feedback</span>
                  </div>
                </div>

                {/* Callout annotation */}
                <div className="absolute bottom-12 md:bottom-16 right-1 md:right-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-2 md:p-3 max-w-40 md:max-w-48">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-900 mb-1">Users click here to submit feedback</div>
                      <div className="text-xs text-gray-700">AI automatically organizes their suggestions</div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 md:w-6 md:h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <ArrowRight className="h-2 w-2 md:h-3 md:w-3 text-cyan-500 rotate-45" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-4">
                <span className="text-sm text-gray-700">Add to any website in 2 minutes</span>
                <p className="text-xs text-gray-500 mt-1">Trusted by startups to enterprise</p>
              </div>
            </div>

            <div className="text-center mt-8">
              <div className="inline-flex items-center space-x-3 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-gray-200">
                <Zap className="h-5 w-5 text-cyan-500" />
                <span className="text-sm font-medium text-gray-700">Feedback button appears → Users submit → You see results</span>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* NEW SECTION: Public Roadmap & Changelog */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-cyan-100 text-cyan-500 border-cyan-200 text-base px-4 py-2">
              🗣️ Have Real-Time Conversations with Thousands of Users
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              Public Feedback Boards + Shareable Roadmaps
            </h2>
            <p className="font-body text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Give your users a <strong className="text-gray-900">public space to share ideas, vote on features, and track your progress</strong> in real-time. Turn feedback into transparent conversations—not buried support tickets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Public Roadmap */}
            <Card className="card-float border-cyan-100">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-3xl flex items-center justify-center">
                    <Map className="h-6 w-6 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="font-body text-xl font-bold text-gray-900">Public Roadmap</h3>
                    <p className="text-gray-700">Share your product journey</p>
                  </div>
                </div>

                {/* Mini Kanban Preview */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center">
                    <div className="bg-pink-100 rounded-2xl p-2 mb-1">
                      <Lightbulb className="h-4 w-4 text-pink-600 mx-auto" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Ideas</div>
                    <div className="font-body text-lg font-bold text-pink-600">12</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-yellow-100 rounded-2xl p-2 mb-1">
                      <Target className="h-4 w-4 text-yellow-600 mx-auto" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Planned</div>
                    <div className="font-body text-lg font-bold text-yellow-600">8</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-orange-100 rounded-2xl p-2 mb-1">
                      <Clock className="h-4 w-4 text-orange-600 mx-auto" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Building</div>
                    <div className="font-body text-lg font-bold text-orange-600">5</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-100 rounded-2xl p-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Shipped</div>
                    <div className="font-body text-lg font-bold text-green-600">23</div>
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-gray-700">
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
            <Card className="card-float border-cyan-100">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-50 rounded-3xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="font-body text-xl font-bold text-gray-900">Public Changelog</h3>
                    <p className="text-gray-700">Celebrate your wins</p>
                  </div>
                </div>

                {/* Sample Changelog Entry */}
                <div className="bg-cyan-50 rounded-2xl p-4 mb-4 border border-cyan-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      New Feature
                    </Badge>
                    <Badge variant="outline" className="text-xs">v2.1.0</Badge>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">AI Duplicate Detection</h4>
                  <p className="text-xs text-gray-700 mb-2">
                    Our AI now automatically finds and merges duplicate feedback using semantic analysis.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>Released 2 days ago</span>
                    <span>•</span>
                    <span>🎉 Based on 12 user requests</span>
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-gray-700">
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
            <div className="bg-blue-50 border-2 border-cyan-200 rounded-3xl p-6 max-w-3xl mx-auto mb-6">
              <p className="font-body text-base font-bold text-gray-900 mb-2">
                💬 This Is How You Talk to Thousands of Users at Scale
              </p>
              <p className="text-gray-700">
                Public boards = transparent conversations. AI = automatic organization. Roadmap = show progress. Users feel heard, you build what matters.
              </p>
            </div>
            <Link href="/demo/board">
              <Button className="gradient-cyan-purple hover:bg-blue-700 text-lg px-8 py-6">
                <ExternalLink className="h-5 w-5 mr-2" />
                See Live Public Board & Roadmap
              </Button>
            </Link>
          </div>
        </div>
      </section >

      {/* Pricing Section */}
      < section id="pricing" className="py-20 md:py-28 lg:py-36 px-4 bg-white grain-overlay dot-pattern relative overflow-hidden" >
        {/* Subtle background gradients */}
        < div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/3 rounded-full blur-3xl" ></div >
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400/3 rounded-full blur-3xl"></div>

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16 md:mb-20 max-w-4xl mx-auto">
            <Badge className="mb-6 gradient-cyan-purple text-white border-0 font-body font-semibold text-sm px-4 py-2 rounded-full shadow-depth-md">
              <span className="mr-1.5">💎</span> Simple, Transparent Pricing
            </Badge>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display text-gray-900 mb-6 leading-tight">
              Effortlessly affordable pricing<br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-600 bg-clip-text text-transparent">that scales with you</span>
            </h2>
            <p className="font-body-relaxed text-xl text-gray-600 px-4 mb-8">
              Start free forever. Upgrade for unlimited AI features starting at <strong className="text-gray-900">$19/month</strong>. No setup fees or commitments.
            </p>

            {/* Simplified trust badges */}
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-depth-sm border border-gray-100">
                <CheckCircle className="h-3.5 w-3.5 text-cyan-500" />
                <span className="text-gray-600">Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-depth-sm border border-gray-100">
                <CheckCircle className="h-3.5 w-3.5 text-cyan-500" />
                <span className="text-gray-600">No setup fees</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-depth-sm border border-gray-100">
                <CheckCircle className="h-3.5 w-3.5 text-cyan-500" />
                <span className="text-gray-600">SSL encrypted</span>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-14">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl shadow-depth-sm">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${!isAnnual ? 'text-white gradient-cyan-purple shadow-depth-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${isAnnual ? 'text-white bg-green-600 shadow-depth-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Annual <span className="text-xs ml-1">(20% off)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="border border-gray-200 shadow-depth-lg hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-2 bg-white rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-8 pt-10 px-8 border-b border-gray-100">
                <div className="mb-4">
                  <Badge className="bg-gray-100 text-gray-700 border-0 font-semibold text-xs px-3 py-1">
                    ALWAYS FREE
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-display font-bold text-gray-900 mb-2">Free Forever</CardTitle>
                <div className="flex items-baseline justify-center gap-2 my-6">
                  <span className="text-6xl font-display font-bold text-gray-900">$0</span>
                  <span className="text-gray-500 font-medium">/month</span>
                </div>
                <CardDescription className="text-gray-600 font-body text-base">Experience AI-powered feedback management risk-free</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="bg-green-50 rounded-2xl p-4 mb-4 border-2 border-green-300">
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
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200">
                      🚀 Start Free • Try AI Now
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-700 mt-3 text-center font-medium">
                    No credit card • No time limit • Upgrade only when you love it
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-cyan-200 shadow-depth-xl hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-2 bg-white rounded-3xl overflow-visible relative ring-2 ring-cyan-100/50">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="gradient-cyan-purple text-white border-0 px-5 py-1.5 rounded-full shadow-depth-md font-semibold text-xs whitespace-nowrap">
                  ⭐ MOST POPULAR
                </Badge>
              </div>
              <CardHeader className="text-center pb-8 pt-12 px-8 bg-gradient-to-b from-cyan-50/30 to-white border-b border-cyan-100">
                <CardTitle className="text-3xl font-display font-bold text-gray-900 mb-2">Pro</CardTitle>
                <div className="my-6">
                  {isAnnual ? (
                    <>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-6xl font-display font-bold bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">$15.20</span>
                        <span className="text-gray-500 font-medium">/month</span>
                      </div>
                      <div className="mt-3 text-sm text-green-600 font-semibold">
                        Billed annually ($182.40/year) • Save 20%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-6xl font-display font-bold bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">$19</span>
                        <span className="text-gray-500 font-medium">/month</span>
                      </div>
                      <div className="mt-3 text-sm text-gray-500 font-medium">
                        Cancel anytime • No commitments
                      </div>
                    </>
                  )}
                </div>
                <CardDescription className="text-gray-600 font-body text-base">For growing teams • Unlimited AI • Everything you need</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="bg-cyan-50 rounded-2xl p-3 mb-4 border border-cyan-100">
                  <p className="text-sm font-bold text-cyan-500 text-center">⚡ Unlimited AI Requests</p>
                  <p className="text-xs text-cyan-500 text-center mt-1">No per-request charges • No usage limits</p>
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
                <Button
                  className="w-full mt-8 gradient-cyan-purple hover:bg-blue-700 text-white font-semibold rounded-3xl hover:scale-110 hover-lift transition-all duration-200 shadow-lg hover:shadow-xl py-4"
                  onClick={() => handleProCheckout()}
                >
                  🚀 Start Free - Upgrade Anytime
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section >

      {/* Competitive Comparison */}
      < section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-cyan-100 text-cyan-600 border-cyan-200 text-base px-4 py-2">
              🤖 Modern AI-Powered Feedback Management
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              Why Pay <span className="line-through text-gray-600">Thousands Per Year</span> for Legacy Tools?<br />
              <span className="text-pink-600">Get Advanced AI Features for $19/Month</span>
            </h2>
            <p className="font-body text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Most feedback tools charge <strong className="text-orange-600">$100-300/month (or per-user)</strong> with limited or no AI capabilities. We built SignalsLoop to deliver <strong className="text-cyan-500">comprehensive AI automation</strong> at a fraction of the cost.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-blue-100 border-2 border-cyan-400 rounded-2xl px-6 py-3">
              <span className="text-2xl">🚀</span>
              <p className="text-sm font-bold text-gray-900">Join hundreds of teams automating their feedback workflow with AI</p>
            </div>
          </div>

          {/* AI Features Callout Box */}
          <div className="mb-8 bg-cyan-50 border-2 border-cyan-300 rounded-3xl p-6">
            <h3 className="font-body text-xl font-bold text-gray-900 mb-4 text-center flex items-center justify-center gap-2">
              <Bot className="w-5 h-5" />Why Teams Choose SignalsLoop
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl mb-3">🤖</div>
                <div className="font-bold text-gray-900 mb-2">5 AI Features</div>
                <div className="text-xs text-gray-700">Auto-categorization, priority scoring, duplicate detection, smart replies, and writing assistant</div>
              </div>
              <div>
                <div className="text-4xl mb-3">💰</div>
                <div className="font-bold text-gray-900 mb-2">No Per-User Pricing</div>
                <div className="text-xs text-gray-700">$19/month flat rate. No surprise bills as your team grows.</div>
              </div>
              <div>
                <div className="text-4xl mb-3">⚡</div>
                <div className="font-bold text-gray-900 mb-2">Built for Speed</div>
                <div className="text-xs text-gray-700">Simple, fast interface. Start collecting feedback in 5 minutes.</div>
              </div>
            </div>
            <p className="text-center mt-6 text-sm text-gray-700">
              <strong className="text-cyan-500">Comprehensive AI automation at 75-90% lower cost than traditional alternatives</strong>
            </p>
          </div>

          <div className="text-xs text-gray-500 text-center mb-6 italic">
            *Pricing and features based on publicly available information as of January 2025. Subject to change. Visit competitor websites for current details.
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Legacy Tool A */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-gray-200 opacity-75">
              <div className="text-center mb-4">
                <div className="font-body text-xl font-bold text-gray-400 mb-2">Legacy Tool A</div>
                <div className="text-3xl font-bold text-red-600">~$99</div>
                <div className="text-xs text-gray-500">/month (Pro)</div>
                <div className="mt-2 text-xs font-bold text-red-600">≈ $1,188/year</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI priority scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI duplicate detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI smart replies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI writing assistant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-700">Roadmap</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-700">Integrations</span>
                </li>
              </ul>
            </div>

            {/* Legacy Tool B */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-gray-200 opacity-75">
              <div className="text-center mb-4">
                <div className="font-body text-xl font-bold text-gray-400 mb-2">Legacy Tool B</div>
                <div className="text-3xl font-bold text-red-600">~$59</div>
                <div className="text-xs text-gray-500">/user/month</div>
                <div className="mt-2 text-xs font-bold text-red-600">≈ $3,540/year (5 users)</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 text-sm">~</span>
                  <span className="text-gray-700">Basic AI insights only</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">Auto-categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI priority scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI duplicate detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700">Too complex for small teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-700">Portal customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm">⚠</span>
                  <span className="text-gray-700 font-bold">Per-user pricing kills budget</span>
                </li>
              </ul>
            </div>

            {/* Legacy Tool C */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-gray-200 opacity-75">
              <div className="text-center mb-4">
                <div className="font-body text-xl font-bold text-gray-400 mb-2">Legacy Tool C</div>
                <div className="text-3xl font-bold text-red-600">~$59</div>
                <div className="text-xs text-gray-500">/user/month</div>
                <div className="mt-2 text-xs font-bold text-red-600">≈ $2,124/year (3 users)</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 text-sm">~</span>
                  <span className="text-gray-700">Very limited AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI auto-categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI priority scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm font-bold">✗</span>
                  <span className="text-gray-700 line-through">AI duplicate detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-700">Ideas portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-gray-700">Voting system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 text-sm">⚠</span>
                  <span className="text-gray-700 font-bold">Expensive per-user model</span>
                </li>
              </ul>
            </div>

            {/* SignalsLoop */}
            <div className="bg-blue-50 rounded-3xl p-5 shadow-xl border-4 border-green-400 relative transform scale-105">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                🚀 AI-Powered Winner
              </Badge>
              <div className="text-center mb-4 mt-2">
                <div className="font-body text-xl font-bold text-cyan-500 mb-2">SignalsLoop</div>
                <div className="text-4xl font-display font-bold text-green-600">$19</div>
                <div className="text-xs text-gray-700">/month (unlimited users)</div>
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
          <div className="mt-10 bg-green-50 rounded-3xl p-8 shadow-xl border-2 border-green-300">
            <div className="text-center mb-6">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                💰 Your Team Could Save Thousands This Year
              </h3>
              <p className="font-body text-base text-gray-700">
                Same features (actually, <strong className="text-green-700">way better with AI</strong>). Fraction of the price.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-green-200">
                <div className="text-sm font-bold text-gray-700 mb-2">vs Legacy Tool A Pro</div>
                <div className="text-3xl md:text-4xl font-display font-bold text-green-600 mb-2">$960</div>
                <div className="text-xs text-gray-700">potential savings/year*</div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-700">
                    <strong>Many lack comprehensive AI.</strong><br />
                    You're paying more for manual workflows.
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-green-200">
                <div className="text-sm font-bold text-gray-700 mb-2">vs Legacy Tool B (5 users)</div>
                <div className="text-3xl md:text-4xl font-display font-bold text-green-600 mb-2">$3,312</div>
                <div className="text-xs text-gray-700">potential savings/year*</div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-700">
                    <strong>93% cheaper!</strong><br />
                    Their "basic AI" can't auto-categorize feedback.
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-green-200">
                <div className="text-sm font-bold text-gray-700 mb-2">vs Legacy Tool C (3 users)</div>
                <div className="text-3xl md:text-4xl font-display font-bold text-green-600 mb-2">$1,536</div>
                <div className="text-xs text-gray-700">potential savings/year*</div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-700">
                    <strong>89% cheaper!</strong><br />
                    Limited AI. Per-user pricing adds up fast.
                  </div>
                </div>
              </div>
            </div>

            {/* The Kicker - What You Get */}
            <div className="bg-cyan-500 text-white rounded-3xl p-6">
              <div className="text-center">
                <h4 className="font-body text-xl font-bold mb-3">🎯 Here's What Makes This a No-Brainer:</h4>
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
                  <p className="font-body text-lg font-bold">
                    Your competitors are already automating feedback with AI.
                  </p>
                  <p className="font-body text-base opacity-90 mt-2">
                    Every week you wait, you're burning hours on manual categorization and missing what customers <em>actually</em> want.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500 italic max-w-3xl mx-auto">
              *Comparisons based on publicly available pricing and feature information as of January 2025. Actual competitor pricing, features, and capabilities may vary and are subject to change. We recommend visiting competitor websites directly to verify current offerings. Savings calculations are estimates based on typical usage scenarios and may not reflect your specific needs.
            </div>
          </div>
        </div>
      </section >

      {/* CTA Section */}
      < section className="py-16 md:py-24 lg:py-32 px-4 gradient-cyan-purple text-white" >
        <div className="container mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4">
            Ready to effortlessly organize feedback with AI?
          </h2>
          <p className="font-body text-lg sm:text-xl mb-6 opacity-90 px-4">
            Join 100+ teams already saving 15+ hours per week with AI-powered feedback organization
          </p>

          {/* Enhanced Trust/Urgency Combo */}
          <div className="mb-8">
            <Badge className="bg-white text-cyan-500 text-base md:text-lg px-4 py-2 mb-4">
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
                <span className="text-cyan-300">✓</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleProCheckout}
            size="lg"
            className="bg-white text-cyan-500 hover:bg-gray-100 text-base md:text-lg px-6 md:px-10 py-3 md:py-4 font-bold rounded-3xl hover:scale-110 hover-lift transition-all duration-200 shadow-lg hover:shadow-xl min-h-[44px]"
          >
            🚀 Get Started in 2 Minutes
            <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </section >

      {/* Credibility Section */}
      < section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white to-cyan-50/20 relative overflow-hidden" >
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              Built with enterprise-grade security
            </h2>
            <p className="font-body text-lg text-gray-700 max-w-2xl mx-auto">
              Your data is protected with industry-leading security standards and enterprise-grade infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center bg-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="font-semibold text-gray-900 mb-2">SSL Encrypted</h3>
              <p className="text-gray-700">End-to-end security</p>
            </div>

            <div className="text-center bg-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure by Default</h3>
              <p className="text-gray-700">API keys & authentication</p>
            </div>

            <div className="text-center bg-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-2">Slack & Discord</h3>
              <p className="text-gray-700">Team integrations ready</p>
            </div>

            <div className="text-center bg-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">CSV Export</h3>
              <p className="text-gray-700">Own your data</p>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="mt-12 text-center">
            <p className="text-gray-700 mb-4">Built with modern, secure technology stack:</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-600 border-cyan-200">
                AWS Infrastructure
              </Badge>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-600 border-green-200">
                Supabase Database
              </Badge>
              <Badge variant="secondary" className="bg-cyan-50 text-cyan-500 border-cyan-100">
                Next.js Framework
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                TypeScript
              </Badge>
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-500 border-cyan-200">
                Enterprise AI
              </Badge>
            </div>
          </div>
        </div>
      </section >

      {/* Footer */}
      < footer className="bg-gray-900 text-white py-8 md:py-12 px-4" >
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 gradient-cyan-purple rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="font-body text-xl font-bold">SignalsLoop</span>
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
      </footer >
    </div >
  );
}
