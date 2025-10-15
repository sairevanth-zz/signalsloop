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
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id, email, name, welcome_email_sent_at')
      .eq('id', userId)
      .maybeSingle();
    let user = userRecord;

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user record:', error);
      return NextResponse.json({ error: 'Failed to load user record' }, { status: 500 });
    }

    if (!user) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

      if (authError || !authUser?.user?.email) {
        console.error('Auth user lookup failed for welcome email:', authError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const metadata = (authUser.user.user_metadata ?? {}) as Record<string, unknown>;
      const derivedName =
        (metadata.full_name as string | undefined) ??
        (metadata.name as string | undefined) ??
        (metadata.first_name as string | undefined) ??
        null;

      const { data: upsertedUser, error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: authUser.user.id,
            email: authUser.user.email,
            name: derivedName,
            plan: 'free',
          },
          { onConflict: 'id' }
        )
        .select('id, email, name, welcome_email_sent_at')
        .maybeSingle();

      if (upsertError || !upsertedUser) {
        console.error('Failed to upsert user record for welcome email:', upsertError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }

      user = upsertedUser;
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
