import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendGiftNotificationParams {
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  giftMessage?: string;
  durationMonths: number;
  redemptionCode: string;
  expiresAt: string;
  giftId: string;
}

interface SendGiftClaimedParams {
  senderEmail: string;
  senderName?: string;
  recipientEmail: string;
  recipientName?: string;
  durationMonths: number;
  claimedAt: string;
}

export async function sendGiftNotificationEmail({
  recipientEmail,
  recipientName,
  senderName,
  giftMessage,
  durationMonths,
  redemptionCode,
  expiresAt,
  giftId
}: SendGiftNotificationParams) {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.signalsloop.com';
  const claimUrl = `${appUrl}/gift/claim/${giftId}`;
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `🎁 You've received a ${durationMonths}-month Pro subscription gift!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gift Subscription</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎁 You've Got a Gift!</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                          Hi${recipientName ? ` ${recipientName}` : ''},
                        </p>
                        
                        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                          ${senderName ? `<strong>${senderName}</strong>` : 'Someone special'} has gifted you a <strong>${durationMonths}-month Pro subscription</strong> to SignalsLoop!
                        </p>
                        
                        ${giftMessage ? `
                          <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-left: 4px solid #667eea; border-radius: 4px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563; font-style: italic;">
                              "${giftMessage}"
                            </p>
                          </div>
                        ` : ''}
                        
                        <div style="margin: 30px 0; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center;">
                          <p style="margin: 0 0 10px; font-size: 14px; color: rgba(255, 255, 255, 0.9); text-transform: uppercase; letter-spacing: 1px;">
                            Your Redemption Code
                          </p>
                          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                            ${redemptionCode}
                          </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${claimUrl}" style="display: inline-block; padding: 16px 40px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s;">
                            Claim Your Pro Subscription
                          </a>
                        </div>
                        
                        <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400e;">
                            ⏰ <strong>Important:</strong> This gift expires on <strong>${expiryDate}</strong>. Make sure to claim it before then!
                          </p>
                        </div>
                        
                        <div style="margin: 30px 0; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                          <h3 style="margin: 0 0 15px; font-size: 18px; color: #111827;">✨ What's Included:</h3>
                          <ul style="margin: 0; padding-left: 20px; color: #374151;">
                            <li style="margin-bottom: 10px;">Unlimited AI-powered features</li>
                            <li style="margin-bottom: 10px;">Priority support</li>
                            <li style="margin-bottom: 10px;">Advanced analytics</li>
                            <li style="margin-bottom: 10px;">Custom branding</li>
                            <li style="margin-bottom: 10px;">Unlimited feedback posts</li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                          Questions? Contact us at <a href="mailto:support@signalsloop.com" style="color: #667eea; text-decoration: none;">support@signalsloop.com</a>
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                          © 2025 SignalsLoop. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending gift notification email:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send gift notification email:', error);
    throw error;
  }
}

export async function sendGiftClaimedEmail({
  senderEmail,
  senderName,
  recipientEmail,
  recipientName,
  durationMonths,
  claimedAt
}: SendGiftClaimedParams) {
  const claimDate = new Date(claimedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <onboarding@resend.dev>',
      to: [senderEmail],
      subject: `🎉 Your gift has been claimed!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gift Claimed</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px 12px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 Gift Claimed!</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                          Hi${senderName ? ` ${senderName}` : ''},
                        </p>
                        
                        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                          Great news! ${recipientName || recipientEmail} has claimed your ${durationMonths}-month Pro subscription gift on ${claimDate}.
                        </p>
                        
                        <div style="margin: 30px 0; padding: 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; text-align: center;">
                          <p style="margin: 0; font-size: 18px; color: #ffffff; line-height: 1.6;">
                            Your generous gift is now helping them build better products and engage with their users!
                          </p>
                        </div>
                        
                        <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: #374151;">
                          Thank you for spreading the love and helping others succeed with SignalsLoop! 💚
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                          Questions? Contact us at <a href="mailto:support@signalsloop.com" style="color: #10b981; text-decoration: none;">support@signalsloop.com</a>
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                          © 2025 SignalsLoop. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending gift claimed email:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send gift claimed email:', error);
    throw error;
  }
}

