import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const logPrefix = '[GiftClaimAPI]';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

type GiftRecord = {
  id: string;
  project_id: string | null;
  gifter_email: string;
  recipient_email: string;
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  gift_type: 'pro' | 'enterprise';
  duration_months: number;
  expires_at: string | null;
  claimed_at: string | null;
  recipient_id: string | null;
  gift_message?: string | null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let bodyUserId: string | null = null;
    let bodyEmail: string | null = null;

    try {
      const body = await request.json();
      if (body && typeof body === 'object') {
        bodyUserId = typeof body.userId === 'string' ? body.userId : null;
        bodyEmail = typeof body.email === 'string' ? body.email : null;
      }
    } catch (jsonError) {
      // ignore if no body
    }

    console.log(`${logPrefix} Request received`, {
      giftId: params.giftId,
      hasBodyUser: !!bodyUserId,
      hasBodyEmail: !!bodyEmail,
    });

    let userId: string | null = bodyUserId;
    let userEmail: string | null = bodyEmail;

    if (!userId) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        email: bodyEmail,
      });

      if (!error && data?.users?.length) {
        const user = data.users[0];
        userId = user.id;
        userEmail = user.email ?? userEmail;
        console.log(`${logPrefix} Resolved user via admin lookup`, { userId, userEmail });
      } else {
        console.error(`${logPrefix} Failed admin lookup for email`, error);
      }
    }

    if (!userId) {
      console.warn(`${logPrefix} Unable to resolve user for email`, { bodyEmail });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log(`${logPrefix} Target user resolved`, { userId, userEmail });

    // Load gift record
    const { data: gift, error: giftError } = await adminClient
      .from('gift_subscriptions')
      .select<GiftRecord>('id, project_id, status, gift_type, duration_months, expires_at, claimed_at, recipient_id')
      .eq('id', params.giftId)
      .maybeSingle();

    if (giftError) {
      console.error(`${logPrefix} Failed to fetch gift`, giftError);
      return NextResponse.json(
        { error: 'Failed to load gift details' },
        { status: 500 }
      );
    }

    if (!gift) {
      console.warn(`${logPrefix} Gift not found`, { giftId: params.giftId });
      return NextResponse.json(
        { error: 'Gift not found' },
        { status: 404 }
      );
    }

    console.log(`${logPrefix} Loaded gift`, gift);

    if (userEmail && gift.recipient_email && gift.recipient_email.toLowerCase() !== userEmail.toLowerCase()) {
      console.warn(`${logPrefix} Gift recipient mismatch`, { giftRecipient: gift.recipient_email, userEmail });
      return NextResponse.json(
        { error: 'This gift is assigned to a different email address.' },
        { status: 403 }
      );
    }

    if (gift.status !== 'pending') {
      console.warn(`${logPrefix} Gift already handled`, { status: gift.status });
      return NextResponse.json(
        { error: `Gift is already ${gift.status}` },
        { status: 400 }
      );
    }

    const now = new Date();
    if (gift.expires_at && new Date(gift.expires_at) < now) {
      console.warn(`${logPrefix} Gift expired`, { expires_at: gift.expires_at });
      return NextResponse.json(
        { error: 'Gift has expired' },
        { status: 400 }
      );
    }

    const expiresAt = gift.expires_at ?? new Date(now.getTime() + gift.duration_months * 30 * 24 * 60 * 60 * 1000).toISOString();
    const utcNowIso = now.toISOString();

    let claimMessage = 'Gift claimed successfully';

    // Update project if applicable
    if (gift.project_id) {
      const { error: projectUpdateError } = await adminClient
        .from('projects')
        .update({
          plan: 'pro',
          subscription_status: 'active',
          current_period_end: expiresAt,
          updated_at: utcNowIso,
        })
        .eq('id', gift.project_id);

      if (projectUpdateError) {
        console.error(`${logPrefix} Project update failed`, projectUpdateError);
        return NextResponse.json(
          { error: 'Failed to activate gifted project' },
          { status: 500 }
        );
      }

      console.log(`${logPrefix} Project marked pro`, { projectId: gift.project_id });
    }

    const { error: updateGiftError } = await adminClient
      .from('gift_subscriptions')
      .update({
        status: 'claimed',
        claimed_at: utcNowIso,
        recipient_id: userId,
        updated_at: utcNowIso,
      })
      .eq('id', params.giftId);

    if (updateGiftError) {
      console.error(`${logPrefix} Failed to update gift record`, updateGiftError);
      return NextResponse.json(
        { error: 'Failed to record gift claim' },
        { status: 500 }
      );
    }

    // Update all projects owned by the user to reflect Pro access
    const { error: upgradeProjectsError } = await adminClient
      .from('projects')
      .update({
        plan: 'pro',
        subscription_status: 'active',
        updated_at: utcNowIso,
      })
      .eq('owner_id', userId);

    if (upgradeProjectsError) {
      console.error(`${logPrefix} Failed to upgrade user projects to pro`, upgradeProjectsError);
    }

    // Persist gifted status on the account profile so the dashboard reflects Pro access
    const { error: profileError } = await adminClient
      .from('account_billing_profiles')
      .upsert(
        {
          user_id: userId,
          plan: 'pro',
          billing_cycle: 'gifted',
          subscription_status: 'active',
          current_period_end: expiresAt,
          subscription_id: `gift-${params.giftId}`,
          stripe_customer_id: `gift-${userId}`,
          updated_at: utcNowIso,
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      console.error(`${logPrefix} Billing profile upsert failed`, profileError);
    } else {
      console.log(`${logPrefix} Billing profile updated`, { userId, expiresAt });
    }

    const { error: userPlanError } = await adminClient
      .from('users')
      .upsert(
        {
          id: userId,
          email: userEmail,
          plan: 'pro',
          updated_at: utcNowIso,
        },
        { onConflict: 'id' }
      );

    if (userPlanError) {
      console.error(`${logPrefix} Failed to upsert users.plan`, userPlanError);
    }

    if (gift.project_id) {
      const { error: projectUpdateError } = await adminClient
        .from('projects')
        .update({
          plan: 'pro',
          subscription_status: 'active',
          current_period_end: expiresAt,
          updated_at: utcNowIso,
        })
        .eq('id', gift.project_id);

      if (projectUpdateError) {
        console.error(`${logPrefix} Project update failed`, projectUpdateError);
      } else {
        console.log(`${logPrefix} Project marked pro`, { projectId: gift.project_id });
      }
    }

    // Ensure the gift record records the recipient
    const { error: recipientUpdateError } = await adminClient
      .from('gift_subscriptions')
      .update({ recipient_id: userId })
      .eq('id', params.giftId)
      .is('recipient_id', null);

    if (recipientUpdateError) {
      console.error(`${logPrefix} Failed to set recipient_id`, recipientUpdateError);
    } else {
      console.log(`${logPrefix} Gift linked to recipient`, { giftId: params.giftId, userId });
    }

    return NextResponse.json({
      success: true,
      message: claimMessage,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error(`${logPrefix} Unexpected error`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
