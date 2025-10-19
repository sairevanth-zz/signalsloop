import { Resend } from 'resend';
import { getSupabaseServiceRoleClient } from './supabase-client';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.signalsloop.com';
const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ||
  process.env.NEXT_PUBLIC_RESEND_FROM_ADDRESS ||
  'SignalsLoop <noreply@signalsloop.com>';

interface BaseEmailParams {
  email: string;
  name?: string | null;
}

interface ProWelcomeEmailParams extends BaseEmailParams {
  projectName?: string | null;
}

interface CancellationEmailParams extends BaseEmailParams {
  projectName?: string | null;
  reactivationUrl?: string | null;
}

function buildEmailHtml({
  title,
  greeting,
  paragraphs,
  bullets = [],
  ctaLabel,
  ctaUrl,
  outro,
}: {
  title: string;
  greeting: string;
  paragraphs: string[];
  bullets?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  outro?: string;
}) {
  const paragraphHtml = paragraphs
    .map(
      (text) =>
        `<p style="margin: 0 0 18px; font-size: 16px; line-height: 1.6; color: #374151;">${text}</p>`
    )
    .join('');

  const bulletsHtml =
    bullets.length > 0
      ? `<ul style="margin: 0 0 24px; padding-left: 20px; color: #374151;">
          ${bullets
            .map(
              (item) => `<li style="margin-bottom: 12px; font-size: 15px; line-height: 1.6;">${item}</li>`
            )
            .join('')}
        </ul>`
      : '';

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<div style="text-align: center; margin: 30px 0;">
          <a href="${ctaUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            ${ctaLabel}
          </a>
        </div>`
      : '';

  const outroHtml =
    outro
      ? `<p style="margin: 30px 0 18px; font-size: 16px; line-height: 1.6; color: #374151;">${outro}</p>`
      : '';

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color:#f9fafb;">
      <table role="presentation" style="width:100%; border-collapse:collapse; background-color:#f9fafb;">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table role="presentation" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; box-shadow:0 12px 32px rgba(15, 23, 42, 0.1); overflow:hidden;">
              <tr>
                <td style="padding:40px 40px 24px; text-align:center; background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                  <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700;">${title}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px 24px;">
                  <p style="margin:0 0 18px; font-size:16px; line-height:1.6; color:#374151;">${greeting}</p>
                  ${paragraphHtml}
                  ${bulletsHtml}
                  ${ctaHtml}
                  ${outroHtml}
                  <p style="margin:30px 0 0; font-size:16px; line-height:1.6; color:#374151;">Warmly,<br/>The SignalsLoop Team</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 40px; background-color:#f3f4f6; text-align:center;">
                  <p style="margin:0; font-size:13px; color:#6b7280;">
                    Need a hand? Reply to this email or reach us at <a href="mailto:support@signalsloop.com" style="color:#4f46e5; text-decoration:none;">support@signalsloop.com</a>
                  </p>
                  <p style="margin:12px 0 0; font-size:12px; color:#9ca3af;">© ${new Date().getFullYear()} SignalsLoop. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resendApiKey) {
    const message = 'RESEND_API_KEY is not configured';
    console.error(message);
    throw new Error(message);
  }

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error('Email send error:', error);
    throw error;
  }

  return data;
}

export async function sendFreeWelcomeEmail({ email, name }: BaseEmailParams) {
  const html = buildEmailHtml({
    title: 'Welcome to SignalsLoop 👋',
    greeting: `Hi${name ? ` ${name}` : ''},`,
    paragraphs: [
      'Thanks for joining SignalsLoop! We built this space to help product teams capture feedback, understand what matters most, and keep customers in the loop. We’re excited to have you with us.',
      'Here are a few quick things you can do right away:',
    ],
    bullets: [
      'Create your first public board and invite your team.',
      'Capture ideas or feedback from customers in seconds.',
      'Keep everyone aligned by sharing roadmap updates effortlessly.',
    ],
    ctaLabel: 'Start Building Your Board',
    ctaUrl: `${APP_URL}/app`,
    outro: 'Have questions or want tips? Just reply—our team reads every message.',
  });

  await sendEmail({ to: email, subject: '👋 Welcome to SignalsLoop', html });
}

export async function sendProWelcomeEmail({ email, name, projectName }: ProWelcomeEmailParams) {
  const html = buildEmailHtml({
    title: 'Welcome to SignalsLoop Pro 🚀',
    greeting: `Hi${name ? ` ${name}` : ''},`,
    paragraphs: [
      `Thank you for upgrading to SignalsLoop Pro! You now have everything you need to run a world-class feedback program across all your projects.`,
      "Here's what you can start using right away:",
    ],
    bullets: [
      'Unlimited feedback boards and advanced AI insights.',
      'Priority support with faster responses from our team.',
      'Custom branding to give your portals the exact look you want.',
      'Deep analytics to understand sentiment, themes, and demand.',
    ],
    ctaLabel: 'Explore Pro Features',
    ctaUrl: `${APP_URL}/app`,
    outro: "If there's anything you'd like help with—from migration to best practices—just reply. We're here for you.",
  });

  await sendEmail({ to: email, subject: '🚀 Your SignalsLoop Pro account is ready', html });
}

export async function sendCancellationEmail({
  email,
  name,
  projectName,
  reactivationUrl,
}: CancellationEmailParams) {
  const html = buildEmailHtml({
    title: 'Sorry to see you go 💜',
    greeting: `Hi${name ? ` ${name}` : ''},`,
    paragraphs: [
      `Thanks for spending time with SignalsLoop. We've canceled your Pro subscription, but all your projects and feedback are safe if you decide to return.`,
    ],
    bullets: [
      'You can continue using the free plan any time.',
      'Need an export of your data? Reply and we\'ll send it over.',
      'We\'re always iterating—tell us what would bring you back!',
    ],
    ctaLabel: reactivationUrl ? 'Reactivate Your Pro Subscription' : undefined,
    ctaUrl: reactivationUrl ?? undefined,
    outro: 'Got a minute to share feedback? Hit reply—your input makes SignalsLoop better for everyone.',
  });

  await sendEmail({ to: email, subject: '💜 We\'ve canceled your SignalsLoop Pro subscription', html });
}

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

// ==================== EMAIL NOTIFICATION SYSTEM ====================

