import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendCancellationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name, owner_id, cancellation_email_sent_at, plan, subscription_status')
      .eq('id', projectId)
      .maybeSingle();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.cancellation_email_sent_at) {
      return NextResponse.json({ success: true, skipped: true });
    }

    if (project.plan !== 'free' || project.subscription_status !== 'canceled') {
      return NextResponse.json({ error: 'Project is not canceled' }, { status: 400 });
    }

    const { data: owner } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', project.owner_id)
      .maybeSingle();

    if (!owner?.email) {
      return NextResponse.json({ error: 'Project owner does not have an email address' }, { status: 400 });
    }

    const reactivationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.signalsloop.com'}/app`;

    await sendCancellationEmail({
      email: owner.email,
      name: owner.name,
      projectName: project.name,
      reactivationUrl,
    });

    await supabase
      .from('projects')
      .update({ cancellation_email_sent_at: new Date().toISOString() })
      .eq('id', project.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
    return NextResponse.json({ error: 'Failed to send cancellation email' }, { status: 500 });
  }
}
