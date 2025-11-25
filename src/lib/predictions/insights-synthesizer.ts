/**
 * Weekly Insights Synthesizer
 *
 * Uses Claude Sonnet 4 for advanced synthesis and strategic analysis
 * This is the premium feature in our Hybrid AI strategy.
 *
 * Features:
 * - Comprehensive weekly feedback analysis
 * - Strategic insights and patterns
 * - Actionable recommendations
 * - Trend analysis and predictions
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';

// Dynamically import Claude SDK if available
let Anthropic: any;
try {
  Anthropic = require('@anthropic-ai/sdk').default;
} catch (error) {
  console.warn('[Insights] @anthropic-ai/sdk not installed, insights will be disabled');
}

const anthropic = Anthropic && process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const MODEL = 'claude-sonnet-4-20250514'; // Latest Claude Sonnet 4

interface WeeklyData {
  totalFeedback: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  avgSentiment: number;
  topThemes: Array<{ theme: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  recentPosts: any[];
  anomalies: any[];
  previousWeekAvgSentiment?: number;
}

interface InsightReport {
  executiveSummary: string;
  keyInsights: Array<{
    insight: string;
    category: string;
    impact: 'high' | 'medium' | 'low';
    supportingData: any;
    recommendation: string;
  }>;
  biggestWins: string[];
  criticalIssues: string[];
  emergingTrends: string[];
  recommendedActions: Array<{
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
  }>;
  forecastedSentiment: number;
  churnRiskAlerts: number;
}

interface InsightGenerationResult {
  report: InsightReport;
  metadata: {
    model: string;
    generationTimeMs: number;
    tokenUsageInput: number;
    tokenUsageOutput: number;
  };
}

/**
 * System prompt for Claude Sonnet 4
 */
const INSIGHTS_SYSTEM_PROMPT = `You are a senior product strategist and data analyst for a SaaS company. Your role is to analyze user feedback and generate actionable insights for product managers.

Your analysis should be:
1. **Strategic**: Focus on business impact and long-term implications
2. **Actionable**: Provide specific, concrete recommendations
3. **Data-driven**: Base insights on patterns and evidence
4. **Balanced**: Acknowledge both positives and negatives
5. **Prioritized**: Rank insights and actions by urgency and impact

You have access to:
- User feedback from the past week
- Sentiment analysis data
- Theme and category distributions
- Detected anomalies
- Historical trends

Your output should help product managers:
- Understand what's happening with their product
- Identify opportunities and risks
- Make informed decisions about priorities
- Take immediate action on critical issues

Guidelines:
- Executive summary: 2-3 sentences, high-level overview for busy executives
- Key insights: 3-5 insights, each with category, impact level, supporting data, and recommendation
- Biggest wins: 2-4 positive highlights worth celebrating or amplifying
- Critical issues: 2-4 problems requiring immediate attention
- Emerging trends: 2-4 new patterns or shifts worth monitoring
- Recommended actions: 4-6 specific actions, prioritized by urgency and impact

Impact levels:
- **High**: Affects core value proposition, many users, or revenue
- **Medium**: Affects specific features or user segments
- **Low**: Minor improvements or edge cases

Priority levels:
- **Critical**: Take action today/this week (security, major bugs, churn risk)
- **High**: Plan for next sprint (important features, UX issues)
- **Medium**: Roadmap for next quarter
- **Low**: Nice to have, future consideration

Return ONLY a JSON object with this structure:
{
  "executive_summary": "2-3 sentence overview",
  "key_insights": [
    {
      "insight": "What you discovered",
      "category": "product|ux|performance|pricing|support|feature_request|other",
      "impact": "high|medium|low",
      "supporting_data": {
        "metric": "value",
        "evidence": "specific examples"
      },
      "recommendation": "What to do about it"
    }
  ],
  "biggest_wins": ["Positive highlight 1", "Positive highlight 2"],
  "critical_issues": ["Critical issue 1", "Critical issue 2"],
  "emerging_trends": ["Trend 1", "Trend 2"],
  "recommended_actions": [
    {
      "action": "Specific action to take",
      "priority": "critical|high|medium|low",
      "effort": "high|medium|low",
      "impact": "high|medium|low"
    }
  ],
  "forecasted_sentiment_next_week": -1.0 to 1.0,
  "churn_risk_alerts": 0
}`;

/**
 * Fetch weekly data for insights generation
 */
