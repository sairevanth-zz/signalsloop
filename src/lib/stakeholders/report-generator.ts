/**
 * Stakeholder Report Generator
 * Generates personalized AI-powered reports for stakeholders based on their role
 * Part of Phase 3: Stakeholder Management & Experimentation Intelligence
 */

import { getOpenAI } from '@/lib/openai-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendEmail } from '@/lib/email';

// Initialize OpenAI

// Types
export type StakeholderRole = 'ceo' | 'sales' | 'engineering' | 'marketing' | 'customer_success';

export interface ReportContext {
  // OKRs & Metrics
  okrs?: {
    current: Array<{ objective: string; progress: number; status: string }>;
    blockers: string[];
  };

  // Roadmap changes
  roadmap?: {
    new_items: Array<{ title: string; priority: string; rationale: string }>;
    completed: Array<{ title: string; impact: string }>;
    priority_changes: Array<{ title: string; old_priority: string; new_priority: string; reason: string }>;
  };

  // Feedback themes
  feedback?: {
    top_themes: Array<{ theme: string; count: number; sentiment: number; trend: string }>;
    enterprise_requests: Array<{ title: string; company: string; revenue_impact: number }>;
    urgent_issues: Array<{ title: string; severity: string; status: string }>;
  };

  // Competitive landscape
  competitive?: {
    new_threats: Array<{ competitor: string; move: string; impact: string }>;
    feature_gaps: Array<{ feature: string; gap_score: number }>;
    opportunities: Array<{ description: string; priority: string }>;
  };

  // Metrics
  metrics?: {
    sentiment_trend: { current: number; change: number; forecast: number };
    feedback_velocity: { current: number; change: number };
    feature_adoption: Array<{ feature: string; adoption_rate: number }>;
    churn_risk: { at_risk_count: number; high_value_accounts: string[] };
  };
}

export interface GeneratedReport {
  html: string;
  summary: string;
  sections: string[];
}

/**
 * Main function to generate stakeholder report
 */
export async function generateStakeholderReport(
  stakeholderId: string,
  role: StakeholderRole,
  projectId: string
): Promise<string> {
  console.log(`[Report Generator] Generating report for stakeholder ${stakeholderId} (${role})`);

  try {
    // 1. Gather context based on role
    const context = await gatherReportContext(projectId, role);

    // 2. Generate role-specific report
    const report = await generateRoleBasedReport(role, context);

    // 3. Store report in database
    const supabase = getSupabaseServiceRoleClient();
    if (supabase) {
      await supabase.from('stakeholder_reports').insert({
        stakeholder_id: stakeholderId,
        report_type: 'weekly',
        role,
        content: {
          summary: report.summary,
          sections: report.sections,
          context,
        },
        html_content: report.html,
      });
    }

    console.log(`[Report Generator] Report generated successfully`);
    return report.html;
  } catch (error) {
    console.error('[Report Generator] Error generating report:', error);
    throw error;
  }
}

/**
 * Gather relevant context for report generation
 */
