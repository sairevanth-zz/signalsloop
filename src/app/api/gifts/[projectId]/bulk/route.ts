import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const { emails, duration_months, gift_message } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Emails array is required' },
        { status: 400 }
      );
    }

    if (!duration_months) {
      return NextResponse.json(
        { error: 'Duration is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create multiple gift subscriptions
    const giftPromises = emails.map(async (email: string) => {
      const { data, error } = await supabase.rpc('create_gift_subscription', {
        p_project_id: params.projectId,
        p_recipient_email: email.trim(),
        p_duration_months: duration_months,
        p_gift_message: gift_message || null,
      });

      return { email, data, error };
    });

    const results = await Promise.all(giftPromises);
    
    const successful = results.filter(result => result.data?.success);
    const failed = results.filter(result => !result.data?.success || result.error);

    // TODO: Send email notifications to all recipients
    // This would integrate with your email service

    return NextResponse.json({
      success: true,
      created_count: successful.length,
      failed_count: failed.length,
      failed_emails: failed.map(f => f.email),
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
