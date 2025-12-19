import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

const resolveSubscriptionType = (project: {
  current_period_end: string | null;
  stripe_customer_id: string | null;
  subscription_id: string | null;
}) => {
  if (!project.current_period_end) return { subscriptionType: 'monthly', isYearly: false };

  const currentDate = new Date();
  const periodEnd = new Date(project.current_period_end);
  const daysDiff = Math.ceil((periodEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > 300) {
    return { subscriptionType: 'yearly', isYearly: true };
  }

  if (daysDiff > 25 && daysDiff < 35) {
    return { subscriptionType: 'monthly', isYearly: false };
  }

  if (!project.stripe_customer_id && !project.subscription_id) {
    return { subscriptionType: 'gifted', isYearly: daysDiff > 300 };
  }

  return { subscriptionType: 'monthly', isYearly: false };
};

type GiftRow = {
  id: string;
  project_id: string | null;
  gift_type: string | null;
  duration_months: number | null;
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  expires_at: string | null;
  claimed_at: string | null;
  recipient_id: string | null;
  recipient_email: string | null;
};

type ProjectRow = {
  id: string;
  slug: string | null;
  plan: 'free' | 'pro' | 'premium' | null;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  trial_status: string | null;
  is_trial: boolean | null;
  trial_cancelled_at: string | null;
};

async function promoteAccountForGift({
  supabase,
  accountId,
  userEmail,
  expiresAt,
  giftId,
}: {
  supabase: SupabaseClient;
  accountId: string;
  userEmail: string | null;
  expiresAt: string;
  giftId: string;
}) {
  const utcNowIso = new Date().toISOString();
  const subscriptionId = `gift-${giftId}`;
  const stripeCustomerId = `gift-${accountId}`;

  const { error: profileError } = await supabase
    .from('account_billing_profiles')
    .upsert(
      {
        user_id: accountId,
        plan: 'pro', // Gift claims default to pro unless explicitly premium
        billing_cycle: 'gifted',
        subscription_status: 'active',
        current_period_end: expiresAt,
        subscription_id: subscriptionId,
        stripe_customer_id: stripeCustomerId,
        cancel_at_period_end: false,
        updated_at: utcNowIso,
      },
      { onConflict: 'user_id' }
    );

  if (profileError) {
    console.error('Failed to upsert gifted billing profile during sync:', profileError);
  }

  const { error: userUpdateError } = await supabase
    .from('users')
    .upsert(
      {
        id: accountId,
        email: userEmail ?? undefined,
        plan: 'pro', // Gift claims default to pro unless explicitly premium
        updated_at: utcNowIso,
      },
      { onConflict: 'id' }
    );

  if (userUpdateError) {
    console.error('Failed to persist pro plan on users table during gift sync:', userUpdateError);
  }

  const { error: projectsUpdateError } = await supabase
    .from('projects')
    .update({
      plan: 'pro', // Gift claims default to pro unless explicitly premium
      subscription_status: 'active',
      current_period_end: expiresAt,
      updated_at: utcNowIso,
    })
    .eq('owner_id', accountId);

  if (projectsUpdateError) {
    console.error('Failed to mark projects as pro during gift sync:', projectsUpdateError);
  }
}

async function autoClaimGiftForAccount({
  supabase,
  accountId,
  userEmail,
  normalizedEmail,
  projects,
}: {
  supabase: SupabaseClient;
  accountId: string;
  userEmail: string | null;
  normalizedEmail: string | null;
  projects: ProjectRow[];
}) {
  const giftFilters = [`recipient_id.eq.${accountId}`];
  if (normalizedEmail) {
    giftFilters.push(`recipient_email.eq.${normalizedEmail}`);
  }

  const { data: pendingGifts, error: pendingError } = await supabase
    .from('gift_subscriptions')
    .select<GiftRow>('id, project_id, gift_type, duration_months, status, expires_at, claimed_at, recipient_id, recipient_email')
    .eq('status', 'pending')
    .or(giftFilters.join(','))
    .order('expires_at', { ascending: false })
    .limit(5);

  if (pendingError) {
    console.error('Failed to load pending gifts for auto-claim:', pendingError);
    return null;
  }

  if (!pendingGifts || pendingGifts.length === 0) {
    return null;
  }

  const now = new Date();
  const utcNowIso = now.toISOString();

  for (const gift of pendingGifts) {
    const matchesRecipientId = gift.recipient_id === accountId;
    const matchesEmail =
      normalizedEmail && gift.recipient_email && gift.recipient_email.toLowerCase() === normalizedEmail;

    if (!matchesRecipientId && !matchesEmail) {
      continue;
    }

    if (gift.expires_at && new Date(gift.expires_at) < now) {
      await supabase
        .from('gift_subscriptions')
        .update({ status: 'expired', updated_at: utcNowIso })
        .eq('id', gift.id);
      continue;
    }

    const durationMonths = gift.duration_months && gift.duration_months > 0 ? gift.duration_months : 1;
    const computedExpiry =
      gift.expires_at ??
      new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: updatedGift, error: updateError } = await supabase
      .from('gift_subscriptions')
      .update({
        status: 'claimed',
        claimed_at: utcNowIso,
        recipient_id: accountId,
        expires_at: computedExpiry,
        updated_at: utcNowIso,
      })
      .eq('id', gift.id)
      .select<GiftRow>('id, project_id, gift_type, duration_months, status, expires_at, claimed_at, recipient_id, recipient_email')
      .maybeSingle();

    if (updateError) {
      console.error('Failed to auto-claim pending gift:', updateError);
      continue;
    }

    await supabase
      .from('gift_subscriptions')
      .update({ recipient_id: accountId })
      .eq('id', gift.id)
      .is('recipient_id', null);

    await promoteAccountForGift({
      supabase,
      accountId,
      userEmail,
      expiresAt: computedExpiry,
      giftId: gift.id,
    });

    const updatedProjects = projects.map((project) => ({
      ...project,
      plan: 'pro', // Gift claims default to pro unless explicitly premium
      subscription_status: 'active',
      current_period_end: computedExpiry,
    }));

    return {
      gift: {
        ...(updatedGift ?? gift),
        status: 'claimed',
        recipient_id: accountId,
        expires_at: computedExpiry,
      },
      expiresAt: computedExpiry,
      projects: updatedProjects,
    };
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    const projectSlug = request.nextUrl.searchParams.get('projectSlug');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }

    const { data: accountProfile, error: profileError } = await supabase
      .from('account_billing_profiles')
      .select('*')
      .eq('user_id', accountId)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to load account billing profile:', profileError);
    }

    const { data: projectRows, error: projectError } = await supabase
      .from('projects')
      .select(
        'id, slug, plan, stripe_customer_id, subscription_status, subscription_id, current_period_end, cancel_at_period_end, trial_start_date, trial_end_date, trial_status, is_trial, trial_cancelled_at'
      )
      .eq('owner_id', accountId)
      .order('created_at', { ascending: true });

    if (projectError) {
      console.error('Failed to load projects for billing info:', projectError);
    }

    let projects: ProjectRow[] = projectRows ?? [];

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('email, plan')
      .eq('id', accountId)
      .maybeSingle();

    if (userError) {
      console.error('Failed to load user record for billing info:', userError);
    }

    const userEmail = userRecord?.email ?? null;
    const normalizedEmail = userEmail?.toLowerCase() ?? null;

    let selectedProject: ProjectRow | null = projects.length
      ? projectSlug
        ? projects.find((p) => p.slug === projectSlug) || projects[0]
        : projects[0]
      : null;

    const nowIso = new Date().toISOString();

    // isPaidPlan: Check for pro OR premium
    const isPaidPlan = (p: string | null | undefined) => p === 'pro' || p === 'premium';

    let plan: 'free' | 'pro' | 'premium' =
      isPaidPlan(accountProfile?.plan) ? (accountProfile?.plan as 'pro' | 'premium') :
        isPaidPlan(selectedProject?.plan) ? (selectedProject?.plan as 'pro' | 'premium') :
          isPaidPlan(userRecord?.plan) ? (userRecord?.plan as 'pro' | 'premium') :
            'free';

    // Check for active gifted subscription as an additional guard
    let activeGiftExpiresAt: string | null = null;
    const giftFilters = [`recipient_id.eq.${accountId}`];
    if (normalizedEmail) {
      giftFilters.push(`recipient_email.eq.${normalizedEmail}`);
    }

    const { data: claimedGiftRows, error: giftError } = await supabase
      .from('gift_subscriptions')
      .select<GiftRow>('id, project_id, gift_type, duration_months, expires_at, status, claimed_at, recipient_id, recipient_email')
      .eq('status', 'claimed')
      .or(giftFilters.join(','))
      .order('expires_at', { ascending: false })
      .limit(5);

    if (giftError) {
      console.error('Failed to load claimed gifts:', giftError);
    }

    let claimedGifts: GiftRow[] = claimedGiftRows ?? [];

    if (!claimedGifts.length) {
      const autoClaimResult = await autoClaimGiftForAccount({
        supabase,
        accountId,
        userEmail,
        normalizedEmail,
        projects,
      });

      if (autoClaimResult) {
        claimedGifts = [autoClaimResult.gift];
        activeGiftExpiresAt = autoClaimResult.expiresAt;
        plan = 'pro';
        projects = autoClaimResult.projects;
        selectedProject = projects.length
          ? projectSlug
            ? projects.find((p) => p.slug === projectSlug) || projects[0]
            : projects[0]
          : null;
      }
    }

    if (claimedGifts && claimedGifts.length > 0) {
      for (const gift of claimedGifts) {
        const stillValid = !gift.expires_at || gift.expires_at >= nowIso;
        if (!stillValid) continue;

        const matchesRecipientId = gift.recipient_id === accountId;
        const matchesEmail =
          normalizedEmail &&
          gift.recipient_email &&
          gift.recipient_email.toLowerCase() === normalizedEmail;

        if (matchesRecipientId || matchesEmail) {
          // Preserve premium if already set, otherwise default to pro for gifts
          if (plan !== 'premium') {
            plan = 'pro';
          }
          activeGiftExpiresAt = gift.expires_at ?? activeGiftExpiresAt;
          break;
        }
      }
    }

    // Check for billing_cycle in database first, fallback to heuristic
    const storedBillingCycle = accountProfile?.billing_cycle || null;
    let subscriptionType: 'monthly' | 'yearly' | 'gifted';
    let isYearly: boolean;

    if (storedBillingCycle === 'yearly') {
      subscriptionType = 'yearly';
      isYearly = true;
    } else if (storedBillingCycle === 'monthly') {
      subscriptionType = 'monthly';
      isYearly = false;
    } else if (storedBillingCycle === 'gifted') {
      subscriptionType = 'gifted';
      isYearly = false;
    } else {
      // Fallback to heuristic if billing_cycle not set
      const result = resolveSubscriptionType(selectedProject || accountProfile || {});
      subscriptionType = result.subscriptionType;
      isYearly = result.isYearly;
    }

    // Ensure gifted subscriptions are recognized even if account profile hasn't been updated yet
    if (
      subscriptionType === 'monthly' &&
      (plan === 'pro' || plan === 'premium') &&
      (activeGiftExpiresAt || (selectedProject && (!selectedProject.stripe_customer_id || selectedProject.stripe_customer_id.startsWith('gift-'))))
    ) {
      subscriptionType = 'gifted';
      isYearly = false;
    }

    const billingInfo = {
      plan,
      stripe_customer_id: accountProfile?.stripe_customer_id ?? selectedProject?.stripe_customer_id ?? null,
      subscription_status: accountProfile?.subscription_status ?? selectedProject?.subscription_status ?? null,
      subscription_id: accountProfile?.subscription_id ?? selectedProject?.subscription_id ?? null,
      current_period_end:
        activeGiftExpiresAt ??
        accountProfile?.current_period_end ??
        selectedProject?.current_period_end ??
        null,
      cancel_at_period_end:
        accountProfile?.cancel_at_period_end ?? selectedProject?.cancel_at_period_end ?? false,
      is_yearly: isYearly,
      subscription_type: subscriptionType,
      payment_method: null,
      trial_start_date: accountProfile?.trial_start_date ?? selectedProject?.trial_start_date ?? null,
      trial_end_date: accountProfile?.trial_end_date ?? selectedProject?.trial_end_date ?? null,
      trial_status: accountProfile?.trial_status ?? selectedProject?.trial_status ?? 'none',
      is_trial: accountProfile?.is_trial ?? selectedProject?.is_trial ?? false,
      trial_cancelled_at: accountProfile?.trial_cancelled_at ?? selectedProject?.trial_cancelled_at ?? null,
    };

    const primaryProject = selectedProject
      ? {
        id: selectedProject.id,
        slug: selectedProject.slug,
        plan: selectedProject.plan,
        stripe_customer_id: selectedProject.stripe_customer_id,
      }
      : null;

    return NextResponse.json({
      billingInfo,
      primaryProject,
    });
  } catch (error) {
    console.error('Account billing API error:', error);
    return NextResponse.json({ error: 'Failed to load account billing info' }, { status: 500 });
  }
}
