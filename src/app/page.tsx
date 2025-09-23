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
  Zap
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function Homepage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    // Check if there's an access_token in the hash (magic link redirect)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('Found access_token in hash, redirecting to app');
      router.push(`/app${hash}`);
    }
  }, [router]);

  const handleProCheckout = () => {
    router.push('/login');
  };
  return (
    <div className="min-h-screen">
      
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SignalsLoop</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/demo/board" className="text-gray-600 hover:text-gray-900 transition-colors">
                Demo
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Button 
                onClick={handleProCheckout}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
            ✨ AI-Powered Feedback Management
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            AI-Powered Feedback That<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Actually Gets Organized
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Stop drowning in scattered feedback. Our AI instantly categorizes every user suggestion, so you can focus on building what matters most.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              onClick={handleProCheckout}
              size="lg"
              className="text-lg px-8 py-3 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Start Organizing Feedback Instantly
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Link href="/demo/board">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                View Live Demo
              </Button>
            </Link>
          </div>
          
          {/* Social Proof */}
          <div className="text-sm text-gray-500 mb-8">
            <div className="flex items-center justify-center space-x-1 mb-2">
              {[1,2,3,4,5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            Join 100+ product teams who've organized 10,000+ pieces of feedback with AI
            <br />
            <span className="text-blue-600 font-medium">
              ⚡ Start organizing feedback instantly
            </span>
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
              <div className="absolute top-8 right-8 bg-white rounded-lg shadow-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-700 font-medium">AI Organizing</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">3 new posts auto-categorized</div>
              </div>
              
              <div className="absolute bottom-8 left-8 bg-white rounded-lg shadow-lg p-3 border border-gray-100">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">98%</div>
                  <div className="text-xs text-gray-500">Accuracy Rate</div>
                </div>
              </div>
              
              <div className="absolute top-1/2 right-4 bg-white rounded-lg shadow-lg p-2 border border-gray-100">
              <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">127</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Highlight Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="container mx-auto">
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
            <div className="text-center bg-white rounded-lg p-6 shadow-sm border border-purple-100">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Smart Categorization</h3>
              <p className="text-gray-600">Automatically organizes every post into relevant categories like Bug, Feature Request, UI/UX, and more.</p>
            </div>
            
            <div className="text-center bg-white rounded-lg p-6 shadow-sm border border-blue-100">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Organization</h3>
              <p className="text-gray-600">No more manual tagging or endless sorting. Every piece of feedback is instantly categorized and ready to review.</p>
            </div>
            
            <div className="text-center bg-white rounded-lg p-6 shadow-sm border border-green-100">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Filtering</h3>
              <p className="text-gray-600">Find what matters fast with AI-powered category filters and intelligent search across all your feedback.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-red-50">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Your users have amazing ideas. But they're buried in:
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-red-100">
              <div className="text-3xl mb-3">📧</div>
              <h3 className="font-semibold text-gray-900 mb-2">Endless email threads</h3>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-red-100">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-2">Scattered Slack messages</h3>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-red-100">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="font-semibold text-gray-900 mb-2">Lost sticky notes</h3>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-red-100">
              <div className="text-3xl mb-3">🎫</div>
              <h3 className="font-semibold text-gray-900 mb-2">Untagged support tickets</h3>
            </div>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Meanwhile, your team wastes hours manually sorting through it all.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 bg-green-50">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            SignalsLoop's AI reads every piece of feedback
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            and instantly organizes it into actionable categories like Bug Reports, Feature Requests, UI Improvements, and more.
          </p>
          <div className="bg-white rounded-lg p-8 shadow-lg max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Organization</h3>
            <p className="text-gray-600">
              No more manual sorting. Every piece of feedback is automatically categorized and ready for your team to act on.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AI-powered features that work instantly
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From automatic categorization to smart roadmaps, everything works seamlessly with AI.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <CardTitle>AI Auto-Categorization</CardTitle>
                <CardDescription>
                  Every post automatically sorted into relevant categories. No manual tagging required.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center border-2 hover:border-purple-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <CardTitle>Smart Roadmaps</CardTitle>
                <CardDescription>
                  Show users exactly what you're building with AI-organized public roadmaps.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center border-2 hover:border-green-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <CardTitle>2-Minute Setup</CardTitle>
                <CardDescription>
                  One script tag. Works anywhere. No backend changes needed.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Widget Demo Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AI-powered feedback in 2 lines of code
            </h2>
            <p className="text-xl text-gray-600">
              No complex setup. No backend integration. Just copy, paste, and watch AI organize everything.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-6 text-white font-mono text-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-green-400">→ Install Widget</span>
                <Button size="sm" variant="secondary">Copy</Button>
              </div>
              <code>
                {`<script src="https://signalsloop.com/embed/your-key.js"></script>`}
              </code>
            </div>
            
            <div className="text-center mt-8">
              <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-lg">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Feedback button appears → Users submit → You see results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
              💎 Simple, Transparent Pricing
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AI-powered pricing that scales with you
            </h2>
            <p className="text-xl text-gray-600">
              Start free. Upgrade for advanced features starting at $19/month.
            </p>
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
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="text-4xl font-bold text-gray-900 my-4">$0</div>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent>
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
                <Link href="/login" className="block mt-8">
                  <Button className="w-full" variant="outline">
                    Free
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-blue-200 relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                Most Popular
              </Badge>
              <Badge className="absolute -top-3 right-4 bg-purple-600">
                🤖 Powered by AI
              </Badge>
              <Badge className="absolute -top-3 left-4 bg-blue-600">
                💎 Most Popular
              </Badge>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="text-4xl font-bold text-gray-900 my-4">
                  {isAnnual ? (
                    <>
                      $15.20<span className="text-lg text-gray-500">/month</span>
                      <div className="text-sm text-green-600 font-medium mt-1">
                        Billed annually ($182.40/year)
                      </div>
                    </>
                  ) : (
                    <>
                      $19<span className="text-lg text-gray-500">/month</span>
                    </>
                  )}
                </div>
                <CardDescription>For growing teams</CardDescription>
              </CardHeader>
              <CardContent>
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
                  className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={handleProCheckout}
                >
                  Get Started - {isAnnual ? 'Annual' : 'Monthly'}
                </GradientButton>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to start organizing feedback with AI?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join 100+ product teams who've organized 10,000+ pieces of feedback with AI
          </p>
          <div className="mb-6">
            <Badge className="bg-white text-blue-600 text-lg px-4 py-2">
              ✨ Ready to Get Started?
            </Badge>
          </div>
          <Button 
            onClick={handleProCheckout}
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3 font-bold"
          >
            🚀 Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
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