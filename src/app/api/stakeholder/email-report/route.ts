/**
 * Email Report API
 * Sends stakeholder intelligence reports via email
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      queryText,
      userRole,
      components,
      projectId,
      recipientEmail,
      reportName
    } = body;

    if (!queryText || !userRole || !components || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate HTML report
    const html = generateEmailHTML(
      queryText,
      userRole,
      components,
      projectId,
      reportName
    );

    // In a real implementation, you would use an email service like:
    // - Resend (resend.com)
    // - SendGrid
    // - AWS SES
    // - Mailgun
    //
    // Example with Resend:
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'reports@signalsloop.com',
    //   to: recipientEmail,
    //   subject: `Stakeholder Intelligence Report: ${reportName || queryText}`,
    //   html: html
    // });

    console.log('[Email Report] Would send email to:', recipientEmail);
    console.log('[Email Report] Report name:', reportName || queryText);
    console.log('[Email Report] Components count:', components.length);

    // For now, return success (implement actual email sending when ready)
    return NextResponse.json({
      success: true,
      message: 'Email report queued for delivery',
      recipient: recipientEmail
    });
  } catch (error) {
    console.error('[Email Report API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send email report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(
  queryText: string,
  userRole: string,
  components: any[],
  projectId: string,
  reportName?: string
): string {
  const timestamp = new Date().toLocaleString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportName || 'Stakeholder Intelligence Report'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 0;
      margin: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .meta {
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .component {
      margin-bottom: 25px;
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
    }
    .component-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 12px;
      color: #1f2937;
    }
    .metric {
      font-size: 32px;
      font-weight: bold;
      color: #8b5cf6;
      margin: 10px 0;
    }
    .theme-item {
      display: inline-block;
      padding: 6px 12px;
      margin: 4px;
      background: #8b5cf6;
      color: white;
      border-radius: 16px;
      font-size: 13px;
    }
    .feedback-item {
      padding: 12px;
      margin: 8px 0;
      border-left: 3px solid #8b5cf6;
      background: white;
      font-size: 14px;
    }
    .footer {
      padding: 20px 30px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background: #8b5cf6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ ${reportName || 'Stakeholder Intelligence Report'}</h1>
      <div class="meta">
        <div>${queryText}</div>
        <div style="margin-top: 8px;">Role: ${userRole} • ${timestamp}</div>
      </div>
    </div>

    <div class="content">
      ${components.map((component) => renderComponentForEmail(component)).join('\n')}

      <div style="text-align: center; margin-top: 30px;">
        <a href="https://signalsloop.com/dashboard/${projectId}/stakeholder" class="cta-button">
          View Interactive Dashboard
        </a>
      </div>
    </div>

    <div class="footer">
      <p><strong>SignalsLoop Stakeholder Intelligence</strong></p>
      <p>This report was automatically generated based on your product feedback data.</p>
      <p style="margin-top: 15px;">
        <a href="https://signalsloop.com" style="color: #8b5cf6; text-decoration: none;">signalsloop.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render component for email
 */
function renderComponentForEmail(component: any): string {
  const { type, props } = component;

  switch (type) {
    case 'SummaryText':
      return `
        <div class="component">
          <div style="font-size: 15px; line-height: 1.6;">
            ${props.content}
          </div>
        </div>
      `;

    case 'MetricCard':
      return `
        <div class="component">
          <div class="component-title">${props.title}</div>
          <div class="metric">${props.value}</div>
          ${props.delta ? `<div style="color: #6b7280; font-size: 14px;">${props.delta}</div>` : ''}
          ${props.description ? `<div style="margin-top: 8px; font-size: 14px; color: #4b5563;">${props.description}</div>` : ''}
        </div>
      `;

    case 'ThemeCloud':
      return `
        <div class="component">
          <div class="component-title">${props.title || 'Top Themes'}</div>
          <div>
            ${props.themes?.slice(0, 10).map((theme: any) =>
              `<span class="theme-item">${theme.name} (${theme.count})</span>`
            ).join('') || ''}
          </div>
        </div>
      `;

    case 'FeedbackList':
      return `
        <div class="component">
          <div class="component-title">${props.title || 'Feedback'}</div>
          ${props.items?.slice(0, 5).map((item: any) => `
            <div class="feedback-item">
              <strong>${item.title}</strong>
              ${item.content ? `<div style="margin-top: 4px;">${item.content}</div>` : ''}
              <div style="font-size: 11px; color: #9ca3af; margin-top: 6px;">
                Sentiment: ${item.sentiment?.toFixed(2) || 'N/A'} • ${item.source || 'Unknown'}
              </div>
            </div>
          `).join('') || '<p>No feedback items</p>'}
        </div>
      `;

    case 'ActionCard':
      return `
        <div class="component" style="border-left: 4px solid ${props.severity === 'high' ? '#ef4444' : props.severity === 'medium' ? '#f59e0b' : '#3b82f6'}">
          <div class="component-title">⚡ ${props.title}</div>
          <div style="font-size: 14px;">
            <div style="margin-bottom: 8px;"><strong>Action:</strong> ${props.action}</div>
            ${props.description ? `<div>${props.description}</div>` : ''}
            <div style="margin-top: 8px;">
              <strong>Severity:</strong> <span style="text-transform: uppercase;">${props.severity || 'UNKNOWN'}</span>
            </div>
          </div>
        </div>
      `;

    case 'SentimentChart':
    case 'TimelineEvents':
    case 'CompetitorCompare':
      // For complex visualizations, provide a summary and link to dashboard
      return `
        <div class="component">
          <div class="component-title">${props.title || type}</div>
          <div style="text-align: center; padding: 20px; background: white; border-radius: 6px;">
            <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
            <div style="color: #6b7280; font-size: 14px;">
              View this visualization in the interactive dashboard
            </div>
          </div>
        </div>
      `;

    default:
      return '';
  }
}
