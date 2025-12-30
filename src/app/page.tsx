'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, ChevronDown, Flame, Play, ArrowRight, Sparkles, CheckCircle, Target, Bot, Brain, Zap } from 'lucide-react';

export default function Homepage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);


  useEffect(() => {
    if (user && !loading) {
      router.push('/welcome');
    }
  }, [user, loading, router]);

  const handleProCheckout = (source: string = 'homepage') => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFAF5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#FF4F00] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl">⚡</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF4F00] mx-auto mb-4"></div>
          <p className="text-[#5C5C57]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#FFFAF5' }}>
      {/* Gradient Blobs Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-36 w-[500px] h-[500px] rounded-full opacity-60"
          style={{ background: 'linear-gradient(180deg, #FFB088 0%, #FFD4BF 50%, #FFECE0 100%)', filter: 'blur(60px)' }} />
        <div className="absolute top-0 -right-24 w-[450px] h-[450px] rounded-full opacity-60"
          style={{ background: 'linear-gradient(180deg, #FFE082 0%, #FFF3C4 50%, #FFFBEB 100%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-12 left-1/3 w-[350px] h-[350px] rounded-full opacity-50"
          style={{ background: 'linear-gradient(180deg, #C8E6C9 0%, #E8F5E9 100%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.04] transition-all duration-300"
          style={{ background: 'rgba(255, 250, 245, 0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-10 h-10 rounded-xl shadow-sm" />
              <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[22px] text-[#2D2D2A]">SignalsLoop</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-9">
              {/* Products Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-[15px] font-medium text-[#5C5C57] hover:text-[#FF4F00] transition-colors flex items-center gap-1 outline-none">
                  Products
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 p-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-xl rounded-xl">
                  <Link href="/products">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-orange-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center text-white">📋</span>
                      <div>
                        <div className="font-semibold text-gray-900">All Products</div>
                        <div className="text-xs text-gray-500">Overview of all 6 hubs</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="my-1" />
                  <Link href="/products/feedback-hub">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-orange-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center text-white">📬</span>
                      <div>
                        <div className="font-semibold text-gray-900">Feedback Hub</div>
                        <div className="text-xs text-gray-500">Hunt signals across 8 platforms</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/products/spec-hub">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-amber-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C2703D] to-[#D4886A] flex items-center justify-center text-white">✏️</span>
                      <div>
                        <div className="font-semibold text-gray-900">Spec Hub</div>
                        <div className="text-xs text-gray-500">PRDs in 30 seconds</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/products/prediction-hub">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-green-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A6741] to-[#6B8E6B] flex items-center justify-center text-white">🔮</span>
                      <div>
                        <div className="font-semibold text-gray-900">Prediction Hub</div>
                        <div className="text-xs text-gray-500">Know before you build</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/products/insights-hub">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-cyan-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0091AE] to-[#00BDA5] flex items-center justify-center text-white">📊</span>
                      <div>
                        <div className="font-semibold text-gray-900">Insights Hub</div>
                        <div className="text-xs text-gray-500">See patterns humans miss</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/products/advocate-hub">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-purple-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6A5ACD] to-[#9B8FD9] flex items-center justify-center text-white">😈</span>
                      <div>
                        <div className="font-semibold text-gray-900">Advocate Hub</div>
                        <div className="text-xs text-gray-500">Challenge assumptions</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/products/stakeholder-hub">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2E475D] to-[#516F90] flex items-center justify-center text-white">👥</span>
                      <div>
                        <div className="font-semibold text-gray-900">Stakeholder Hub</div>
                        <div className="text-xs text-gray-500">Keep everyone aligned</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Solutions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-[15px] font-medium text-[#5C5C57] hover:text-[#FF4F00] transition-colors flex items-center gap-1 outline-none">
                  Solutions
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 p-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-xl rounded-xl">
                  <Link href="/solutions">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-orange-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center text-white">🎯</span>
                      <div>
                        <div className="font-semibold text-gray-900">All Solutions</div>
                        <div className="text-xs text-gray-500">See all use cases</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="my-1" />
                  <Link href="/solutions/startups">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-orange-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center text-white">🚀</span>
                      <div>
                        <div className="font-semibold text-gray-900">For Startups</div>
                        <div className="text-xs text-gray-500">Ship faster, learn faster</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/solutions/scaleups">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-green-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A6741] to-[#6B8E6B] flex items-center justify-center text-white">⚡</span>
                      <div>
                        <div className="font-semibold text-gray-900">For Scale-ups</div>
                        <div className="text-xs text-gray-500">Scale decisions, not chaos</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/solutions/enterprise">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2E475D] to-[#516F90] flex items-center justify-center text-white">🏢</span>
                      <div>
                        <div className="font-semibold text-gray-900">For Enterprise</div>
                        <div className="text-xs text-gray-500">Governance meets agility</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/pricing" className="text-[15px] font-medium text-[#5C5C57] hover:text-[#FF4F00] transition-colors">
                Pricing
              </Link>

              {/* Try It Dropdown - Demos */}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-[15px] font-medium text-[#FF4F00] hover:text-[#E64700] transition-colors flex items-center gap-1 outline-none">
                  Try It
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 p-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-xl rounded-xl">
                  <DropdownMenuLabel className="text-xs text-gray-400 uppercase tracking-wider px-2 py-1">
                    Interactive Demos
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
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
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-green-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white">✏️</span>
                      <div>
                        <div className="font-semibold text-gray-900">Spec Generator</div>
                        <div className="text-xs text-gray-500">AI writes your PRDs</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/demo/competitive-intel">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-blue-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white">⚔️</span>
                      <div>
                        <div className="font-semibold text-gray-900">Competitive Intel</div>
                        <div className="text-xs text-gray-500">Track competitors</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/demo/feedback">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-purple-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white">📬</span>
                      <div>
                        <div className="font-semibold text-gray-900">Feedback Analysis</div>
                        <div className="text-xs text-gray-500">AI theme clustering</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/demo/health-score">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-emerald-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white">💚</span>
                      <div>
                        <div className="font-semibold text-gray-900">Health Score</div>
                        <div className="text-xs text-gray-500">Customer health metrics</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/demo/board">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-amber-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">📋</span>
                      <div>
                        <div className="font-semibold text-gray-900">Feedback Board</div>
                        <div className="text-xs text-gray-500">Public feedback portal</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Resources Dropdown - Docs + Learn More */}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-[15px] font-medium text-[#5C5C57] hover:text-[#FF4F00] transition-colors flex items-center gap-1 outline-none">
                  Resources
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 p-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-xl rounded-xl">
                  <DropdownMenuLabel className="text-xs text-gray-400 uppercase tracking-wider px-2 py-1">
                    Documentation
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <Link href="/docs/api">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
                      <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white text-sm font-mono">{`</>`}</span>
                      <div>
                        <div className="font-semibold text-gray-900">API Documentation</div>
                        <div className="text-xs text-gray-500">REST API reference</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/docs/widget">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white">🧩</span>
                      <div>
                        <div className="font-semibold text-gray-900">Widget Embed</div>
                        <div className="text-xs text-gray-500">Add feedback to your app</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>

                  <DropdownMenuLabel className="text-xs text-gray-400 uppercase tracking-wider px-2 py-1 mt-2">
                    Learn More
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <Link href="/agents">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-orange-50">
                      <span className="w-8 h-8 rounded-lg bg-[#FF4F00] flex items-center justify-center text-white">🤖</span>
                      <div>
                        <div className="font-semibold text-gray-900">AI Agents</div>
                        <div className="text-xs text-gray-500">Meet our 12 AI agents</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/features">
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-blue-50">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">✨</span>
                      <div>
                        <div className="font-semibold text-gray-900">Features</div>
                        <div className="text-xs text-gray-500">All AI capabilities</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <Link href="/login" className="text-[15px] font-medium text-[#2D2D2A] hover:text-[#FF4F00] transition-colors">
                Log in
              </Link>
              <Link href="/demo/spec" className="px-5 py-2.5 text-[15px] font-semibold text-[#2D2D2A] bg-transparent border-[1.5px] border-[#2D2D2A] rounded-lg hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all">
                Get a demo
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-lg hover:bg-[#E64700] transition-all shadow-[0_2px_8px_rgba(255,79,0,0.25)] hover:shadow-[0_6px_16px_rgba(255,79,0,0.3)] hover:-translate-y-0.5"
              >
                Start free
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-[#2D2D2A]" /> : <Menu className="w-6 h-6 text-[#2D2D2A]" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-black/[0.04] bg-[#FFFAF5] max-h-[calc(100vh-72px)] overflow-y-auto">
              <div className="px-4 py-4 space-y-1">
                {/* Products Accordion */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                    className="w-full flex items-center justify-between py-3 text-base font-semibold text-[#2D2D2A]"
                  >
                    Products
                    <ChevronDown className={`w-5 h-5 transition-transform ${mobileProductsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {mobileProductsOpen && (
                    <div className="pb-3 space-y-1">
                      <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-orange-50 text-[#FF4F00] font-medium">
                        <span>📋</span> All Products
                      </Link>
                      {[
                        { href: '/products/feedback-hub', icon: '📬', name: 'Feedback Hub' },
                        { href: '/products/spec-hub', icon: '✏️', name: 'Spec Hub' },
                        { href: '/products/prediction-hub', icon: '🔮', name: 'Prediction Hub' },
                        { href: '/products/insights-hub', icon: '📊', name: 'Insights Hub' },
                        { href: '/products/advocate-hub', icon: '😈', name: 'Advocate Hub' },
                        { href: '/products/stakeholder-hub', icon: '👥', name: 'Stakeholder Hub' },
                      ].map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-[#2D2D2A]">
                          <span>{item.icon}</span> {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Solutions Accordion */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)}
                    className="w-full flex items-center justify-between py-3 text-base font-semibold text-[#2D2D2A]"
                  >
                    Solutions
                    <ChevronDown className={`w-5 h-5 transition-transform ${mobileSolutionsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {mobileSolutionsOpen && (
                    <div className="pb-3 space-y-1">
                      <Link href="/solutions" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-orange-50 text-[#FF4F00] font-medium">
                        <span>🎯</span> All Solutions
                      </Link>
                      {[
                        { href: '/solutions/startups', icon: '🚀', name: 'For Startups' },
                        { href: '/solutions/scaleups', icon: '⚡', name: 'For Scale-ups' },
                        { href: '/solutions/enterprise', icon: '🏢', name: 'For Enterprise' },
                      ].map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-[#2D2D2A]">
                          <span>{item.icon}</span> {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base font-semibold text-[#2D2D2A] border-b border-gray-100">
                  Pricing
                </Link>
                <Link href="/demo/roast" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base font-semibold text-[#FF4F00] border-b border-gray-100">
                  🔥 Try Demos
                </Link>

                <div className="pt-4 flex flex-col gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-base font-semibold text-[#2D2D2A] border-2 border-gray-200 rounded-xl">
                    Log in
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-base font-semibold text-white bg-[#FF4F00] rounded-xl">
                    Start free
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-6 text-center relative">
          {/* Hero Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-8 rounded-full text-[13px] font-semibold"
            style={{ background: '#FFECE0', border: '1px solid rgba(255, 79, 0, 0.15)', color: '#E64700' }}>
            <span className="w-2 h-2 bg-[#FF4F00] rounded-full animate-pulse"></span>
            The only platform that closes the product loop
          </div>

          {/* Hero Title */}
          <h1 className="font-[family-name:var(--font-fraunces)] font-medium text-[#2D2D2A] tracking-tight mb-7 max-w-4xl mx-auto"
            style={{ fontSize: 'clamp(40px, 5.5vw, 68px)', lineHeight: 1.1 }}>
            Hunt. Decide. Ship. Prove.<br />
            <span className="text-[#FF4F00]">One platform. No gaps.</span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xl text-[#5C5C57] max-w-2xl mx-auto mb-10 leading-relaxed">
            Other tools handle pieces. SignalsLoop handles the entire journey—from discovering what users need, to predicting what will work, to writing specs, to proving you were right.
          </p>

          {/* Prism Visual */}
          <div className="relative max-w-5xl mx-auto h-[380px] mb-10">
            {/* Left: Noise Cards */}
            <div className="absolute left-0 top-0 w-[30%] h-full hidden md:block">
              {[
                { icon: '💬', text: 'Slack thread', top: '5%', right: '30%', rotate: '-8deg', opacity: 0.55 },
                { icon: '📱', text: 'Reddit mention', top: '15%', right: '5%', rotate: '6deg', opacity: 0.75 },
                { icon: '💼', text: 'Intercom chat', top: '30%', right: '25%', rotate: '-5deg', opacity: 0.6 },
                { icon: '⭐', text: 'G2 review', top: '45%', right: '0%', rotate: '10deg', opacity: 0.7 },
                { icon: '📧', text: 'Support ticket', top: '60%', right: '28%', rotate: '-7deg', opacity: 0.5 },
                { icon: '📝', text: 'Survey response', top: '75%', right: '8%', rotate: '4deg', opacity: 0.65 },
              ].map((card, i) => (
                <div
                  key={i}
                  className="absolute bg-white rounded-xl px-3.5 py-2.5 shadow-md border border-black/[0.04] flex items-center gap-2 text-xs font-medium text-[#5C5C57] transition-all hover:opacity-100 hover:scale-110 hover:rotate-0 hover:z-50"
                  style={{ top: card.top, right: card.right, transform: `rotate(${card.rotate})`, opacity: card.opacity }}
                >
                  <span className="w-6 h-6 bg-[#FFF5EB] rounded-md flex items-center justify-center text-sm">{card.icon}</span>
                  <span>{card.text}</span>
                </div>
              ))}
            </div>

            {/* Center: Glass Prism */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative w-40 h-48">
                <div className="absolute inset-[-40px] rounded-full animate-pulse"
                  style={{ background: 'radial-gradient(circle, rgba(255, 79, 0, 0.15) 0%, transparent 60%)' }} />
                <svg viewBox="0 0 180 210" className="w-full h-full drop-shadow-2xl">
                  <defs>
                    <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                      <stop offset="25%" stopColor="rgba(255, 79, 0, 0.15)" />
                      <stop offset="50%" stopColor="rgba(255, 255, 255, 0.85)" />
                      <stop offset="75%" stopColor="rgba(74, 103, 65, 0.1)" />
                      <stop offset="100%" stopColor="rgba(255, 255, 255, 0.9)" />
                    </linearGradient>
                  </defs>
                  <polygon points="90,8 170,200 10,200" fill="url(#prismGrad)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
                </svg>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                  <div className="font-[family-name:var(--font-fraunces)] text-lg font-bold text-[#FF4F00]">⚡ AI Core</div>
                  <div className="text-[11px] font-bold text-[#8A8A85] tracking-wider">12 AGENTS</div>
                </div>
              </div>
            </div>

            {/* Right: Output Beam + Spec Card */}
            <div className="absolute right-0 top-0 w-[35%] h-full flex items-center hidden md:flex">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-24 rounded-full animate-pulse"
                style={{ background: 'linear-gradient(90deg, #FF4F00, #FF6B26)', boxShadow: '0 0 10px rgba(255, 79, 0, 0.5), 0 0 20px rgba(255, 79, 0, 0.3)' }} />
              <div className="absolute right-[5%] top-1/2 -translate-y-1/2 bg-white rounded-2xl p-5 w-52 shadow-lg border-2 border-[#FF4F00]/20">
                <div className="flex items-center gap-2.5 mb-3.5 pb-3.5 border-b border-[#E8E8E6]">
                  <div className="w-10 h-10 bg-[#FF4F00] rounded-xl flex items-center justify-center text-lg shadow-[0_4px_12px_rgba(255,79,0,0.3)]">📄</div>
                  <div>
                    <div className="text-sm font-bold text-[#2D2D2A]">Shippable Spec</div>
                    <div className="text-[11px] text-[#4A6741] font-semibold">Ready in 30 seconds</div>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-[#5C5C57] leading-relaxed">
                  <div className="text-[#C2703D] font-semibold"># Dark Mode Feature</div>
                  <div className="text-[#8A8A85] mt-1.5">## Problem Statement</div>
                  <div className="mt-0.5">Users report eye strain...</div>
                  <div className="text-[#8A8A85] mt-1.5">## User Stories</div>
                  <div className="mt-0.5">• As a user, I want...</div>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1.5 bg-[#E8F0E8] rounded-full text-[10px] font-semibold text-[#4A6741]">
                  <span className="w-1.5 h-1.5 bg-[#4A6741] rounded-full animate-pulse"></span>
                  Auto-generated
                </div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="px-8 py-4 text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all shadow-[0_2px_8px_rgba(255,79,0,0.25)] hover:shadow-[0_6px_16px_rgba(255,79,0,0.3)] hover:-translate-y-0.5"
            >
              Try the Complete Platform Free →
            </Link>
            <Link href="#platform" className="px-8 py-4 text-base font-semibold text-[#2D2D2A] bg-white border-[1.5px] border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all flex items-center gap-2">
              See the Full Loop
            </Link>
          </div>
        </section>

        {/* Metrics Banner - Continuous Marquee */}
        <section className="py-8 border-t border-b border-black/[0.04] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.7)' }}>
          <div className="relative">
            <div className="flex animate-marquee whitespace-nowrap">
              {[...Array(2)].map((_, dupeIdx) => (
                <div key={dupeIdx} className="flex items-center gap-16 px-8">
                  {[
                    { value: '4hrs → 30s', label: 'spec writing time', color: '#FF4F00' },
                    { value: '0%', label: 'feedback missed', color: '#4A6741' },
                    { value: '30 days', label: 'ahead on churn prediction', color: '#C2703D' },
                    { value: '1 platform', label: 'instead of 5+', color: '#2D2D2A' },
                    { value: '12', label: 'AI agents included', color: '#FF4F00' },
                    { value: '8+', label: 'platforms scanned', color: '#2D2D2A' },
                  ].map((metric, i) => (
                    <div key={i} className="flex items-baseline gap-2.5 flex-shrink-0">
                      <span className="font-[family-name:var(--font-fraunces)] text-3xl md:text-4xl font-semibold" style={{ color: metric.color }}>
                        {metric.value}
                      </span>
                      <span className="text-[14px] md:text-[15px] text-[#5C5C57]">{metric.label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <style jsx>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee {
              animation: marquee 25s linear infinite;
            }
          `}</style>
        </section>

        {/* Problem Section */}
        <section className="py-24 px-6" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div className="max-w-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF4F00] mb-4 block">The product management trap</span>
              <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-6"
                style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.2 }}>
                You're paid to make decisions.<br />But you spend your week collecting data to make them.
              </h2>
              <p className="text-[17px] text-[#5C5C57] leading-relaxed mb-4">
                Product management was supposed to be strategic. Instead:
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-[16px] text-[#5C5C57]">
                  <span className="text-[#FF4F00] mt-1">→</span>
                  <span>You're a <strong className="text-[#2D2D2A]">feedback archaeologist</strong>—digging through 8 different tools to find what customers actually said</span>
                </li>
                <li className="flex items-start gap-3 text-[16px] text-[#5C5C57]">
                  <span className="text-[#FF4F00] mt-1">→</span>
                  <span>You're a <strong className="text-[#2D2D2A]">spec mill</strong>—spending hours formatting documents instead of thinking strategically</span>
                </li>
                <li className="flex items-start gap-3 text-[16px] text-[#5C5C57]">
                  <span className="text-[#FF4F00] mt-1">→</span>
                  <span>You're a <strong className="text-[#2D2D2A]">defense attorney</strong>—justifying roadmap decisions with whatever evidence you can find fast</span>
                </li>
                <li className="flex items-start gap-3 text-[16px] text-[#5C5C57]">
                  <span className="text-[#FF4F00] mt-1">→</span>
                  <span>You're a <strong className="text-[#2D2D2A]">fortune teller</strong>—guessing what will work because there's no time to analyze properly</span>
                </li>
              </ul>
              <p className="text-[17px] text-[#2D2D2A] font-medium">
                What if the collecting, analyzing, writing, and proving happened automatically—and you just made the decisions?
              </p>
            </div>
            <div className="relative min-h-[300px] hidden md:block">
              {[
                { icon: '🔍', text: '"Feature request buried in Slack"', top: '0', left: '0', rotate: '-3deg' },
                { icon: '⏰', text: '"Spec took 4 hours to write"', top: '60px', left: '40%', rotate: '2deg' },
                { icon: '❓', text: '"Why are we building this?"', top: '130px', left: '10%', rotate: '-1deg' },
                { icon: '🎲', text: '"Hope this feature works..."', top: '200px', left: '35%', rotate: '3deg' },
              ].map((card, i) => (
                <div
                  key={i}
                  className="absolute bg-white rounded-xl px-4 py-3 shadow-md border border-black/[0.06] flex items-center gap-2.5 text-[13px] text-[#5C5C57] opacity-85"
                  style={{ top: card.top, left: card.left, transform: `rotate(${card.rotate})` }}
                >
                  <span className="text-lg">{card.icon}</span>
                  {card.text}
                </div>
              ))}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-3xl text-[#8A8A85]">↓</div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-semibold"
                style={{ background: '#FDF5F2', border: '1px solid #C2703D', color: '#C2703D' }}>
                The product management trap
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section id="platform" className="py-28 px-6" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="flex items-center justify-center gap-2.5 mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-[#FF4F00]">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span className="text-sm font-semibold text-[#FF4F00]">The complete product loop</span>
              </div>
              <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-4"
                style={{ fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.15 }}>
                One platform. Six powerful hubs.<br />Everything you need. Nothing you don't.
              </h2>
              <p className="text-lg text-[#5C5C57]">
                Other tools give you a piece of the puzzle. A feedback board here. A spec template there. SignalsLoop is the first platform that handles the entire product intelligence loop—with AI doing the heavy lifting at every stage.
              </p>
              <div className="flex justify-center gap-4 mt-8">
                <Link
                  href="/signup"
                  className="px-6 py-3 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all"
                >
                  Try it free
                </Link>
                <Link
                  href="/products"
                  className="px-6 py-3 text-[15px] font-semibold text-[#2D2D2A] bg-white border-[1.5px] border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all"
                >
                  Explore all hubs
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: '🎯', title: 'Feedback Hub', subtitle: 'The Signal Command Center', color: 'from-[#FF4F00] to-[#FF6B26]', features: ['AI agents scan 8+ platforms 24/7', 'Auto-categorize & deduplicate', 'Revenue-weighted prioritization'] },
                { icon: '✏️', title: 'Spec Hub', subtitle: 'From Idea to PRD in 30 Seconds', color: 'from-[#C2703D] to-[#D4886A]', features: ['Complete specs with evidence citations', 'User stories & acceptance criteria', 'One-click Jira export'] },
                { icon: '🔮', title: 'Prediction Hub', subtitle: 'Know Before You Build', color: 'from-[#4A6741] to-[#6B8E6B]', features: ['ML-based success prediction', 'Adoption rate forecasting', 'Revenue impact estimates'] },
                { icon: '📊', title: 'Insights Hub', subtitle: 'See the Patterns You\'re Missing', color: 'from-[#0091AE] to-[#00BDA5]', features: ['Theme detection & clustering', 'Sentiment shift alerts', 'Auto-generated weekly briefings'] },
                { icon: '😈', title: 'Advocate Hub', subtitle: 'Your Built-In Skeptic', color: 'from-[#6A5ACD] to-[#9B8FD9]', features: ['Devil\'s Advocate attacks your specs', 'Finds assumptions & risks', 'Contradictions in your data'] },
                { icon: '👥', title: 'Stakeholder Hub', subtitle: 'Alignment Without Meetings', color: 'from-[#2E475D] to-[#516F90]', features: ['Role-based auto-reports', 'Go/No-Go dashboards', 'Outcome tracking & attribution'] },
              ].map((product, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 border border-black/[0.06] shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-[#FF4F00] transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.color} flex items-center justify-center text-2xl mb-5`}>
                    {product.icon}
                  </div>
                  <h3 className="font-[family-name:var(--font-fraunces)] text-[22px] font-semibold text-[#2D2D2A] mb-1">{product.title}</h3>
                  <p className="text-[14px] text-[#FF4F00] font-medium mb-3">{product.subtitle}</p>
                  <div className="w-10 h-0.5 bg-[#FF4F00] mb-4 rounded"></div>
                  <ul className="space-y-2 mb-6">
                    {product.features.map((f, j) => (
                      <li key={j} className="text-[15px] text-[#5C5C57] flex items-center gap-2">
                        <span className="text-[#4A6741] font-bold">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/products" className="text-[15px] font-semibold text-[#FF4F00] hover:gap-3 transition-all flex items-center gap-2">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 12 AI Agents Section */}
        <section className="py-28 px-6" style={{ background: '#FFFAF5' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8F0E8] rounded-full mb-6">
                <span className="text-base">🤖</span>
                <span className="text-[13px] font-semibold text-[#4A6741]">Your AI product team</span>
              </div>
              <h2 className="font-[family-name:var(--font-fraunces)] font-medium text-[#2D2D2A] mb-5"
                style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', lineHeight: 1.15 }}>
                12 specialists. Working 24/7.<br /><span className="text-[#FF4F00]">$19/month.</span>
              </h2>
              <p className="text-lg text-[#5C5C57] leading-relaxed">
                Imagine having 12 people on your team—each handling a specific piece of the product puzzle. That's what SignalsLoop delivers. Each agent does one thing exceptionally well.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {/* Hero Agents */}
              <div className="agent-card col-span-2 p-8 rounded-2xl border border-[#FF4F00]/15"
                style={{ background: 'linear-gradient(135deg, #FFF8F5 0%, #FFF0E8 100%)' }}>
                <span className="inline-block px-3 py-1 bg-white/80 rounded-full text-[11px] font-bold text-[#8A8A85] uppercase tracking-wide mb-4">Core Agent</span>
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-3">Hunter Agent</h3>
                <p className="text-[15px] text-[#5C5C57] leading-relaxed mb-5">
                  Discovers feedback from Reddit, Hacker News, G2, App Store, and more. Runs on-demand or on your schedule.
                </p>
                <div className="flex gap-6">
                  <div><span className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">8</span><span className="text-xs text-[#8A8A85] ml-1">platforms</span></div>
                  <div><span className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">Auto</span><span className="text-xs text-[#8A8A85] ml-1">categorize</span></div>
                </div>
                <div className="agent-preview">
                  <div className="preview-label">Live Scan</div>
                  <div className="preview-scan"></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }}></span>
                      Reddit: 12 new signals
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }}></span>
                      Twitter: 8 mentions
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }}></span>
                      G2: Processing...
                    </div>
                  </div>
                </div>
              </div>
              <div className="agent-card col-span-2 p-8 rounded-2xl border border-[#4A6741]/15"
                style={{ background: 'linear-gradient(135deg, #F8FBF8 0%, #EDF5ED 100%)' }}>
                <span className="inline-block px-3 py-1 bg-white/80 rounded-full text-[11px] font-bold text-[#8A8A85] uppercase tracking-wide mb-4">Core Agent</span>
                <div className="text-5xl mb-4">✏️</div>
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-3">Spec Writer Agent</h3>
                <p className="text-[15px] text-[#5C5C57] leading-relaxed mb-5">
                  Generates complete PRDs in 30 seconds. Problem statements, user stories, acceptance criteria—all ready for Jira.
                </p>
                <div className="flex gap-6">
                  <div><span className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">30s</span><span className="text-xs text-[#8A8A85] ml-1">generation</span></div>
                  <div><span className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D2D2A]">1-click</span><span className="text-xs text-[#8A8A85] ml-1">Jira export</span></div>
                </div>
                <div className="agent-preview">
                  <div className="preview-label">Generating PRD</div>
                  <div className="preview-typing">
                    <span style={{ color: '#C2703D' }}># Dark Mode Feature</span><br />
                    <span style={{ color: '#8A8A85' }}>## Problem Statement</span><br />
                    <span style={{ color: '#5C5C57' }}>Users report eye strain...</span>
                    <span className="preview-typing-cursor"></span>
                  </div>
                </div>
              </div>

              {/* Standard Agents - Slide-up Preview on Hover */}
              {/* Devil's Advocate */}
              <div className="agent-card bg-white p-6 rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#FF4F00] flex items-center justify-center mb-4">
                  <span className="text-xl">😈</span>
                </div>
                <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">Devil&apos;s Advocate</h4>
                <p className="text-sm text-[#5C5C57] leading-relaxed">Challenges assumptions before you waste resources</p>
                <div className="agent-preview">
                  <div className="preview-label">Risk Alert</div>
                  <div className="preview-alert">
                    <span className="preview-alert-icon">⚠️</span>
                    <span className="preview-alert-text">Competitor X launched free tier yesterday</span>
                  </div>
                </div>
              </div>

              {/* Prediction Engine */}
              <div className="agent-card bg-white p-6 rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#4A6741] flex items-center justify-center mb-4">
                  <span className="text-xl">🔮</span>
                </div>
                <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">Prediction Engine</h4>
                <p className="text-sm text-[#5C5C57] leading-relaxed">Forecasts feature success before you build</p>
                <div className="agent-preview">
                  <div className="preview-label">Adoption Forecast</div>
                  <div className="preview-metric">
                    <span className="preview-metric-value">67%</span>
                    <span className="preview-metric-unit">predicted adoption</span>
                  </div>
                  <div className="preview-bars" style={{ marginTop: '8px' }}>
                    <span></span><span></span><span></span><span></span><span></span><span></span>
                  </div>
                </div>
              </div>

              {/* Churn Radar */}
              <div className="agent-card bg-white p-6 rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#C2703D] flex items-center justify-center mb-4">
                  <span className="text-xl">📡</span>
                </div>
                <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">Churn Radar</h4>
                <p className="text-sm text-[#5C5C57] leading-relaxed">Predicts at-risk customers 30 days out</p>
                <div className="agent-preview">
                  <div className="preview-label">Risk Detection</div>
                  <div className="preview-metric">
                    <span className="preview-metric-value" style={{ color: '#C2703D' }}>3</span>
                    <span className="preview-metric-unit">accounts at risk</span>
                  </div>
                  <div className="preview-pulse" style={{ marginTop: '8px' }}>
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                </div>
              </div>

              {/* Competitive Intel */}
              <div className="agent-card bg-white p-6 rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#5C5C57] flex items-center justify-center mb-4">
                  <span className="text-xl">⚔️</span>
                </div>
                <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">Competitive Intel</h4>
                <p className="text-sm text-[#5C5C57] leading-relaxed">Tracks competitor moves & threats</p>
                <div className="agent-preview">
                  <div className="preview-label">Tracking 8 Competitors</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <span style={{ width: '32px', height: '32px', background: '#E8F0E8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#4A6741' }}>V</span>
                    <span style={{ width: '32px', height: '32px', background: '#E8F0E8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#4A6741' }}>L</span>
                    <span style={{ width: '32px', height: '32px', background: '#E8F0E8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#4A6741' }}>N</span>
                    <span style={{ width: '32px', height: '32px', background: '#FFF7ED', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#E64700' }}>!</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>1 new threat detected</div>
                </div>
              </div>

              {/* Knowledge Gap - New */}
              <div className="agent-card bg-[#E8F0E8]/30 border border-[#4A6741]/10 p-6 rounded-2xl">
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-full bg-[#4A6741]/20 text-[#4A6741] text-[10px] font-bold uppercase">New</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#FF4F00] flex items-center justify-center mb-4">
                  <span className="text-xl">🧠</span>
                </div>
                <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">Knowledge Gap</h4>
                <p className="text-sm text-[#5C5C57] leading-relaxed">Identifies missing intel in decisions</p>
                <div className="agent-preview">
                  <div className="preview-label">Analysis Complete</div>
                  <div className="preview-metric">
                    <span className="preview-metric-value">3</span>
                    <span className="preview-metric-unit">gaps found in Q4 roadmap</span>
                  </div>
                </div>
              </div>

              {/* Anomaly Detect - New */}
              <div className="agent-card bg-[#E8F0E8]/30 border border-[#4A6741]/10 p-6 rounded-2xl">
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-full bg-[#4A6741]/20 text-[#4A6741] text-[10px] font-bold uppercase">New</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#C2703D] flex items-center justify-center mb-4">
                  <span className="text-xl">⚡</span>
                </div>
                <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">Anomaly Detect</h4>
                <p className="text-sm text-[#5C5C57] leading-relaxed">Flags unusual patterns instantly</p>
                <div className="agent-preview">
                  <div className="preview-label">Pattern Detected</div>
                  <div className="preview-alert" style={{ background: 'rgba(194, 112, 61, 0.08)', borderColor: 'rgba(194, 112, 61, 0.15)' }}>
                    <span className="preview-alert-icon">📈</span>
                    <span className="preview-alert-text" style={{ color: '#C2703D' }}>Feedback spike: +340% this week</span>
                  </div>
                </div>
              </div>

              {/* Sentiment Forecast - New */}
              <div className="agent-card bg-[#E8F0E8]/30 border border-[#4A6741]/10 p-6 rounded-2xl">
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-full bg-[#4A6741]/20 text-[#4A6741] text-[10px] font-bold uppercase">New</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#4A6741] flex items-center justify-center mb-4">
                  <span className="text-xl">📈</span>
                </div>
                <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">Sentiment Forecast</h4>
                <p className="text-sm text-[#5C5C57] leading-relaxed">Predicts sentiment 30 days ahead</p>
                <div className="agent-preview">
                  <div className="preview-label">30-Day Forecast</div>
                  <div className="preview-metric">
                    <span className="preview-metric-value" style={{ color: '#4A6741' }}>+12%</span>
                    <span className="preview-metric-unit">sentiment improvement</span>
                  </div>
                  <div className="preview-bars" style={{ marginTop: '8px' }}>
                    <span></span><span></span><span></span><span></span><span></span><span></span>
                  </div>
                </div>
              </div>

              {/* Strategy Shifts - New */}
              <div className="agent-card bg-[#E8F0E8]/30 border border-[#4A6741]/10 p-6 rounded-2xl">
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-full bg-[#4A6741]/20 text-[#4A6741] text-[10px] font-bold uppercase">New</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#5C5C57] flex items-center justify-center mb-4">
                  <span className="text-xl">🔄</span>
                </div>
                <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[#2D2D2A] mb-2">Strategy Shifts</h4>
                <p className="text-sm text-[#5C5C57] leading-relaxed">Detects market & competitor pivots</p>
                <div className="agent-preview">
                  <div className="preview-label">Market Watch</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#4A6741', marginTop: '4px' }}>↗ 2 market shifts detected</div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>• Enterprise focus increasing<br />• API-first trend emerging</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-28 px-6" style={{ background: 'linear-gradient(180deg, #FFFAF5 0%, #FFF5EB 100%)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF4F00] mb-4 block">Simple Pricing</span>
              <h2 className="font-[family-name:var(--font-fraunces)] font-medium text-[#2D2D2A] mb-4"
                style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>
                Start Free.<br /><span className="text-[#FF4F00]">Scale When Ready.</span>
              </h2>
              <p className="text-lg text-[#5C5C57]">No credit card required. Cancel anytime.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Free */}
              <div className="bg-white rounded-2xl p-9 border border-black/[0.06] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-1">Free</h3>
                <p className="text-sm text-[#8A8A85] mb-6">For solo makers</p>
                <div className="mb-5">
                  <span className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">$0</span>
                  <span className="text-lg text-[#8A8A85]">/mo</span>
                </div>
                <ul className="space-y-2.5 mb-7">
                  {['1 project', '50 feedback items', '3 AI agents'].map((f, i) => (
                    <li key={i} className="text-[15px] text-[#5C5C57] flex items-center gap-2.5">
                      <CheckCircle className="w-4.5 h-4.5 text-[#8A8A85]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleProCheckout('pricing-free')}
                  className="w-full py-4 text-[15px] font-semibold text-[#2D2D2A] bg-white border-[1.5px] border-[#E8E8E6] rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all"
                >
                  Start Free
                </button>
                <p className="text-center text-[13px] text-[#8A8A85] mt-3">No credit card needed</p>
              </div>

              {/* Pro */}
              <div className="bg-white rounded-2xl p-9 border-2 border-[#FF4F00] shadow-xl relative pt-12">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-[#FF4F00] text-white text-[13px] font-bold rounded-full whitespace-nowrap">
                  Most Popular
                </div>
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-1">Pro</h3>
                <p className="text-sm text-[#FF4F00] font-semibold mb-6">For Builders</p>
                <div className="mb-5">
                  <span className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">$19</span>
                  <span className="text-lg text-[#8A8A85]">/mo</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E8F0E8] border border-[#4A6741]/20 rounded-full text-xs font-semibold text-[#4A6741] mb-6">
                  💰 Replaces $200/mo of tools
                </div>
                <ul className="space-y-2.5 mb-7">
                  {['All 12 AI agents', '1,200 feedback items', 'AI Spec Writer'].map((f, i) => (
                    <li key={i} className="text-[15px] text-[#5C5C57] flex items-center gap-2.5">
                      <CheckCircle className="w-4.5 h-4.5 text-[#FF4F00]" />
                      <span className={i === 0 ? 'font-bold text-[#2D2D2A]' : ''}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleProCheckout('pricing-pro')}
                  className="w-full py-4 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all shadow-[0_2px_8px_rgba(255,79,0,0.25)]"
                >
                  Get Pro
                </button>
              </div>

              {/* Premium */}
              <div className="bg-white rounded-2xl p-9 border border-black/[0.06] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#2D2D2A] mb-1">Premium</h3>
                <p className="text-sm text-[#4A6741] font-semibold mb-6">For Teams</p>
                <div className="mb-5">
                  <span className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold text-[#2D2D2A]">$79</span>
                  <span className="text-lg text-[#8A8A85]">/mo</span>
                </div>
                <ul className="space-y-2.5 mb-7">
                  {['10 team members', 'Go/No-Go Dashboard', 'Outcome Attribution'].map((f, i) => (
                    <li key={i} className="text-[15px] text-[#5C5C57] flex items-center gap-2.5">
                      <CheckCircle className="w-4.5 h-4.5 text-[#4A6741]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleProCheckout('pricing-premium')}
                  className="w-full py-4 text-[15px] font-semibold text-[#2D2D2A] bg-white border-[1.5px] border-[#E8E8E6] rounded-xl hover:border-[#4A6741] hover:text-[#4A6741] transition-all"
                >
                  Get Premium
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-36 px-6 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2D2D2A 0%, #1a1a18 100%)' }}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="font-[family-name:var(--font-fraunces)] font-medium text-white mb-6"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)', lineHeight: 1.15 }}>
              Hunt. Decide. Ship. Prove.<br /><span className="text-[#FF4F00]">Close the loop.</span>
            </h2>
            <p className="text-xl text-white/60 mb-12">
              No other platform takes you from scattered signals to shipped success with evidence at every step. Start free. No credit card required.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link
                href="/signup"
                className="px-10 py-5 text-[17px] font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all shadow-[0_2px_8px_rgba(255,79,0,0.25)]"
              >
                Try the Complete Platform Free →
              </Link>
              <Link href="/demo/roast" className="px-10 py-5 text-[17px] font-semibold text-white bg-transparent border-2 border-white/30 rounded-xl hover:bg-white/10 hover:border-white/50 transition-all">
                See It in Action
              </Link>
            </div>
            <p className="mt-8 text-sm text-white/50">
              ✓ Free forever plan  ·  ✓ Setup in 5 minutes  ·  ✓ Cancel anytime
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-20 px-6" style={{ background: '#1a1a18', color: 'rgba(255, 255, 255, 0.6)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-12">
              <div className="col-span-2">
                <div className="flex items-center gap-2.5 mb-4">
                  <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-10 h-10 rounded-xl" />
                  <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[22px] text-white">SignalsLoop</span>
                </div>
                <p className="text-sm leading-relaxed mb-6 max-w-xs">
                  The AI-native product OS that helps product teams discover signals, predict outcomes, and ship the right features.
                </p>
                <div className="flex gap-3">
                  <a href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#FF4F00] transition-colors">𝕏</a>
                  <a href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#FF4F00] transition-colors">in</a>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-5">Products</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/products" className="hover:text-white transition-colors">Feedback Hub</Link></li>
                  <li><Link href="/products" className="hover:text-white transition-colors">Spec Hub</Link></li>
                  <li><Link href="/products" className="hover:text-white transition-colors">Prediction Hub</Link></li>
                  <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-5">Resources</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                  <li><Link href="/docs/api" className="hover:text-white transition-colors">API Reference</Link></li>
                  <li><Link href="/demo/roast" className="hover:text-white transition-colors">Demos</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-5">Company</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                  <li><Link href="/solutions" className="hover:text-white transition-colors">Solutions</Link></li>
                  <li><Link href="/agents" className="hover:text-white transition-colors">AI Agents</Link></li>
                  <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                  <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="text-sm">© 2025 SignalsLoop. All rights reserved.</span>
              <div className="flex gap-6 text-sm">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
