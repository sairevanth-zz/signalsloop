'use client';

import React, { useState } from 'react';
import { Menu, X, Home, Settings, BarChart3, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  showNavigation?: boolean;
}

export function MobileLayout({ children, title, showNavigation = true }: MobileLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b lg:hidden">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
          {showNavigation && (
            <button
              onClick={toggleMenu}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {showNavigation && isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={toggleMenu} />
          <nav className="fixed top-0 right-0 bottom-0 flex flex-col w-5/6 max-w-sm py-6 overflow-y-auto bg-white border-l">
            <div className="flex items-center justify-between px-6 pb-6">
              <span className="text-lg font-semibold text-gray-900">SignalSloop</span>
              <button onClick={toggleMenu} className="p-1 text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="px-6 space-y-1">
              <Link 
                href="/app" 
                className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                onClick={toggleMenu}
              >
                <Home className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
              
              <Link 
                href="/app/admin" 
                className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                onClick={toggleMenu}
              >
                <MessageSquare className="w-5 h-5 mr-3" />
                Moderate Posts
              </Link>
              
              <Link 
                href="/app/analytics" 
                className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                onClick={toggleMenu}
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Analytics
              </Link>
              
              <Link 
                href="/app/settings" 
                className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                onClick={toggleMenu}
              >
                <Settings className="w-5 h-5 mr-3" />
                Settings
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar (hidden on mobile) */}
      {showNavigation && (
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white border-r overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6">
              <span className="text-xl font-semibold text-gray-900">SignalSloop</span>
            </div>
            
            <div className="flex-grow mt-8 px-6">
              <nav className="space-y-1">
                <Link 
                  href="/app" 
                  className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Home className="w-5 h-5 mr-3" />
                  Dashboard
                </Link>
                
                <Link 
                  href="/app/admin" 
                  className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <MessageSquare className="w-5 h-5 mr-3" />
                  Moderate Posts
                </Link>
                
                <Link 
                  href="/app/analytics" 
                  className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Analytics
                </Link>
                
                <Link 
                  href="/app/settings" 
                  className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Settings
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={showNavigation ? "lg:pl-64" : ""}>
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
