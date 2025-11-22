'use client';

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { User, SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const lastSyncedTokenRef = useRef<string | null>(null);

  const syncSessionWithServer = async (session: Session | null) => {
    if (typeof window === 'undefined') return;
    if (!session?.access_token || !session.refresh_token) return;
    if (lastSyncedTokenRef.current === session.access_token) return;

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      });

      if (!response.ok) {
        console.error('Failed to sync session with server:', await response.text());
        return;
      }

      lastSyncedTokenRef.current = session.access_token;
    } catch (error) {
      console.error('Error syncing session with server:', error);
    }
  };

  useEffect(() => {
    // Only run on client side to prevent hydration mismatches
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Initialize Supabase client on client side only
    const client = getSupabaseClient();
    setSupabase(client);

    if (!client) {
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        
        // First try to get session from URL (for OAuth redirects)
        const { data: { session: urlSession } } = await client.auth.getSession();
        
        if (urlSession) {
          console.log('Session found from URL:', urlSession.user?.email || 'no user');
          setUser(urlSession.user);
          setLoading(false);
          return;
        }
        
        // If no session from URL, try regular session
        const { data: { session }, error } = await client.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else {
          console.log('Session retrieved:', session?.user?.email || 'no user');
        }
        
        setUser(session?.user ?? null);
        await syncSessionWithServer(session);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event, session?.user?.email || 'no user');
      setUser(session?.user ?? null);
      setLoading(false);
      await syncSessionWithServer(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/auth/session', { method: 'DELETE' });
      } catch (error) {
        console.error('Failed to clear server session:', error);
      }
    }

    lastSyncedTokenRef.current = null;
  };

  return { user, loading, signOut };
}