// Helper: Generate email base template
function getEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SignalsLoop Notification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${content}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// Helper: Get status badge HTML
function getStatusBadge(status: string): string {
  const badges: Record<string, { color: string; bg: string; text: string }> = {
    open: { color: '#6b7280', bg: '#f3f4f6', text: 'Open' },
    planned: { color: '#3b82f6', bg: '#dbeafe', text: '📅 Planned' },
    in_progress: { color: '#f59e0b', bg: '#fef3c7', text: '🚧 In Progress' },
    done: { color: '#10b981', bg: '#d1fae5', text: '✅ Done' },
    declined: { color: '#ef4444', bg: '#fee2e2', text: '❌ Declined' },
  };

  const badge = badges[status] || badges.open;
  return `<span style="display: inline-block; padding: 6px 12px; background-color: ${badge.bg}; color: ${badge.color}; border-radius: 6px; font-weight: 600; font-size: 14px;">${badge.text}</span>`;
}

// Helper: Log email send
async function logEmail(params: {
  emailType: string;
  toEmail: string;
  fromEmail?: string;
  subject: string;
  postId?: string;
  commentId?: string;
  projectId?: string;
  resendId?: string;
  metadata?: any;
}) {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return;

  try {
    await supabase.from('email_logs').insert({
      email_type: params.emailType,
      to_email: params.toEmail,
      from_email: params.fromEmail || 'noreply@signalsloop.com',
      subject: params.subject,
      post_id: params.postId,
      comment_id: params.commentId,
      project_id: params.projectId,
      resend_id: params.resendId,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

// Helper: Check if should send email
async function checkEmailPreferences(
  email: string,
  userId: string | null,
  emailType: string
): Promise<boolean> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return true; // Fail open

  try {
    const { data: rpcResult, error } = await supabase.rpc('should_send_email', {
      p_email: email,
      p_user_id: userId,
      p_email_type: emailType,
    });

    if (error) {
      console.error('Error checking email preferences:', error);
      return true; // Fail open
    }

    return rpcResult === true;
  } catch (error) {
    console.error('Failed to check email preferences:', error);
    return true; // Fail open
  }
}

// Helper: Check rate limit
async function checkRateLimit(email: string, maxPerDay = 5): Promise<boolean> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return true; // Fail open

  try {
    const { data: rpcResult, error } = await supabase.rpc('check_email_rate_limit', {
      p_email: email,
      p_max_per_day: maxPerDay,
    });

    if (error) {
      console.error('Error checking rate limit:', error);
      return true; // Fail open
    }

    return rpcResult === true;
  } catch (error) {
    console.error('Failed to check rate limit:', error);
    return true; // Fail open
  }
}

// Helper: Increment email count
async function incrementEmailCount(email: string): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return;

  try {
    await supabase.rpc('increment_email_count', {
      p_email: email,
    });
  } catch (error) {
    console.error('Failed to increment email count:', error);
  }
}

// Helper: Get unsubscribe token
async function getOrCreateUnsubscribeToken(email: string, userId: string | null): Promise<string> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return '';

  try {
    // Try to get existing token
    let query = supabase.from('email_preferences').select('unsubscribe_token');
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('email', email);
    }

    const { data, error } = await query.single();

    if (data?.unsubscribe_token) {
      return data.unsubscribe_token;
    }

    // Create new token
    const { data: tokenData } = await supabase.rpc('generate_unsubscribe_token');
    const token = tokenData || Math.random().toString(36).substring(2);

    // Insert or update preferences
    await supabase.from('email_preferences').upsert({
      email: email,
      user_id: userId,
      unsubscribe_token: token,
    });

    return token;
  } catch (error) {
    console.error('Failed to get/create unsubscribe token:', error);
    return '';
  }
}

interface CollectPostNotificationRecipientsOptions {
  postId: string;
  authorEmail?: string | null;
  includeAuthor?: boolean;
  includeVoters?: boolean;
  includeCommenters?: boolean;
  includeMentions?: boolean;
  includeOnBehalfCustomers?: boolean;
  excludeEmails?: Array<string | null | undefined>;
}

