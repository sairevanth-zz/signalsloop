import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user from the request
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer', '').trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token to identify the user
    const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      console.error('Failed to resolve user from access token:', userError);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // Use a client scoped to the user session when calling the claim RPC
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Claim the gift subscription using the database function
    const { data, error } = await userClient.rpc('claim_gift_subscription', {
      gift_id: params.giftId,
    });

    if (error) {
      console.error('Error claiming gift:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to claim gift subscription' },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to claim gift subscription' },
        { status: 400 }
      );
    }

    const expiresAt = data.expires_at ?? null;

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
          stripe_customer_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      console.error('Failed to upsert account billing profile for gift recipient:', profileError);
    }

    // Ensure the gift record is linked to the recipient
    const { error: recipientUpdateError } = await adminClient
      .from('gift_subscriptions')
      .update({ recipient_id: userId })
      .eq('id', params.giftId)
      .is('recipient_id', null);

    if (recipientUpdateError) {
      console.error('Failed to update gift recipient_id after claim:', recipientUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
