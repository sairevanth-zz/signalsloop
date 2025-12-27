'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CheckCircle,
  Star,
  Zap,
  MessageSquare,
  TrendingUp,
  Target,
  Clock,
  Brain,
  Sparkles,
  Users,
  Shield,
  FileText,
  BarChart3,
  Layers,
  Menu,
  X,
  ChevronDown,
  Flame,
  Play,
  Globe,
  RefreshCw,
  AlertTriangle,
  Search,
  Bot,
  PenTool,
  Award,
  Rocket,
  Coffee,
  Headphones,
  Heart,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerChildren = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check for success state in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setShowSuccess(true);
    }

    // Check if there's an access_token in the hash (magic link redirect)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('Found access_token in hash, setting session and checking if new user');
      const urlParams = new URLSearchParams(hash.substring(1));
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const setSessionAndRedirect = async () => {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });

              if (sessionError) {
                console.error('Error setting session:', sessionError);
                router.push('/app');
                return;
              }

              if (sessionData.user) {
                const userCreatedAt = new Date(sessionData.user.created_at);
                const timeSinceCreation = Date.now() - userCreatedAt.getTime();
                const isNewUser = timeSinceCreation < 300000;

                if (isNewUser) {
                  const { analytics } = await import('@/lib/analytics');
                  analytics.signup({
                    source: 'magic_link',
                    email: sessionData.user.email,
                    user_id: sessionData.user.id
                  });
                  analytics.identify(sessionData.user.id, {
                    email: sessionData.user.email,
                    created_at: sessionData.user.created_at,
                    signup_method: 'magic_link'
                  });

                  if (sessionData.user.email) {
                    try {
                      await fetch('/api/users/welcome', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: sessionData.user.id })
                      });
                    } catch (emailError) {
                      console.error('Failed to send welcome email:', emailError);
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
          router.push('/app');
        };
        setSessionAndRedirect();
        return;
      }
    }

    // Redirect authenticated users
    if (!loading && user) {
      router.push('/app');
    }
  }, [router, user, loading]);

  const handleCTA = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-10 h-10 rounded-lg shadow-sm mb-4 mx-auto" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* ============================================= */}
      {/* HEADER - Sticky Navigation */}
      {/* ============================================= */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <img
                src="/signalsloop-logo-v2.png"
                alt="SignalsLoop"
                className="w-10 h-10 rounded-xl shadow-sm group-hover:scale-105 transition-transform"
              />
              <span className="font-display text-xl font-bold text-gray-900 hidden sm:inline">
                SignalsLoop
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-8 text-sm text-gray-600">
              <Link href="#features" className="hover:text-cyan-600 transition-colors font-medium">
                Features
              </Link>
              <Link href="#pricing" className="hover:text-cyan-600 transition-colors font-medium">
                Pricing
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 font-medium hover:text-cyan-600 transition-colors outline-none">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  Try It
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 p-2 bg-white border border-gray-100 shadow-xl rounded-xl">
                  <DropdownMenuLabel className="text-xs text-gray-400 uppercase tracking-wider px-2 py-1">
                    Interactive Demos
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/demo/board">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-cyan-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">Demo Board</div>
                        <div className="text-xs text-gray-500">Full product experience</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/demo/roast">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-orange-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-white" />
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">Roast My Roadmap</div>
                        <div className="text-xs text-gray-500">AI critique your roadmap</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/demo/spec">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-yellow-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white">
                        <FileText className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">Spec Generator</div>
                        <div className="text-xs text-gray-500">AI-powered PRDs</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Button
                onClick={handleCTA}
                className="gradient-cyan-purple text-white font-semibold rounded-full hover:scale-105 transition-all px-6"
              >
                Start Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-gray-100 mt-4 pt-4"
              >
                <nav className="space-y-2 pb-4">
                  <Link href="#features" className="block px-4 py-3 rounded-lg hover:bg-gray-50 font-medium">
                    Features
                  </Link>
                  <Link href="#pricing" className="block px-4 py-3 rounded-lg hover:bg-gray-50 font-medium">
                    Pricing
                  </Link>
                  <Link href="/demo/board" className="block px-4 py-3 rounded-lg hover:bg-gray-50 font-medium">
                    Try Demo
                  </Link>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ============================================= */}
      {/* SECTION 2: SUCCESS (Conditional) */}
      {/* Job: Kill buyer's remorse */}
      {/* ============================================= */}
      <AnimatePresence>
        {showSuccess && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-8"
          >
            <div className="container mx-auto px-4 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold">You're In!</h2>
              </div>
              <p className="text-white/90 mb-4 max-w-xl mx-auto">
                Welcome to SignalsLoop. Here's what happens next:
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Check className="w-4 h-4" />
                  <span>AI analyzes your feedback sources</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Check className="w-4 h-4" />
                  <span>Priorities generated in 24 hours</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Check className="w-4 h-4" />
                  <span>Your first roadmap item ready</span>
                </div>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="mt-4 text-white/70 hover:text-white text-sm underline"
              >
                Dismiss
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ============================================= */}
      {/* SECTION 1: HERO */}
      {/* Job: Get email or get scroll */}
      {/* ============================================= */}
      <section className="relative py-20 md:py-28 lg:py-36 px-4 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-50/50 via-white to-white"></div>

        {/* Animated gradient orbs */}
        <div className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] bg-gradient-to-br from-cyan-400/20 to-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-purple-400/15 to-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] bg-gradient-to-br from-teal-400/15 to-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>

        <div className="relative z-10 container mx-auto max-w-6xl">
          <motion.div
            className="text-center"
            initial="initial"
            animate="animate"
            variants={staggerChildren}
          >
            {/* Eyebrow */}
            <motion.div variants={fadeInUp} className="mb-6">
              <Badge className="gradient-cyan-purple text-white border-0 font-semibold text-sm px-5 py-2 rounded-full shadow-lg">
                <Bot className="w-4 h-4 mr-2 inline" />
                The Only AI-Native Product OS
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display text-gray-900 mb-6 leading-[1.1]"
            >
              Your AI Product Manager
              <br />
              <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                That Never Sleeps
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              Stop drowning in Slack threads and Reddit posts. SignalsLoop's 5 AI models
              automatically discover feedback, identify patterns, and build your roadmap—
              <strong className="text-gray-900">while you sleep.</strong>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <Button
                  onClick={handleCTA}
                  size="lg"
                  className="relative btn-primary-glow text-lg px-10 py-6 text-white font-bold rounded-2xl hover:scale-105 transition-all"
                >
                  Start Free — No Credit Card
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <Link href="/demo/board">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-6 rounded-2xl border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50/50 transition-all font-semibold"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </Link>
            </motion.div>

            {/* Trust Signals */}
            <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Free Forever Plan</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                <span>2-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-500" />
                <span>SOC 2 Compliant</span>
              </div>
            </motion.div>

            {/* Platform logos */}
            <motion.div variants={fadeInUp} className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                Monitors 8 platforms automatically
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400">
                {['Reddit', 'Twitter', 'HackerNews', 'ProductHunt', 'G2', 'Discord', 'Slack', 'GitHub'].map((platform) => (
                  <div key={platform} className="flex items-center gap-2 text-sm font-medium hover:text-gray-600 transition-colors">
                    <Globe className="w-4 h-4" />
                    {platform}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================= */}
      {/* SECTION 3: PROBLEM-AGITATE */}
      {/* Job: Make status quo painful */}
      {/* ============================================= */}
      <section className="py-20 md:py-28 px-4 bg-gray-50" id="problems">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-red-100 text-red-700 border-0 mb-4">
              <AlertTriangle className="w-4 h-4 mr-1" />
              The Problem
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-gray-900 mb-4">
              Sound Familiar?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Product teams are drowning in feedback scattered across a dozen channels.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Problem 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
            >
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-display text-gray-900 mb-3">
                Feedback Lives Everywhere
              </h3>
              <p className="text-gray-600 mb-4">
                Slack, email, support tickets, Reddit, Twitter... Your customers are talking,
                but their insights are trapped in 10+ different tools.
              </p>
              <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>73% of feedback never gets logged</span>
              </div>
            </motion.div>

            {/* Problem 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
            >
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-display text-gray-900 mb-3">
                PMs Spend 60% on Busywork
              </h3>
              <p className="text-gray-600 mb-4">
                Manually tagging, categorizing, and prioritizing feedback. That's 24+ hours
                per week not spent on strategy or shipping.
              </p>
              <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                <Coffee className="w-4 h-4" />
                <span>12 hours/week on manual data entry</span>
              </div>
            </motion.div>

            {/* Problem 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
            >
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-display text-gray-900 mb-3">
                6 Weeks From Feedback to Feature
              </h3>
              <p className="text-gray-600 mb-4">
                By the time you've gathered enough data to make a decision, the market has
                already moved. Your competitors shipped it last month.
              </p>
              <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                <Rocket className="w-4 h-4" />
                <span>Competitors move 4x faster</span>
              </div>
            </motion.div>
          </div>

          {/* Personal transition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <p className="text-xl text-gray-700 max-w-3xl mx-auto italic">
              "I used to spend every Monday morning going through 200+ Slack messages
              just to understand what our customers were asking for. There had to be a better way."
            </p>
            <p className="mt-4 text-sm text-gray-500">
              — Every PM before discovering SignalsLoop
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================= */}
      {/* SECTION 4: VALUE STACK (Features) */}
      {/* Job: Make saying no feel stupid */}
      {/* ============================================= */}
      <section className="py-20 md:py-28 px-4 bg-white" id="features">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-cyan-100 text-cyan-700 border-0 mb-4">
              <Sparkles className="w-4 h-4 mr-1" />
              The Solution
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-gray-900 mb-4">
              One Platform. Five AI Models.
              <br />
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Zero Manual Work.
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              SignalsLoop is the only product OS that's AI-native from the ground up.
            </p>
          </motion.div>

          {/* Feature Tier 1: Core */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 md:p-10 text-white shadow-2xl"
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <Search className="w-8 h-8" />
              </div>
              <div className="text-cyan-200 text-sm font-medium uppercase tracking-wider mb-2">
                AI Model #1
              </div>
              <h3 className="text-2xl md:text-3xl font-display mb-4">
                Autonomous Feedback Discovery
              </h3>
              <p className="text-white/80 text-lg mb-6">
                AI scans 8 platforms every 30 minutes without any setup. Reddit, Twitter,
                HackerNews, ProductHunt, G2, Discord, Slack, and GitHub—automatically.
              </p>
              <ul className="space-y-3">
                {[
                  'Zero manual configuration required',
                  'Real-time sentiment tracking',
                  'Automatic competitor mention detection',
                  'Cross-platform deduplication'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-cyan-300" />
                    <span className="text-white/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-8 md:p-10 text-white shadow-2xl"
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <Brain className="w-8 h-8" />
              </div>
              <div className="text-purple-200 text-sm font-medium uppercase tracking-wider mb-2">
                AI Model #2
              </div>
              <h3 className="text-2xl md:text-3xl font-display mb-4">
                Smart Priority Scoring
              </h3>
              <p className="text-white/80 text-lg mb-6">
                Multi-factor algorithm weighs frequency (30%), sentiment (25%),
                business impact (25%), effort (10%), and competitive pressure (10%).
              </p>
              <ul className="space-y-3">
                {[
                  'Data-driven prioritization',
                  'Automatic roadmap suggestions',
                  'Impact vs effort visualization',
                  'Custom weighting options'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-purple-300" />
                    <span className="text-white/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Feature Tier 2 */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: <Layers className="w-6 h-6" />,
                model: 'AI Model #3',
                title: 'Auto-Categorization',
                description: 'Every piece of feedback instantly tagged and organized into themes, features, and segments.',
                color: 'bg-emerald-500'
              },
              {
                icon: <RefreshCw className="w-6 h-6" />,
                model: 'AI Model #4',
                title: 'Duplicate Detection',
                description: 'Smart clustering identifies the same request across different words and platforms.',
                color: 'bg-orange-500'
              },
              {
                icon: <PenTool className="w-6 h-6" />,
                model: 'AI Model #5',
                title: 'Spec Writer',
                description: 'Generate comprehensive PRDs in 30 seconds using RAG-powered writing.',
                color: 'bg-indigo-500'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 text-white`}>
                  {feature.icon}
                </div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                  {feature.model}
                </div>
                <h3 className="text-lg font-display text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Value Stack Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white text-center"
            id="pricing"
          >
            <h3 className="text-2xl md:text-3xl font-display mb-6">
              Everything You Need to Ship Faster
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {[
                { value: '8', label: 'Platform Integrations' },
                { value: '5', label: 'AI Models' },
                { value: '30s', label: 'PRD Generation' },
                { value: '72h', label: 'Feedback to Feature' }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl md:text-4xl font-display text-cyan-400">
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-300 mb-8">
              <span className="text-gray-500 line-through">$99-299/mo elsewhere</span>
              <span className="text-3xl font-display text-white">
                From <span className="text-cyan-400">$19</span>/month
              </span>
            </div>
            <Button
              onClick={handleCTA}
              size="lg"
              className="gradient-cyan-purple text-white font-bold text-lg px-10 py-6 rounded-2xl hover:scale-105 transition-all"
            >
              Start Free — Forever Free Plan Available
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ============================================= */}
      {/* SECTION 5: SOCIAL PROOF */}
      {/* Job: Let others convince them */}
      {/* ============================================= */}
      <section className="py-20 md:py-28 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-yellow-100 text-yellow-700 border-0 mb-4">
              <Star className="w-4 h-4 mr-1" />
              Loved by Teams
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-gray-900 mb-4">
              Real Results From Real Teams
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Product teams are shipping faster and building what users actually want.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-6 text-lg leading-relaxed">
                "As a solo founder, I was drowning in feedback from 500+ users.
                SignalsLoop's AI sorted everything overnight.
                <strong className="text-gray-900"> I saved 12 hours/week</strong>
                and finally knew what to build next."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-cyan-purple rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">V</span>
                </div>
                <div>
                  <div className="font-bold text-gray-900">Vipin</div>
                  <div className="text-sm text-gray-500">Solo Founder @ Apex Cloud Hub</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-cyan-600 font-medium">
                <Clock className="w-4 h-4" />
                <span>12 hours saved per week</span>
              </div>
            </motion.div>

            {/* Testimonial 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-6 text-lg leading-relaxed">
                "We switched from a legacy tool (~$99/mo) to SignalsLoop.
                <strong className="text-gray-900"> Got better AI features for 1/5th the price.</strong>
                The priority scoring alone changed how we plan our roadmap."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <div>
                  <div className="font-bold text-gray-900">Srini</div>
                  <div className="text-sm text-gray-500">Head of Product @ Sanjeevani</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>80% cost reduction</span>
              </div>
            </motion.div>

            {/* Testimonial 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-6 text-lg leading-relaxed">
                "Our roadmap used to be a guessing game. Now it's
                <strong className="text-gray-900"> backed by data from 8 different sources.</strong>
                The AI finds patterns I'd never have spotted manually."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">M</span>
                </div>
                <div>
                  <div className="font-bold text-gray-900">Maria</div>
                  <div className="text-sm text-gray-500">PM @ Growth Startup</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-purple-600 font-medium">
                <Target className="w-4 h-4" />
                <span>Data-driven decisions</span>
              </div>
            </motion.div>
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-wrap items-center justify-center gap-8"
          >
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">GDPR Ready</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="w-5 h-5" />
              <span className="text-sm">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Headphones className="w-5 h-5" />
              <span className="text-sm">24/7 Support</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================= */}
      {/* SECTION 6: TRANSFORMATION */}
      {/* Job: Make outcome tangible */}
      {/* ============================================= */}
      <section className="py-20 md:py-28 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-green-100 text-green-700 border-0 mb-4">
              <Rocket className="w-4 h-4 mr-1" />
              Your Journey
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-gray-900 mb-4">
              From Chaos to Clarity
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Here's what happens when you let AI handle the busywork.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 -translate-y-1/2 rounded-full"></div>

            <div className="grid md:grid-cols-4 gap-8 relative">
              {/* Stage 1: Quick Win */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg border-2 border-cyan-100 relative"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  1
                </div>
                <div className="text-center pt-4">
                  <div className="text-xs text-cyan-600 font-medium uppercase tracking-wider mb-2">
                    Day 1
                  </div>
                  <h3 className="text-lg font-display text-gray-900 mb-2">
                    Quick Win
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Connect your sources. AI starts analyzing immediately. See your first
                    insights within hours.
                  </p>
                </div>
              </motion.div>

              {/* Stage 2: Compound */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-100 relative"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  2
                </div>
                <div className="text-center pt-4">
                  <div className="text-xs text-purple-600 font-medium uppercase tracking-wider mb-2">
                    Week 1
                  </div>
                  <h3 className="text-lg font-display text-gray-900 mb-2">
                    Patterns Emerge
                  </h3>
                  <p className="text-gray-600 text-sm">
                    AI identifies recurring themes. Priorities become clear.
                    Your first data-driven roadmap takes shape.
                  </p>
                </div>
              </motion.div>

              {/* Stage 3: Advantage */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100 relative"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  3
                </div>
                <div className="text-center pt-4">
                  <div className="text-xs text-pink-600 font-medium uppercase tracking-wider mb-2">
                    Month 1
                  </div>
                  <h3 className="text-lg font-display text-gray-900 mb-2">
                    Competitive Edge
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Ship features users actually want. Beat competitors to market.
                    Watch your retention climb.
                  </p>
                </div>
              </motion.div>

              {/* Stage 4: 10x */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg text-white relative"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white">
                  4
                </div>
                <div className="text-center pt-4">
                  <div className="text-xs text-emerald-200 font-medium uppercase tracking-wider mb-2">
                    Quarter 1
                  </div>
                  <h3 className="text-lg font-display mb-2">
                    10x Impact
                  </h3>
                  <p className="text-white/80 text-sm">
                    Your product team operates like a company 10x your size.
                    AI handles the work of 3 analysts.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* SECTION 7: SECONDARY CTA */}
      {/* Job: Catch the scrollers */}
      {/* ============================================= */}
      <section className="py-20 md:py-28 px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Avatar stack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mb-8"
          >
            <div className="flex -space-x-3">
              {[
                'bg-gradient-to-br from-cyan-400 to-blue-500',
                'bg-gradient-to-br from-purple-400 to-pink-500',
                'bg-gradient-to-br from-emerald-400 to-teal-500',
                'bg-gradient-to-br from-orange-400 to-red-500',
                'bg-gradient-to-br from-yellow-400 to-orange-500'
              ].map((gradient, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 ${gradient} rounded-full border-2 border-gray-900 flex items-center justify-center`}
                >
                  <span className="text-white font-bold text-sm">
                    {String.fromCharCode(65 + i)}
                  </span>
                </div>
              ))}
              <div className="w-12 h-12 bg-white/10 rounded-full border-2 border-gray-700 flex items-center justify-center">
                <span className="text-white/70 text-sm">+99</span>
              </div>
            </div>
          </motion.div>

          {/* Question headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-display mb-6"
          >
            Ready to stop guessing what to build next?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
          >
            Join product teams who've replaced spreadsheets with AI-powered insights.
          </motion.p>

          {/* "Yes" button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Button
              onClick={handleCTA}
              size="lg"
              className="gradient-cyan-purple text-white font-bold text-xl px-12 py-7 rounded-2xl hover:scale-105 transition-all shadow-2xl"
            >
              Yes, Let's Do This
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
            <p className="mt-6 text-gray-400 text-sm">
              Free forever plan available • No credit card required • 2-minute setup
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================= */}
      {/* SECTION 8: FOOTER */}
      {/* Job: Professional legitimacy */}
      {/* ============================================= */}
      <footer className="py-16 px-4 bg-white border-t border-gray-100">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <img
                  src="/signalsloop-logo-v2.png"
                  alt="SignalsLoop"
                  className="w-10 h-10 rounded-xl shadow-sm"
                />
                <span className="font-display text-xl font-bold text-gray-900">
                  SignalsLoop
                </span>
              </Link>
              <p className="text-gray-600 mb-6 max-w-sm">
                The AI-native product OS that turns scattered feedback into shipped features.
                Built for modern product teams.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://twitter.com/signalsloop" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-500 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="https://linkedin.com/company/signalsloop" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-500 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://github.com/signalsloop" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-500 transition-colors">
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="font-display text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                Product
              </h4>
              <nav className="space-y-3">
                <Link href="#features" className="block text-gray-600 hover:text-cyan-600 transition-colors">
                  Features
                </Link>
                <Link href="#pricing" className="block text-gray-600 hover:text-cyan-600 transition-colors">
                  Pricing
                </Link>
                <Link href="/demo/board" className="block text-gray-600 hover:text-cyan-600 transition-colors">
                  Demo
                </Link>
                <Link href="/changelog" className="block text-gray-600 hover:text-cyan-600 transition-colors">
                  Changelog
                </Link>
              </nav>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-display text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                Legal
              </h4>
              <nav className="space-y-3">
                <Link href="/privacy" className="block text-gray-600 hover:text-cyan-600 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block text-gray-600 hover:text-cyan-600 transition-colors">
                  Terms of Service
                </Link>
                <Link href="/security" className="block text-gray-600 hover:text-cyan-600 transition-colors">
                  Security
                </Link>
                <Link href="/gdpr" className="block text-gray-600 hover:text-cyan-600 transition-colors">
                  GDPR
                </Link>
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} SignalsLoop. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>SOC 2</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>GDPR</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <span>Made with love</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
