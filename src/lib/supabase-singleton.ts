import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceRoleClient: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient {
  if (!serviceRoleClient) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      throw new Error('Missing Supabase configuration');
    }

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
        global: {
          headers: {
            'x-connection-pool': 'true',
          },
        },
      }
    );
  }
  return serviceRoleClient;
}
