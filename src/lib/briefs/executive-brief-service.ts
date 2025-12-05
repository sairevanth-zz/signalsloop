/**
 * Executive Brief Service
 * Generates comprehensive executive briefings with AI analysis
 */

import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface BriefConfig {
  includeSentiment?: boolean;
  includeThemes?: boolean;
  includeCompetitors?: boolean;
  includeRevenueAtRisk?: boolean;
  includeRecommendations?: boolean;
  includeMetrics?: boolean;
  tone?: 'executive' | 'detailed' | 'casual';
}

export interface BriefSection {
  title: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  data?: any;
}

export interface TopInsight {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  dataPoints?: string[];
}

export interface ActionItem {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate?: string;
  linkedData?: any;
}

export interface AccountAtRisk {
  name: string;
  email?: string;
  company?: string;
  mrr?: number;
  healthScore?: number;
  reason: string;
  lastFeedback?: string;
}

export interface CompetitorMove {
  competitor: string;
  move: string;
  impact: 'high' | 'medium' | 'low';
  recommendedResponse?: string;
  affectedCustomers?: number;
}

export interface ExecutiveBriefData {
  projectId: string;
  projectName: string;
  periodStart: Date;
  periodEnd: Date;
  briefType: 'daily' | 'weekly' | 'monthly';
  
  // Summary
  summary: string;
  
  // Metrics
  metrics: {
    sentimentScore: number;
    sentimentTrend: 'up' | 'down' | 'stable';
    sentimentChange: number;
    totalFeedback: number;
    feedbackTrend: 'up' | 'down' | 'stable';
    themesIdentified: number;
    competitorAlerts: number;
    healthScore: number;
  };
  
  // Core sections
  topInsights: TopInsight[];
  actionItems: ActionItem[];
  
  // Revenue impact
  revenueAtRisk: number;
  accountsAtRisk: AccountAtRisk[];
  
  // Competitive
  competitorMoves: CompetitorMove[];
  
