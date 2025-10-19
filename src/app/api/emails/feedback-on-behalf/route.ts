import { NextRequest, NextResponse } from 'next/server';
import { sendFeedbackOnBehalfEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerEmail,
      customerName,
      feedbackTitle,
      feedbackDescription,
      postId,
      projectSlug,
      projectName,
      adminName,
      projectId,
    } = body;

    if (!customerEmail || !customerName || !feedbackTitle || !projectId || !postId || !projectSlug || !projectName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await sendFeedbackOnBehalfEmail({
      toEmail: customerEmail,
      toName: customerName,
      feedbackTitle,
      feedbackDescription,
      postId,
      projectId,
      projectSlug,
      projectName,
      adminName: adminName || 'Your team',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
