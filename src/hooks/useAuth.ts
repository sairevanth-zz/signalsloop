'use client';

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { User, SupabaseClient } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const lastWelcomeUserIdRef = useRef<string | null>(null);

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
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = client.auth.onAuthStateChange((event: any, session: any) => {
      console.log('Auth state changed:', event, session?.user?.email || 'no user');
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!user?.id) {
      lastWelcomeUserIdRef.current = null;
      return;
    }

    if (lastWelcomeUserIdRef.current === user.id) {
      return;
    }

    lastWelcomeUserIdRef.current = user.id;

    const controller = new AbortController();

    const ensureWelcomeEmail = async () => {
      try {
        const response = await fetch('/api/users/welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          console.error('Failed to trigger welcome email:', {
            status: response.status,
            body: errorBody,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error triggering welcome email:', error);
      }
    };

    ensureWelcomeEmail();

    return () => controller.abort();
  }, [user?.id]);

  return { user, loading, signOut };
}
