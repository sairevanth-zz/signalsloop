import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendEmail } from '@/lib/email';
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

    // Fetch stakeholder
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id, name, email, access_token, token_expires_at, project_id')
      .eq('id', stakeholderId)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ success: false, error: 'Stakeholder not found' }, { status: 404 });
    }

    if (!stakeholder.email) {
      return NextResponse.json({ success: false, error: 'Stakeholder has no email' }, { status: 400 });
    }

    // Generate token if missing/expired
    let token = stakeholder.access_token;
    let tokenExpiresAt = stakeholder.token_expires_at ? new Date(stakeholder.token_expires_at) : null;
    const now = new Date();

    if (!token || !tokenExpiresAt || tokenExpiresAt < now) {
      token = crypto.randomBytes(32).toString('base64url');
      tokenExpiresAt = new Date();
      tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1);

      await supabase
        .from('stakeholders')
        .update({
          access_token: token,
          token_expires_at: tokenExpiresAt.toISOString(),
        })
        .eq('id', stakeholder.id);
    }

    const { data: project } = await supabase
      .from('projects')
      .select('name, slug')
      .eq('id', stakeholder.project_id)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const portalUrl = `${baseUrl}/stakeholder-portal/${token}`;
    const projectName = project?.name || 'your product';

    const html = `
      <div>
        <p>Hi ${stakeholder.name || 'there'},</p>
        <p>Access the live roadmap and ask AI for status updates here:</p>
        <p><a href="${portalUrl}">${portalUrl}</a></p>
        <p>Project: ${projectName}</p>
        <p>Thanks,<br/>SignalsLoop</p>
      </div>
    `;

    await sendEmail({
      to: stakeholder.email,
      subject: `${projectName} — Stakeholder Portal`,
      html,
    });

    return NextResponse.json({ success: true, portalUrl });
  } catch (error) {
    console.error('[Stakeholder Email Portal] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send portal link' }, { status: 500 });
  }
}
