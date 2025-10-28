'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const supabaseRef = useRef(getSupabaseClient());

  const resolveAccessToken = useCallback(async () => {
    const supabase = supabaseRef.current || getSupabaseClient();

    if (!supabase) {
      console.error('Supabase client unavailable when resolving admin token');
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? null;

      if (token && token !== accessToken) {
        setAccessToken(token);
      }

      return token;
    } catch (error) {
      console.error('Failed to resolve access token:', error);
      return null;
    }
  }, [accessToken]);

  useEffect(() => {
    const supabase = supabaseRef.current || getSupabaseClient();

    const evaluateAdmin = (authUser: any | null) => {
      if (!authUser) {
        setUser(null);
        setIsAdmin(false);
        return;
      }

      setUser(authUser);

      const configuredEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean);

      const fallbackEmails = [
        'sai.chandupatla@gmail.com',
        'admin@signalsloop.com',
      ];

      const allowedEmails = configuredEmails.length > 0 ? configuredEmails : fallbackEmails;
      const userEmail = (authUser.email || '').toLowerCase();
      const isAllowed = allowedEmails.includes(userEmail);

      setIsAdmin(isAllowed);
      console.log('Admin check:', { email: authUser.email, isAdmin: isAllowed });
    };

    const init = async () => {
      try {
        const [{ data: { user: authUser } }, { data: { session } }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession(),
        ]);

        setAccessToken(session?.access_token ?? null);
        evaluateAdmin(authUser);
      } catch (error) {
        console.error('Admin auth error:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAccessToken(session?.access_token ?? null);
      evaluateAdmin(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, loading, user, accessToken, getAccessToken: resolveAccessToken };
}
