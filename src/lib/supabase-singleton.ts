import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceRoleClient: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient | null {
  if (!serviceRoleClient) {
    // During build time (static analysis), env vars may not be available
    // Return null instead of throwing to allow build to proceed
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      console.warn('[Supabase Singleton] Missing configuration - returning null');
      return null;
    }

    // Supabase connection pooling configuration
    // The JS client uses REST API (not direct Postgres), so pooling is managed by Supabase's backend
    // Key: Keep singleton pattern to reuse HTTP connections
    serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE,
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
  }
  return serviceRoleClient;
}
