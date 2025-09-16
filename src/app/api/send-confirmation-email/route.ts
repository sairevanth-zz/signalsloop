import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email, postTitle, postId, projectSlug } = await request.json();

    // Validate required fields
    if (!email || !postTitle || !postId || !projectSlug) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create the post URL
    const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://signalsloop.com'}/${projectSlug}/post/${postId}`;

    // Send confirmation email
    const emailData = await resend.emails.send({
      from: 'SignalsLoop <notifications@signalsloop.com>',
      to: [email],
      subject: '✅ Thanks for your feedback!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thanks for your feedback!</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0; 
              padding: 0;
              background-color: #f7f9fc;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 { 
              margin: 0; 
              font-size: 28px; 
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px; 
            }
            .post-title { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #667eea;
              margin: 20px 0;
            }
            .post-title h3 { 
              margin: 0; 
              color: #333; 
              font-size: 18px;
            }
            .button { 
              display: inline-block; 
              background: #667eea; 
              color: white; 
              padding: 14px 28px; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: 600;
              margin: 20px 0;
            }
            .footer { 
              background: #f8f9fa; 
              padding: 30px; 
              text-align: center; 
              color: #666; 
              font-size: 14px;
            }
            .footer a { 
              color: #667eea; 
              text-decoration: none; 
            }
            .emoji { 
              font-size: 24px; 
              margin-bottom: 10px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎉</div>
              <h1>Thanks for your feedback!</h1>
            </div>
            
            <div class="content">
              <p>Hi there!</p>
              
              <p>We received your feedback and wanted to say thank you! Every piece of feedback helps us build better features.</p>
              
              <div class="post-title">
                <h3>Your Feedback: "${postTitle}"</h3>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Our team will review your feedback</li>
                <li>Other users can vote and comment on your idea</li>
                <li>We'll update the status as we work on it</li>
                <li>You'll get notified of any status changes</li>
              </ul>
              
              <p>You can track the progress and see other feedback here:</p>
              
              <a href="${postUrl}" class="button">View Your Feedback</a>
              
              <p>Thanks for helping us improve!</p>
              
              <p>Best regards,<br>The SignalsLoop Team</p>
            </div>
            
            <div class="footer">
              <p>
                This email was sent because you submitted feedback on SignalsLoop.<br>
                <a href="mailto:support@signalsloop.com">Contact Support</a> | 
                <a href="${postUrl}">View Feedback</a>
              </p>
              <p style="margin-top: 20px;">
                <strong>SignalsLoop</strong> - Simple Feedback Boards & Public Roadmaps
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Thanks for your feedback!

We received your feedback: "${postTitle}"

Our team will review it and you'll get notified of any status changes.

View your feedback: ${postUrl}

Thanks for helping us improve!
The SignalsLoop Team
      `.trim()
    });

    console.log('Email sent successfully:', emailData.data?.id);

    return NextResponse.json({ 
      success: true, 
      emailId: emailData.data?.id 
    });

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}