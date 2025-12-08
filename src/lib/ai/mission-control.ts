/**
 * Mission Control AI Service
 * Generates daily briefings and intelligence summaries for the dashboard
 */

import { getOpenAI } from '../openai-client';
import { getSupabaseServerClient } from '../supabase-client';
import { calculateProductHealthScore, type ProductHealthScore } from './product-health-score';

export interface BriefingItem {
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  action?: {
    label: string;
    type: 'draft_spec' | 'view_competitor' | 'review_feedback' | 'update_roadmap' | 'review_auto_spec' | 'execute_action';
    link?: string;
    metadata?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

export interface DailyBriefingContent {
  sentiment_score: number;
  sentiment_trend: 'up' | 'down' | 'stable';

  // Enhanced severity-categorized briefing
  critical_items: BriefingItem[]; // 🔴 Critical - needs immediate action
  warning_items: BriefingItem[];  // 🟡 Attention - needs review soon
  info_items: BriefingItem[];     // 🔵 Info - good to know
  success_items: BriefingItem[];  // 🟢 Good news - positive updates

  // Legacy fields (kept for backwards compatibility)
  critical_alerts: string[];
  recommended_actions: {
    label: string;
    action: 'draft_spec' | 'view_competitor' | 'review_feedback' | 'update_roadmap' | 'review_auto_spec';
    priority: 'high' | 'medium' | 'low';
    context?: string;
    link?: string;
    artifact_id?: string;
    artifact_type?: 'spec' | 'feedback' | 'theme' | 'competitor';
    badge?: string;
  }[];
  briefing_text: string;
  opportunities: {
    title: string;
    votes: number;
    impact: 'high' | 'medium' | 'low';
    link?: string;
    id?: string;
  }[];
  threats: {
    title: string;
    severity: 'high' | 'medium' | 'low';
    link?: string;
    id?: string;
  }[];
}

export interface DashboardMetrics {
  sentiment: {
    current_nps: number;
    total_feedback: number;
    trend: 'up' | 'down';
    change_percent: number;
  };
  feedback: {
    issues_per_week: number;
    total_this_week: number;
    trend: 'up' | 'down';
  };
  execution?: {
    avg_velocity_points: number;
    last_sprint_points: number;
    trend: 'up' | 'down' | 'stable';
  };
  usage?: {
    weekly_active: number;
    events_7d: number;
    events_per_user: number;
    trend: 'up' | 'down' | 'stable';
  };
  roadmap: {
    in_progress: number;
    planned: number;
    completed_this_week: number;
  };
  competitors: {
    new_insights_count: number;
    high_priority_count: number;
  };
  health_score?: ProductHealthScore;
}

/**
 * Aggregate data from the last 7 days for AI analysis
 */
async function aggregateProjectData(projectId: string): Promise<{
  feedbackStats: any;
  competitorStats: any;
  roadmapStats: any;
  recentFeedback: any[];
  themes: any[];
  executionStats?: {
    avg_velocity_points: number;
    last_sprint_points: number;
    trend: 'up' | 'down' | 'stable';
  };
  usageStats?: {
    weekly_active: number;
    events_7d: number;
    events_per_user: number;
    trend: 'up' | 'down' | 'stable';
  };
}> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  // Get dashboard metrics using the database function
  const { data: metrics, error: metricsError } = await supabase
    .rpc('get_dashboard_metrics', { p_project_id: projectId });

  if (metricsError) {
    console.error('Error fetching dashboard metrics:', metricsError);
  }

  // Fetch recent feedback (last 7 days)
  // Note: sentiment_score is in sentiment_analysis table, not posts
  const { data: recentFeedback, error: feedbackError } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      vote_count,
      created_at,
      category,
      sentiment_analysis (
        sentiment_score,
        sentiment_category
      )
    `)
    .eq('project_id', projectId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  if (feedbackError) {
    console.error('Error fetching recent feedback:', feedbackError);
  }

  // Fetch top themes
  const { data: themes, error: themesError } = await supabase
    .from('themes')
    .select('id, theme_name, frequency, avg_sentiment, trend')
    .eq('project_id', projectId)
    .order('frequency', { ascending: false })
    .limit(5);

  if (themesError) {
    console.error('Error fetching themes:', themesError);
  }

  // Fetch competitive insights (if exists)
  let competitorInsights: any[] = [];
  try {
    const { data: insights } = await supabase
      .from('competitive_insights')
      .select('*')
      .eq('project_id', projectId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    competitorInsights = insights || [];
  } catch (e) {
    // Table might not exist
  }

  const executionStats = await getExecutionVelocityStats(projectId);
  const usageStats = await getUsageStats(projectId);

  return {
    feedbackStats: metrics?.feedback || {},
    competitorStats: { insights: competitorInsights, ...metrics?.competitors },
    roadmapStats: metrics?.roadmap || {},
    recentFeedback: recentFeedback || [],
    themes: themes || [],
    executionStats,
    usageStats,
  };
}

/**
 * Generate a daily briefing using OpenAI GPT-4o
 * Enhanced with actionable artifacts and direct links
 */
export async function generateDailyBriefing(projectId: string): Promise<DailyBriefingContent> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  // Aggregate data
  const data = await aggregateProjectData(projectId);

  // Get project details (name + slug for links)
  const { data: project } = await supabase
    .from('projects')
    .select('name, slug')
    .eq('id', projectId)
    .single();

  const projectName = project?.name || 'Your Product';
  const projectSlug = project?.slug || 'project';

  // === ENHANCED: Detect Actionable Artifacts ===

  // 1. Check for auto-generated specs that need review
  let autoGeneratedSpecs: any[] | null = null;
  try {
    const { data } = await supabase
      .from('specs')
      .select('id, title, created_at')
      .eq('project_id', projectId)
      .eq('auto_generated', true)
      .eq('status', 'draft')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false })
      .limit(5);
    autoGeneratedSpecs = data;
  } catch (e) {
    // Column might not exist yet or specs table might not exist
    console.warn('Could not fetch auto-generated specs:', e);
  }

  // 2. Detect high-volume feedback clusters (themes with 15+ items)
  const { data: highVolumeThemes } = await supabase
    .from('themes')
    .select('id, theme_name, frequency')
    .eq('project_id', projectId)
    .gte('frequency', 15)
    .order('frequency', { ascending: false })
    .limit(5);

  // 3. Get negative feedback that needs attention
  // Query posts with sentiment_analysis joined
  const { data: urgentFeedback } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      vote_count,
      sentiment_analysis!inner (
        sentiment_score,
        sentiment_category
      )
    `)
    .eq('project_id', projectId)
    .lt('sentiment_analysis.sentiment_score', -0.5) // Negative sentiment
    .gte('vote_count', 5) // Multiple votes
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('vote_count', { ascending: false })
    .limit(3);

