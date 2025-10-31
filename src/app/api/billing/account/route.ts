import { NextRequest, NextResponse } from 'next/server';
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

    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(
        'id, slug, plan, stripe_customer_id, subscription_status, subscription_id, current_period_end, cancel_at_period_end, trial_start_date, trial_end_date, trial_status, is_trial, trial_cancelled_at'
      )
      .eq('owner_id', accountId)
      .order('created_at', { ascending: true });

    if (projectError) {
      console.error('Failed to load projects for billing info:', projectError);
    }

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('email, plan')
      .eq('id', accountId)
      .maybeSingle();

    if (userError) {
      console.error('Failed to load user record for billing info:', userError);
    }

    const selectedProject = projects?.length
      ? projectSlug
        ? projects.find((p) => p.slug === projectSlug) || projects[0]
        : projects[0]
      : null;

    const nowIso = new Date().toISOString();

    let plan: 'free' | 'pro' =
      accountProfile?.plan === 'pro' || selectedProject?.plan === 'pro' || userRecord?.plan === 'pro'
        ? 'pro'
        : 'free';

    const normalizedEmail = userRecord?.email?.toLowerCase() ?? null;

    // Check for active gifted subscription as an additional guard
    let activeGiftExpiresAt: string | null = null;
    const giftFilters = [`recipient_id.eq.${accountId}`];
    if (normalizedEmail) {
      giftFilters.push(`recipient_email.eq.${normalizedEmail}`);
    }

    const { data: claimedGifts, error: giftError } = await supabase
      .from('gift_subscriptions')
      .select('expires_at, status, recipient_id, recipient_email')
      .eq('status', 'claimed')
      .or(giftFilters.join(','))
      .order('expires_at', { ascending: false })
      .limit(5);

    if (giftError) {
      console.error('Failed to load claimed gifts:', giftError);
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
          plan = 'pro';
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
      plan === 'pro' &&
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
