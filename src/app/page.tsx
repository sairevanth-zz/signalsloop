'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  ArrowRight,
  MessageSquare,
  Bot,
  Target,
  Users,
  BarChart3,
  Mail,
  Zap,
  Shield,
  Sparkles,
  CheckCircle,
  Calendar,
  Star,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const HERO_HIGHLIGHTS = [
  '✨ Public Roadmap + Feedback Widget',
  '🤖 5 AI Features Free',
  '⚡ 2-Min Setup',
];

const STATS = [
  {
    value: '147',
    label: 'Product teams joined this week',
    description: 'Bootstrapped founders to scaled product orgs adopt SignalsLoop daily.',
  },
  {
    value: '50K+',
    label: 'Pieces of feedback processed',
    description: 'AI categorizes every post, vote, transcript, and survey for you automatically.',
  },
  {
    value: '5',
    label: 'Proprietary AI automations',
    description: 'Categorization, priority scoring, duplicate detection, smart replies, and writing assistance.',
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: MessageSquare,
    title: 'Unify every conversation',
    description:
      'Connect Slack, Intercom, email, support forms, and public boards into one shared workspace for your team.',
  },
  {
    icon: Bot,
    title: 'AI triage & prioritization',
    description:
      'SignalsLoop reads every request, tags themes, scores impact, and surfaces the next best thing to build.',
  },
  {
    icon: Target,
    title: 'Roadmap that updates itself',
    description:
      'Move ideas into roadmap columns, publish changelog notes, and close the loop with subscribers automatically.',
  },
  {
    icon: Users,
    title: 'Delight your community',
    description:
      'Invite customers to vote, follow updates, and receive personal replies without living in spreadsheets.',
  },
  {
    icon: Zap,
    title: 'Automate your workflows',
    description:
      'Pipe insights into Linear, Jira, Notion, or Slack with rules, webhooks, and bulk actions that keep teams aligned.',
  },
  {
    icon: Shield,
    title: 'Secure by design',
    description:
      'Granular roles, private boards, custom domains, and audit trails keep customer conversations safe and organized.',
  },
];

const WORKFLOW_HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: 'Always-on AI assistance',
    description:
      'Smart replies and writing assistance craft release notes, changelog posts, and status updates in your voice.',
  },
  {
    icon: Mail,
    title: 'Close the loop instantly',
    description:
      'Send personalized replies, invite champions to betas, and keep supporters informed without manual busywork.',
  },
  {
    icon: BarChart3,
    title: 'Insight-rich analytics',
    description:
      'See trending themes, quantify demand over time, and share decision-ready reports with leadership in seconds.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      '“As a solo founder, I was drowning in feedback from 500+ users. SignalsLoop’s AI sorted everything overnight. I saved 12 hours/week and finally knew what to build next.”',
    author: 'Marcus Chen',
    role: 'Solo Founder @ TaskFlow',
  },
  {
    quote:
      '“We switched from Legacy Tool A (~$99/mo) to SignalsLoop. Got better AI features for 1/5th the price. The priority scoring alone changed how we plan our roadmap.”',
    author: 'Sarah Martinez',
    role: 'Head of Product @ GrowthLabs',
  },
];

const BENEFIT_PARAGRAPHS = [
  "Public feedback is your superpower. You're a solo founder, indie maker, or early-stage startup. Public feedback boards help you validate ideas and build what users actually want—but traditional feedback tools price you out with per-user fees and enterprise pricing.",
  "We believe every founder deserves powerful feedback tools. That's why SignalsLoop starts at $0 (forever free) and scales to just $19/month for unlimited everything.",
];

const COMPARISON_CARDS = [
  {
    emoji: '💸',
    title: 'Legacy Tools',
    price: '$79-299/mo',
    description: 'Entry-level plans with annual contracts, setup fees, and limited seats.',
  },
  {
    emoji: '📊',
    title: 'Per-User Pricing',
    price: '$30-100/user',
    description: 'Most incumbents charge per teammate—5 seats can easily cost $500+/month.',
  },
  {
    emoji: '🎯',
    title: 'Limited AI',
    price: 'Extra $$',
    description: 'AI is locked behind enterprise tiers or per-request fees that scale poorly.',
  },
];

const PRICING_FEATURES = {
  free: [
    'Public feedback board — collect unlimited ideas',
    '5 AI features — 10 requests/day to test everything',
    'Team collaboration — invite teammates at no cost',
    'Roadmap & changelog — keep users informed',
  ],
  pro: [
    'Unlimited AI — no daily limits, no per-request fees',
    'Private boards — run internal conversations',
    'Custom domain — feedback.yourdomain.com',
    'Unlimited team — no per-user pricing ever',
  ],
};

