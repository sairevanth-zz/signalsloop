'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, Home, Settings, BarChart3, MessageSquare, Map, User, LogOut, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from './button';

interface MobileNavProps {
  user?: {
    email?: string | null;
  } | null;
  onSignOut?: () => void;
  currentPath?: string;
}

export function MobileNav({ user, onSignOut, currentPath }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [currentPath]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const navItems = [
    { href: '/app', label: 'Dashboard', icon: Home },
    { href: '/app/admin', label: 'Moderate', icon: MessageSquare },
    { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/app/roadmap', label: 'Roadmap', icon: Map },
    { href: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMenu}
        className="lg:hidden min-touch-target p-2 tap-highlight-transparent"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={toggleMenu}
            aria-hidden="true"
          />
          
          {/* Slide-out Menu */}
          <nav 
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-out momentum-scroll safe-top safe-bottom"
            style={{ animation: 'slideInRight 0.3s ease-out' }}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-lg font-bold text-white">SignalsLoop</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMenu}
                className="text-white hover:bg-white/20 min-touch-target"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.email || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">Account Settings</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={toggleMenu}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-touch-target tap-highlight-transparent ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-base">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Sign Out Button */}
            {user && onSignOut && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white safe-bottom">
                <Button
                  onClick={() => {
                    toggleMenu();
                    onSignOut();
                  }}
                  variant="outline"
                  className="w-full justify-start gap-3 text-red-600 border-red-200 hover:bg-red-50 min-touch-target"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

