import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleClient } from './supabase-client';

export type BillingPlan = 'free' | 'pro';

export type BillingCycle = 'monthly' | 'yearly' | 'gifted' | null;

export interface AccountBillingProfile {
  user_id: string;
  plan: BillingPlan;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  billing_cycle: BillingCycle;
  trial_start_date: string | null;
  trial_end_date: string | null;
  trial_status: string | null;
  is_trial: boolean;
  trial_cancelled_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Returns a Supabase client that can access account billing data.
 * Uses service role client for server-side usage. For client usage, the caller must pass a configured client.
 */
const resolveClient = (client?: SupabaseClient): SupabaseClient | null => {
  if (client) return client;

  try {
    return getSupabaseServiceRoleClient();
  } catch (error) {
    console.error('Failed to resolve service role client for billing:', error);
    return null;
  }
};

/**
 * Fetch account-level billing profile for a user.
 */
export const getAccountBillingProfile = async (
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<AccountBillingProfile | null> => {
  const client = resolveClient(supabaseClient);
  if (!client) return null;

  const { data, error } = await client
    .from<AccountBillingProfile>('account_billing_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch account billing profile:', error);
    return null;
  }

  return data;
};

/**
 * Update account-level billing profile. Falls back to service role client.
 */
export const upsertAccountBillingProfile = async (
  payload: Partial<AccountBillingProfile> & { user_id: string },
  supabaseClient?: SupabaseClient
): Promise<AccountBillingProfile | null> => {
  const client = resolveClient(supabaseClient);
  if (!client) return null;

  const { data, error } = await client
    .from('account_billing_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to upsert account billing profile:', error);
    return null;
  }

  return data;
};

export const ensureAccountBillingProfile = async (
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<AccountBillingProfile | null> => {
  const client = resolveClient(supabaseClient);
  if (!client) return null;

  const existing = await getAccountBillingProfile(userId, client);
  if (existing) return existing;

  const { data, error } = await client
    .from<AccountBillingProfile>('account_billing_profiles')
    .insert({ user_id: userId })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to ensure account billing profile:', error);
    return null;
  }

  return data;
};

const PROJECT_BILLING_FIELDS = `
  id,
  owner_id,
  slug,
  name,
  plan,
  stripe_customer_id,
  subscription_id,
  subscription_status,
  current_period_end,
  cancel_at_period_end,
  pro_welcome_email_sent_at,
  trial_start_date,
  trial_end_date,
  trial_status,
  is_trial,
  trial_cancelled_at
`;

export interface ProjectBillingSnapshot {
  id: string;
  owner_id: string;
  slug: string | null;
  name: string | null;
  plan: BillingPlan;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  pro_welcome_email_sent_at: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  trial_status: string | null;
  is_trial: boolean | null;
  trial_cancelled_at: string | null;
}

export const getProjectBillingSnapshot = async (
  projectId: string,
  supabaseClient?: SupabaseClient
): Promise<ProjectBillingSnapshot | null> => {
  const client = resolveClient(supabaseClient);
  if (!client) return null;

  const { data, error } = await client
    .from<ProjectBillingSnapshot>('projects')
    .select(PROJECT_BILLING_FIELDS)
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load project billing snapshot:', error);
    return null;
  }

  return data;
};

export interface BillingContext {
  userId: string;
  profile: AccountBillingProfile | null;
  project: ProjectBillingSnapshot | null;
}

export const resolveBillingContext = async (
  identifier: string,
  supabaseClient?: SupabaseClient
): Promise<BillingContext | null> => {
  const client = resolveClient(supabaseClient);
  if (!client) return null;

  const project = await getProjectBillingSnapshot(identifier, client);
  const userId = project?.owner_id ?? identifier;

  const profile = await ensureAccountBillingProfile(userId, client);

  return {
    userId,
    profile,
    project,
  };
};

