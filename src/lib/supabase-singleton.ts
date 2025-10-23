import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceRoleClient: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient {
  if (!serviceRoleClient) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      throw new Error('Missing Supabase configuration');
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
