import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClient: any = null;

export const getSupabaseClient = () => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    console.warn('Supabase client called on server side - this may cause issues');
    return null;
  }

  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables:', {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey,
      });
      return null;
    }

    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
      console.log('Supabase client initialized successfully');
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return null;
    }
  }

  return supabaseClient;
};

// Import singleton to ensure connection pooling
import { getServiceRoleClient as getSingleton } from './supabase-singleton';

// Server-side Supabase client with auth support (uses cookies)
export async function createServerClient() {
  // Import cookies dynamically to avoid module-level imports
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Debug: Log available cookies to trace SSR auth issues
  const allCookies = cookieStore.getAll();
  console.log('[createServerClient] Available cookies:', allCookies.map((c) => c.name));

  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const value = cookieStore.get(name)?.value;
        console.log(`[createServerClient] Getting cookie "${name}":`, value ? 'present' : 'missing');
        return value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

// Legacy function - now uses createServerClient
export const getSupabaseServerClient = () => {
  // This is synchronous but createServerClient is async
  // For backwards compatibility, return the singleton
  // New code should use createServerClient() instead
  return getSingleton();
};

// Service role client for admin operations - uses singleton
export const getSupabaseServiceRoleClient = () => {
  return getSingleton();
};

export const getSupabasePublicServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing public Supabase environment variables');
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