  // Build context for AI
  const context = {
    projectName,
    feedbackCount: data.recentFeedback.length,
    themes: data.themes.map(t => ({
      name: t.theme_name,
      frequency: t.frequency,
      sentiment: t.avg_sentiment,
      trend: t.trend,
    })),
    topFeedback: data.recentFeedback.slice(0, 5).map(f => ({
      title: f.title,
      sentiment: f.sentiment_analysis?.[0]?.sentiment_score || null,
      votes: f.vote_count,
    })),
    roadmap: data.roadmapStats,
    competitors: data.competitorStats,
    // NEW: Add artifact context
    autoGeneratedSpecs: autoGeneratedSpecs?.length || 0,
    highVolumeThemes: highVolumeThemes?.length || 0,
    urgentFeedbackCount: urgentFeedback?.length || 0,
  };

  // Call OpenAI API
  const systemPrompt = `You are a Product Intelligence Agent for ${projectName}.
Your role is to analyze product feedback, sentiment, roadmap status, and competitive intelligence to provide daily strategic briefings to product leaders.

Format your response as valid JSON with this exact schema:
{
  "sentiment_score": <number 0-100>,
  "sentiment_trend": "<up|down|stable>",
  "critical_alerts": [<array of urgent issues>],
  "recommended_actions": [
    {
      "label": "<action description>",
      "action": "<draft_spec|view_competitor|review_feedback|update_roadmap>",
      "priority": "<high|medium|low>",
      "context": "<optional explanation>"
    }
  ],
  "briefing_text": "<natural language executive summary in 2-3 sentences>",
  "opportunities": [
    {
      "title": "<opportunity name>",
      "votes": <vote count>,
      "impact": "<high|medium|low>"
    }
  ],
  "threats": [
    {
      "title": "<threat description>",
      "severity": "<high|medium|low>"
    }
  ]
}

Focus on actionable insights. Be concise but insightful.`;

  const userPrompt = `Analyze this product data and generate today's briefing:

${JSON.stringify(context, null, 2)}

Key focus areas:
1. Identify critical sentiment shifts or patterns
2. Highlight emerging themes that need attention
3. Recommend specific actions based on the data
4. Flag competitive threats or opportunities
5. Provide roadmap health assessment`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const briefing: DailyBriefingContent = JSON.parse(content);

