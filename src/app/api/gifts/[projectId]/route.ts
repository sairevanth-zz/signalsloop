import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendGiftNotificationEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all gift subscriptions for this project
    const { data: gifts, error } = await supabase
      .from('gift_subscriptions')
      .select('*')
      .eq('project_id', params.projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gifts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gift subscriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ gifts });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const {
      recipient_email,
      duration_months,
      gift_message,
      recipient_name,
      sender_name
    } = body;

    if (!recipient_email || !duration_months) {
      return NextResponse.json(
        { error: 'Recipient email and duration are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the current user from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create the gift subscription using the database function
    const { data, error } = await supabase.rpc('create_gift_subscription', {
      p_project_id: params.projectId,
      p_recipient_email: recipient_email,
      p_duration_months: duration_months,
      p_gift_message: gift_message || null,
    });

    if (error) {
      console.error('Error creating gift:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create gift subscription' },
        { status: 500 }
      );
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to create gift subscription' },
        { status: 400 }
      );
    }

    if (sender_name || recipient_name) {
      try {
        const updatePayload: Record<string, unknown> = {};
        if (sender_name) {
          updatePayload.sender_name = sender_name;
        }
        if (recipient_name) {
          updatePayload.recipient_name = recipient_name;
        }
        if (Object.keys(updatePayload).length > 0) {
          await supabase
            .from('gift_subscriptions')
            .update(updatePayload)
            .eq('id', data.gift_id);
        }
      } catch (updateErr) {
        console.error('Failed to persist sender/recipient names on gift:', updateErr);
      }
    }

    let redemptionCode: string | undefined;
    let expiresAt: string | undefined = data.expires_at ?? undefined;
    let resolvedRecipientName = recipient_name;
    let resolvedSenderName = sender_name;
    let resolvedGiftMessage = gift_message ?? undefined;

    try {
      const { data: giftRecord, error: fetchError } = await supabase
        .from('gift_subscriptions')
        .select('*')
        .eq('id', data.gift_id)
        .single();

      if (fetchError) {
        console.error('Error fetching gift for email notification:', fetchError);
      } else if (giftRecord) {
        redemptionCode = giftRecord.redemption_code ?? undefined;
        expiresAt = giftRecord.expires_at ?? expiresAt;
        resolvedRecipientName = giftRecord.recipient_name ?? resolvedRecipientName;
        resolvedSenderName = giftRecord.sender_name ?? resolvedSenderName;
        resolvedGiftMessage = giftRecord.gift_message ?? resolvedGiftMessage;
      }
    } catch (fetchErr) {
      console.error('Unexpected error loading gift for email:', fetchErr);
    }

    try {
      if (expiresAt) {
        await sendGiftNotificationEmail({
          recipientEmail: recipient_email,
          recipientName: resolvedRecipientName ?? undefined,
          senderName: resolvedSenderName ?? undefined,
          giftMessage: resolvedGiftMessage,
          durationMonths: duration_months,
          redemptionCode,
          expiresAt,
          giftId: data.gift_id,
        });
      } else {
        console.warn('Skipping gift notification email due to missing expiry date');
      }
    } catch (emailError) {
      console.error('Failed to send gift notification email:', emailError);
    }

    return NextResponse.json({
      success: true,
      gift_id: data.gift_id,
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
