'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const productLinks = [
    { href: '/products/feedback-hub', icon: '📬', name: 'Feedback Hub', desc: 'Hunt signals across 8 platforms' },
    { href: '/products/spec-hub', icon: '✏️', name: 'Spec Hub', desc: 'PRDs in 30 seconds' },
    { href: '/products/experiments-hub', icon: '🧪', name: 'Experiments Hub', desc: 'Built-in A/B testing' },
    { href: '/products/prediction-hub', icon: '🔮', name: 'Prediction Hub', desc: 'Know before you build' },
    { href: '/products/insights-hub', icon: '📊', name: 'Insights Hub', desc: 'See patterns humans miss' },
    { href: '/products/advocate-hub', icon: '😈', name: 'Advocate Hub', desc: 'Challenge assumptions' },
    { href: '/products/stakeholder-hub', icon: '👥', name: 'Stakeholder Hub', desc: 'Keep everyone aligned' },
];

const solutionLinks = [
    { href: '/solutions/startups', icon: '🚀', name: 'For Startups', desc: 'Ship faster, learn faster' },
    { href: '/solutions/scaleups', icon: '⚡', name: 'For Scale-ups', desc: 'Scale decisions, not chaos' },
    { href: '/solutions/enterprise', icon: '🏢', name: 'For Larger Teams', desc: 'Alignment at scale' },
];

export function SiteNav() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
    const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.04]"
                style={{ background: 'rgba(255, 250, 245, 0.95)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-[72px]">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl" />
                        <span className="font-[family-name:var(--font-fraunces)] font-semibold text-lg sm:text-[22px] text-[#2D2D2A]">SignalsLoop</span>
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
                                            <div className="text-xs text-gray-500">Overview of all 7 hubs</div>
                                        </div>
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuSeparator className="my-1" />
                                {productLinks.map((item) => (
                                    <Link key={item.href} href={item.href}>
                                        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-orange-50">
                                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center text-white">{item.icon}</span>
                                            <div>
                                                <div className="font-semibold text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.desc}</div>
                                            </div>
                                        </DropdownMenuItem>
                                    </Link>
                                ))}
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
                                {solutionLinks.map((item) => (
                                    <Link key={item.href} href={item.href}>
                                        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-orange-50">
                                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4F00] to-[#FF6B26] flex items-center justify-center text-white">{item.icon}</span>
                                            <div>
                                                <div className="font-semibold text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.desc}</div>
                                            </div>
                                        </DropdownMenuItem>
                                    </Link>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Link href="/pricing" className="text-[15px] font-medium text-[#5C5C57] hover:text-[#FF4F00] transition-colors">
                            Pricing
                        </Link>
                    </div>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden lg:flex items-center gap-4">
                        <Link href="/login" className="text-[15px] font-medium text-[#2D2D2A] hover:text-[#FF4F00] transition-colors">Log in</Link>
                        <Link href="/signup" className="px-5 py-2.5 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-lg hover:bg-[#E64700] transition-all">
                            Start free
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 -mr-2 text-[#2D2D2A] hover:text-[#FF4F00] transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Menu Panel */}
            <div className={`lg:hidden fixed top-16 left-0 right-0 bottom-0 z-40 bg-[#FFFAF5] transform transition-transform duration-300 ease-out overflow-y-auto ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="px-4 py-6 space-y-2">
                    {/* Products Accordion */}
                    <div className="border-b border-gray-100 pb-2">
                        <button
                            onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                            className="w-full flex items-center justify-between py-3 text-lg font-semibold text-[#2D2D2A]"
                        >
                            Products
                            <ChevronDown className={`w-5 h-5 transition-transform ${mobileProductsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {mobileProductsOpen && (
                            <div className="pb-3 space-y-1">
                                <Link
                                    href="/products"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl bg-orange-50 text-[#FF4F00] font-medium"
                                >
                                    <span className="text-xl">📋</span>
                                    All Products
                                </Link>
                                {productLinks.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 text-[#2D2D2A]"
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-[#8A8A85]">{item.desc}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Solutions Accordion */}
                    <div className="border-b border-gray-100 pb-2">
                        <button
                            onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)}
                            className="w-full flex items-center justify-between py-3 text-lg font-semibold text-[#2D2D2A]"
                        >
                            Solutions
                            <ChevronDown className={`w-5 h-5 transition-transform ${mobileSolutionsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {mobileSolutionsOpen && (
                            <div className="pb-3 space-y-1">
                                <Link
                                    href="/solutions"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl bg-orange-50 text-[#FF4F00] font-medium"
                                >
                                    <span className="text-xl">🎯</span>
                                    All Solutions
                                </Link>
                                {solutionLinks.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 text-[#2D2D2A]"
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-[#8A8A85]">{item.desc}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pricing Link */}
                    <Link
                        href="/pricing"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-3 text-lg font-semibold text-[#2D2D2A] border-b border-gray-100"
                    >
                        Pricing
                    </Link>

                    {/* Mobile Auth Buttons */}
                    <div className="pt-6 space-y-3">
                        <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block w-full py-3 text-center text-base font-semibold text-[#2D2D2A] border-2 border-gray-200 rounded-xl hover:border-[#FF4F00] hover:text-[#FF4F00] transition-all"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/signup"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block w-full py-3 text-center text-base font-semibold text-white bg-[#FF4F00] rounded-xl hover:bg-[#E64700] transition-all"
                        >
                            Start free
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

export function SiteFooter() {
    return (
        <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-black/[0.06]" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg" />
                    <span className="font-[family-name:var(--font-fraunces)] font-semibold text-base sm:text-lg text-[#2D2D2A]">SignalsLoop</span>
                </div>
                <div className="text-xs sm:text-sm text-[#8A8A85] text-center">© 2025 SignalsLoop. All rights reserved.</div>
            </div>
        </footer>
    );
}
