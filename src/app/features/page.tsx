'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bot,
  Target,
  Search,
  Lightbulb,
  Zap,
  BarChart3,
  Users,
  Shield,
  UserPlus,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="text-xl font-bold text-gray-900 dark:text-white">SignalsLoop</div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/features" className="text-blue-600 dark:text-blue-400 font-medium">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Pricing
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 bg-blue-50 dark:bg-blue-950">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300">
            <Bot className="w-3 h-3 inline mr-1" />Powered by AI
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Everything you need to manage feedback intelligently
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            From AI-powered categorization to team collaboration and urgency-based voting—SignalsLoop has all the features you need to turn feedback into action.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/#pricing">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/demo/board">
              <Button size="lg" variant="outline" className="bg-white text-blue-600 border-white hover:bg-gray-100">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* AI Features Highlight Section */}
      <section className="py-20 md:py-32 px-4 bg-purple-50 dark:bg-purple-950 relative">
        <div className="absolute inset-0 bg-purple-100/20 dark:bg-purple-900/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300">
              <Bot className="w-3 h-3 inline mr-1" />5 Powerful AI Features
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Complete AI-powered feedback intelligence
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              From automatic categorization to smart duplicate detection, our AI handles everything so you can focus on building what matters.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 max-w-6xl mx-auto">
            {/* Large Feature - Auto-Categorization (spans 2 columns, 2 rows) */}
            <div className="md:col-span-3 md:row-span-2 bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-purple-200/50 dark:border-purple-700/50">
              <div className="mb-6">
                <Bot className="w-16 h-16 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI Auto-Categorization</h3>
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                Automatically organizes feedback into 10 SaaS-specific categories. 99.2% accuracy, instant results.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full">Feature Request</span>
                <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full">Bug Report</span>
                <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full">UI/UX</span>
              </div>
            </div>

            {/* Priority Scoring (spans 2 columns, 1 row) */}
            <div className="md:col-span-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-orange-200/50 dark:border-orange-700/50">
              <div className="flex items-start gap-4">
                <Target className="w-12 h-12 text-orange-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI Priority Scoring</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    7-factor business-aware scoring. Knows which feedback matters most to your business goals.
                  </p>
                </div>
              </div>
            </div>

            {/* Duplicate Detection (spans 2 columns, 1 row) */}
            <div className="md:col-span-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-blue-200/50 dark:border-blue-700/50">
              <div className="flex items-start gap-4">
                <Search className="w-12 h-12 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI Duplicate Detection</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Semantic analysis finds similar feedback automatically. Cluster related posts and merge duplicates.
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Replies (spans 2 columns, 1 row) */}
            <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-blue-200/50 dark:border-blue-700/50">
              <Lightbulb className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Smart Replies</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Context-aware follow-up questions. Get deeper insights automatically.
              </p>
            </div>

            {/* Writing Assistant (spans 2 columns, 1 row) */}
            <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-blue-200/50 dark:border-blue-700/50">
              <Zap className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Writing Assistant</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Helps users write better feedback with smart suggestions.
              </p>
            </div>

            {/* AI Insights (spans 2 columns, 1 row) */}
            <div className="md:col-span-2 bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-purple-200/50 dark:border-purple-700/50">
              <BarChart3 className="w-10 h-10 text-purple-600 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Insights Panel</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Get AI-powered insights and trends from your feedback data.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto border border-purple-200 dark:border-purple-700">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">🚀 All AI features included in Pro plan</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unlimited usage • No per-request charges • Full access to all features</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Collaboration Section */}
      <section className="py-20 md:py-32 px-4 bg-blue-50 dark:bg-blue-950 relative">
        <div className="absolute inset-0 bg-blue-100/20 dark:bg-blue-900/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300">
              👥 Team Collaboration
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Work together, ship faster
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Invite your team, assign roles, and collaborate seamlessly. Team members inherit your project's features—no extra cost per user.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-blue-100/50 dark:border-blue-700/50">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Easy Team Invites</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Invite team members via email. Existing users are added instantly, new users receive invitation links.
              </p>
              <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium">Direct Add • Email Invitations • Automatic Setup</div>
            </div>

            <div className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-indigo-100/50 dark:border-indigo-700/50">
              <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Role-Based Permissions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Owner, Admin, and Member roles. Admins can manage everything except deleting the project.
              </p>
              <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Owner Control • Admin Rights • Member Access</div>
            </div>

            <div className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-purple-100/50 dark:border-purple-700/50">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">No Per-User Pricing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                All team members access your project's features at no extra cost. Scale your team without scaling your bill.
              </p>
              <div className="mt-3 text-xs text-purple-600 dark:text-purple-400 font-medium">Unlimited Team Size • Project-Based Billing • Fair Pricing</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto border border-blue-200 dark:border-blue-700">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">👥 Team features included in all plans</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pro plans get admin roles, unlimited members, and advanced permissions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency-Based Voting */}
      <section className="py-20 md:py-32 px-4 bg-orange-50 dark:bg-orange-950 relative">
        <div className="absolute inset-0 bg-orange-100/20 dark:bg-orange-900/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-300">
              <Target className="w-3 h-3 inline mr-1" />Unique to SignalsLoop
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Not All Feedback is Created Equal
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Unlike basic upvoting, our urgency-based voting reveals what users <em>truly</em> need vs. what they'd <em>like to have</em>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-orange-200 dark:border-orange-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🔴</div>
                <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-3">Must Have</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Critical features users can't live without. These drive churn if ignored.
                </p>
                <div className="mt-4 text-xs text-orange-600 dark:text-orange-400 font-medium">
                  "I need this now or I'm switching"
                </div>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-orange-200 dark:border-orange-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🟡</div>
                <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-3">Important</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Valuable improvements that significantly enhance the product experience.
                </p>
                <div className="mt-4 text-xs text-orange-600 dark:text-orange-400 font-medium">
                  "This would make my life easier"
                </div>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-blue-200 dark:border-blue-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-5xl mb-4">🟢</div>
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-3">Nice to Have</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Cool ideas that add polish but aren't essential to core workflows.
                </p>
                <div className="mt-4 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  "This would be a nice bonus"
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 max-w-3xl mx-auto border border-orange-200 dark:border-orange-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">See the Priority Mix at a Glance</h4>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="h-8 rounded-full overflow-hidden flex">
                  <div className="bg-orange-500 h-full" style={{width: '35%'}}></div>
                  <div className="bg-orange-500 h-full" style={{width: '45%'}}></div>
                  <div className="bg-blue-500 h-full" style={{width: '20%'}}></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>35% Must-Have 🔴</span>
              <span>45% Important 🟡</span>
              <span>20% Nice-to-Have 🟢</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">
              <strong>Result:</strong> You immediately know where to focus your engineering resources
            </p>
          </div>
        </div>
      </section>

      {/* Results PMs Care About */}
      <section className="py-20 md:py-32 px-4 bg-blue-50 dark:bg-blue-950 relative">
        <div className="absolute inset-0 bg-blue-100/20 dark:bg-blue-900/20"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300">
              <Sparkles className="w-3 h-3 inline mr-1" />Real Results from Real PMs
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              What Changes After Week 1 with SignalsLoop
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              These aren't vanity metrics—these are the outcomes that get you promoted.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Result 1 */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100/50 dark:border-blue-700/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-xl">"I walked into the exec meeting with data, not opinions"</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                    Instead of guessing, Srini showed their CEO the top 5 features based on urgency votes and AI priority scores. The roadmap was approved in 10 minutes.
                  </p>
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Result: Roadmap confidence • Exec trust • Less pushback</div>
                </div>
              </div>
            </div>

            {/* Result 2 */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100/50 dark:border-blue-700/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⏰</div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-xl">"I got 15 hours back every week"</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                    Vipin used to spend Monday-Wednesday just reading and tagging feedback. Now AI does it overnight. He spends Mondays planning sprints instead.
                  </p>
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Result: 60 hours/month saved • More time building • Less burnout</div>
                </div>
              </div>
            </div>

            {/* Result 3 */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-purple-100/50 dark:border-purple-700/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📈</div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-xl">"Our NPS jumped 12 points in one quarter"</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                    Users stopped feeling ignored. The public roadmap and changelog showed exactly what was being built. They saw their feedback turn into features.
                  </p>
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Result: Higher NPS • Lower churn • More word-of-mouth</div>
                </div>
              </div>
            </div>

            {/* Result 4 */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-purple-100/50 dark:border-purple-700/50">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎯</div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-xl">"We stopped building features nobody uses"</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                    The engineering team now builds from a prioritized backlog based on real user demand, not gut feelings.
                  </p>
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Result: Better product decisions • Higher feature adoption • Less waste</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to transform how you manage feedback?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join hundreds of product teams using SignalsLoop to build better products.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/#pricing">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/demo/board">
              <Button size="lg" variant="outline" className="bg-white text-blue-600 border-white hover:bg-gray-100">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 md:py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-xl font-bold">SignalsLoop</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
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
