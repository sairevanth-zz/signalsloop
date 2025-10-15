import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendProWelcomeEmail } from '@/lib/email';

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
      .select('id, name, plan, pro_welcome_email_sent_at, owner_id, stripe_customer_id')
      .eq('id', projectId)
      .maybeSingle();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.pro_welcome_email_sent_at) {
      return NextResponse.json({ success: true, skipped: true });
    }

    if (project.plan !== 'pro') {
      return NextResponse.json({ error: 'Project is not on the Pro plan' }, { status: 400 });
    }

    const { data: owner } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', project.owner_id)
      .maybeSingle();

    if (!owner?.email) {
      return NextResponse.json({ error: 'Project owner does not have an email address' }, { status: 400 });
    }

    await sendProWelcomeEmail({ email: owner.email, name: owner.name, projectName: project.name });

    await supabase
      .from('projects')
      .update({ pro_welcome_email_sent_at: new Date().toISOString() })
      .eq('id', project.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send pro welcome email:', error);
    return NextResponse.json({ error: 'Failed to send pro welcome email' }, { status: 500 });
  }
}