const FOOTER_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/demo/board', label: 'Live Demo' },
  { href: '/login', label: 'Sign In' },
];

export default function Homepage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
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
                refresh_token: refreshToken,
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
                    user_id: sessionData.user.id,
                  });

                  analytics.identify(sessionData.user.id, {
                    email: sessionData.user.email,
                    created_at: sessionData.user.created_at,
                    signup_method: 'magic_link',
                  });

                  if (sessionData.user.email) {
                    try {
                      const emailResponse = await fetch('/api/users/welcome', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: sessionData.user.id }),
                      });
                      console.log('Welcome email API response:', emailResponse.status);
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

    if (!loading && user) {
      router.push('/app');
    }
  }, [router, user, loading]);

  const handleProCheckout = (source: string = 'homepage') => {
    import('@/lib/analytics').then(({ analytics }) => {
      analytics.page('cta_clicked', {
        section: source,
        cta_text: source === 'hero' ? 'Start Free' : 'Get Started',
        destination: '/login',
      });
    });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-supademo flex items-center justify-center text-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/20">
            <span className="text-lg font-bold">S</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-sm text-slate-300">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const displayedPrice = isAnnual ? '$190' : '$19';
  const priceSuffix = isAnnual ? '/year (2 months free)' : '/month';

  return (
    <div className="relative min-h-screen bg-supademo text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-80 blur-3xl" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(80, 99, 255, 0.45), transparent 60%)' }} />
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-[400px] opacity-60 blur-3xl" style={{ background: 'radial-gradient(circle at 80% 10%, rgba(34, 211, 238, 0.35), transparent 55%)' }} />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold shadow-inner shadow-white/5">
              S
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">SignalsLoop</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-200 md:flex">
            <Link href="#features" className="transition-colors hover:text-white">Features</Link>
            <Link href="#pricing" className="transition-colors hover:text-white">Pricing</Link>
            <Link href="/demo/board" className="transition-colors hover:text-white">Live Demo</Link>
            <Link href="/login" className="transition-colors hover:text-white">Sign In</Link>
          </nav>
          <Button onClick={() => handleProCheckout('header')} className="hidden bg-white/90 text-slate-900 hover:bg-white md:inline-flex">
            Start Free
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 md:pt-24">
          <div className="flex flex-col items-center gap-6 text-center">
            <Badge className="bg-white/10 text-slate-200 backdrop-blur-md">AI-Powered Feedback Management</Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
              The AI Product Intelligence Platform that builds your roadmap for you.
            </h1>
            <p className="max-w-3xl text-lg text-slate-300 md:text-xl">
              Connect with thousands of customers through public boards. AI reads every conversation, identifies patterns,
              prioritizes opportunities, and generates a data-driven roadmap—automatically.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {HERO_HIGHLIGHTS.map((item) => (
                <span key={item} className="rounded-full border border-white/10 px-4 py-2 backdrop-blur-md">
                  {item}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-slate-200"
                onClick={() => handleProCheckout('hero')}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Link href="/demo/board">
                <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                  Explore Live Demo
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-[1.1fr,0.9fr]">
            <div className="glass-panel rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span>Watch your scattered feedback transform into an actionable roadmap.</span>
              </div>
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 text-sm text-slate-300">
                  <span>SignalsLoop Workspace</span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300">AI Applied</span>
                </div>
                <div className="space-y-6 px-6 py-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI Inbox</h3>
                    <p className="text-sm text-slate-400">
                      Automatic categorization, duplicate detection, and smart grouping keep your queue crystal clear.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Priority scoring</h3>
                    <p className="text-sm text-slate-400">
                      Weighted models combine customer impact, revenue signals, and strategic fit to highlight what matters.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">One-click roadmap</h3>
                    <p className="text-sm text-slate-400">
                      Ship updates, publish changelog posts, and send thank-you replies in seconds—not weeks.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {STATS.map((stat) => (
                <Card key={stat.label} className="border-white/10 bg-white/5 text-slate-100">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-3xl font-semibold text-white">{stat.value}</CardTitle>
                    <CardDescription className="text-slate-300">{stat.label}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-400">{stat.description}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 pb-24">
          <div className="flex flex-col gap-4 text-center">
            <Badge className="mx-auto bg-white/10 text-slate-200 backdrop-blur-md">Everything in one platform</Badge>
            <h2 className="text-3xl font-semibold text-white md:text-4xl">From feedback intake to roadmap in minutes.</h2>
            <p className="mx-auto max-w-3xl text-base text-slate-300 md:text-lg">
              SignalsLoop replaces your spreadsheets, forms, and endless Slack threads with an integrated, AI-first workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {FEATURE_HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-white/10 bg-white/5 text-slate-100 transition-colors hover:bg-white/10">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl text-white">{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">{description}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-10 md:grid-cols-[1.2fr,0.8fr]">
            <div className="glass-panel rounded-3xl p-10 shadow-xl">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Calendar className="h-4 w-4" />
                <span>Built for product teams that move fast</span>
              </div>
              <h3 className="mt-6 text-3xl font-semibold text-white">Put follow-up on autopilot.</h3>
              <p className="mt-4 text-base text-slate-300">
                SignalsLoop reads every piece of feedback, categorizes it, finds duplicates, scores priorities, and builds your roadmap
                in seconds—not weeks. Say goodbye to stale tracking sheets and lottery-ticket inboxes.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {WORKFLOW_HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-lg font-semibold text-white">{title}</h4>
                    <p className="mt-2 text-sm text-slate-300">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {TESTIMONIALS.map((testimonial) => (
                <Card key={testimonial.author} className="border-white/10 bg-white/5 text-slate-100">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <CardDescription className="text-base text-slate-200">{testimonial.quote}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-400">
                    <div className="font-semibold text-white">{testimonial.author}</div>
                    <div>{testimonial.role}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="glass-panel rounded-3xl p-10 shadow-xl">
            <Badge className="bg-white/10 text-slate-200 backdrop-blur-md">Founder-friendly pricing</Badge>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
              Public feedback is your superpower. Legacy tools shouldn’t break the bank.
            </h2>
            <div className="mt-6 space-y-5 text-base text-slate-300">
              {BENEFIT_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {COMPARISON_CARDS.map((card) => (
                <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="text-3xl">{card.emoji}</div>
                  <h3 className="mt-4 text-xl font-semibold text-white">{card.title}</h3>
                  <div className="mt-2 text-lg font-semibold text-rose-300">{card.price}</div>
                  <p className="mt-3 text-sm text-slate-300">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 pb-24">
          <div className="glass-panel rounded-3xl p-10 shadow-xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge className="bg-emerald-500/20 text-emerald-200">Starts free. Unlock Pro anytime.</Badge>
                <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Simple pricing that grows with you.</h2>
                <p className="mt-3 max-w-xl text-base text-slate-300">
                  No setup fees. No contracts. No per-user charges. Just honest pricing built for indie makers and product teams.
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span>Monthly</span>
                <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                <span>Yearly (save 2 months)</span>
              </div>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <CheckCircle className="h-5 w-5 text-emerald-300" />
                    Free Forever
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    {PRICING_FEATURES.free.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 text-emerald-300">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Sparkles className="h-5 w-5 text-sky-300" />
                    Upgrade to Pro
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    {PRICING_FEATURES.pro.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 text-sky-300">★</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/10 p-8 text-slate-100 shadow-inner">
                <div>
                  <div className="text-sm uppercase tracking-wide text-emerald-300">Pro Plan</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-4xl font-semibold text-white">{displayedPrice}</div>
                    <div className="text-sm text-slate-300">{priceSuffix}</div>
                  </div>
                  <p className="mt-4 text-sm text-slate-300">
                    Unlimited projects, unlimited teammates, unlimited AI. Built to replace tools that cost $79-$299/month.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200">
                    <span className="text-emerald-300 font-semibold">$19/mo</span>
                    <span className="text-slate-400">vs</span>
                    <span className="text-slate-400 line-through">$79-299/mo</span>
                    <Badge className="bg-emerald-500/20 text-emerald-200">Save up to 93%</Badge>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <Button onClick={() => handleProCheckout('pricing')} className="bg-white text-slate-900 hover:bg-slate-200">
                    Start Free Forever
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Link href="/demo/board" className="text-sm text-slate-300 transition-colors hover:text-white">
                    Explore the live public board →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-24 text-center">
          <Badge className="mx-auto bg-white/10 text-slate-200 backdrop-blur-md">Ready to build faster?</Badge>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
            Turn community feedback into a living roadmap overnight.
          </h2>
          <p className="mt-4 text-base text-slate-300 md:text-lg">
            Hundreds of makers, startups, and growth-stage product teams rely on SignalsLoop to stay close to customers.
            You can be live before your next coffee.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-200" onClick={() => handleProCheckout('cta')}>
              Create your workspace
            </Button>
            <Link href="/demo/board">
              <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                View the public roadmap demo
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold">S</div>
              <span className="font-semibold tracking-tight">SignalsLoop</span>
            </div>
            <p className="mt-3 max-w-sm text-xs text-slate-500">
              SignalsLoop helps modern product teams centralize feedback, apply AI, and ship what customers actually want.
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 md:gap-6">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} SignalsLoop. Built for builders.
          </div>
        </div>
      </footer>
    </div>
  );
}
