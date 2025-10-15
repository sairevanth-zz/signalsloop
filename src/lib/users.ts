import type { SupabaseClient } from '@supabase/supabase-js';

interface UserRecord {
  id: string;
  email: string | null;
  name: string | null;
  welcome_email_sent_at: string | null;
  plan?: string | null;
}

const deriveNameFromMetadata = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata) return null;

  return (
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    (metadata.first_name as string | undefined) ??
    null
  );
};

export const ensureUserRecord = async (
  supabase: SupabaseClient,
  userId: string
): Promise<UserRecord> => {
  const { data: existingUser, error: existingError } = await supabase
    .from('users')
    .select('id, email, name, welcome_email_sent_at, plan')
    .eq('id', userId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Failed to load user record: ${existingError.message}`);
  }

  if (existingUser) {
    return existingUser;
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

  if (authError || !authUser?.user) {
    throw new Error(authError?.message || 'User not found in auth.users');
  }

  const derivedName = deriveNameFromMetadata(
    (authUser.user.user_metadata ?? {}) as Record<string, unknown>
  );

  const userPayload = {
    id: authUser.user.id,
    email: authUser.user.email,
    name: derivedName,
    plan: 'free',
  };

  const { data: insertedUser, error: insertError } = await supabase
    .from('users')
    .upsert(userPayload, { onConflict: 'id' })
    .select('id, email, name, welcome_email_sent_at, plan')
    .maybeSingle();

  if (insertError || !insertedUser) {
    throw new Error(insertError?.message || 'Failed to create user record');
  }

  return insertedUser;
};
