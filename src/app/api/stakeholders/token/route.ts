import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { stakeholderId } = await request.json();
    if (!stakeholderId) {
      return NextResponse.json({ success: false, error: 'stakeholderId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const newToken = crypto.randomBytes(32).toString('base64url');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1);

    const { data, error } = await supabase
      .from('stakeholders')
      .update({
        access_token: newToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq('id', stakeholderId)
      .select('access_token')
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Failed to generate token' }, { status: 500 });
    }

    const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/stakeholder-portal/${data.access_token}`;

    return NextResponse.json({ success: true, access_token: data.access_token, portalUrl });
  } catch (error) {
    console.error('[Stakeholder Token] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate token' }, { status: 500 });
  }
}
