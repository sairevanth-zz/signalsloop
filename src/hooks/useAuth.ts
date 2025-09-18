'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { User, SupabaseClient } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

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

  return { user, loading, signOut };
}
