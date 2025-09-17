'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';

interface AdminUser {
  id: string;
  email: string;
}

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Check if user is admin
      const adminEmails = [
        'revanth@signalsloop.com', // Replace with your actual admin email
        'admin@signalsloop.com'    // Add more admin emails as needed
      ];

      if (!session.user.email || !adminEmails.includes(session.user.email)) {
        setError('Admin access required');
        setLoading(false);
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }

      setUser({
        id: session.user.id,
        email: session.user.email
      });

    } catch (error) {
      console.error('Admin auth error:', error);
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return {
    user,
    loading,
    error,
    signOut,
    refreshAuth: checkAdminAuth
  };
}
