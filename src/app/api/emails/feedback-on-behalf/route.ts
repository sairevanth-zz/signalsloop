import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    } = body;

    if (!customerEmail || !customerName || !feedbackTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${projectSlug}/board`;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SignalsLoop <noreply@signalsloop.com>',
      to: [customerEmail],
      subject: `Your feedback has been submitted to ${projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feedback Submitted</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✓ Feedback Submitted</h1>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Thank you for your feedback! ${adminName} from our team has submitted your feature request to our feedback board.
              </p>

              <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #1f2937;">${feedbackTitle}</h2>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">${feedbackDescription}</p>
              </div>

              <p style="font-size: 16px; margin-bottom: 20px;">
                You can view and track the status of your feedback, add comments, or vote for other features on our feedback board:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${postUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Feedback Board
                </a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                We appreciate your input and will keep you updated on the progress of this feature request.
              </p>

              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Best regards,<br>
                <strong>${projectName} Team</strong>
              </p>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">
                This email was sent because feedback was submitted on your behalf to ${projectName}.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
