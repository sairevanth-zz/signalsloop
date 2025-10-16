import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendFreeWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('[TEST WELCOME] Testing welcome email for user:', userId);

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      console.error('[TEST WELCOME] Service role client unavailable');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Get user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[TEST WELCOME] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.email) {
      console.error('[TEST WELCOME] User has no email');
      return NextResponse.json({ error: 'User has no email' }, { status: 400 });
    }

    console.log('[TEST WELCOME] Sending welcome email to:', user.email);

    // Send welcome email
    await sendFreeWelcomeEmail({
      email: user.email,
      name: null,
    });

    // Update the user record
    await supabase
      .from('users')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', userId);

    console.log('[TEST WELCOME] ✅ Welcome email sent successfully');

    return NextResponse.json({
      success: true,
      email: user.email,
      message: 'Welcome email sent successfully'
    });
  } catch (error) {
    console.error('[TEST WELCOME] ❌ Failed to send welcome email:', error);
    return NextResponse.json({
      error: 'Failed to send welcome email',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
