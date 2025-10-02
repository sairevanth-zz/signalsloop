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
  Zap as Lightning
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
      console.log('Found access_token in hash, redirecting to app');
      router.push(`/app${hash}`);
      return;
    }

    // If user is already authenticated, redirect to dashboard
    if (!loading && user) {
      console.log('User already authenticated, redirecting to dashboard');
      router.push('/app');
      return;
    }
  }, [router, user, loading]);

  const handleProCheckout = () => {
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
              <Link href="/demo/interactive" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors flex items-center gap-1 min-touch-target">
                🎯 Demo
              </Link>
              
              {/* Subtle Header Trust Signals */}
              <div className="hidden xl:flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="text-green-500">🔒</span>
                  <span>SOC 2</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-500">⚡</span>
                  <span>99.9% Uptime</span>
                </div>
              </div>
            </nav>
            
            <div className="flex items-center gap-2">
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
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>99.9% Uptime SLA</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>GDPR Ready</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
              <span>Used by 100+ teams</span>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 md:mb-8 leading-tight tracking-tight animate-fade-in">
            AI-Powered Feedback That<br className="hidden sm:block" />
            <span className="block sm:inline"> </span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
              Instantly Gets Organized
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed font-medium px-4">
            Stop drowning in scattered feedback. Our AI automatically categorizes every user suggestion effortlessly, so you can focus on building what matters most.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center mb-8 px-4">
            <Button 
              onClick={handleProCheckout}
              size="lg"
              className="text-lg sm:text-xl px-8 sm:px-12 md:px-16 py-4 sm:py-5 gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl min-h-[56px] w-full sm:w-auto text-center"
            >
              🚀 Start Organizing Feedback Instantly
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <div className="w-full sm:w-auto">
              <Link href="/demo/interactive">
                <Button size="lg" variant="outline" className="text-sm sm:text-base px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-xl border-2 border-purple-300 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 min-h-[44px] w-full font-semibold text-purple-700 shadow-md hover:shadow-lg">
                  🎯 Try Interactive Demo
                </Button>
              </Link>
              <p className="text-xs text-purple-600 font-medium mt-2 text-center">✨ No signup • Try all AI features</p>
            </div>
          </div>
          
          {/* Enhanced Micro-copy under CTA */}
          <div className="text-center mb-8">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs font-bold">✓</span>
                </div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">✓</span>
                </div>
                <span>Setup takes 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-xs font-bold">✓</span>
                </div>
                <span>Works with any website or app</span>
              </div>
            </div>
          </div>
          
          
          {/* Enhanced Social Proof */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-1 mb-3">
              {[1,2,3,4,5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            
            {/* Company avatars visual indicator */}
            <div className="flex items-center justify-center mb-3">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{String.fromCharCode(64 + i)}</span>
                  </div>
                ))}
                <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">+</span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-semibold text-gray-900">Join 100+ teams</span> who've organized <span className="font-semibold text-blue-600">50,000+ pieces of feedback</span> with AI
            </div>
            <div className="text-xs text-gray-500">
              ⚡ Saved teams 500+ hours of manual categorization • 99.2% accuracy rate
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
                      {/* Header Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">127</div>
                              <div className="text-xs text-blue-600">Total Posts</div>
                            </div>
                            <MessageSquare className="w-6 h-6 text-blue-500" />
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-green-600">89</div>
                              <div className="text-xs text-green-600">Votes Today</div>
                            </div>
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">↑</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-purple-600">23</div>
                              <div className="text-xs text-purple-600">AI Categorized</div>
                            </div>
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">🤖</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Recent Feedback */}
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Feedback</h3>
                      </div>
                      
                      {/* Feedback Cards */}
                      <div className="space-y-3">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900 text-sm">Add dark mode support</span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Feature</span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">Users want the ability to switch between light and dark themes for better accessibility...</div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>👤 Sarah M.</span>
                                <span>🕒 2 hours ago</span>
                                <span>💬 5 comments</span>
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
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Bug</span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">The login button on the homepage doesn't respond when clicked. Tested on Chrome and Safari...</div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>👤 Mike R.</span>
                                <span>🕒 4 hours ago</span>
                                <span>💬 2 comments</span>
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
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Enhancement</span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">The mobile menu could be more intuitive. Consider adding swipe gestures...</div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>👤 Alex T.</span>
                                <span>🕒 6 hours ago</span>
                                <span>💬 0 comments</span>
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
              
              {/* Floating Elements */}
              <div className="absolute top-8 right-8 bg-white rounded-lg shadow-lg p-3 border border-gray-100 animate-bounce-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-700 font-medium">AI Organizing</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">3 new posts auto-categorized</div>
              </div>
              
              <div className="absolute bottom-8 left-8 bg-white rounded-lg shadow-lg p-3 border border-gray-100 animate-float">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">98%</div>
                  <div className="text-xs text-gray-500">Accuracy Rate</div>
                </div>
              </div>
              
              <div className="absolute top-1/2 right-4 bg-white rounded-lg shadow-lg p-2 border border-gray-100 animate-float-delayed">
              <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">127</div>
                  <div className="text-xs text-gray-500">Total</div>
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
              See the difference AI makes
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Transform chaotic feedback into organized, actionable insights
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
                  <div className="text-center text-gray-600 text-xs md:text-sm mb-2 md:mb-3">Organized Feedback Board</div>
                  
                  {/* Categories */}
                  <div className="grid grid-cols-2 gap-2 mb-3 md:mb-4">
                    <div className="bg-blue-100 rounded-lg p-2 text-center">
                      <div className="text-xs text-blue-700 font-medium">Bug Reports</div>
                      <div className="text-sm md:text-lg font-bold text-blue-600">12</div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-2 text-center">
                      <div className="text-xs text-green-700 font-medium">Features</div>
                      <div className="text-sm md:text-lg font-bold text-green-600">8</div>
                    </div>
                    <div className="bg-purple-100 rounded-lg p-2 text-center">
                      <div className="text-xs text-purple-700 font-medium">UI/UX</div>
                      <div className="text-sm md:text-lg font-bold text-purple-600">5</div>
                    </div>
                    <div className="bg-orange-100 rounded-lg p-2 text-center">
                      <div className="text-xs text-orange-700 font-medium">Enhancements</div>
                      <div className="text-sm md:text-lg font-bold text-orange-600">3</div>
                    </div>
                  </div>
                  
                  {/* AI processing indicator */}
                  <div className="flex items-center justify-center gap-2 bg-green-50 rounded-lg p-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-700 font-medium">AI Processing...</span>
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
              🤖 Powered by AI
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Smart feedback organization that actually works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stop manually tagging and organizing feedback. Our AI automatically categorizes every post so you can focus on what matters.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-100/50">
              <div className="text-5xl mb-6">🤖</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Smart Categorization</h3>
              <p className="text-gray-600 leading-relaxed">Automatically organizes every post into relevant categories like Bug, Feature Request, UI/UX, and more.</p>
            </div>
            
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-100/50">
              <div className="text-5xl mb-6">⚡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Organization</h3>
              <p className="text-gray-600 leading-relaxed">No more manual tagging or endless sorting. Every piece of feedback is instantly categorized and ready to review.</p>
            </div>
            
            <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-green-100/50">
              <div className="text-5xl mb-6">🎯</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Filtering</h3>
              <p className="text-gray-600 leading-relaxed">Find what matters fast with AI-powered category filters and intelligent search across all your feedback.</p>
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
            and instantly organizes it into actionable categories like Bug Reports, Feature Requests, UI Improvements, and more.
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
              Watch AI organize feedback instantly
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

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AI-powered features that work instantly
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From effortless automatic categorization to smart roadmaps, everything works seamlessly with AI. Save 15+ hours per week on feedback management.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm rounded-xl p-6">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 mb-3">AI Auto-Categorization</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Every post automatically sorted into relevant categories. No manual tagging required.
                </CardDescription>
                <div className="mt-3">
                  <span className="text-sm font-semibold text-green-600">99.2% accuracy rate</span>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="text-center border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm rounded-xl p-6">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 mb-3">Smart Roadmaps</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Show users exactly what you're building with AI-organized public roadmaps.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm rounded-xl p-6">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Lightning className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 mb-3">2-Minute Setup</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  One script tag. Works anywhere. No backend changes needed.
                </CardDescription>
              </CardHeader>
            </Card>
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
              No complex setup. No backend integration. Just copy, paste, and watch AI automatically organize everything. 2-minute setup, lifetime of organized feedback.
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
                <span>GDPR Compliant</span>
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
                <CardDescription className="text-gray-600">Perfect for getting started • No credit card required</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <ul className="space-y-3">
                  {[
                    "1 feedback board",
                    "50 posts maximum", 
                    "Public boards only",
                    "Manual categorization only",
                    "Basic organization",
                    "Community support",
                    "SignalsLoop branding"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/login" className="block">
                    <Button className="w-full" variant="outline">
                      Start Free
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-500 mt-2 text-center">Start free, upgrade when ready</p>
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
                <ul className="space-y-3">
                  {[
                    "Unlimited boards",
                    "Unlimited posts", 
                    "Private boards",
                    "🤖 AI Smart Categorization",
                    "🔍 AI Duplicate Detection",
                    "🎯 AI Priority Scoring",
                    "Smart filtering & search",
                    "Custom domain (coming soon)",
                    "Remove branding",
                    "Priority email support (coming soon)",
                    "API access",
                    "Email notifications (coming soon)"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <GradientButton 
                  className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl py-4"
                  onClick={handleProCheckout}
                >
                  🚀 Start Free Trial - {isAnnual ? 'Annual' : 'Monthly'}
                </GradientButton>
              </CardContent>
            </Card>
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
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold text-gray-900 mb-2">SOC 2 Type II</h3>
              <p className="text-sm text-gray-600">Certified security controls</p>
            </div>
            
            <div className="text-center bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="font-semibold text-gray-900 mb-2">GDPR Compliant</h3>
              <p className="text-sm text-gray-600">Privacy-first approach</p>
            </div>
            
            <div className="text-center bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold text-gray-900 mb-2">99.9% Uptime</h3>
              <p className="text-sm text-gray-600">Reliable infrastructure</p>
            </div>
            
            <div className="text-center bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="font-semibold text-gray-900 mb-2">SSL Encrypted</h3>
              <p className="text-sm text-gray-600">End-to-end security</p>
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