async function collectPostNotificationRecipients(
  options: CollectPostNotificationRecipientsOptions
): Promise<string[]> {
  const {
    postId,
    authorEmail,
    includeAuthor = false,
    includeVoters = true,
    includeCommenters = true,
    includeMentions = true,
    includeOnBehalfCustomers = true,
    excludeEmails = [],
  } = options;

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return [];

  const normalizedExclude = new Set(
    excludeEmails
      .map((email) => email?.trim().toLowerCase())
      .filter((email): email is string => !!email)
  );

  const recipients = new Map<string, string>();
  const addRecipient = (email?: string | null) => {
    if (!email) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized || normalizedExclude.has(normalized)) return;
    if (!recipients.has(normalized)) {
      recipients.set(normalized, email.trim());
    }
  };

  if (includeAuthor) {
    addRecipient(authorEmail);
  }

  const [votesResult, commentsResult, mentionsResult, metadataResult] = await Promise.all([
    includeVoters
      ? supabase.from('votes').select('voter_email').eq('post_id', postId)
      : Promise.resolve({ data: [], error: null }),
    includeCommenters
      ? supabase.from('comments').select('author_email').eq('post_id', postId)
      : Promise.resolve({ data: [], error: null }),
    includeMentions
      ? supabase.from('comment_mentions').select('mentioned_user_email').eq('post_id', postId)
      : Promise.resolve({ data: [], error: null }),
    includeOnBehalfCustomers
      ? supabase.from('feedback_metadata').select('customer_email').eq('post_id', postId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (votesResult.error) {
    console.error('Failed to load vote recipients:', votesResult.error);
  } else {
    votesResult.data?.forEach((row: { voter_email?: string | null }) => addRecipient(row?.voter_email));
  }

  if (commentsResult.error) {
    console.error('Failed to load comment recipients:', commentsResult.error);
  } else {
    commentsResult.data?.forEach((row: { author_email?: string | null }) => addRecipient(row?.author_email));
  }

  if (mentionsResult.error) {
    console.error('Failed to load mention recipients:', mentionsResult.error);
  } else {
    mentionsResult.data?.forEach((row: { mentioned_user_email?: string | null }) =>
      addRecipient(row?.mentioned_user_email)
    );
  }

  if (metadataResult.error) {
    console.error('Failed to load feedback metadata recipients:', metadataResult.error);
  } else {
    metadataResult.data?.forEach((row: { customer_email?: string | null }) =>
      addRecipient(row?.customer_email)
    );
  }

  return Array.from(recipients.values());
}

interface ProjectNotificationRecipientRecord {
  id: string;
  email: string;
  name: string | null;
  receive_weekly_digest: boolean;
  receive_team_alerts: boolean;
}

export interface ProjectNotificationRecipient {
  email: string;
  name: string | null;
  receiveWeeklyDigest: boolean;
  receiveTeamAlerts: boolean;
}

export async function getAllProjectNotificationRecipients(
  projectId: string
): Promise<ProjectNotificationRecipient[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('project_notification_recipients')
      .select('id, email, name, receive_weekly_digest, receive_team_alerts')
      .eq('project_id', projectId);

    if (error) {
      console.error('Failed to load project notification recipients:', error);
      return [];
    }

    if (!Array.isArray(data)) {
      return [];
    }

    const unique = new Map<string, ProjectNotificationRecipient>();
    data.forEach((row: ProjectNotificationRecipientRecord) => {
      if (!row?.email) return;
      const normalized = row.email.trim().toLowerCase();
      if (!normalized) return;
      if (!unique.has(normalized)) {
        unique.set(normalized, {
          email: normalized,
          name: row.name ?? null,
          receiveWeeklyDigest: Boolean(row.receive_weekly_digest),
          receiveTeamAlerts: Boolean(row.receive_team_alerts),
        });
      } else {
        const existing = unique.get(normalized)!;
        existing.receiveWeeklyDigest =
          existing.receiveWeeklyDigest || Boolean(row.receive_weekly_digest);
        existing.receiveTeamAlerts =
          existing.receiveTeamAlerts || Boolean(row.receive_team_alerts);
        if (!existing.name && row.name) {
          existing.name = row.name;
        }
      }
    });

    return Array.from(unique.values());
  } catch (error) {
    console.error('Unexpected error loading project notification recipients:', error);
    return [];
  }
}

export async function getProjectNotificationRecipientsByType(
  projectId: string,
  type: 'team_alert' | 'weekly_digest'
): Promise<ProjectNotificationRecipient[]> {
  const recipients = await getAllProjectNotificationRecipients(projectId);
  if (type === 'team_alert') {
    return recipients.filter((recipient) => recipient.receiveTeamAlerts);
  }
  return recipients.filter((recipient) => recipient.receiveWeeklyDigest);
}

// ==================== TEMPLATE 1: Status Change ====================

interface SendStatusChangeEmailParams {
  toEmail: string;
  toName?: string;
  userId?: string;
  postTitle: string;
  postId: string;
  projectId: string;
  projectSlug: string;
  oldStatus: string;
  newStatus: string;
  adminNote?: string;
}

export async function sendStatusChangeEmail(params: SendStatusChangeEmailParams) {
  const {
    toEmail,
    toName,
    userId,
    postTitle,
    postId,
    projectId,
    projectSlug,
    oldStatus,
    newStatus,
    adminNote,
  } = params;

  // Check preferences
  const shouldSend = await checkEmailPreferences(toEmail, userId || null, 'status_change');
  if (!shouldSend) {
    console.log(`User ${toEmail} has opted out of status change emails`);
    return { success: false, reason: 'opted_out' };
  }

  // Check rate limit
  const withinLimit = await checkRateLimit(toEmail);
  if (!withinLimit) {
    console.log(`Rate limit exceeded for ${toEmail}`);
    return { success: false, reason: 'rate_limit' };
  }

  const postUrl = `${APP_URL}/${projectSlug}/board?post=${postId}`;
  const unsubscribeToken = await getOrCreateUnsubscribeToken(toEmail, userId || null);
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  let statusMessage = '';
  if (newStatus === 'planned') {
    statusMessage = "We're planning to work on this! It's on our roadmap.";
  } else if (newStatus === 'in_progress') {
    statusMessage = "We've started building this! Stay tuned for updates.";
  } else if (newStatus === 'done') {
    statusMessage = "🎉 This is live! Check it out now.";
  } else if (newStatus === 'declined') {
    statusMessage = adminNote || "Thanks for the suggestion. We've decided not to build this at this time.";
  }

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">📢 Status Update</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Hi${toName ? ` ${toName}` : ''},
        </p>
        
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Good news! We've updated the status of your feature request.
        </p>
        
        <div style="margin: 30px 0; padding: 25px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #667eea;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            Your Feedback
          </p>
          <p style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #111827;">
            ${postTitle}
          </p>
          <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
            Status Update:
          </p>
          <p style="margin: 0;">
            ${getStatusBadge(newStatus)}
          </p>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: ${newStatus === 'done' ? '#d1fae5' : newStatus === 'declined' ? '#fee2e2' : '#dbeafe'}; border-radius: 8px;">
          <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #111827;">
            ${statusMessage}
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${postUrl}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Feedback
          </a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          Questions? Contact us at <a href="mailto:support@signalsloop.com" style="color: #667eea; text-decoration: none;">support@signalsloop.com</a>
        </p>
        <p style="margin: 0 0 10px; font-size: 12px; color: #9ca3af;">
          © 2025 SignalsLoop. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 11px;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these emails</a>
        </p>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: [toEmail],
      subject: `Update on your feedback: ${postTitle}`,
      html: getEmailTemplate(content),
    });

    if (error) {
      console.error('Error sending status change email:', error);
      throw error;
    }

    // Log email
    await logEmail({
      emailType: 'status_change',
      toEmail,
      subject: `Update on your feedback: ${postTitle}`,
      postId,
      projectId,
      resendId: data?.id,
      metadata: { oldStatus, newStatus, adminNote },
    });

    // Increment count
    await incrementEmailCount(toEmail);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send status change email:', error);
    throw error;
  }
}

interface NotifyStatusChangeParticipantsParams {
  postId: string;
  projectId: string;
  projectSlug: string;
  postTitle: string;
  oldStatus: string;
  newStatus: string;
  adminNote?: string;
  authorEmail?: string | null;
  triggeredByEmail?: string | null;
}