    // Validate and ensure all required fields exist
    let validated: DailyBriefingContent = {
      sentiment_score: briefing.sentiment_score || 50,
      sentiment_trend: briefing.sentiment_trend || 'stable',
      critical_items: [],
      warning_items: [],
      info_items: [],
      success_items: [],
      critical_alerts: briefing.critical_alerts || [],
      recommended_actions: briefing.recommended_actions || [],
      briefing_text: briefing.briefing_text || 'No significant changes detected.',
      opportunities: briefing.opportunities || [],
      threats: briefing.threats || [],
    };

    // === POST-PROCESSING: Inject Actionable Artifacts with Links ===

    // 1. Add auto-generated specs that need review
    if (autoGeneratedSpecs && autoGeneratedSpecs.length > 0) {
      for (const spec of autoGeneratedSpecs) {
        validated.recommended_actions.unshift({
          label: `Review auto-drafted spec: "${spec.title}"`,
          action: 'review_auto_spec',
          priority: 'high',
          context: 'Auto-generated by AI based on user feedback cluster',
          link: `/${projectSlug}/specs/${spec.id}`,
          artifact_id: spec.id,
          artifact_type: 'spec',
          badge: 'NEW',
        });
      }
    }

    // 2. Add high-volume themes that could become specs
    if (highVolumeThemes && highVolumeThemes.length > 0) {
      for (const theme of highVolumeThemes.slice(0, 2)) { // Top 2 themes
        validated.recommended_actions.push({
          label: `Draft spec for "${theme.theme_name}" (${theme.frequency} requests)`,
          action: 'draft_spec',
          priority: 'medium',
          context: `High-volume theme with ${theme.frequency} user requests`,
          link: `/${projectSlug}/specs/new?theme=${encodeURIComponent(theme.theme_name)}`,
          artifact_id: theme.id,
          artifact_type: 'theme',
          badge: 'HOT',
        });
      }
    }

    // 3. Add urgent feedback that needs attention
    if (urgentFeedback && urgentFeedback.length > 0) {
      for (const feedback of urgentFeedback) {
        validated.recommended_actions.push({
          label: `Address urgent negative feedback: "${feedback.title.substring(0, 50)}..."`,
          action: 'review_feedback',
          priority: 'high',
          context: `${feedback.vote_count} votes, negative sentiment`,
          link: `/${projectSlug}/board?highlight=${feedback.id}`,
          artifact_id: feedback.id,
          artifact_type: 'feedback',
          badge: 'URGENT',
        });
      }
    }

    // 4. Enhance opportunities with links
    validated.opportunities = validated.opportunities.map(opp => ({
      ...opp,
      link: opp.title ? `/${projectSlug}/themes?search=${encodeURIComponent(opp.title)}` : undefined,
    }));

    // 5. Enhance threats with links (if they mention competitors)
    validated.threats = validated.threats.map(threat => ({
      ...threat,
      link: threat.title.toLowerCase().includes('competitor')
        ? `/${projectSlug}/competitive`
        : undefined,
    }));

    // === NEW: Categorize into severity-based briefing items ===

    // CRITICAL ITEMS 🔴
    // - High severity threats
    validated.threats.filter(t => t.severity === 'high').forEach(threat => {
      validated.critical_items.push({
        severity: 'critical',
        title: threat.title,
        description: 'Competitive threat requires immediate attention',
        action: {
          label: 'View competitive analysis',
          type: 'view_competitor',
          link: threat.link
        },
        metadata: { threatId: threat.id }
      });
    });

    // - Urgent negative feedback
    if (urgentFeedback && urgentFeedback.length > 0) {
      validated.critical_items.push({
        severity: 'critical',
        title: `${urgentFeedback.length} urgent feedback items with negative sentiment`,
        description: `Customer frustration detected in ${urgentFeedback.length} high-voted items`,
        action: {
          label: 'Review urgent feedback',
          type: 'review_feedback',
          link: `/${projectSlug}/board?filter=urgent`
        },
        metadata: { feedbackCount: urgentFeedback.length }
      });
    }

    // - Critical alerts from AI
    validated.critical_alerts.forEach(alert => {
      validated.critical_items.push({
        severity: 'critical',
        title: alert,
        description: 'AI detected critical issue',
        metadata: { source: 'ai_analysis' }
      });
    });

    // WARNING ITEMS 🟡
    // - Medium priority recommended actions
    validated.recommended_actions
      .filter(a => a.priority === 'high' || a.priority === 'medium')
      .forEach(action => {
        validated.warning_items.push({
          severity: 'warning',
          title: action.label,
          description: action.context || 'Action recommended by AI',
          action: {
            label: action.label,
            type: action.action,
            link: action.link,
            metadata: {
              artifactId: action.artifact_id,
              artifactType: action.artifact_type,
              badge: action.badge
            }
          }
        });
      });

