/**
 * Supabase Service Role Client Singleton
 * Uses modern Supabase client creation compatible with new API keys
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceRoleClient: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient | null {
  if (!serviceRoleClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Support both env var names - SUPABASE_SERVICE_ROLE and SUPABASE_SERVICE_ROLE_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    // During build time (static analysis), env vars may not be available
    // Return null instead of throwing to allow build to proceed
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[Supabase Singleton] Missing configuration - returning null', {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey,
        urlPrefix: supabaseUrl?.substring(0, 20) + '...',
      });
      return null;
    }

    // Create client with modern configuration
    // The service role key bypasses RLS for server-side operations
    serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'x-supabase-api-version': '2024-01-01',
        },
      },
      db: {
        schema: 'public',
      },
    });

    console.log('[Supabase Singleton] Service role client created with modern config');
  }
  return serviceRoleClient;
}

// Export a function to clear the singleton (useful for testing)
export function clearServiceRoleClient(): void {
  serviceRoleClient = null;
}