  // Top themes
  topThemes: {
    name: string;
    feedbackCount: number;
    sentiment: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  
  // Top requests
  topRequests: {
    title: string;
    votes: number;
    revenue: number;
  }[];
  
  // Raw data for custom rendering
  rawData: any;
}

export interface GeneratedBrief {
  id: string;
  title: string;
  data: ExecutiveBriefData;
  contentMarkdown: string;
  contentHtml: string;
  summary: string;
  status: 'draft' | 'ready' | 'sent' | 'failed';
}

export class ExecutiveBriefService {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  /**
   * Generate a new executive brief
   */
  async generateBrief(
    projectId: string,
    briefType: 'daily' | 'weekly' | 'monthly' = 'weekly',
    config: BriefConfig = {}
  ): Promise<GeneratedBrief> {
    // Calculate period based on brief type
    const { periodStart, periodEnd } = this.calculatePeriod(briefType);
    
    // Fetch all required data
    const data = await this.aggregateData(projectId, periodStart, periodEnd);
    
    // Generate AI analysis
    const analysis = await this.generateAIAnalysis(data, config);
    
    // Build brief content
    const briefData = this.buildBriefData(data, analysis, projectId, periodStart, periodEnd, briefType);
    
    // Generate markdown content
    const contentMarkdown = this.generateMarkdown(briefData, config);
    const contentHtml = this.markdownToHtml(contentMarkdown);
    
    // Create brief record
    const title = `${briefType.charAt(0).toUpperCase() + briefType.slice(1)} Brief: ${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;
    
    const { data: brief, error } = await this.supabase
      .from('executive_briefs')
      .insert({
        project_id: projectId,
        title,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        brief_type: briefType,
        content_markdown: contentMarkdown,
        content_html: contentHtml,
        summary: briefData.summary,
        data: briefData,
        metrics: briefData.metrics,
        top_insights: briefData.topInsights,
        action_items: briefData.actionItems,
        revenue_at_risk: briefData.revenueAtRisk,
        accounts_at_risk: briefData.accountsAtRisk.length,
        competitor_moves: briefData.competitorMoves,
        status: 'ready',
        generation_completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('[ExecutiveBriefService] Error creating brief:', error);
      throw error;
    }
    
    return {
      id: brief.id,
      title,
      data: briefData,
      contentMarkdown,
      contentHtml,
      summary: briefData.summary,
      status: 'ready',
    };
  }
  
  /**
   * Calculate period based on brief type
   */
  private calculatePeriod(briefType: 'daily' | 'weekly' | 'monthly'): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();
    
    switch (briefType) {
      case 'daily':
        return {
          periodStart: subDays(now, 1),
          periodEnd: now,
        };
      case 'weekly':
        return {
          periodStart: startOfWeek(subDays(now, 7)),
          periodEnd: endOfWeek(subDays(now, 7)),
        };
      case 'monthly':
        return {
          periodStart: startOfMonth(subDays(now, 30)),
          periodEnd: endOfMonth(subDays(now, 30)),
        };
    }
  }
  
  /**
   * Aggregate all data needed for the brief
   */
  private async aggregateData(
    projectId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any> {
    const [
      project,
      feedback,
      themes,
      posts,
      competitors,
      customers,
      previousPeriodFeedback,
    ] = await Promise.all([
      // Project info
      this.supabase
        .from('projects')
        .select('name, settings')
        .eq('id', projectId)
        .single(),
      
      // Feedback in period
      this.supabase
        .from('posts')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString()),
      
      // Themes
      this.supabase
        .from('themes')
        .select('*, posts:theme_posts(post_id)')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('post_count', { ascending: false })
        .limit(10),
      
      // Top voted posts
      this.supabase
        .from('posts')
        .select('id, title, vote_count, revenue_impact')
        .eq('project_id', projectId)
        .eq('status', 'open')
        .order('vote_count', { ascending: false })
        .limit(10),
      
      // Competitor insights
      this.supabase
        .from('competitor_insights')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', periodStart.toISOString())
        .order('priority', { ascending: false })
        .limit(10),
      
      // At-risk customers from inbox
      this.supabase
        .from('customers')
        .select('*')
        .eq('project_id', projectId)
        .in('churn_risk', ['high', 'critical'])
        .limit(10),
      
      // Previous period for comparison
      this.supabase
        .from('posts')
        .select('id, sentiment_score')
        .eq('project_id', projectId)
        .gte('created_at', subDays(periodStart, 7).toISOString())
        .lt('created_at', periodStart.toISOString()),
    ]);
    
    return {
      project: project.data,
      feedback: feedback.data || [],
      themes: themes.data || [],
      posts: posts.data || [],
      competitors: competitors.data || [],
      customers: customers.data || [],
      previousPeriodFeedback: previousPeriodFeedback.data || [],
    };
  }
  
  /**
   * Generate AI analysis from aggregated data
   */
  private async generateAIAnalysis(data: any, config: BriefConfig): Promise<any> {
    const systemPrompt = `You are an expert product analyst creating an executive brief. 
Analyze the provided data and generate insights in a ${config.tone || 'executive'} tone.

Your analysis should:
1. Identify the top 3-5 most important insights
2. Recommend specific action items with priority
3. Highlight revenue at risk and accounts needing attention
4. Summarize competitive moves and recommended responses
5. Create a 2-3 sentence executive summary

Be specific, data-driven, and actionable.`;

    const userPrompt = `Analyze this product data for the period:

Project: ${data.project?.name}
Total Feedback: ${data.feedback.length}
Active Themes: ${data.themes.length}
Competitor Alerts: ${data.competitors.length}
At-Risk Customers: ${data.customers.length}

Feedback Summary:
${JSON.stringify(data.feedback.slice(0, 20), null, 2)}

Top Themes:
${JSON.stringify(data.themes.slice(0, 5), null, 2)}

Competitor Insights:
${JSON.stringify(data.competitors.slice(0, 5), null, 2)}

At-Risk Customers:
${JSON.stringify(data.customers.slice(0, 5), null, 2)}

Generate a JSON response with:
{
  "summary": "2-3 sentence executive summary",
  "topInsights": [
    {"title": "", "description": "", "impact": "high|medium|low", "category": "", "dataPoints": []}
  ],
  "actionItems": [
    {"title": "", "description": "", "priority": "critical|high|medium|low"}
  ],
  "competitorAnalysis": [
    {"competitor": "", "move": "", "impact": "high|medium|low", "recommendedResponse": ""}
  ],
  "keyMetricsSummary": "brief summary of key metrics",
  "riskAssessment": "assessment of revenue and customer risks"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('[ExecutiveBriefService] AI analysis error:', error);
      return {
        summary: 'Unable to generate AI analysis at this time.',
        topInsights: [],
        actionItems: [],
        competitorAnalysis: [],
        keyMetricsSummary: '',
        riskAssessment: '',
      };
    }
  }
  
