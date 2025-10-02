import { NextRequest, NextResponse } from 'next/server';
import { sendVoteOnBehalfEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerEmail,
      customerName,
      postTitle,
      postId,
      projectSlug,
      projectName,
      adminName,
    } = body;

    if (!customerEmail || !customerName || !postTitle || !postId || !projectSlug || !projectName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await sendVoteOnBehalfEmail({
      customerEmail,
      customerName,
      postTitle,
      postId,
      projectSlug,
      projectName,
      adminName: adminName || 'Your team',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending vote on behalf email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