export const resolveBillingContextByCustomerId = async (
  customerId: string,
  supabaseClient?: SupabaseClient
): Promise<BillingContext | null> => {
  const client = resolveClient(supabaseClient);
  if (!client) return null;

  const { data: profileMatch, error: profileError } = await client
    .from<AccountBillingProfile>('account_billing_profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to load account billing profile by customer ID:', profileError);
  }

  const { data: projectMatch, error: projectError } = await client
    .from<ProjectBillingSnapshot>('projects')
    .select(PROJECT_BILLING_FIELDS)
    .eq('stripe_customer_id', customerId)
    .order('updated_at', { ascending: false, nullsLast: true })
    .limit(1)
    .maybeSingle();

  if (projectError) {
    console.error('Failed to load project by customer ID:', projectError);
  }

  const userId = profileMatch?.user_id ?? projectMatch?.owner_id;
  if (!userId) {
    return null;
  }

  let profile = profileMatch ?? null;

  if (!profile && projectMatch) {
    profile = await upsertAccountBillingProfile(
      {
        user_id: projectMatch.owner_id,
        plan: projectMatch.plan,
        stripe_customer_id: customerId,
        subscription_id: projectMatch.subscription_id,
        subscription_status: projectMatch.subscription_status,
        current_period_end: projectMatch.current_period_end,
        cancel_at_period_end: projectMatch.cancel_at_period_end ?? false,
        trial_start_date: projectMatch.trial_start_date,
        trial_end_date: projectMatch.trial_end_date,
        trial_status: projectMatch.trial_status,
        is_trial: projectMatch.is_trial ?? false,
        trial_cancelled_at: projectMatch.trial_cancelled_at,
      },
      client
    );
  }

  if (!profile) {
    profile = await ensureAccountBillingProfile(userId, client);
  }

  return {
    userId,
    profile,
    project: projectMatch ?? null,
  };
};

export const syncAccountProfileToProject = async (
  projectId: string,
  profile: AccountBillingProfile,
  supabaseClient?: SupabaseClient
): Promise<boolean> => {
  const client = resolveClient(supabaseClient);
  if (!client) return false;

  const payload = {
    plan: profile.plan,
    stripe_customer_id: profile.stripe_customer_id,
    subscription_id: profile.subscription_id,
    subscription_status: profile.subscription_status,
    current_period_end: profile.current_period_end,
    cancel_at_period_end: profile.cancel_at_period_end,
    trial_start_date: profile.trial_start_date,
    trial_end_date: profile.trial_end_date,
    trial_status: profile.trial_status,
    is_trial: profile.is_trial,
    trial_cancelled_at: profile.trial_cancelled_at,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from('projects')
    .update(payload)
    .eq('id', projectId);

  if (error) {
    console.error('Failed to sync project billing fields:', error);
    return false;
  }

  return true;
};

/**
 * Utility to map account profile back to legacy project billing fields during transition.
 */
export const mapAccountBillingToProjectFields = (
  profile: AccountBillingProfile | null
) => {
  if (!profile) {
    return {
      plan: 'free' as BillingPlan,
      stripe_customer_id: null as string | null,
      subscription_status: null as string | null,
      current_period_end: null as string | null,
      cancel_at_period_end: false,
      trial_start_date: null as string | null,
      trial_end_date: null as string | null,
      trial_status: null as string | null,
      is_trial: false,
      trial_cancelled_at: null as string | null,
    };
  }

  return {
    plan: profile.plan,
    stripe_customer_id: profile.stripe_customer_id,
    subscription_status: profile.subscription_status,
    current_period_end: profile.current_period_end,
    cancel_at_period_end: profile.cancel_at_period_end,
    trial_start_date: profile.trial_start_date,
    trial_end_date: profile.trial_end_date,
    trial_status: profile.trial_status,
    is_trial: profile.is_trial,
    trial_cancelled_at: profile.trial_cancelled_at,
  };
};
