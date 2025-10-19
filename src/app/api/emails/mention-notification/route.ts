import { NextRequest, NextResponse } from 'next/server';
import { sendMentionNotificationEmail } from '@/lib/email';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mentionedEmail,
      mentionedName,
      commenterName,
      commentText,
      postTitle,
      postUrl,
      projectName,
      projectSlug,
      postId,
      projectId,
      commentId,
      mentionId,
      mentionedUserId,
    } = body;

    if (!mentionedEmail || !commenterName || !commentText || !postTitle || !projectName || !postId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sendResult = await sendMentionNotificationEmail({
      toEmail: mentionedEmail,
      toName: mentionedName,
      commentText,
      commenterName,
      postTitle,
      postId,
      projectId,
      projectName,
      projectSlug,
      commentId,
      postUrl,
      userId: mentionedUserId || null,
    });

    if (sendResult.success && mentionId) {
      const supabase = getSupabaseServiceRoleClient();
      if (supabase) {
        await supabase
          .from('comment_mentions')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', mentionId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