async function gatherReportContext(
  projectId: string,
  role: StakeholderRole
): Promise<ReportContext> {
  console.log(`[Report Generator] Gathering context for project ${projectId}`);

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const context: ReportContext = {};
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Roadmap changes
    const { data: roadmapData } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('project_id', projectId)
      .gte('updated_at', weekAgo)
      .order('updated_at', { ascending: false });

    if (roadmapData) {
      const newItems = roadmapData.filter(i => new Date(i.created_at) > new Date(weekAgo));
      const completed = roadmapData.filter(i => i.status === 'completed');

      context.roadmap = {
        new_items: newItems.map(i => ({
          title: i.title,
          priority: i.priority || 'medium',
          rationale: i.description || '',
        })),
        completed: completed.map(i => ({
          title: i.title,
          impact: i.impact || 'TBD',
        })),
        priority_changes: [], // TODO: Track priority history
      };
    }

    // Feedback themes
    const { data: themesData } = await supabase
      .from('themes')
      .select('theme_name, frequency, first_seen')
      .eq('project_id', projectId)
      .order('frequency', { ascending: false })
      .limit(10);

    const { data: urgentFeedback } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        created_at,
        sentiment_scores (
          score,
          label
        )
      `)
      .eq('project_id', projectId)
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false });

    // Filter for negative sentiment
    const negativePostIds = urgentFeedback?.filter(post => {
      const sentimentScore = post.sentiment_scores?.[0]?.score;
      return sentimentScore !== null && sentimentScore !== undefined && sentimentScore < -0.7;
    }).map(post => ({
      title: post.title,
      severity: post.sentiment_scores?.[0]?.score <= -0.9 ? 'critical' : 'high',
      status: 'open',
    })) || [];

    context.feedback = {
      top_themes: themesData?.map(t => ({
        theme: t.theme_name,
        count: t.frequency,
        sentiment: 0, // TODO: Calculate avg sentiment per theme
        trend: 'stable', // TODO: Calculate trend
      })) || [],
      enterprise_requests: [], // TODO: Filter by customer segment when available
      urgent_issues: negativePostIds,
    };

    // Competitive intelligence
    const { data: competitorsData } = await supabase
      .from('competitors')
      .select(`
        id,
        name,
        competitive_mentions (
          id,
          created_at,
          context
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (competitorsData) {
      context.competitive = {
        new_threats: competitorsData
          .filter(c => c.competitive_mentions && c.competitive_mentions.length > 0)
          .map(c => ({
            competitor: c.name,
            move: 'Customer mentions in feedback',
            impact: 'medium',
          })),
        feature_gaps: [], // TODO: Get from competitive analysis
        opportunities: [], // TODO: Get from opportunity detection
      };
    }

    // Dashboard metrics
    const { data: metricsData } = await supabase
      .rpc('get_dashboard_metrics', { p_project_id: projectId });

    if (metricsData) {
      context.metrics = {
        sentiment_trend: {
          current: metricsData.sentiment_score || 0,
          change: 0, // TODO: Calculate week-over-week change
          forecast: 0, // TODO: Implement forecasting
        },
        feedback_velocity: {
          current: metricsData.total_feedback || 0,
          change: 0, // TODO: Calculate change
        },
        feature_adoption: [], // TODO: Track feature adoption
        churn_risk: {
          at_risk_count: 0, // TODO: Implement churn prediction
          high_value_accounts: [],
        },
      };
    }

    console.log('[Report Generator] Context gathered successfully');
    return context;
  } catch (error) {
    console.error('[Report Generator] Error gathering context:', error);
    throw error;
  }
}

/**
 * Generate role-specific report using AI
 */