    // - High volume themes
    if (highVolumeThemes && highVolumeThemes.length > 0) {
      highVolumeThemes.forEach(theme => {
        validated.warning_items.push({
          severity: 'warning',
          title: `High demand for "${theme.theme_name}"`,
          description: `${theme.frequency} user requests - consider prioritizing`,
          action: {
            label: 'Draft spec',
            type: 'draft_spec',
            link: `/${projectSlug}/specs/new?theme=${encodeURIComponent(theme.theme_name)}`
          },
          metadata: { themeId: theme.id, frequency: theme.frequency }
        });
      });
    }

    // INFO ITEMS 🔵
    // - Opportunities
    validated.opportunities.forEach(opp => {
      validated.info_items.push({
        severity: 'info',
        title: opp.title,
        description: `${opp.votes} votes • ${opp.impact} impact opportunity`,
        action: {
          label: 'Explore opportunity',
          type: 'view_competitor',
          link: opp.link
        },
        metadata: { opportunityId: opp.id, votes: opp.votes, impact: opp.impact }
      });
    });

    // - General insights
    if (data.themes.length > 0) {
      validated.info_items.push({
        severity: 'info',
        title: `${data.themes.length} active themes identified`,
        description: `Top: ${data.themes.slice(0, 3).map(t => t.theme_name).join(', ')}`,
        metadata: { themeCount: data.themes.length }
      });
    }

    // SUCCESS ITEMS 🟢
    // - Positive sentiment trend
    if (validated.sentiment_trend === 'up') {
      validated.success_items.push({
        severity: 'success',
        title: 'Sentiment trending up',
        description: `Overall customer satisfaction is improving (${validated.sentiment_score}/100)`,
        metadata: { sentimentScore: validated.sentiment_score }
      });
    }

    // - Completed roadmap items
    if (data.roadmapStats.completed_this_week > 0) {
      validated.success_items.push({
        severity: 'success',
        title: `${data.roadmapStats.completed_this_week} feature${data.roadmapStats.completed_this_week !== 1 ? 's' : ''} shipped this week`,
        description: 'Great execution velocity',
        action: {
          label: 'View roadmap',
          type: 'update_roadmap',
          link: `/${projectSlug}/roadmap`
        },
        metadata: { completedCount: data.roadmapStats.completed_this_week }
      });
    }

    // - Low severity threats (handled well)
    validated.threats.filter(t => t.severity === 'low').forEach(threat => {
      validated.success_items.push({
        severity: 'success',
        title: `Monitoring: ${threat.title}`,
        description: 'Low severity - under control',
        metadata: { threatId: threat.id }
      });
    });

    return validated;
  } catch (error) {
    console.error('Error generating daily briefing:', error);

    // Return fallback briefing
    return {
      sentiment_score: 50,
      sentiment_trend: 'stable',
      critical_items: [{
        severity: 'critical',
        title: 'Unable to generate briefing',
        description: 'AI service temporarily unavailable. Please check back later.',
        metadata: { error: 'service_unavailable' }
      }],
      warning_items: [],
      info_items: [],
      success_items: [],
      critical_alerts: ['Unable to generate briefing - AI service unavailable'],
      recommended_actions: [],
      briefing_text: 'Daily briefing is temporarily unavailable. Please check back later.',
      opportunities: [],
      threats: [],
    };
  }
}

/**
 * Get or create today's briefing for a project
 */
export async function getTodayBriefing(projectId: string): Promise<{
  id: string;
  content: DailyBriefingContent;
  created_at: string;
}> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  // Check if today's briefing already exists
  const { data: existing, error: existingError } = await supabase
    .rpc('get_today_briefing', { p_project_id: projectId });

  if (existingError) {
    console.error('Error checking for existing briefing:', existingError);
    // Don't throw here - just generate a new one
  } else if (existing && existing.length > 0) {
    return {
      id: existing[0].id,
      content: existing[0].content as DailyBriefingContent,
      created_at: existing[0].created_at,
    };
  }

  // Generate new briefing
  const content = await generateDailyBriefing(projectId);

  // Save to database
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const { data: newBriefing, error } = await supabase
    .from('daily_briefings')
    .insert({
      project_id: projectId,
      content,
      briefing_date: today,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving briefing:', error);
    throw new Error(`Failed to save briefing: ${error.message || JSON.stringify(error)}`);
  }

  if (!newBriefing) {
    throw new Error('No briefing data returned after saving');
  }

  return {
    id: newBriefing.id,
    content: newBriefing.content as DailyBriefingContent,
    created_at: newBriefing.created_at,
  };
}