export async function notifyStatusChangeParticipants(
  params: NotifyStatusChangeParticipantsParams
): Promise<void> {
  const recipients = await collectPostNotificationRecipients({
    postId: params.postId,
    authorEmail: params.authorEmail,
    includeAuthor: false,
    includeVoters: true,
    includeCommenters: true,
    includeMentions: true,
    includeOnBehalfCustomers: true,
    excludeEmails: [params.authorEmail, params.triggeredByEmail],
  });

  for (const email of recipients) {
    try {
      await sendStatusChangeEmail({
        toEmail: email,
        postTitle: params.postTitle,
        postId: params.postId,
        projectId: params.projectId,
        projectSlug: params.projectSlug,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        adminNote: params.adminNote,
      });
    } catch (error) {
      console.error('Failed to notify participant of status change:', email, error);
    }
  }
}

// ==================== TEMPLATE 2: New Comment ====================

interface SendCommentEmailParams {
  toEmail: string;
  toName?: string;
  userId?: string;
  postTitle: string;
  postId: string;
  projectId: string;
  projectSlug: string;
  commentId: string;
  commentText: string;
  commenterName: string;
  isAdmin: boolean;
}

export async function sendCommentEmail(params: SendCommentEmailParams) {
  const {
    toEmail,
    toName,
    userId,
    postTitle,
    postId,
    projectId,
    projectSlug,
    commentId,
    commentText,
    commenterName,
    isAdmin,
  } = params;

  // Check preferences
  const shouldSend = await checkEmailPreferences(toEmail, userId || null, 'comment');
  if (!shouldSend) {
    console.log(`User ${toEmail} has opted out of comment emails`);
    return { success: false, reason: 'opted_out' };
  }

  // Check rate limit
  const withinLimit = await checkRateLimit(toEmail);
  if (!withinLimit) {
    console.log(`Rate limit exceeded for ${toEmail}`);
    return { success: false, reason: 'rate_limit' };
  }

  const postUrl = `${APP_URL}/${projectSlug}/board?post=${postId}`;
  const unsubscribeToken = await getOrCreateUnsubscribeToken(toEmail, userId || null);
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  const previewText = commentText.length > 100 ? `${commentText.substring(0, 100)}...` : commentText;

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">💬 New Comment</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Hi${toName ? ` ${toName}` : ''},
        </p>
        
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          ${isAdmin ? '<strong>An admin</strong>' : `<strong>${commenterName}</strong>`} just ${isAdmin ? 'replied' : 'commented'} on your feature request:
        </p>
        
        <div style="margin: 30px 0; padding: 25px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            Your Feedback
          </p>
          <p style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #111827;">
            ${postTitle}
          </p>
          <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
            ${isAdmin ? 'Admin' : commenterName}'s Comment:
          </p>
          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #374151; font-style: italic;">
            "${previewText}"
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${postUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Full Comment
          </a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          Questions? Contact us at <a href="mailto:support@signalsloop.com" style="color: #10b981; text-decoration: none;">support@signalsloop.com</a>
        </p>
        <p style="margin: 0 0 10px; font-size: 12px; color: #9ca3af;">
          © 2025 SignalsLoop. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 11px;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these emails</a>
        </p>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: [toEmail],
      subject: `${commenterName} ${isAdmin ? 'replied to' : 'commented on'} your feedback`,
      html: getEmailTemplate(content),
    });

    if (error) {
      console.error('Error sending comment email:', error);
      throw error;
    }

    // Log email
    await logEmail({
      emailType: 'comment',
      toEmail,
      subject: `${commenterName} ${isAdmin ? 'replied to' : 'commented on'} your feedback`,
      postId,
      commentId,
      projectId,
      resendId: data?.id,
      metadata: { commenterName, isAdmin },
    });

    // Increment count
    await incrementEmailCount(toEmail);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send comment email:', error);
    throw error;
  }
}

interface NotifyCommentParticipantsParams {
  postId: string;
  projectId: string;
  projectSlug: string;
  postTitle: string;
  commentId: string;
  commentText: string;
  commenterName: string;
  commentAuthorEmail?: string | null;
  postAuthorEmail?: string | null;
  isAdminComment?: boolean;
}

export async function notifyCommentParticipants(
  params: NotifyCommentParticipantsParams
): Promise<void> {
  const recipients = await collectPostNotificationRecipients({
    postId: params.postId,
    authorEmail: params.postAuthorEmail,
    includeAuthor: false,
    includeVoters: true,
    includeCommenters: true,
    includeMentions: true,
    includeOnBehalfCustomers: true,
    excludeEmails: [params.postAuthorEmail, params.commentAuthorEmail],
  });

  for (const email of recipients) {
    try {
      await sendCommentEmail({
        toEmail: email,
        postTitle: params.postTitle,
        postId: params.postId,
        projectId: params.projectId,
        projectSlug: params.projectSlug,
        commentId: params.commentId,
        commentText: params.commentText,
        commenterName: params.commenterName,
        isAdmin: params.isAdminComment ?? false,
      });
    } catch (error) {
      console.error('Failed to notify participant of new comment:', email, error);
    }
  }
}

// ==================== TEMPLATE 3: Post Submitted (Confirmation) ====================

interface SendPostConfirmationEmailParams {
  toEmail: string;
  toName?: string;
  postTitle: string;
  postId: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  voteCount?: number;
}

