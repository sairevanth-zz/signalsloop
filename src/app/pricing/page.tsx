'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Zap, Target, Shield } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);

  const handleCheckout = (tier: string) => {
    router.push('/login');
  };

  const plans = [
    {
      name: 'Free',
      tagline: 'For solo makers',
      price: { monthly: 0, annual: 0 },
      highlight: false,
      color: '#8A8A85',
      features: [
        '1 project',
        '50 feedback items',
        '3 AI agents',
        'AI categorization (30/day)',
        'Hunter: 4 scans/mo',
        'Community support',
      ],
      cta: 'Start Free',
      ctaSecondary: true,
    },
    {
      name: 'Pro',
      tagline: 'For Builders',
      price: { monthly: 19, annual: 15 },
      highlight: true,
      badge: 'Most Popular',
      color: '#FF4F00',
      savings: 'Replaces $200/mo of tools',
      features: [
        'All 12 AI agents',
        '1,200 feedback items',
        '5 projects',
        'AI Spec Writer',
        'Hunter: 30 scans/mo',
        '10 AI Specs/month',
        "5 Devil's Advocate/month",
        '50 Ask SignalsLoop queries',
        'Jira & Slack integration',
        'Custom domain',
        'Email support (48hr)',
      ],
      cta: 'Get Pro',
      ctaSecondary: false,
    },
    {
      name: 'Premium',
      tagline: 'For Teams',
      price: { monthly: 79, annual: 63 },
      highlight: false,
      color: '#4A6741',
      features: [
        'Everything in Pro',
        'Unlimited everything',
        '10 team members',
        'Go/No-Go Dashboards',
        'Outcome Attribution',
        '30 AI Specs/month',
        "15 Devil's Advocate/month",
        'Hunter: 90 scans/mo + Twitter',
        'Full Competitive War Room',
        'Linear & Webhooks',
        'Priority support (24hr)',
      ],
      cta: 'Get Premium',
      ctaSecondary: true,
    },
  ];

  const comparisonFeatures = [
    { name: 'Projects', free: '1', pro: '5', premium: 'Unlimited' },
    { name: 'Feedback Items', free: '50', pro: '1,200', premium: 'Unlimited' },
    { name: 'Team Members', free: '1', pro: '2', premium: '10' },
    { name: 'AI Agents', free: '3', pro: 'All 12', premium: 'All 12' },
    { name: 'Hunter Agent Scans', free: '4/mo', pro: '30/mo', premium: '90/mo + Twitter' },
    { name: 'AI Spec Generation', free: '—', pro: '10/mo', premium: '30/mo' },
    { name: "Devil's Advocate", free: '—', pro: '5/mo', premium: '15/mo' },
    { name: 'Ask SignalsLoop', free: '—', pro: '50/mo', premium: '100/mo' },
    { name: 'Go/No-Go Dashboard', free: '—', pro: '—', premium: '✓' },
    { name: 'Outcome Attribution', free: '—', pro: '—', premium: '✓' },
    { name: 'Custom Domain', free: '—', pro: '✓', premium: '✓' },
    { name: 'Jira Integration', free: '—', pro: '✓', premium: '✓' },
    { name: 'Linear Integration', free: '—', pro: '—', premium: '✓' },
    { name: 'Webhooks', free: '—', pro: '—', premium: '✓' },
    { name: 'Support', free: 'Community', pro: 'Email 48hr', premium: 'Priority 24hr' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FFFAF5' }}>
      {/* Gradient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-36 w-[500px] h-[500px] rounded-full opacity-60"
          style={{ background: 'linear-gradient(180deg, #FFB088 0%, #FFD4BF 50%, #FFECE0 100%)', filter: 'blur(60px)' }} />
        <div className="absolute top-0 -right-24 w-[450px] h-[450px] rounded-full opacity-60"
          style={{ background: 'linear-gradient(180deg, #FFE082 0%, #FFF3C4 50%, #FFFBEB 100%)', filter: 'blur(60px)' }} />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.04]"
        style={{ background: 'rgba(255, 250, 245, 0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#FF4F00] rounded-xl flex items-center justify-center text-white text-lg">⚡</div>
            <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[22px] text-[#2D2D2A]">SignalsLoop</span>
          </Link>
          <div className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-[#5C5C57]">
            <Link href="/" className="hover:text-[#FF4F00] transition-colors">Home</Link>
            <Link href="/products" className="hover:text-[#FF4F00] transition-colors">Products</Link>
            <Link href="/pricing" className="text-[#FF4F00]">Pricing</Link>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <Link href="/login" className="text-[15px] font-medium text-[#2D2D2A] hover:text-[#FF4F00] transition-colors">Log in</Link>
            <Link href="/login" className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-lg hover:bg-[#E64700] transition-all">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-32 pb-20 px-6">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF4F00] mb-4 block">
            💎 Simple, Transparent Pricing
          </span>
          <h1 className="font-[family-name:var(--font-fraunces)] font-medium text-[#2D2D2A] mb-6"
            style={{ fontSize: 'clamp(40px, 5vw, 60px)', lineHeight: 1.1 }}>
            Start Free.<br /><span className="text-[#FF4F00]">Scale When Ready.</span>
          </h1>
          <p className="text-lg text-[#5C5C57] max-w-2xl mx-auto">
            No credit card required. Cancel anytime. All plans include core AI features.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-[#5C5C57]">
            {[
              { icon: <Shield className="w-4 h-4 text-[#FF4F00]" />, text: 'Enterprise Security' },
              { icon: '💳', text: 'Secure Payments' },
              { icon: '🔄', text: 'Cancel Anytime' },
              { icon: '✓', text: 'SSL Encrypted' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-black/[0.04]">
                {typeof badge.icon === 'string' ? <span>{badge.icon}</span> : badge.icon}
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4 bg-white p-1 rounded-xl shadow-sm border border-black/[0.04]">
            <button
              className={`px-6 py-2.5 text-[15px] font-medium transition-all rounded-lg ${!isAnnual ? 'text-white bg-[#FF4F00]' : 'text-[#5C5C57]'}`}
              onClick={() => setIsAnnual(false)}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2.5 text-[15px] font-medium transition-all rounded-lg ${isAnnual ? 'text-white bg-[#FF4F00]' : 'text-[#5C5C57]'}`}
              onClick={() => setIsAnnual(true)}
            >
              Annual <span className="text-xs opacity-80">(20% off)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-24">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl p-8 border shadow-lg relative transition-all hover:-translate-y-1 ${plan.highlight ? 'border-2 border-[#FF4F00] pt-12' : 'border-black/[0.06]'
                }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-[#FF4F00] text-white text-[13px] font-bold rounded-full whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-1">{plan.name}</h2>
              <p className="text-sm font-semibold mb-6" style={{ color: plan.color }}>{plan.tagline}</p>

              <div className="mb-6">
                <span className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">
                  ${isAnnual ? plan.price.annual : plan.price.monthly}
                </span>
                <span className="text-lg text-[#8A8A85]">/mo</span>
                {isAnnual && plan.price.annual !== plan.price.monthly && (
                  <div className="text-sm text-[#4A6741] font-medium mt-1">
                    Billed annually · Save 20%
                  </div>
                )}
              </div>

              {plan.savings && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E8F0E8] border border-[#4A6741]/20 rounded-full text-xs font-semibold text-[#4A6741] mb-6">
                  💰 {plan.savings}
                </div>
              )}

              <ul className="space-y-2.5 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5" >
                    <CheckCircle
                      className="w-4.5 h-4.5 flex-shrink-0 mt-0.5"
                      style={{ color: plan.highlight ? '#FF4F00' : plan.color }}
                    />
                    <span className={`text-[15px] text-[#5C5C57] ${i === 0 && plan.highlight ? 'font-bold text-[#2D2D2A]' : ''}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.name.toLowerCase())}
                className={`w-full py-4 text-[15px] font-semibold rounded-xl transition-all ${plan.highlight
                    ? 'text-white bg-[#FF4F00] hover:bg-[#E64700] shadow-[0_2px_8px_rgba(255,79,0,0.25)]'
                    : 'text-[#2D2D2A] bg-white border-[1.5px] border-[#E8E8E6] hover:border-[#FF4F00] hover:text-[#FF4F00]'
                  }`}
              >
                {plan.cta}
              </button>

              {plan.name === 'Free' && (
                <p className="text-center text-[13px] text-[#8A8A85] mt-3">No credit card needed</p>
              )}
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="max-w-5xl mx-auto">
          <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] text-center mb-8">
            Feature Comparison
          </h2>

          <div className="bg-white rounded-2xl shadow-lg border border-black/[0.06] overflow-hidden">
            <div className="grid grid-cols-4 bg-[#FFF5EB] border-b border-black/[0.06]">
              <div className="p-4 font-bold text-[#2D2D2A]">Feature</div>
              <div className="p-4 text-center border-l border-black/[0.06] font-bold text-[#8A8A85]">Free</div>
              <div className="p-4 text-center border-l border-black/[0.06] font-bold text-[#FF4F00]">Pro $19</div>
              <div className="p-4 text-center border-l border-black/[0.06] font-bold text-[#4A6741]">Premium $79</div>
            </div>

            {comparisonFeatures.map((row, i) => (
              <div
                key={row.name}
                className={`grid grid-cols-4 border-b border-black/[0.04] last:border-b-0 text-sm hover:bg-[#FFFAF5] transition-colors ${i % 2 === 0 ? 'bg-[#FAFAFA]' : 'bg-white'
                  }`}
              >
                <div className="p-3 font-medium text-[#2D2D2A]">{row.name}</div>
                <div className="p-3 text-center border-l border-black/[0.04] text-[#5C5C57]">{row.free}</div>
                <div className="p-3 text-center border-l border-black/[0.04] font-medium text-[#FF4F00]">{row.pro}</div>
                <div className="p-3 text-center border-l border-black/[0.04] font-medium text-[#4A6741]">{row.premium}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-[#5C5C57] mb-4">All plans include SSL encryption, uptime SLA, and data backups</p>
            <button
              onClick={() => handleCheckout('free')}
              className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all shadow-[0_2px_8px_rgba(255,79,0,0.25)]"
            >
              Start Free • Upgrade Anytime <ArrowRight className="inline w-5 h-5 ml-2" />
            </button>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="max-w-5xl mx-auto mt-24 py-16 px-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, #FFF5EB 0%, #FFFAF5 100%)' }}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full mb-4">
              <Zap className="w-4 h-4 text-[#FF4F00]" />
              <span className="text-sm font-semibold text-[#FF4F00]">Modern AI-Powered Platform</span>
            </div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#2D2D2A] mb-2">
              Why Pay <span className="line-through text-[#8A8A85]">$200+/month</span> for Legacy Tools?
            </h2>
            <p className="text-lg text-[#5C5C57]">Get advanced AI features for $19/month</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🤖', title: '12 AI Agents', desc: 'Auto-categorization, specs, predictions, and more' },
              { icon: '💰', title: 'No Per-User Pricing', desc: '$19/month flat rate. No surprise bills.' },
              { icon: '⚡', title: 'Built for Speed', desc: 'Start collecting feedback in 5 minutes.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="font-bold text-[#2D2D2A] mb-2">{item.title}</div>
                <div className="text-sm text-[#5C5C57]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="py-24 px-6 text-center" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="font-[family-name:var(--font-fraunces)] font-medium text-white mb-6"
            style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
            Ready to transform how you manage feedback?
          </h2>
          <p className="text-xl text-white/60 mb-10">Start free forever. Upgrade when ready.</p>
          <button
            onClick={() => handleCheckout('free')}
            className="px-10 py-5 text-[17px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all"
          >
            🚀 Get Started in 2 Minutes <ArrowRight className="inline w-5 h-5 ml-2" />
          </button>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/50">
            <span>✓ Free forever plan</span>
            <span>✓ No setup fees</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6" style={{ background: '#1a1a18', color: 'rgba(255, 255, 255, 0.6)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#FF4F00] rounded-lg flex items-center justify-center text-white text-sm">⚡</div>
            <span className="font-[family-name:var(--font-fraunces)] font-semibold text-lg text-white">SignalsLoop</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </div>
          <div className="text-sm">© 2025 SignalsLoop. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
