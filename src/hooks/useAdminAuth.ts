'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUser(user);
          
          // Check if user is admin (you can customize this logic)
          // For now, we'll check if user email is in a list of admin emails
          const adminEmails = [
            'sai.chandupatla@gmail.com',
            'admin@signalsloop.com',
            // Add more admin emails here
          ];
          
          const isAdminUser = adminEmails.includes(user.email || '');
          setIsAdmin(isAdminUser);
          
          console.log('Admin check:', { email: user.email, isAdmin: isAdminUser });
        }
      } catch (error) {
        console.error('Admin auth error:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAuth();
  }, []);

  return { isAdmin, loading, user };
}
