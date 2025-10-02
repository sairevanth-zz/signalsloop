import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      return NextResponse.json({ 
        error: 'RESEND_API_KEY not found in environment variables',
        hasKey: false
      });
    }

    // Test the API key
    const resend = new Resend(resendApiKey);
    
    // Try to send a test email
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <onboarding@resend.dev>',
      to: ['biorevanth@gmail.com'],
      subject: '🧪 Test Email from SignalsLoop',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend integration.</p>
        <p>If you receive this, the email system is working!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
    });

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        hasKey: true,
        testResult: 'failed',
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      hasKey: true,
      testResult: 'success',
      emailId: data?.id,
      message: 'Test email sent! Check biorevanth@gmail.com inbox.'
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      testResult: 'exception'
    }, { status: 500 });
  }
}