  /**
   * Build structured brief data
   */
  private buildBriefData(
    data: any,
    analysis: any,
    projectId: string,
    periodStart: Date,
    periodEnd: Date,
    briefType: 'daily' | 'weekly' | 'monthly'
  ): ExecutiveBriefData {
    // Calculate metrics
    const currentSentiment = this.calculateAverageSentiment(data.feedback);
    const previousSentiment = this.calculateAverageSentiment(data.previousPeriodFeedback);
    const sentimentChange = currentSentiment - previousSentiment;
    
    // Calculate revenue at risk from at-risk customers
    const revenueAtRisk = data.customers.reduce(
      (sum: number, c: any) => sum + (c.mrr || 0),
      0
    );
    
    return {
      projectId,
      projectName: data.project?.name || 'Project',
      periodStart,
      periodEnd,
      briefType,
      
      summary: analysis.summary || 'Executive brief generated.',
      
      metrics: {
        sentimentScore: Math.round(currentSentiment * 100),
        sentimentTrend: sentimentChange > 0.05 ? 'up' : sentimentChange < -0.05 ? 'down' : 'stable',
        sentimentChange: Math.round(sentimentChange * 100),
        totalFeedback: data.feedback.length,
        feedbackTrend: data.feedback.length > data.previousPeriodFeedback.length ? 'up' : 'down',
        themesIdentified: data.themes.length,
        competitorAlerts: data.competitors.length,
        healthScore: 75, // TODO: Calculate actual health score
      },
      
      topInsights: analysis.topInsights || [],
      actionItems: analysis.actionItems || [],
      
      revenueAtRisk,
      accountsAtRisk: data.customers.map((c: any) => ({
        name: c.name || 'Unknown',
        email: c.email,
        company: c.company,
        mrr: c.mrr,
        healthScore: c.health_score,
        reason: c.churn_risk === 'critical' ? 'Critical churn risk' : 'High churn risk',
        lastFeedback: c.last_feedback_at,
      })),
      
      competitorMoves: (analysis.competitorAnalysis || []).map((c: any) => ({
        competitor: c.competitor,
        move: c.move,
        impact: c.impact,
        recommendedResponse: c.recommendedResponse,
      })),
      
      topThemes: data.themes.slice(0, 5).map((t: any) => ({
        name: t.name,
        feedbackCount: t.post_count || 0,
        sentiment: t.avg_sentiment || 0,
        trend: 'stable' as const,
      })),
      
      topRequests: data.posts.slice(0, 5).map((p: any) => ({
        title: p.title,
        votes: p.vote_count || 0,
        revenue: p.revenue_impact || 0,
      })),
      
      rawData: data,
    };
  }
  
  /**
   * Generate markdown content
   */
  private generateMarkdown(data: ExecutiveBriefData, config: BriefConfig): string {
    let md = '';
    
    // Header
    md += `# ${data.projectName} - ${data.briefType.charAt(0).toUpperCase() + data.briefType.slice(1)} Brief\n\n`;
    md += `**Period:** ${format(data.periodStart, 'MMM d')} - ${format(data.periodEnd, 'MMM d, yyyy')}\n\n`;
    
    // Executive Summary
    md += `## Executive Summary\n\n`;
    md += `${data.summary}\n\n`;
    
    // Key Metrics
    md += `## Key Metrics\n\n`;
    md += `| Metric | Value | Trend |\n`;
    md += `|--------|-------|-------|\n`;
    md += `| Sentiment Score | ${data.metrics.sentimentScore} | ${this.trendEmoji(data.metrics.sentimentTrend)} ${data.metrics.sentimentChange > 0 ? '+' : ''}${data.metrics.sentimentChange}% |\n`;
    md += `| Total Feedback | ${data.metrics.totalFeedback} | ${this.trendEmoji(data.metrics.feedbackTrend)} |\n`;
    md += `| Active Themes | ${data.metrics.themesIdentified} | - |\n`;
    md += `| Competitor Alerts | ${data.metrics.competitorAlerts} | - |\n`;
    md += `| Health Score | ${data.metrics.healthScore} | - |\n\n`;
    
    // Revenue at Risk
    if (data.revenueAtRisk > 0) {
      md += `## ⚠️ Revenue at Risk\n\n`;
      md += `**$${data.revenueAtRisk.toLocaleString()} ARR** from ${data.accountsAtRisk.length} accounts\n\n`;
      
      if (data.accountsAtRisk.length > 0) {
        md += `| Account | MRR | Health | Risk Reason |\n`;
        md += `|---------|-----|--------|-------------|\n`;
        data.accountsAtRisk.slice(0, 5).forEach(account => {
          md += `| ${account.company || account.name} | $${(account.mrr || 0).toLocaleString()} | ${account.healthScore || '-'} | ${account.reason} |\n`;
        });
        md += `\n`;
      }
    }
    
    // Top Insights
    if (data.topInsights.length > 0) {
      md += `## Top Insights\n\n`;
      data.topInsights.forEach((insight, idx) => {
        md += `### ${idx + 1}. ${insight.title}\n\n`;
        md += `${insight.description}\n\n`;
        if (insight.dataPoints && insight.dataPoints.length > 0) {
          insight.dataPoints.forEach(point => {
            md += `- ${point}\n`;
          });
          md += `\n`;
        }
      });
    }
    
    // Action Items
    if (data.actionItems.length > 0) {
      md += `## Recommended Actions\n\n`;
      data.actionItems.forEach((action, idx) => {
        const priorityEmoji = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢',
        }[action.priority];
        md += `${idx + 1}. ${priorityEmoji} **${action.title}**\n`;
        md += `   ${action.description}\n\n`;
      });
    }
    
