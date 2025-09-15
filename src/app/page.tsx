'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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

export default function Homepage() {
  const router = useRouter();

  useEffect(() => {
    // Check if there's an access_token in the hash (magic link redirect)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('Found access_token in hash, redirecting to app');
      // Redirect to app with the hash
      router.push(`/app${hash}`);
    }
  }, [router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SignalLoop</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="#docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                Docs
              </Link>
              <Link href="/demo/board" className="text-gray-600 hover:text-gray-900 transition-colors">
                Demo
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/app/create">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            🚀 The simple alternative to expensive feedback tools
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Simple Feedback Boards &<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Public Roadmaps
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Collect user feedback and show progress with a 2-line embeddable widget. 
            <strong> 75% cheaper than Canny</strong>, infinitely easier to set up.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/app/create">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
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
            Trusted by 100+ indie makers and startups
          </div>
          
          {/* Hero Image Placeholder */}
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Product Screenshot Goes Here</p>
                <p className="text-sm text-gray-400">Feedback board, voting, roadmap preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need for user feedback
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stop losing feedback in email, Slack, and sticky notes. Organize everything in one place.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Collect Feedback</CardTitle>
                <CardDescription>
                  Users submit ideas, vote on features, and discuss in comments. 
                  Anonymous or authenticated - your choice.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center border-2 hover:border-purple-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Public Roadmap</CardTitle>
                <CardDescription>
                  Show users what you&apos;re working on. Transparent progress updates 
                  build trust and reduce support tickets.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center border-2 hover:border-green-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Code className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>2-Line Install</CardTitle>
                <CardDescription>
                  Add a feedback widget to any site in 2 minutes. Works with React, 
                  Vue, plain HTML, or any framework.
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
              Install in 2 lines of code
            </h2>
            <p className="text-xl text-gray-600">
              No complex setup. No backend integration. Just copy, paste, done.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-6 text-white font-mono text-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-green-400">→ Install Widget</span>
                <Button size="sm" variant="secondary">Copy</Button>
              </div>
              <code>
                {`<script src="https://signalloop.com/embed/your-key.js"></script>`}
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, honest pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free, upgrade when you need more. No hidden fees.
            </p>
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
                    "Community support",
                    "SignalLoop branding"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block mt-8">
                  <Button className="w-full" variant="outline">
                    Start Free
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-blue-200 relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                Most Popular
              </Badge>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="text-4xl font-bold text-gray-900 my-4">
                  $19<span className="text-lg text-gray-500">/month</span>
                </div>
                <CardDescription>For growing teams</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Unlimited boards",
                    "Unlimited posts", 
                    "Private boards",
                    "Custom domain",
                    "Remove branding",
                    "Priority email support",
                    "API access",
                    "Email notifications"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/app/create" className="block mt-8">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to start collecting better feedback?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join 100+ companies using SignalLoop to build better products
          </p>
          <Link href="/app/create">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
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
                <span className="text-xl font-bold">SignalLoop</span>
              </div>
              <p className="text-gray-400">
                Simple feedback boards and public roadmaps for indie makers.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/demo/board" className="hover:text-white transition-colors">Demo</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
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
            <p>&copy; 2024 SignalLoop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}