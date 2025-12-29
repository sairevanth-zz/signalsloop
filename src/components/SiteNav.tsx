'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SiteNav() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.04]"
            style={{ background: 'rgba(255, 250, 245, 0.9)', backdropFilter: 'blur(20px)' }}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
                <Link href="/" className="flex items-center gap-2.5">
                    <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-9 h-9 rounded-xl" />
                    <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[22px] text-[#2D2D2A]">SignalsLoop</span>
                </Link>

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
                </div>

                <div className="hidden lg:flex items-center gap-4">
                    <Link href="/login" className="text-[15px] font-medium text-[#2D2D2A] hover:text-[#FF4F00] transition-colors">Log in</Link>
                    <Link href="/signup" className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#FF4F00] rounded-lg hover:bg-[#E64700] transition-all">
                        Start free
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export function SiteFooter() {
    return (
        <footer className="py-12 px-6 border-t border-black/[0.06]" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2.5">
                    <img src="/signalsloop-logo-v2.png" alt="SignalsLoop" className="w-8 h-8 rounded-lg" />
                    <span className="font-[family-name:var(--font-fraunces)] font-semibold text-lg text-[#2D2D2A]">SignalsLoop</span>
                </div>
                <div className="text-sm text-[#8A8A85]">© 2025 SignalsLoop. All rights reserved.</div>
            </div>
        </footer>
    );
}
