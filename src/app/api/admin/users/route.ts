import { NextResponse } from 'next/server';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const GET = secureAPI(
  async () => {
    try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      console.error('Supabase client not available');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Get all users from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users', details: usersError.message }, { status: 500 });
    }

    // Get all projects to calculate project counts
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('owner_id, plan');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    const { data: billingProfiles, error: billingError } = await supabase
      .from('account_billing_profiles')
      .select('user_id, plan, billing_cycle, subscription_status, current_period_end');

    if (billingError) {
      console.error('Error fetching billing profiles:', billingError);
      return NextResponse.json({ error: 'Failed to fetch billing profiles' }, { status: 500 });
    }

    const { data: claimedGifts, error: giftError } = await supabase
      .from('gift_subscriptions')
      .select('recipient_id, recipient_email, status, expires_at')
      .eq('status', 'claimed');

    if (giftError) {
      console.error('Error fetching claimed gifts:', giftError);
      return NextResponse.json({ error: 'Failed to fetch gift data' }, { status: 500 });
    }

    const billingProfileMap = new Map(
      billingProfiles?.map((profile) => [profile.user_id, profile]) ?? []
    );

    const activeGiftMap = new Map<string, boolean>();
    const nowIso = new Date().toISOString();

    claimedGifts?.forEach((gift) => {
      const isActive = !gift.expires_at || gift.expires_at >= nowIso;
      if (!isActive) {
        return;
      }

      if (gift.recipient_id) {
        activeGiftMap.set(gift.recipient_id, true);
      }

      if (gift.recipient_email) {
        activeGiftMap.set(gift.recipient_email.toLowerCase(), true);
      }
    });

    // Transform users data with project counts and plan info
    const usersWithStats = users.users.map(user => {
      const userProjects = projects.filter(p => p.owner_id === user.id);
      const proProjects = userProjects.filter(p => p.plan === 'pro').length;
      const freeProjects = userProjects.filter(p => p.plan === 'free').length;
      const billingProfile = billingProfileMap.get(user.id);
      const normalizedEmail = user.email?.toLowerCase() ?? null;
      const hasActiveGift =
        activeGiftMap.get(user.id) ||
        (normalizedEmail ? activeGiftMap.get(normalizedEmail) : false) ||
        false;

      let planStatus: 'free' | 'gifted' | 'paid' = 'free';

      if (billingProfile?.plan === 'pro') {
        planStatus = billingProfile.billing_cycle === 'gifted' ? 'gifted' : 'paid';
      } else if (hasActiveGift) {
        planStatus = 'gifted';
      } else if (proProjects > 0) {
        planStatus = 'paid';
      }

      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        projects_count: userProjects.length,
        pro_projects: proProjects,
        free_projects: freeProjects,
        has_pro_subscription: planStatus !== 'free',
        plan_status: planStatus,
        billing_cycle: billingProfile?.billing_cycle ?? (planStatus === 'gifted' ? 'gifted' : null),
        subscription_status: billingProfile?.subscription_status ?? null,
      };
    });

    return NextResponse.json({ users: usersWithStats });
    } catch (error) {
      console.error('Admin API error:', error);
      return NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);