export async function sendPostConfirmationEmail(params: SendPostConfirmationEmailParams) {
  const {
    toEmail,
    toName,
    postTitle,
    postId,
    projectId,
    projectSlug,
    projectName,
    voteCount = 0,
  } = params;

  const postUrl = `${APP_URL}/${projectSlug}/board?post=${postId}`;
  const shareUrl = `${APP_URL}/${projectSlug}/board?post=${postId}`;

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✅ We Received Your Feedback!</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Hi${toName ? ` ${toName}` : ''},
        </p>
        
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Thanks for sharing your idea with ${projectName}! Here's what happens next:
        </p>
        
        <div style="margin: 30px 0; padding: 25px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            Your Feedback
          </p>
          <p style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #111827;">
            ${postTitle}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Status:</p>
              <p style="margin: 0;">${getStatusBadge('open')}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Current Votes:</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b;">${voteCount}</p>
            </div>
          </div>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #dbeafe; border-radius: 8px;">
          <p style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #111827;">
            📊 What happens next?
          </p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">
            We review all feedback and prioritize based on votes and impact. Want to increase visibility? Share the link with your team!
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${shareUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 5px;">
            📢 Share Feedback
          </a>
          <a href="${postUrl}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 5px;">
            View Post
          </a>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #111827;">
            💡 Pro Tip:
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #6b7280;">
            We'll send you email updates when the status changes or when team members reply. You can adjust these preferences anytime.
          </p>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          Questions? Contact us at <a href="mailto:support@signalsloop.com" style="color: #f59e0b; text-decoration: none;">support@signalsloop.com</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          © 2025 SignalsLoop. All rights reserved.
        </p>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: [toEmail],
      subject: `✅ We received your feedback: ${postTitle}`,
      html: getEmailTemplate(content),
    });

    if (error) {
      console.error('Error sending post confirmation email:', error);
      throw error;
    }

    // Log email
    await logEmail({
      emailType: 'confirmation',
      toEmail,
      subject: `✅ We received your feedback: ${postTitle}`,
      postId,
      projectId,
      resendId: data?.id,
      metadata: { projectName, voteCount },
    });

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send post confirmation email:', error);
    throw error;
  }
}

// ==================== TEMPLATE 4: Feedback Submitted On Behalf ====================

interface SendFeedbackOnBehalfEmailParams {
  toEmail: string;
  toName: string;
  feedbackTitle: string;
  feedbackDescription?: string | null;
  postId: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  adminName: string;
}

export async function sendFeedbackOnBehalfEmail(params: SendFeedbackOnBehalfEmailParams) {
  const {
    toEmail,
    toName,
    feedbackTitle,
    feedbackDescription,
    postId,
    projectId,
    projectSlug,
    projectName,
    adminName,
  } = params;

  const shouldSend = await checkEmailPreferences(toEmail, null, 'feedback_on_behalf');
  if (!shouldSend) {
    console.log(`User ${toEmail} has opted out of feedback on behalf emails`);
    return { success: false, reason: 'opted_out' };
  }

  const withinLimit = await checkRateLimit(toEmail);
  if (!withinLimit) {
    console.log(`Rate limit exceeded for ${toEmail}`);
    return { success: false, reason: 'rate_limit' };
  }

  const postUrl = `${APP_URL}/${projectSlug}/post/${postId}`;
  const unsubscribeToken = await getOrCreateUnsubscribeToken(toEmail, null);
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;
  const safeDescription =
    feedbackDescription && feedbackDescription.trim().length > 0
      ? feedbackDescription.replace(/\n/g, '<br />')
      : null;

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✓ Feedback Submitted</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Hi${toName ? ` ${toName}` : ''},
        </p>

        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          ${adminName} from <strong>${projectName}</strong> just submitted your feedback to our board.
        </p>

        <div style="margin: 30px 0; padding: 24px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #667eea;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            Your Feedback
          </p>
          <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">
            ${feedbackTitle}
          </p>
          ${
            safeDescription
              ? `<p style="margin: 0; font-size: 14px; line-height: 1.7; color: #4b5563;">${safeDescription}</p>`
              : ''
          }
        </div>

        <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #374151;">
          You can follow the conversation, add more context, or vote to show it's important to you.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${postUrl}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Your Feedback
          </a>
        </div>

        <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
            We'll keep you updated as the status changes. You can reply to this email if you have additional thoughts.
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          Questions? Contact us at <a href="mailto:support@signalsloop.com" style="color: #667eea; text-decoration: none;">support@signalsloop.com</a>
        </p>
        <p style="margin: 0 0 10px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} SignalsLoop. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 11px;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these emails</a>
        </p>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: [toEmail],
      subject: `Your feedback has been submitted to ${projectName}`,
      html: getEmailTemplate(content),
    });

    if (error) {
      console.error('Error sending feedback on behalf email:', error);
      throw error;
    }

    await logEmail({
      emailType: 'feedback_on_behalf',
      toEmail,
      subject: `Your feedback has been submitted to ${projectName}`,
      postId,
      projectId,
      resendId: data?.id,
      metadata: { adminName },
    });

    await incrementEmailCount(toEmail);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send feedback on behalf email:', error);
    throw error;
  }
}

// ==================== TEMPLATE 5: Vote on Behalf Notification ====================

interface SendVoteOnBehalfEmailParams {
  customerEmail: string;
  customerName: string;
  postTitle: string;
  postId: string;
  projectSlug: string;
  projectName: string;
  adminName: string;
}

export async function sendVoteOnBehalfEmail(params: SendVoteOnBehalfEmailParams) {
  const {
    customerEmail,
    customerName,
    postTitle,
    postId,
    projectSlug,
    projectName,
    adminName,
  } = params;

  const postUrl = `${APP_URL}/${projectSlug}/post/${postId}`;
  const shouldSend = await checkEmailPreferences(customerEmail, null, 'vote_on_behalf');
  if (!shouldSend) {
    console.log(`User ${customerEmail} has opted out of vote on behalf emails`);
    return { success: false, reason: 'opted_out' };
  }

  const withinLimit = await checkRateLimit(customerEmail);
  if (!withinLimit) {
    console.log(`Rate limit exceeded for ${customerEmail}`);
    return { success: false, reason: 'rate_limit' };
  }

  const unsubscribeToken = await getOrCreateUnsubscribeToken(customerEmail, null);
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🗳️ Your Request Was Submitted</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Hi${customerName ? ` ${customerName}` : ''},
        </p>
        
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Good news! ${adminName} from ${projectName} has submitted a feature request on your behalf.
        </p>
        
        <div style="margin: 30px 0; padding: 25px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            Feature Request
          </p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
            ${postTitle}
          </p>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #dbeafe; border-radius: 8px;">
          <p style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #111827;">
            💬 Want to add more details?
          </p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">
            You can view this request, add comments with more context, and follow updates. Your input helps us build the right features!
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${postUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Request & Add Comments
          </a>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #111827;">
            📊 What happens next?
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px; line-height: 1.8;">
            <li>We'll review and prioritize based on customer feedback</li>
            <li>You'll get email updates when the status changes</li>
            <li>You can vote and comment to show your support</li>
          </ul>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          Questions? Contact us at <a href="mailto:support@signalsloop.com" style="color: #3b82f6; text-decoration: none;">support@signalsloop.com</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          © 2025 SignalsLoop. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 11px;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these emails</a>
        </p>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: [customerEmail],
      subject: `Your team submitted a feature request: ${postTitle}`,
      html: getEmailTemplate(content),
    });

    if (error) {
      console.error('Error sending vote on behalf email:', error);
      throw error;
    }

    // Log email
    await logEmail({
      emailType: 'vote_on_behalf',
      toEmail: customerEmail,
      subject: `Your team submitted a feature request: ${postTitle}`,
      postId,
      resendId: data?.id,
      metadata: { adminName, projectName },
    });

    await incrementEmailCount(customerEmail);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send vote on behalf email:', error);
    throw error;
  }
}