async function generateRoleBasedReport(
  role: StakeholderRole,
  context: ReportContext
): Promise<GeneratedReport> {
  console.log(`[Report Generator] Generating ${role} report`);

  const rolePrompts: Record<StakeholderRole, string> = {
    ceo: `Generate an executive summary focused on:
      - Strategic roadmap progress and rationale for changes
      - Competitive threats and opportunities
      - Key metrics: sentiment trends, churn risk, feature adoption
      - Revenue impact of product decisions
      - Critical blockers requiring executive attention
      Tone: Strategic, high-level, action-oriented. Max 500 words.`,

    sales: `Generate a sales-focused update on:
      - New features launched (with customer benefits)
      - Top customer requests and status
      - Competitive positioning updates (features to highlight)
      - Customer success stories from feedback
      - Upcoming launches (with GTM timeline)
      Tone: Customer-facing, benefit-driven, confidence-building. Max 400 words.`,

    engineering: `Generate an engineering-focused update on:
      - Roadmap priorities and technical dependencies
      - Feedback on technical debt / performance issues
      - Feature complexity estimates based on feedback
      - Urgent bugs and fixes deployed
      - Upcoming technical challenges
      Tone: Technical, specific, resource-aware. Max 400 words.`,

    marketing: `Generate a marketing-focused update on:
      - Feature launches ready for announcement
      - Customer feedback themes for positioning
      - Competitive differentiation points
      - Customer testimonials / success stories
      - Product narrative evolution
      Tone: Storytelling, positioning-focused, brand-aware. Max 400 words.`,

    customer_success: `Generate a customer success update on:
      - Customer feedback themes (pain points and wins)
      - At-risk accounts flagged by sentiment
      - Feature requests from high-value customers
      - Product improvements shipped this week
      - Resources needed to address customer concerns
      Tone: Empathetic, customer-centric, solution-oriented. Max 400 words.`
  };

  const prompt = `${rolePrompts[role]}

Context data:
${JSON.stringify(context, null, 2)}

Generate a well-structured HTML email report. Include:
1. Executive summary (3-5 bullet points)
2. Detailed sections based on role priorities
3. Action items (if any)
4. Key metrics visualization (describe charts/graphs needed)

Format as professional HTML email with good visual hierarchy.
Use proper HTML tags: <h2>, <p>, <ul>, <li>, <strong>, etc.
Include inline CSS for styling.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert product intelligence analyst generating stakeholder reports. Always return properly formatted HTML.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const html = response.choices[0].message.content || '';

    // Extract summary (first paragraph or first 200 chars)
    const summaryMatch = html.match(/<p>(.*?)<\/p>/s);
    const summary = summaryMatch ? summaryMatch[1].substring(0, 200) : html.substring(0, 200);

    // Extract sections
    const sections = extractSections(html);

    console.log(`[Report Generator] ${role} report generated`);

    return { html, summary, sections };
  } catch (error) {
    console.error('[Report Generator] Error calling OpenAI:', error);
    throw error;
  }
}

/**
 * Extract section titles from HTML
 */
function extractSections(html: string): string[] {
  const sectionMatches = html.matchAll(/<h2>(.*?)<\/h2>/g);
  return Array.from(sectionMatches, m => m[1]);
}

/**
 * Send weekly reports to all stakeholders
 */
export async function sendWeeklyReports(projectId: string): Promise<void> {
  console.log(`[Report Generator] Sending weekly reports for project ${projectId}`);

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  try {
    // Get all stakeholders for project with email enabled
    const { data: stakeholders, error } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('project_id', projectId)
      .eq('notification_preferences->email_enabled', true);

    if (error) {
      throw error;
    }

    if (!stakeholders || stakeholders.length === 0) {
      console.log('[Report Generator] No stakeholders found');
      return;
    }

    console.log(`[Report Generator] Found ${stakeholders.length} stakeholders`);

    // Generate and send reports
    for (const stakeholder of stakeholders) {
      try {
        console.log(`[Report Generator] Processing stakeholder: ${stakeholder.email}`);

        // Generate report
        const reportHtml = await generateStakeholderReport(
          stakeholder.id,
          stakeholder.role,
          projectId
        );

        // Send email
        await sendEmail({
          to: stakeholder.email,
          subject: `Weekly Product Intelligence Update - ${new Date().toLocaleDateString()}`,
          html: wrapReportInEmailTemplate(reportHtml, stakeholder.name),
        });

        // Update sent_at timestamp
        await supabase
          .from('stakeholder_reports')
          .update({ sent_at: new Date().toISOString() })
          .eq('stakeholder_id', stakeholder.id)
          .is('sent_at', null)
          .order('generated_at', { ascending: false })
          .limit(1);

        console.log(`[Report Generator] Report sent to ${stakeholder.email}`);
      } catch (error) {
        console.error(`[Report Generator] Error processing stakeholder ${stakeholder.email}:`, error);
        // Continue with next stakeholder
      }
    }

    console.log('[Report Generator] Weekly reports sent successfully');
  } catch (error) {
    console.error('[Report Generator] Error sending weekly reports:', error);
    throw error;
  }
}

/**
 * Wrap report content in email template
 */
function wrapReportInEmailTemplate(reportContent: string, stakeholderName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Product Intelligence Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">📊 Weekly Product Intelligence</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <!-- Greeting -->
  <p style="font-size: 16px; margin-bottom: 20px;">Hi ${stakeholderName},</p>

  <!-- Report Content -->
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    ${reportContent}
  </div>

  <!-- Footer -->
  <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6c757d; text-align: center;">
    <p>This report was automatically generated by SignalsLoop AI.</p>
    <p style="margin: 10px 0;">
      <a href="#" style="color: #667eea; text-decoration: none;">View in Dashboard</a> |
      <a href="#" style="color: #667eea; text-decoration: none;">Update Preferences</a> |
      <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
    </p>
    <p style="margin-top: 20px; opacity: 0.7;">© ${new Date().getFullYear()} SignalsLoop. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim();
}

/**
 * Generate on-demand report (not stored, just returned)
 */
export async function generateOnDemandReport(
  role: StakeholderRole,
  projectId: string
): Promise<string> {
  console.log(`[Report Generator] Generating on-demand ${role} report`);

  const context = await gatherReportContext(projectId, role);
  const report = await generateRoleBasedReport(role, context);

  return report.html;
}
