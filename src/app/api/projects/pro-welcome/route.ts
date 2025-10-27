import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendProWelcomeEmail } from '@/lib/email';
import { ensureUserRecord } from '@/lib/users';
import { resolveBillingContext } from '@/lib/billing';

export async function POST(request: NextRequest) {
  try {
    const { projectId, accountId } = await request.json();
    const identifier = projectId || accountId;

    if (!identifier) {
      return NextResponse.json({ error: 'projectId or accountId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const context = await resolveBillingContext(identifier, supabase);
    if (!context) {
      return NextResponse.json({ error: 'Unable to resolve billing context' }, { status: 404 });
    }

    if (context.project?.pro_welcome_email_sent_at) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const plan = context.profile?.plan ?? context.project?.plan ?? 'free';
    if (plan !== 'pro') {
      return NextResponse.json({ error: 'Project is not on the Pro plan' }, { status: 400 });
    }

    let owner;

    try {
      owner = await ensureUserRecord(supabase, context.userId);
    } catch (ensureError) {
      console.error('Failed to ensure project owner before pro welcome email:', ensureError);
      return NextResponse.json({ error: 'Failed to load project owner' }, { status: 500 });
    }

    if (!owner.email) {
      return NextResponse.json({ error: 'Project owner does not have an email address' }, { status: 400 });
    }

    const projectName = context.project?.name ?? 'SignalsLoop workspace';
    await sendProWelcomeEmail({ email: owner.email, name: owner.name, projectName });

    if (context.project?.id) {
      await supabase
        .from('projects')
        .update({ pro_welcome_email_sent_at: new Date().toISOString() })
        .eq('id', context.project.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send pro welcome email:', error);
    return NextResponse.json({ error: 'Failed to send pro welcome email' }, { status: 500 });
  }
}