// ==================== TEMPLATE 6: Mention Notification ====================

interface SendMentionNotificationEmailParams {
  toEmail: string;
  toName?: string | null;
  commentText: string;
  commenterName: string;
  postTitle: string;
  postId: string;
  projectId: string;
  projectName: string;
  projectSlug?: string;
  commentId?: string;
  postUrl?: string;
  userId?: string | null;
}

export async function sendMentionNotificationEmail(params: SendMentionNotificationEmailParams) {
  const {
    toEmail,
    toName,
    commentText,
    commenterName,
    postTitle,
    postId,
    projectId,
    projectName,
    projectSlug,
    commentId,
    postUrl,
    userId,
  } = params;

  const shouldSend = await checkEmailPreferences(toEmail, userId || null, 'mention');
  if (!shouldSend) {
    console.log(`User ${toEmail} has opted out of mention emails`);
    return { success: false, reason: 'opted_out' };
  }

  const withinLimit = await checkRateLimit(toEmail);
  if (!withinLimit) {
    console.log(`Rate limit exceeded for ${toEmail}`);
    return { success: false, reason: 'rate_limit' };
  }

  const url =
    postUrl ||
    (projectSlug ? `${APP_URL}/${projectSlug}/board?post=${postId}` : `${APP_URL}/post/${postId}`);
  const unsubscribeToken = await getOrCreateUnsubscribeToken(toEmail, userId || null);
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;
  const preview =
    commentText.length > 180 ? `${commentText.substring(0, 180).trimEnd()}...` : commentText;

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">💬 You Were Mentioned</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          Hi${toName ? ` ${toName}` : ''},
        </p>

        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
          <strong>${commenterName}</strong> mentioned you in a discussion on <strong>${projectName}</strong>.
        </p>

        <div style="margin: 30px 0; padding: 24px; background-color: #f3f4f6; border-radius: 8px; border-left: 4px solid #6366f1;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            In the thread
          </p>
          <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">
            ${postTitle}
          </p>
          <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #4b5563; font-style: italic;">
            “${preview}”
          </p>
        </div>

        <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #374151;">
          Join the conversation to keep things moving forward.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Comment
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          Questions? Contact us at <a href="mailto:support@signalsloop.com" style="color: #6366f1; text-decoration: none;">support@signalsloop.com</a>
        </p>
        <p style="margin: 0 0 10px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} SignalsLoop. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 11px;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these emails</a>
        </p>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: [toEmail],
      subject: `${commenterName} mentioned you in ${projectName}`,
      html: getEmailTemplate(content),
    });

    if (error) {
      console.error('Error sending mention notification email:', error);
      throw error;
    }

    await logEmail({
      emailType: 'mention',
      toEmail,
      subject: `${commenterName} mentioned you in ${projectName}`,
      postId,
      commentId,
      projectId,
      resendId: data?.id,
      metadata: { commenterName },
    });

    await incrementEmailCount(toEmail);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send mention notification email:', error);
    throw error;
  }
}

// ==================== TEMPLATE 7: Team Feedback Alert ====================

interface SendTeamFeedbackAlertEmailParams {
  toEmail: string;
  toName?: string | null;
  userId?: string | null;
  projectId: string;
  projectSlug: string;
  projectName: string;
  postId: string;
  feedbackTitle: string;
  feedbackDescription?: string | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
  submitterCompany?: string | null;
  submittedByAdminName?: string | null;
  submittedByAdminEmail?: string | null;
  submissionType: 'public_widget' | 'on_behalf';
  submissionSource?: string | null;
  feedbackCategory?: string | null;
  feedbackPriority?: string | null;
}

