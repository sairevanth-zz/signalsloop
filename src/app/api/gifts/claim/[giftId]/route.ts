import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export async function POST(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the current user from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Claim the gift subscription using the database function
    const { data, error } = await supabase.rpc('claim_gift_subscription', {
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

    return NextResponse.json({
      success: true,
      message: data.message,
      expires_at: data.expires_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