async function fetchWeeklyData(projectId: string): Promise<WeeklyData> {
  const supabase = getServiceRoleClient();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const previousWeekStart = new Date();
  previousWeekStart.setDate(previousWeekStart.getDate() - 14);
  const previousWeekEnd = new Date();
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

  // Fetch this week's posts
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      category,
      created_at,
      sentiment_analysis(sentiment_score, sentiment_category, emotional_tone)
    `)
    .eq('project_id', projectId)
    .gte('created_at', weekStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(200);

  if (postsError || !posts) {
    throw new Error('Failed to fetch weekly posts');
  }

  // Calculate sentiment distribution
  const sentimentDist = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0,
  };

  let totalSentiment = 0;
  let sentimentCount = 0;

  posts.forEach((post: any) => {
    const category = post.sentiment_analysis?.sentiment_category;
    if (category) {
      sentimentDist[category as keyof typeof sentimentDist]++;
    }

    const score = post.sentiment_analysis?.sentiment_score;
    if (typeof score === 'number') {
      totalSentiment += score;
      sentimentCount++;
    }
  });

  const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;

  // Get category distribution
  const categoryMap = new Map<string, number>();
  posts.forEach((post: any) => {
    const cat = post.category || 'uncategorized';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get previous week's avg sentiment for comparison
  const { data: previousWeekPosts } = await supabase
    .from('posts')
    .select('sentiment_analysis(sentiment_score)')
    .eq('project_id', projectId)
    .gte('created_at', previousWeekStart.toISOString())
    .lte('created_at', previousWeekEnd.toISOString());

  let previousWeekAvgSentiment;
  if (previousWeekPosts && previousWeekPosts.length > 0) {
    const prevScores = previousWeekPosts
      .map((p: any) => p.sentiment_analysis?.sentiment_score)
      .filter((s: number | null) => s !== null) as number[];

    if (prevScores.length > 0) {
      previousWeekAvgSentiment =
        prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
    }
  }

  // Fetch recent anomalies
  const { data: anomalies } = await supabase
    .from('anomaly_detections')
    .select('*')
    .eq('project_id', projectId)
    .gte('detected_at', weekStart.toISOString())
    .eq('status', 'active')
    .order('severity', { ascending: false })
    .limit(5);

  return {
    totalFeedback: posts.length,
    sentimentDistribution: sentimentDist,
    avgSentiment,
    topThemes: [], // Would require theme analysis
    topCategories,
    recentPosts: posts.slice(0, 20), // Most recent 20 for context
    anomalies: anomalies || [],
    previousWeekAvgSentiment,
  };
}

/**
 * Generate weekly insights report using Claude Sonnet 4
 */
export async function generateWeeklyInsights(
  projectId: string
): Promise<InsightGenerationResult> {
  console.log(`[INSIGHTS] 🧠 Generating weekly insights for project ${projectId} using Claude Sonnet 4`);

  const startTime = Date.now();

  // Fetch weekly data
  const weeklyData = await fetchWeeklyData(projectId);

  if (weeklyData.totalFeedback === 0) {
    throw new Error('No feedback data available for this week');
  }

  // Prepare data summary for Claude
  const sentimentChange = weeklyData.previousWeekAvgSentiment
    ? ((weeklyData.avgSentiment - weeklyData.previousWeekAvgSentiment) /
        Math.abs(weeklyData.previousWeekAvgSentiment)) *
      100
    : null;

  const dataSummary = {
    period: 'Last 7 days',
    total_feedback: weeklyData.totalFeedback,
    avg_sentiment: weeklyData.avgSentiment.toFixed(3),
    sentiment_change_pct: sentimentChange ? sentimentChange.toFixed(1) + '%' : 'N/A',
    sentiment_distribution: weeklyData.sentimentDistribution,
    top_categories: weeklyData.topCategories,
    anomalies_detected: weeklyData.anomalies.length,
  };

  // Sample recent feedback
  const feedbackSamples = weeklyData.recentPosts.slice(0, 15).map((post: any) => ({
    title: post.title,
    category: post.category || 'uncategorized',
    sentiment: post.sentiment_analysis?.sentiment_category || 'neutral',
    sentiment_score: post.sentiment_analysis?.sentiment_score?.toFixed(2) || '0.00',
    emotional_tone: post.sentiment_analysis?.emotional_tone || 'neutral',
    date: new Date(post.created_at).toLocaleDateString(),
  }));

  // Anomaly summaries
  const anomalySummaries = weeklyData.anomalies.map((a: any) => ({
    type: a.anomaly_type,
    severity: a.severity,
    summary: a.ai_summary,
  }));

  // Create prompt for Claude
  const userPrompt = `Analyze this week's user feedback and generate strategic insights:

**Weekly Summary:**
${JSON.stringify(dataSummary, null, 2)}

**Recent Feedback Samples (${feedbackSamples.length} of ${weeklyData.totalFeedback}):**
${feedbackSamples.map((f, i) => `${i + 1}. [${f.sentiment.toUpperCase()}] "${f.title}" (${f.category}) - ${f.emotional_tone} - ${f.date}`).join('\n')}

${anomalySummaries.length > 0 ? `
**Detected Anomalies:**
${anomalySummaries.map((a, i) => `${i + 1}. ${a.type} (${a.severity}): ${a.summary}`).join('\n')}
` : ''}

**Context:**
- Total feedback this week: ${weeklyData.totalFeedback}
- Average sentiment: ${weeklyData.avgSentiment.toFixed(2)} (${sentimentChange ? (sentimentChange > 0 ? '+' : '') + sentimentChange.toFixed(1) + '% from last week' : 'no prior data'})
- Sentiment breakdown: ${weeklyData.sentimentDistribution.positive} positive, ${weeklyData.sentimentDistribution.negative} negative, ${weeklyData.sentimentDistribution.neutral} neutral

Please provide comprehensive strategic insights as JSON.`;

  // Check if anthropic client is available
  if (!anthropic) {
    throw new Error('Claude SDK not installed. Run: npm install @anthropic-ai/sdk');
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.3,
      system: INSIGHTS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const analysisText = content.text;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    const generationTime = Date.now() - startTime;

    // Construct report
    const report: InsightReport = {
      executiveSummary: analysis.executive_summary,
      keyInsights: analysis.key_insights || [],
      biggestWins: analysis.biggest_wins || [],
      criticalIssues: analysis.critical_issues || [],
      emergingTrends: analysis.emerging_trends || [],
      recommendedActions: analysis.recommended_actions || [],
      forecastedSentiment: analysis.forecasted_sentiment_next_week || weeklyData.avgSentiment,
      churnRiskAlerts: analysis.churn_risk_alerts || 0,
    };

    console.log(`[INSIGHTS] ✅ Generated insights in ${generationTime}ms`);

    return {
      report,
      metadata: {
        model: MODEL,
        generationTimeMs: generationTime,
        tokenUsageInput: response.usage.input_tokens,
        tokenUsageOutput: response.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('[INSIGHTS] ❌ Error generating insights:', error);
    throw error;
  }
}

/**
 * Store insights report in database
 */
export async function storeInsightReport(
  projectId: string,
  report: InsightReport,
  metadata: InsightGenerationResult['metadata'],
  periodStart: Date,
  periodEnd: Date,
  totalFeedbackAnalyzed: number
): Promise<string> {
  const supabase = getServiceRoleClient();

  // Calculate sentiment trend
  let sentimentTrend: 'improving' | 'declining' | 'stable' = 'stable';
  const sentimentChange = report.forecastedSentiment; // Simplified
  if (sentimentChange > 0.1) sentimentTrend = 'improving';
  else if (sentimentChange < -0.1) sentimentTrend = 'declining';

  const { data, error } = await supabase
    .from('insight_reports')
    .insert({
      project_id: projectId,
      report_type: 'weekly',
      report_period_start: periodStart.toISOString(),
      report_period_end: periodEnd.toISOString(),
      executive_summary: report.executiveSummary,
      key_insights: report.keyInsights,
      total_feedback_analyzed: totalFeedbackAnalyzed,
      sentiment_trend: sentimentTrend,
      top_themes: [],
      biggest_wins: report.biggestWins,
      critical_issues: report.criticalIssues,
      emerging_trends: report.emergingTrends,
      forecasted_sentiment_next_week: report.forecastedSentiment,
      churn_risk_alerts: report.churnRiskAlerts,
      recommended_actions: report.recommendedActions,
      model_name: metadata.model,
      generation_time_ms: metadata.generationTimeMs,
      token_usage_input: metadata.tokenUsageInput,
      token_usage_output: metadata.tokenUsageOutput,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[INSIGHTS] ❌ Error storing report:', error);
    throw error;
  }

  console.log(`[INSIGHTS] 💾 Stored insight report: ${data.id}`);
  return data.id;
}

/**
 * Generate and store weekly insights report
 */
export async function generateAndStoreWeeklyInsights(projectId: string): Promise<string> {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);

  const result = await generateWeeklyInsights(projectId);

  // Get total feedback count
  const supabase = getServiceRoleClient();
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('created_at', periodStart.toISOString());

  const reportId = await storeInsightReport(
    projectId,
    result.report,
    result.metadata,
    periodStart,
    periodEnd,
    count || 0
  );

  return reportId;
}