export async function sendTeamFeedbackAlertEmail(
  params: SendTeamFeedbackAlertEmailParams
): Promise<{ success: boolean; reason?: string; data?: unknown }> {
  const {
    toEmail,
    toName,
    userId,
    projectId,
    projectSlug,
    projectName,
    postId,
    feedbackTitle,
    feedbackDescription,
    submitterName,
    submitterEmail,
    submitterCompany,
    submittedByAdminName,
    submittedByAdminEmail,
    submissionType,
    submissionSource,
    feedbackCategory,
    feedbackPriority,
  } = params;

  if (!toEmail) {
    return { success: false, reason: 'missing_recipient' };
  }

  const shouldSend = await checkEmailPreferences(toEmail, userId || null, 'team_feedback_alert');
  if (!shouldSend) {
    console.log(`User ${toEmail} has opted out of team feedback alerts`);
    return { success: false, reason: 'opted_out' };
  }

  const withinLimit = await checkRateLimit(toEmail, 20);
  if (!withinLimit) {
    console.log(`Team alert rate limit exceeded for ${toEmail}`);
    return { success: false, reason: 'rate_limit' };
  }

  const submissionLabel =
    submissionType === 'on_behalf' ? 'On-Behalf Submission' : 'New Widget Feedback';
  const headerGradient =
    submissionType === 'on_behalf' ? '#0ea5e9 0%, #6366f1 100%' : '#22c55e 0%, #16a34a 100%';
  const introLine =
    submissionType === 'on_behalf'
      ? `${submittedByAdminName || 'A teammate'} captured feedback on behalf of ${
          submitterName || submitterEmail || 'a customer'
        }.`
      : `${submitterName || submitterEmail || 'A customer'} just submitted new feedback via your widget.`;

  const postUrl = `${APP_URL}/${projectSlug}/post/${postId}`;
  const unsubscribeToken = await getOrCreateUnsubscribeToken(toEmail, userId || null);
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;

  const formatMultiValue = (...values: Array<string | null | undefined>) =>
    values.filter((value): value is string => !!value).join('<br />');

  const formatEmail = (email?: string | null) =>
    email
      ? `<a href="mailto:${encodeURIComponent(email)}" style="color: #4f46e5; text-decoration: none;">${escapeHtml(email)}</a>`
      : null;

  const formatTitleCase = (value?: string | null) =>
    value
      ? escapeHtml(
          value
            .split(/[_\s]+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        )
      : null;

  const detailRows: string[] = [];
  const addDetailRow = (label: string, rawValue?: string | null) => {
    if (!rawValue) return;
    detailRows.push(`
      <tr>
        <td style="width: 40%; padding: 12px 16px; background-color: #f9fafb; color: #6b7280; font-size: 14px; border: 1px solid #e5e7eb;">
          ${escapeHtml(label)}
        </td>
        <td style="padding: 12px 16px; font-size: 15px; color: #111827; border: 1px solid #e5e7eb;">
          ${rawValue}
        </td>
      </tr>
    `);
  };

  addDetailRow(
    'Submitted By',
    formatMultiValue(
      submitterName ? escapeHtml(submitterName) : undefined,
      formatEmail(submitterEmail),
      submitterCompany ? escapeHtml(submitterCompany) : undefined
    )
  );
  addDetailRow('Submission Type', escapeHtml(submissionLabel));
  addDetailRow('Source', submissionSource ? escapeHtml(submissionSource) : undefined);
  addDetailRow('Category', formatTitleCase(feedbackCategory));
  addDetailRow('Priority', formatTitleCase(feedbackPriority));

  if (submittedByAdminName || submittedByAdminEmail) {
    addDetailRow(
      'Recorded By',
      formatMultiValue(
        submittedByAdminName ? escapeHtml(submittedByAdminName) : undefined,
        formatEmail(submittedByAdminEmail)
      )
    );
  }

  const detailTableHtml = detailRows.length
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
        ${detailRows.join('')}
      </table>
    `
    : '';

  const descriptionHtml = feedbackDescription
    ? `
      <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-left: 4px solid #4f46e5; border-radius: 8px;">
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #374151;">
          ${escapeHtml(feedbackDescription).replace(/\n/g, '<br />')}
        </p>
      </div>
    `
    : '';

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 24px; text-align: center; background: linear-gradient(135deg, ${headerGradient}); border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">${submissionType === 'on_behalf' ? '🤝 Team Alert' : '📥 New Feedback'}</h1>
        <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 16px;">
          ${escapeHtml(projectName)}
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.6; color: #374151;">
          Hi${toName ? ` ${escapeHtml(toName)}` : ''},
        </p>

        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
          ${escapeHtml(introLine)}
        </p>

        <div style="margin: 0 0 24px; padding: 24px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            Feedback
          </p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
            ${escapeHtml(feedbackTitle)}
          </p>
        </div>

        ${detailTableHtml}
        ${descriptionHtml}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${postUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Review Feedback
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          Need to adjust alerts? Update your notification settings or contact <a href="mailto:support@signalsloop.com" style="color: #4f46e5; text-decoration: none;">support@signalsloop.com</a>
        </p>
        <p style="margin: 0 0 10px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} SignalsLoop. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 11px;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these emails</a>
        </p>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: [toEmail],
      subject: `New feedback captured: ${feedbackTitle}`,
      html: getEmailTemplate(content),
    });

    if (error) {
      console.error('Error sending team feedback alert email:', error);
      throw error;
    }

    await logEmail({
      emailType: 'team_feedback_alert',
      toEmail,
      subject: `New feedback captured: ${feedbackTitle}`,
      postId,
      projectId,
      resendId: data?.id,
      metadata: {
        submissionType,
        submissionSource,
        submitterEmail,
        submitterName,
        submittedByAdminEmail,
        submittedByAdminName,
        feedbackCategory,
        feedbackPriority,
      },
    });

    await incrementEmailCount(toEmail);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send team feedback alert email:', error);
    throw error;
  }
}

// ==================== TEMPLATE 8: Weekly Digest ====================

interface WeeklyDigestPostItem {
  postId: string;
  title: string;
  status?: string | null;
  createdAt?: string | null;
  totalVotes?: number | null;
  newVotes?: number | null;
  newComments?: number | null;
}

interface WeeklyDigestProjectSection {
  projectId: string;
  projectName: string;
  projectSlug: string;
  totalNewPosts: number;
  totalNewVotes: number;
  totalNewComments: number;
  newPosts: WeeklyDigestPostItem[];
  topVotedPosts: WeeklyDigestPostItem[];
  topCommentedPosts: WeeklyDigestPostItem[];
}

interface SendWeeklyDigestEmailParams {
  toEmail: string;
  toName?: string | null;
  userId?: string | null;
  timeframeStart: string;
  timeframeEnd: string;
  projects: WeeklyDigestProjectSection[];
}

export async function sendWeeklyDigestEmail(
  params: SendWeeklyDigestEmailParams
): Promise<{ success: boolean; reason?: string; data?: unknown }> {
  const { toEmail, toName, userId, timeframeStart, timeframeEnd, projects } = params;

  if (!projects || projects.length === 0) {
    return { success: false, reason: 'no_projects' };
  }

  const activeProjects = projects.filter(
    (project) =>
      project.totalNewPosts > 0 || project.totalNewVotes > 0 || project.totalNewComments > 0
  );

  if (activeProjects.length === 0) {
    return { success: false, reason: 'no_activity' };
  }

  const shouldSend = await checkEmailPreferences(toEmail, userId || null, 'weekly_digest');
  if (!shouldSend) {
    console.log(`User ${toEmail} has opted out of weekly digest emails`);
    return { success: false, reason: 'opted_out' };
  }

  const withinLimit = await checkRateLimit(toEmail, 10);
  if (!withinLimit) {
    console.log(`Weekly digest rate limit exceeded for ${toEmail}`);
    return { success: false, reason: 'rate_limit' };
  }

  const timeframeStartDate = new Date(timeframeStart);
  const timeframeEndDate = new Date(timeframeEnd);

  const formatDateLabel = (iso?: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const startLabel = timeframeStartDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endLabel = timeframeEndDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const detailsLine = (parts: Array<string | null | undefined>) =>
    parts.filter((part): part is string => !!part && part.trim().length > 0).join(' • ');

  const projectSectionsHtml = activeProjects
    .map((project) => {
      const projectUrl = `${APP_URL}/${project.projectSlug}/board`;

      const newPostsHtml = project.newPosts.length
        ? `
          <div style="margin-top: 20px;">
            <h3 style="margin: 0 0 12px; font-size: 16px; color: #111827;">Latest Posts</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${project.newPosts
                .map((post) => {
                  const postUrl = `${APP_URL}/${project.projectSlug}/post/${post.postId}`;
                  const statusBadge = getStatusBadge(post.status || 'open');
                  const details = detailsLine([
                    post.createdAt ? `Submitted ${formatDateLabel(post.createdAt)}` : null,
                    post.totalVotes !== undefined ? `${post.totalVotes ?? 0} total votes` : null,
                  ]);
                  return `
                    <li style="margin-bottom: 16px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                        <a href="${postUrl}" style="flex: 1; font-weight: 600; color: #1f2937; text-decoration: none;">
                          ${escapeHtml(post.title)}
                        </a>
                        ${statusBadge}
                      </div>
                      ${
                        details
                          ? `<div style="margin-top: 6px; font-size: 13px; color: #6b7280;">${details}</div>`
                          : ''
                      }
                    </li>
                  `;
                })
                .join('')}
            </ul>
          </div>
        `
        : '';

      const topVotesHtml = project.topVotedPosts.length
        ? `
          <div style="margin-top: 24px;">
            <h3 style="margin: 0 0 12px; font-size: 16px; color: #111827;">Most Voted This Week</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${project.topVotedPosts
                .map((post) => {
                  const postUrl = `${APP_URL}/${project.projectSlug}/post/${post.postId}`;
                  const voteDetails = detailsLine([
                    post.newVotes !== undefined ? `+${post.newVotes ?? 0} new votes` : null,
                    post.totalVotes !== undefined ? `${post.totalVotes ?? 0} total votes` : null,
                  ]);
                  return `
                    <li style="margin-bottom: 14px;">
                      <a href="${postUrl}" style="font-weight: 600; color: #1f2937; text-decoration: none;">
                        ${escapeHtml(post.title)}
                      </a>
                      ${
                        voteDetails
                          ? `<div style="margin-top: 6px; font-size: 13px; color: #6b7280;">${voteDetails}</div>`
                          : ''
                      }
                    </li>
                  `;
                })
                .join('')}
            </ul>
          </div>
        `
        : '';

      const topCommentsHtml = project.topCommentedPosts.length
        ? `
          <div style="margin-top: 24px;">
            <h3 style="margin: 0 0 12px; font-size: 16px; color: #111827;">Most Discussed</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${project.topCommentedPosts
                .map((post) => {
                  const postUrl = `${APP_URL}/${project.projectSlug}/post/${post.postId}`;
                  const commentDetails =
                    post.newComments !== undefined
                      ? `+${post.newComments ?? 0} new comments`
                      : null;
                  return `
                    <li style="margin-bottom: 14px;">
                      <a href="${postUrl}" style="font-weight: 600; color: #1f2937; text-decoration: none;">
                        ${escapeHtml(post.title)}
                      </a>
                      ${
                        commentDetails
                          ? `<div style="margin-top: 6px; font-size: 13px; color: #6b7280;">${commentDetails}</div>`
                          : ''
                      }
                    </li>
                  `;
                })
                .join('')}
            </ul>
          </div>
        `
        : '';

      return `
        <div style="margin-top: 30px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #f9fafb; padding: 20px;">
            <h2 style="margin: 0 0 8px; font-size: 20px; color: #111827;">
              ${escapeHtml(project.projectName)}
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              ${escapeHtml(
                `New posts: ${project.totalNewPosts} · New comments: ${project.totalNewComments} · New votes: ${project.totalNewVotes}`
              )}
            </p>
            <p style="margin: 8px 0 0; font-size: 13px;">
              <a href="${projectUrl}" style="color: #4f46e5; text-decoration: none;">Open board</a>
            </p>
          </div>
          <div style="padding: 24px;">
            ${newPostsHtml}
            ${topVotesHtml}
            ${topCommentsHtml}
            ${
              !newPostsHtml && !topVotesHtml && !topCommentsHtml
                ? `<p style="margin: 0; font-size: 14px; color: #6b7280;">No detailed highlights this week, but we recorded activity on this project.</p>`
                : ''
            }
          </div>
        </div>
      `;
    })
    .join('');

  const unsubscribeToken = await getOrCreateUnsubscribeToken(toEmail, userId || null);
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;
  const primaryProject = activeProjects[0];
  const primaryCtaUrl = `${APP_URL}/${primaryProject.projectSlug}/board`;

  const content = `
    <!-- Header -->
    <tr>
      <td style="padding: 40px 40px 24px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #22c55e 100%); border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">📊 Weekly Feedback Digest</h1>
        <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 16px;">
          ${escapeHtml(`${startLabel} – ${endLabel}`)}
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.6; color: #374151;">
          Hi${toName ? ` ${escapeHtml(toName)}` : ''},
        </p>

        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
          Here's what customers talked about over the past week. Use these highlights to prioritize, follow up, or share wins with your team.
        </p>

        ${projectSectionsHtml}

        <div style="text-align: center; margin: 40px 0 10px;">
          <a href="${primaryCtaUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Review Boards
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          Want to tweak these digests? Update notification preferences or contact <a href="mailto:support@signalsloop.com" style="color: #4f46e5; text-decoration: none;">support@signalsloop.com</a>
        </p>
        <p style="margin: 0 0 10px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} SignalsLoop. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 11px;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from weekly digests</a>
        </p>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: [toEmail],
      subject: `Your weekly SignalsLoop digest (${startLabel} – ${endLabel})`,
      html: getEmailTemplate(content),
    });

    if (error) {
      console.error('Error sending weekly digest email:', error);
      throw error;
    }

    await logEmail({
      emailType: 'weekly_digest',
      toEmail,
      subject: `Your weekly SignalsLoop digest (${startLabel} – ${endLabel})`,
      projectId: activeProjects[0]?.projectId,
      resendId: data?.id,
      metadata: {
        timeframeStart,
        timeframeEnd,
        projectIds: activeProjects.map((project) => project.projectId),
      },
    });

    await incrementEmailCount(toEmail);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send weekly digest email:', error);
    throw error;
  }
}