/**
 * Get dashboard metrics (separate from briefing for real-time data)
 */
export async function getDashboardMetrics(projectId: string): Promise<DashboardMetrics> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  const { data: metrics, error } = await supabase
    .rpc('get_dashboard_metrics', { p_project_id: projectId });

  if (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw new Error(`Failed to fetch dashboard metrics: ${error.message || JSON.stringify(error)}`);
  }

  if (!metrics) {
    throw new Error('No metrics data returned from database');
  }

  const dashboardMetrics = metrics as DashboardMetrics;

  // Enrich with cross-tool intelligence metrics
  try {
    dashboardMetrics.execution = await getExecutionVelocityStats(projectId);
  } catch (e) {
    console.warn('[MissionControl] Failed to load execution velocity stats:', e);
  }

  try {
    dashboardMetrics.usage = await getUsageStats(projectId);
  } catch (e) {
    console.warn('[MissionControl] Failed to load usage analytics stats:', e);
  }

  // Calculate Product Health Score
  const healthScore = calculateProductHealthScore(dashboardMetrics);
  dashboardMetrics.health_score = healthScore;

  return dashboardMetrics;
}

/**
 * Compute execution velocity from Jira sprint data
 */
async function getExecutionVelocityStats(projectId: string): Promise<DashboardMetrics['execution']> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { avg_velocity_points: 0, last_sprint_points: 0, trend: 'stable' };

  const { data, error } = await supabase
    .from('team_velocity')
    .select('completed_points, sprint_end_date')
    .eq('project_id', projectId)
    .order('sprint_end_date', { ascending: false })
    .limit(6);

  if (error || !data) {
    console.warn('[MissionControl] team_velocity fetch failed:', error);
    return { avg_velocity_points: 0, last_sprint_points: 0, trend: 'stable' };
  }

  const completed = data.map(row => Number(row.completed_points) || 0);
  const lastSprint = completed[0] || 0;
  const recent = completed.slice(0, 3);
  const previous = completed.slice(3, 6);
  const avgRecent = average(recent);
  const avgPrevious = average(previous);

  return {
    avg_velocity_points: Math.round(avgRecent * 10) / 10,
    last_sprint_points: Math.round(lastSprint * 10) / 10,
    trend: calculateTrend(avgRecent, avgPrevious),
  };
}

/**
 * Compute usage analytics stats from ingestion table
 */
async function getUsageStats(projectId: string): Promise<DashboardMetrics['usage']> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { weekly_active: 0, events_7d: 0, events_per_user: 0, trend: 'stable' };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Recent 7d
  const { data: recentData, error: recentError } = await supabase
    .from('usage_analytics_events')
    .select('distinct_id,user_id,occurred_at')
    .eq('project_id', projectId)
    .gte('occurred_at', sevenDaysAgo)
    .order('occurred_at', { ascending: false })
    .limit(500);

  // Previous 7d
  const { data: prevData, error: prevError } = await supabase
    .from('usage_analytics_events')
    .select('distinct_id,user_id,occurred_at')
    .eq('project_id', projectId)
    .gte('occurred_at', fourteenDaysAgo)
    .lt('occurred_at', sevenDaysAgo)
    .order('occurred_at', { ascending: false })
    .limit(500);

  if (recentError) {
    console.warn('[MissionControl] usage analytics recent fetch failed:', recentError);
  }
  if (prevError) {
    console.warn('[MissionControl] usage analytics previous fetch failed:', prevError);
  }

  const recentEvents = recentData || [];
  const prevEvents = prevData || [];

  const recentUsers = new Set(
    recentEvents.map(e => e.distinct_id || e.user_id).filter(Boolean)
  );
  const prevUsers = new Set(
    prevEvents.map(e => e.distinct_id || e.user_id).filter(Boolean)
  );

  const weeklyActive = recentUsers.size;
  const events7d = recentEvents.length;
  const eventsPerUser = weeklyActive > 0 ? events7d / weeklyActive : 0;

  const trend = calculateTrend(events7d, prevEvents.length);

  return {
    weekly_active: weeklyActive,
    events_7d: events7d,
    events_per_user: Math.round(eventsPerUser * 10) / 10,
    trend,
  };
}

function average(values: number[]): number {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (!previous && !current) return 'stable';
  if (!previous) return 'up';

  const delta = (current - previous) / previous;
  if (delta > 0.1) return 'up';
  if (delta < -0.1) return 'down';
  return 'stable';
}
