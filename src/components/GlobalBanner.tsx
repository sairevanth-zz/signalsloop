'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GlobalBannerProps {
  showBackButton?: boolean;
  backUrl?: string;
  backLabel?: string;
  className?: string;
}

export default function GlobalBanner({ 
  showBackButton = false, 
  backUrl, 
  backLabel = 'Back',
  className = '' 
}: GlobalBannerProps) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getLogoDestination = () => {
    if (user) {
      return '/app'; // Dashboard if logged in
    }
    return '/'; // Homepage if not logged in
  };

  const getBackButtonDestination = () => {
    if (user) {
      return '/app'; // Always go to dashboard if logged in
    }
    return backUrl || '/'; // Use provided backUrl if not logged in
  };

  return (
    <header className={`bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Left side - Back button or Logo */}
          <div className="flex items-center space-x-4">
            {showBackButton ? (
              <Link href={getBackButtonDestination()}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {user ? 'Back to Dashboard' : (backLabel || 'Back')}
                </Button>
              </Link>
            ) : null}
            
            <Link href={getLogoDestination()} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SignalsLoop
                </span>
                <p className="text-sm text-gray-600">Feedback Management</p>
              </div>
            </Link>
          </div>
          
          {/* Right side - User info and actions */}
          <div className="flex items-center space-x-4">
            {!loading && user && (
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700 font-medium">{user.email}</span>
              </div>
            )}
            
            {!loading && user && (
              <>
                <Link href="/app/billing">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Billing
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
