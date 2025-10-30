import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const logPrefix = '[GiftClaimAPI]';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    // Resolve tokens
    const authHeader = request.headers.get('authorization');
    let accessToken = authHeader?.replace('Bearer', '').trim();
    let refreshToken = request.cookies.get('sb-refresh-token')?.value;
    const cookieAccessToken = request.cookies.get('sb-access-token')?.value;

    if (!accessToken && cookieAccessToken) {
      console.log(`${logPrefix} Using sb-access-token cookie`);
      accessToken = cookieAccessToken;
    }

    if (!accessToken && refreshToken) {
      console.log(`${logPrefix} Attempting refresh session`);
      const { data: refreshData, error: refreshError } = await adminClient.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (refreshError) {
        console.error(`${logPrefix} Refresh session failed`, refreshError);
      } else if (refreshData?.session?.access_token) {
        accessToken = refreshData.session.access_token;
        refreshToken = refreshData.session.refresh_token ?? refreshToken;
        console.log(`${logPrefix} Refresh session succeeded`);
      }
    }

    console.log(`${logPrefix} Request received`, {
      giftId: params.giftId,
      hasAuthHeader: !!authHeader,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    if (!accessToken) {
      console.warn(`${logPrefix} No access token available`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token to identify the user
    const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      console.error(`${logPrefix} Failed to resolve user from token`, userError);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    console.log(`${logPrefix} Authenticated user`, { userId });

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
    let rpcSuccess = false;

    if (gift.project_id) {
      // Use a client scoped to the user session when calling the claim RPC so auth.uid() resolves
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

      const { data, error } = await userClient.rpc('claim_gift_subscription', {
        gift_id: params.giftId,
      });

      if (error) {
        console.error(`${logPrefix} RPC claim failed`, error);
        return NextResponse.json(
          { error: error.message || 'Failed to claim gift subscription' },
          { status: 500 }
        );
      }

      if (!data?.success) {
        console.error(`${logPrefix} RPC claim returned failure`, data);
        return NextResponse.json(
          { error: data?.error || 'Failed to claim gift subscription' },
          { status: 400 }
        );
      }

      rpcSuccess = true;
      claimMessage = data.message ?? claimMessage;
    } else {
      // Manual claim flow for gifts without a pre-associated project
      console.log(`${logPrefix} Claiming gift without project; marking claimed manually`);
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
        console.error(`${logPrefix} Manual gift claim failed`, updateGiftError);
        return NextResponse.json(
          { error: 'Failed to record gift claim' },
          { status: 500 }
        );
      }
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
      used_rpc: rpcSuccess,
    });
  } catch (error) {
    console.error(`${logPrefix} Unexpected error`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
