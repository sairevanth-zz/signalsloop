import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceRoleClient: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient | null {
  if (!serviceRoleClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Support both env var names - SUPABASE_SERVICE_ROLE and SUPABASE_SERVICE_ROLE_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // During build time (static analysis), env vars may not be available
    // Return null instead of throwing to allow build to proceed
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[Supabase Singleton] Missing configuration - returning null', {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey
      });
      return null;
    }

    // Supabase connection pooling configuration
    // The JS client uses REST API (not direct Postgres), so pooling is managed by Supabase's backend
    // Key: Keep singleton pattern to reuse HTTP connections
    serviceRoleClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      }
    );
    console.log('[Supabase Singleton] Service role client created successfully');
  }
  return serviceRoleClient;
}