    // Competitor Moves
    if (data.competitorMoves.length > 0) {
      md += `## Competitive Intelligence\n\n`;
      data.competitorMoves.forEach(move => {
        md += `### ${move.competitor}\n`;
        md += `**Move:** ${move.move}\n\n`;
        md += `**Impact:** ${move.impact}\n\n`;
        if (move.recommendedResponse) {
          md += `**Recommended Response:** ${move.recommendedResponse}\n\n`;
        }
      });
    }
    
    // Top Themes
    if (data.topThemes.length > 0) {
      md += `## Top Themes\n\n`;
      md += `| Theme | Feedback Count | Sentiment |\n`;
      md += `|-------|----------------|----------|\n`;
      data.topThemes.forEach(theme => {
        md += `| ${theme.name} | ${theme.feedbackCount} | ${this.sentimentLabel(theme.sentiment)} |\n`;
      });
      md += `\n`;
    }
    
    // Top Feature Requests
    if (data.topRequests.length > 0) {
      md += `## Top Feature Requests\n\n`;
      md += `| Request | Votes | Revenue Impact |\n`;
      md += `|---------|-------|----------------|\n`;
      data.topRequests.forEach(request => {
        md += `| ${request.title} | ${request.votes} | $${request.revenue.toLocaleString()} |\n`;
      });
      md += `\n`;
    }
    
    // Footer
    md += `---\n\n`;
    md += `*Generated by SignalsLoop on ${format(new Date(), 'PPpp')}*\n`;
    
    return md;
  }
  
  /**
   * Convert markdown to HTML
   */
  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    // In production, use a proper library like marked or remark
    let html = markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\| (.+) \|$/gm, (match, content) => {
        const cells = content.split(' | ').map((c: string) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      })
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    return `<div class="executive-brief">${html}</div>`;
  }
  
  /**
   * Calculate average sentiment
   */
  private calculateAverageSentiment(feedback: any[]): number {
    if (feedback.length === 0) return 0;
    const total = feedback.reduce((sum, f) => sum + (f.sentiment_score || 0), 0);
    return total / feedback.length;
  }
  
  private trendEmoji(trend: string): string {
    return { up: '📈', down: '📉', stable: '➡️' }[trend] || '➡️';
  }
  
  private sentimentLabel(score: number): string {
    if (score > 0.3) return '😊 Positive';
    if (score < -0.3) return '😟 Negative';
    return '😐 Neutral';
  }
  
  /**
   * Get brief by ID
   */
  async getBrief(briefId: string): Promise<GeneratedBrief | null> {
    const { data, error } = await this.supabase
      .from('executive_briefs')
      .select('*')
      .eq('id', briefId)
      .single();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
      title: data.title,
      data: data.data,
      contentMarkdown: data.content_markdown,
      contentHtml: data.content_html,
      summary: data.summary,
      status: data.status,
    };
  }
  
  /**
   * List briefs for a project
   */
  async listBriefs(projectId: string, limit = 10): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('executive_briefs')
      .select('id, title, brief_type, period_start, period_end, status, created_at, summary, metrics')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[ExecutiveBriefService] Error listing briefs:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Send brief via email
   */
  async sendBrief(
    briefId: string,
    recipients: { email: string; name?: string }[]
  ): Promise<boolean> {
    // Update sent status
    const { error } = await this.supabase
      .from('executive_briefs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to: recipients,
        sent_via: 'email',
      })
      .eq('id', briefId);
    
    if (error) {
      console.error('[ExecutiveBriefService] Error updating sent status:', error);
      return false;
    }
    
    // TODO: Implement actual email sending with your email service
    // For now, just return true to indicate status was updated
    return true;
  }
}

// Export singleton
export const executiveBriefService = new ExecutiveBriefService();
