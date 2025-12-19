'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle,
  ArrowRight,
  Zap,
  Bot,
  Target,
  Sparkles,
  Shield
} from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);

  const handleProCheckout = () => {
    router.push('/login');
  };

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
              <Link href="/features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-blue-600 dark:text-blue-400 font-medium">
                Pricing
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 lg:py-32 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200 text-sm dark:bg-blue-900 dark:text-blue-300">
              💎 Simple, Transparent Pricing
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Effortlessly affordable pricing that scales with you
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 px-4 mb-6">
              Start free forever. Upgrade for advanced AI features starting at $19/month. No setup fees or commitments.
            </p>

            {/* Pricing Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-blue-500">💳</span>
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-purple-500">🔄</span>
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-blue-600">✓</span>
                <span>API & Webhooks</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-blue-600">✓</span>
                <span>SSL Encrypted</span>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center space-x-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <span className={`px-4 py-2 text-sm font-medium transition-colors ${!isAnnual ? 'text-white bg-blue-600 rounded-md' : 'text-gray-600 dark:text-gray-400'}`}>
                Monthly
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className={`px-4 py-2 text-sm font-medium transition-colors ${isAnnual ? 'text-white bg-blue-600 rounded-md' : 'text-gray-600 dark:text-gray-400'}`}>
                Annual <span className="text-xs">(20% off)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Free Tier */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Free Forever</CardTitle>
                <div className="text-4xl font-bold text-gray-900 dark:text-white my-6">$0</div>
                <CardDescription className="text-gray-600 dark:text-gray-400">Test drive AI-powered feedback</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <ul className="space-y-3">
                  {[
                    "1 feedback board",
                    "50 posts maximum",
                    "1 team member",
                    "AI Categorization (30/day)",
                    "AI Sentiment (30/day)",
                    "AI Duplicates (10/day)",
                    "AI Smart Replies (5/day)",
                    "Hunter: 4 scans/mo (Reddit, HN)",
                    "Public boards only",
                    "Community support",
                    "SignalsLoop branding"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/login" className="block">
                    <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200">
                      Start Free
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center font-medium">
                    No credit card required
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card className="border-2 border-blue-500 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full">
                Most Popular
              </Badge>
              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Pro</CardTitle>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 my-6">
                  {isAnnual ? (
                    <>
                      $15<span className="text-lg text-gray-500 dark:text-gray-400">/month</span>
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
                        Billed annually ($180/year) • Save 20%
                      </div>
                    </>
                  ) : (
                    <>
                      $19<span className="text-lg text-gray-500 dark:text-gray-400">/month</span>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Cancel anytime
                      </div>
                    </>
                  )}
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-400">For indie makers & solo founders</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <ul className="space-y-3">
                  {[
                    "5 feedback boards",
                    "1,000 posts",
                    "2 team members",
                    "Hunter: 30 scans/mo (Reddit, HN)",
                    "10 AI Specs/month",
                    "5 Devil's Advocate/month",
                    "50 Ask SignalsLoop queries",
                    "1 Executive Brief/month",
                    "5 Call transcripts/month",
                    "Jira & Slack integration",
                    "1,000 API calls/month",
                    "Custom domain",
                    "Remove branding",
                    "Email support (48hr)"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <GradientButton
                  className="w-full mt-8 text-white font-semibold rounded-xl py-4"
                  onClick={handleProCheckout}
                >
                  🚀 Start Free - Upgrade Anytime
                </GradientButton>
              </CardContent>
            </Card>

            {/* Premium Tier */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm rounded-xl relative">
              <Badge className="absolute -top-3 right-4 bg-purple-600 text-white px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />Team
              </Badge>
              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Premium</CardTitle>
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 my-6">
                  {isAnnual ? (
                    <>
                      $63<span className="text-lg text-gray-500 dark:text-gray-400">/month</span>
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">
                        Billed annually ($756/year) • Save 20%
                      </div>
                    </>
                  ) : (
                    <>
                      $79<span className="text-lg text-gray-500 dark:text-gray-400">/month</span>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                        For growing teams
                      </div>
                    </>
                  )}
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-400">For PM teams (3-10 people)</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <ul className="space-y-3">
                  {[
                    "Unlimited boards & posts",
                    "10 team members",
                    "Hunter: 90 scans/mo + Twitter/X",
                    "30 AI Specs/month",
                    "15 Devil's Advocate/month",
                    "100 Ask SignalsLoop queries",
                    "4 Executive Briefs/month",
                    "20 Call transcripts/month",
                    "Full Competitive War Room",
                    "Linear & Webhooks",
                    "5,000 API calls/month",
                    "Team permissions & roles",
                    "Priority support (24hr)"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/login" className="block">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 py-4 rounded-xl">
                      🚀 Start with Premium
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pricing Comparison Table */}
        <div className="mt-20 max-w-5xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Feature Comparison
          </h3>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="p-4 font-bold text-gray-900 dark:text-white">Feature</div>
              <div className="p-4 text-center font-bold text-gray-900 dark:text-white border-l border-gray-200 dark:border-gray-700">Free</div>
              <div className="p-4 text-center font-bold text-blue-600 dark:text-blue-400 border-l border-gray-200 dark:border-gray-700">Pro $19</div>
              <div className="p-4 text-center font-bold text-purple-600 dark:text-purple-400 border-l border-gray-200 dark:border-gray-700">Premium $79</div>
            </div>

            {/* Table Rows */}
            {[
              { feature: "Feedback Boards", free: "1", pro: "5", premium: "Unlimited" },
              { feature: "Posts", free: "50", pro: "1,000", premium: "Unlimited" },
              { feature: "Team Members", free: "1", pro: "2", premium: "10" },
              { feature: "Hunter Agent", free: "4/mo", pro: "30/mo", premium: "90/mo + Twitter" },
              { feature: "AI Specs", free: false, pro: "10/mo", premium: "30/mo" },
              { feature: "Devil's Advocate", free: false, pro: "5/mo", premium: "15/mo" },
              { feature: "Ask SignalsLoop", free: false, pro: "50/mo", premium: "100/mo" },
              { feature: "Executive Briefs", free: false, pro: "1/mo", premium: "4/mo" },
              { feature: "Call Intelligence", free: false, pro: "5/mo", premium: "20/mo" },
              { feature: "AI Categorization", free: "30/day", pro: "1K/mo", premium: "Unlimited" },
              { feature: "Competitive War Room", free: false, pro: "Basic", premium: "Full" },
              { feature: "Private Boards", free: false, pro: true, premium: true },
              { feature: "Custom Domain", free: false, pro: true, premium: true },
              { feature: "Jira Integration", free: false, pro: true, premium: true },
              { feature: "Linear Integration", free: false, pro: false, premium: true },
              { feature: "Webhooks", free: false, pro: false, premium: true },
              { feature: "API Calls", free: false, pro: "1K/mo", premium: "5K/mo" },
              { feature: "Support", free: "Community", pro: "Email 48hr", premium: "Priority 24hr" },
            ].map((row, index) => (
              <div
                key={row.feature}
                className={`grid grid-cols-4 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'
                  } border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors`}
              >
                <div className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{row.feature}</div>
                <div className="p-3 text-center border-l border-gray-200 dark:border-gray-700 text-sm">
                  {typeof row.free === 'boolean' ? (
                    row.free ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">{row.free}</span>
                  )}
                </div>
                <div className="p-3 text-center border-l border-gray-200 dark:border-gray-700 text-sm">
                  {typeof row.pro === 'boolean' ? (
                    row.pro ? (
                      <CheckCircle className="w-4 h-4 text-blue-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )
                  ) : (
                    <span className="text-blue-700 dark:text-blue-300 font-medium">{row.pro}</span>
                  )}
                </div>
                <div className="p-3 text-center border-l border-gray-200 dark:border-gray-700 text-sm">
                  {typeof row.premium === 'boolean' ? (
                    row.premium ? (
                      <CheckCircle className="w-4 h-4 text-purple-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )
                  ) : (
                    <span className="text-purple-700 dark:text-purple-300 font-medium">{row.premium}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA below table */}
          <div className="text-center mt-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              All plans include SSL encryption, uptime SLA, and data backups
            </p>
            <Link href="/login">
              <Button className="cta-primary text-lg px-8 py-6">
                Start Free • Upgrade Anytime
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Competitive Comparison */}
      <section className="py-20 md:py-32 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-orange-100 text-orange-700 border-orange-200 text-base px-4 py-2 dark:bg-orange-900 dark:text-orange-300">
              <Zap className="w-4 h-4 inline mr-1" />Modern AI-Powered Feedback Management
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Pay <span className="line-through text-gray-400">Thousands Per Year</span> for Legacy Tools?<br />
              <span className="text-blue-600">Get Advanced AI Features for $19/Month</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Most feedback tools charge <strong className="text-orange-600">$100-300/month (or per-user)</strong> with limited or no AI capabilities. We built SignalsLoop to deliver <strong className="text-blue-600">comprehensive AI automation</strong> at a fraction of the cost.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-700 rounded-lg px-6 py-3">
              <span className="text-2xl">🚀</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Join hundreds of teams automating their feedback workflow with AI</p>
            </div>
          </div>

          {/* AI Features Callout Box */}
          <div className="mb-8 bg-purple-100 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center flex items-center justify-center gap-2"><Bot className="w-5 h-5" />Why Teams Choose SignalsLoop</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl mb-3">🤖</div>
                <div className="font-bold text-gray-900 dark:text-white mb-2">5 AI Features</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Auto-categorization, priority scoring, duplicate detection, smart replies, and writing assistant</div>
              </div>
              <div>
                <div className="text-4xl mb-3">💰</div>
                <div className="font-bold text-gray-900 dark:text-white mb-2">No Per-User Pricing</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">$19/month flat rate. No surprise bills as your team grows.</div>
              </div>
              <div>
                <div className="text-4xl mb-3">⚡</div>
                <div className="font-bold text-gray-900 dark:text-white mb-2">Built for Speed</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Simple, fast interface. Start collecting feedback in 5 minutes.</div>
              </div>
            </div>
            <p className="text-center mt-6 text-sm text-gray-700 dark:text-gray-300">
              <strong className="text-purple-700 dark:text-purple-400">Comprehensive AI automation at 75-90% lower cost than traditional alternatives</strong>
            </p>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6 italic">
            *Pricing and features based on publicly available information as of January 2025. Subject to change. Visit competitor websites for current details.
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Typical Legacy Tool Example 1 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700 opacity-75">
              <div className="text-center mb-4">
                <div className="text-xl font-bold text-gray-400 mb-2">Legacy Tool A</div>
                <div className="text-3xl font-bold text-orange-600">~$99</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">/month*</div>
                <div className="mt-2 text-xs font-bold text-orange-600">≈ $1,188/year</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 dark:text-gray-400">Limited/no AI features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 dark:text-gray-400">Manual categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm">✓</span>
                  <span className="text-gray-600 dark:text-gray-400">Roadmap</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm">✓</span>
                  <span className="text-gray-600 dark:text-gray-400">Integrations</span>
                </li>
              </ul>
            </div>

            {/* Typical Legacy Tool Example 2 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700 opacity-75">
              <div className="text-center mb-4">
                <div className="text-xl font-bold text-gray-400 mb-2">Legacy Tool B</div>
                <div className="text-3xl font-bold text-orange-600">~$59</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">/user/month*</div>
                <div className="mt-2 text-xs font-bold text-orange-600">≈ $3,540/year (5 users)</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 text-sm">~</span>
                  <span className="text-gray-600 dark:text-gray-400">Basic insights only</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 dark:text-gray-400">No auto-categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 text-sm">⚠</span>
                  <span className="text-gray-600 dark:text-gray-400">Per-user pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm">✓</span>
                  <span className="text-gray-600 dark:text-gray-400">Customization</span>
                </li>
              </ul>
            </div>

            {/* Typical Legacy Tool Example 3 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-200 dark:border-gray-700 opacity-75">
              <div className="text-center mb-4">
                <div className="text-xl font-bold text-gray-400 mb-2">Legacy Tool C</div>
                <div className="text-3xl font-bold text-orange-600">~$59</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">/user/month*</div>
                <div className="mt-2 text-xs font-bold text-orange-600">≈ $2,124/year (3 users)</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 text-sm">~</span>
                  <span className="text-gray-600 dark:text-gray-400">Limited AI capabilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 text-sm font-bold">✗</span>
                  <span className="text-gray-600 dark:text-gray-400">No comprehensive AI suite</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm">✓</span>
                  <span className="text-gray-600 dark:text-gray-400">Portal features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 text-sm">⚠</span>
                  <span className="text-gray-600 dark:text-gray-400">Expensive per-user</span>
                </li>
              </ul>
            </div>

            {/* SignalsLoop */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 shadow-xl border-4 border-blue-400 dark:border-blue-600 relative transform scale-105">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                🚀 AI-Powered Winner
              </Badge>
              <div className="text-center mb-4 mt-2">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">SignalsLoop</div>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">$19</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">/month (unlimited users)</div>
                <div className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400">= Only $228/year</div>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 dark:text-white font-bold">AI Auto-Categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 dark:text-white font-bold">AI Priority Scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 dark:text-white font-bold">AI Duplicate Detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 dark:text-white font-bold">AI Smart Replies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 dark:text-white font-bold">✍️ AI Writing Assistant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm font-bold">✓</span>
                  <span className="text-gray-900 dark:text-white font-medium">Slack, Discord, Webhooks, API</span>
                </li>
                <li className="flex items-start gap-2 bg-yellow-100 dark:bg-yellow-900/20 -mx-2 px-2 py-1 rounded">
                  <span className="text-blue-500 text-sm font-bold">★</span>
                  <span className="text-blue-700 dark:text-blue-400 font-bold">FREE PLAN WITH AI!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Dramatic Savings Section with FOMO */}
          <div className="mt-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-8 shadow-xl border-2 border-blue-300 dark:border-blue-700">
            <div className="text-center mb-6">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                💰 Your Team Could Save Thousands This Year
              </h3>
              <p className="text-base text-gray-700 dark:text-gray-300">
                Same features (actually, <strong className="text-blue-700 dark:text-blue-400">way better with AI</strong>). Fraction of the price.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border-2 border-blue-200 dark:border-blue-700">
                <div className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">vs ~$99/mo Tools</div>
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">~$960</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">potential savings/year*</div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Many lack comprehensive AI.</strong><br />
                    You're paying for manual workflows.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border-2 border-blue-200 dark:border-blue-700">
                <div className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">vs Per-User Tools (5 users @ ~$59)</div>
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">~$3,300</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">potential savings/year*</div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Up to 93% cheaper!</strong><br />
                    No per-user fees means predictable costs.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border-2 border-blue-200 dark:border-blue-700">
                <div className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">vs Enterprise Tools</div>
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">~$1,500+</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">potential savings/year*</div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Up to 89% cheaper!</strong><br />
                    Get AI automation without enterprise cost.
                  </div>
                </div>
              </div>
            </div>

            {/* The Kicker - What You Get */}
            <div className="bg-purple-600 text-white rounded-xl p-6">
              <div className="text-center">
                <h4 className="text-xl font-bold mb-3 flex items-center justify-center gap-2"><Target className="w-5 h-5" />Here's What Makes This a No-Brainer:</h4>
                <div className="grid md:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <div className="font-bold text-lg">Comprehensive 5-Feature AI Suite</div>
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

            <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400 italic max-w-3xl mx-auto">
              *Comparisons based on publicly available pricing and feature information as of January 2025. Actual competitor pricing, features, and capabilities may vary and are subject to change. We recommend visiting competitor websites directly to verify current offerings. Savings calculations are estimates based on typical usage scenarios and may not reflect your specific needs.
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
            Start free forever. Upgrade when ready. No credit card required.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleProCheckout}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-10 py-4 font-bold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🚀 Get Started in 2 Minutes
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-300">✓</span>
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
