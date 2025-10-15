import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendFreeWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, welcome_email_sent_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'User record missing email address' }, { status: 400 });
    }

    if (user.welcome_email_sent_at) {
      return NextResponse.json({ success: true, skipped: true });
    }

    await sendFreeWelcomeEmail({ email: user.email, name: user.name });

    await supabase
      .from('users')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 });
  }
}
