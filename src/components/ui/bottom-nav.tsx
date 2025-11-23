'use client';

import React from 'react';
import Link from 'next/link';
import { Home, MessageSquare, Map, Plus, User, Flask } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  projectSlug?: string;
  onNewPost?: () => void;
}

export function BottomNav({ projectSlug, onNewPost }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: projectSlug ? `/${projectSlug}/board` : '/app',
      label: 'Board',
      icon: Home,
      isActive: pathname === `/${projectSlug}/board` || pathname === '/app',
    },
    {
      href: projectSlug ? `/${projectSlug}/roadmap` : '/app/roadmap',
      label: 'Roadmap',
      icon: Map,
      isActive: pathname?.includes('/roadmap'),
    },
    {
      action: 'new-post',
      label: 'New',
      icon: Plus,
      isActive: false,
      isPrimary: true,
    },
    {
      href: projectSlug ? `/${projectSlug}/experiments` : '/app/experiments',
      label: 'Experiments',
      icon: Flask,
      isActive: pathname?.includes('/experiments'),
    },
    {
      href: projectSlug ? `/${projectSlug}/settings` : '/app/settings',
      label: 'Settings',
      icon: User,
      isActive: pathname?.includes('/settings'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden safe-bottom z-50">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          
          if (item.action === 'new-post') {
            return (
              <button
                key={index}
                onClick={onNewPost}
                className="flex flex-col items-center justify-center gap-1 tap-highlight-transparent active:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform active:scale-95">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">{item.label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={index}
              href={item.href || '#'}
              className={`flex flex-col items-center justify-center gap-1 tap-highlight-transparent active:bg-gray-50 transition-colors ${
                item.isActive ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Icon className={`h-5 w-5 ${item.isActive ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className={`text-xs font-medium ${item.isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

