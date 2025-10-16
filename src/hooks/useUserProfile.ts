'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  plan: string | null;
  welcome_email_sent_at: string | null;
}

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setError('Supabase client not available');
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, email, name, plan, welcome_email_sent_at')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Error fetching user profile:', fetchError);
          setError(fetchError.message);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching user profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return;

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  return { profile, loading, error, updateProfile };
}
