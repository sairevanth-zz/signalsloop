/**
 * Stakeholder Response Generator
 * Generates dynamic component-based responses using Claude Sonnet 4
 */

import Anthropic from '@anthropic-ai/sdk';
import { ComponentSelectionResponse, ContextData, StakeholderRole } from '@/types/stakeholder';

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Role-specific context that informs what each stakeholder cares about
 */
const ROLE_CONTEXTS: Record<StakeholderRole, string> = {
  ceo: `CEOs care about: strategic metrics, competitive positioning, revenue impact, churn risk,
high-level roadmap progress, and critical blockers. Focus on business outcomes and executive-level insights.`,

  sales: `Sales teams care about: new features to sell, competitive advantages, customer success stories,
upcoming launches with timelines, customer requests status, and how features solve customer pain points.`,

  engineering: `Engineering teams care about: technical debt feedback, performance issues, bug reports,
feature complexity, upcoming technical challenges, and priority of roadmap items.`,

  marketing: `Marketing teams care about: feature launches ready for announcement, customer testimonials,
competitive differentiation points, positioning insights from feedback, and product narrative evolution.`,

  customer_success: `Customer success teams care about: customer pain points, at-risk accounts,
high-value customer requests, product improvements shipped, and sentiment trends by customer segment.`,

  product: `Product managers care about: feature performance, user feedback themes, prioritization insights,
roadmap impact, outcome metrics, and data-driven product decisions.`,
};

/**
 * Main Claude Sonnet 4 system prompt for component selection
 */
const SYSTEM_PROMPT = `You are an elite executive dashboard architect for C-suite and senior stakeholders. Your responses must be VISUALLY RICH, DATA-DRIVEN, and DISTINCTLY DIFFERENT from simple Q&A.

CRITICAL REQUIREMENTS:
1. ALWAYS include 3-5 components per response (never less than 3)
2. MANDATORY: At least 2 VISUAL components (charts, clouds, timelines, comparisons) - NOT just text and lists
3. Create executive-grade insights that look like a premium dashboard
4. This is NOT a chatbot - it's an intelligent dashboard generator

AVAILABLE COMPONENTS (USE CREATIVELY):

📊 VISUAL COMPONENTS (USE AT LEAST 2):
- SentimentChart: Line chart showing trends over time - PERFECT for "how is X trending?"
- ThemeCloud: Visual word cloud with size/color coding - GREAT for "what are customers saying?"
- TimelineEvents: Chronological visualization - IDEAL for "what happened recently?"
- CompetitorCompare: Side-by-side comparison table - BEST for competitive questions
- MetricCard: Big number with trend arrow - USE for key KPIs

📝 DATA COMPONENTS (COMPLEMENT VISUALS):
- SummaryText: Executive summary with insights (ALWAYS use first, but keep brief)
- FeedbackList: Specific customer quotes/evidence (use to support charts)
- ActionCard: Urgent recommendation with severity (use ONLY for critical items)

COMPONENT SELECTION RULES:
❌ NEVER respond with just SummaryText + FeedbackList (too boring!)
❌ NEVER use less than 3 components
✅ ALWAYS mix visual + data components
✅ ALWAYS think "if this were a $10k/month dashboard, what would it show?"

ROLE-SPECIFIC VISUALIZATION PRIORITIES:
- CEO: SentimentChart + MetricCard + ThemeCloud (big picture, trends, patterns)
- Sales: CompetitorCompare + MetricCard + FeedbackList (competitive edge, wins, testimonials)
- Engineering: ThemeCloud + FeedbackList + TimelineEvents (bug patterns, technical debt, releases)
- Marketing: SentimentChart + FeedbackList + ThemeCloud (brand perception, customer voice)
- Customer Success: SentimentChart + FeedbackList + ActionCard (at-risk accounts, urgent issues)
- Product: ThemeCloud + SentimentChart + TimelineEvents (feature requests, trends, launches)

EXAMPLE GREAT RESPONSE (for "What are the top issues?"):
[
  { "type": "SummaryText", "order": 1, ... },     // Brief exec summary
  { "type": "ThemeCloud", "order": 2, ... },       // Visual of all issues by size
  { "type": "SentimentChart", "order": 3, ... },   // Trend showing issues over time
  { "type": "FeedbackList", "order": 4, ... },     // Top 5 specific examples
  { "type": "ActionCard", "order": 5, ... }        // Recommended immediate action
]

EXAMPLE BAD RESPONSE (too simple):
[
  { "type": "SummaryText", ... },
  { "type": "FeedbackList", ... }
] ❌ This looks like basic Q&A, not a premium dashboard!

Respond with valid JSON only. Make every response worthy of a premium executive dashboard.`;

/**
 * Generate response components for a stakeholder query
 */
export async function generateStakeholderResponse(
  query: string,
  role: StakeholderRole,
  context: ContextData,
  projectId: string
): Promise<ComponentSelectionResponse> {
  const startTime = Date.now();

  try {
    const userPrompt = buildUserPrompt(query, role, context);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!content) {
      throw new Error('Empty response from Claude');
    }

    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const parsed: ComponentSelectionResponse = JSON.parse(jsonStr);

    // Validate and add order to components
    parsed.components = parsed.components.map((comp, idx) => ({
      ...comp,
      order: comp.order || idx + 1,
    }));

    // VALIDATION: Ensure we have enough visual components
    const visualComponents = ['SentimentChart', 'ThemeCloud', 'TimelineEvents', 'CompetitorCompare', 'MetricCard'];
    const visualCount = parsed.components.filter(c => visualComponents.includes(c.type)).length;

    if (visualCount < 2 || parsed.components.length < 3) {
      console.warn('[Response Generator] Response lacks visual richness, enhancing...');
      parsed.components = await enhanceResponse(parsed.components, role, context);
    }

    const generationTime = Date.now() - startTime;
    console.log(`[Response Generator] Generated response in ${generationTime}ms with ${parsed.components.length} components (${visualCount} visual)`);

    return parsed;
  } catch (error) {
    console.error('[Response Generator] Error:', error);

    // Enhanced fallback response with visuals
    return {
      components: [
        {
          type: 'SummaryText',
          order: 1,
          props: {
            content: `I encountered an error processing your question. This might be due to missing data or a temporary issue. Please try rephrasing your query.`,
            sources: [],
          },
        },
        {
          type: 'MetricCard',
          order: 2,
          props: {
            title: 'System Status',
            value: 'Error',
            description: 'Unable to generate full response',
          },
        },
      ],
      follow_up_questions: [
        'What specific metrics would you like to see?',
        'Would you like me to show recent feedback?',
        'Can I help you with a different question?',
      ],
    };
  }
}

/**
 * Enhance response with additional visual components if needed
 */
async function enhanceResponse(
  components: any[],
  role: StakeholderRole,
  context: ContextData
): Promise<any[]> {
  const enhanced = [...components];

  // Add ThemeCloud if we have themes data and it's not already included
  if (context.themes && context.themes.length > 0 && !components.some(c => c.type === 'ThemeCloud')) {
    enhanced.push({
      type: 'ThemeCloud',
      order: enhanced.length + 1,
      props: {
        themes: context.themes.slice(0, 15).map(t => ({
          name: t.name,
          count: t.count,
          sentiment: t.sentiment || 0,
          trend: 'stable' as const,
        })),
        title: 'Top Customer Themes',
      },
    });
  }

  // Add SentimentChart if we have metrics and it's not already included
  if (context.metrics && !components.some(c => c.type === 'SentimentChart')) {
    // Generate last 30 days of data points
    const dataPoints = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dataPoints.push({
        date: date.toISOString().split('T')[0],
        value: context.sentiment || 0, // Would be better with historical data
      });
    }

    enhanced.push({
      type: 'SentimentChart',
      order: enhanced.length + 1,
      props: {
        data: dataPoints,
        timeRange: '30d' as const,
        title: 'Sentiment Trend',
      },
    });
  }

  // Add MetricCard for feedback count if not present
  if (context.metrics && !components.some(c => c.type === 'MetricCard')) {
    enhanced.push({
      type: 'MetricCard',
      order: enhanced.length + 1,
      props: {
        title: 'Total Feedback',
        value: context.metrics.feedback_count,
        trend: 'up' as const,
        delta: '+12% this week',
      },
    });
  }

  return enhanced;
}

/**
 * Build the user prompt with role context and data
 */
function buildUserPrompt(
  query: string,
  role: StakeholderRole,
  context: ContextData
): string {
  // Create a rich data summary
  const dataSummary = `
📊 AVAILABLE DATA FOR VISUALIZATION:

Sentiment Metrics:
- Current Average: ${context.sentiment?.toFixed(2) || 'N/A'}
- Total Feedback Items: ${context.metrics?.feedback_count || 0}
- Recent Activity: ${context.metrics?.recent_activity || 0} items

Top Themes (${context.themes?.length || 0} total):
${context.themes?.slice(0, 10).map((t, i) => `${i + 1}. ${t.name} (${t.count} mentions)`).join('\n') || 'No themes available'}

Recent Feedback Samples (${context.recent_feedback?.length || 0} items):
${context.recent_feedback?.slice(0, 5).map((f, i) => `${i + 1}. "${f.title}" (sentiment: ${f.sentiment?.toFixed(2)})`).join('\n') || 'No recent feedback'}

Competitors:
${context.competitor_events?.length ? context.competitor_events.map(e => `- ${e.competitor}: ${e.event}`).join('\n') : 'No competitor data'}
`;

  return `STAKEHOLDER: ${role.toUpperCase()}
CONTEXT: ${ROLE_CONTEXTS[role]}

QUESTION: "${query}"

${dataSummary}

INSTRUCTIONS:
1. Generate 3-5 components (MINIMUM 3, MAXIMUM 5)
2. Include AT LEAST 2 visual components (charts, clouds, timelines, comparisons)
3. Start with SummaryText (brief, 2-3 sentences max)
4. Use actual data from context above - populate props with real numbers
5. Think: "What would a $10k/month executive dashboard show for this question?"

COMPONENT REQUIREMENTS BY TYPE:

SummaryText:
{ "type": "SummaryText", "order": 1, "props": { "content": "Brief insight...", "sources": [] } }

MetricCard (for KPIs):
{ "type": "MetricCard", "order": 2, "props": { "title": "Metric Name", "value": ${context.metrics?.feedback_count || 0}, "trend": "up|down|flat", "delta": "+X% vs last week" } }

SentimentChart (HIGHLY RECOMMENDED for trends):
{ "type": "SentimentChart", "order": 3, "props": { "data": [{"date": "2024-01-01", "value": 0.5}], "timeRange": "30d", "title": "Chart Title" } }

ThemeCloud (GREAT for "what are customers saying"):
{ "type": "ThemeCloud", "order": 4, "props": { "themes": ${JSON.stringify(context.themes?.slice(0, 15) || [])}, "title": "Top Themes" } }

FeedbackList (use WITH visuals, not alone):
{ "type": "FeedbackList", "order": 5, "props": { "items": [], "limit": 5, "showSentiment": true, "data_query": { "type": "feedback", "limit": 5, "params": {"sentiment": "negative"} } } }

TimelineEvents (for recent activity):
{ "type": "TimelineEvents", "order": 3, "props": { "events": [], "title": "Recent Activity" } }

ActionCard (ONLY if there's urgent action):
{ "type": "ActionCard", "order": 5, "props": { "title": "Action Required", "description": "...", "severity": "critical|high|medium|low", "cta": "Review Now" } }

REMEMBER:
- Mix static props (use context data) with data_query (for live fetching)
- ALWAYS include visualizations - this is a premium dashboard, not a chatbot
- For ${role}: Use role-specific visualization priorities from system prompt

Respond with ONLY valid JSON (no markdown, no explanation):
{ "components": [...], "follow_up_questions": ["...", "...", "..."] }`;
}

/**
 * Fetch context data for response generation
 */
export async function fetchContextData(projectId: string): Promise<ContextData> {
  // This will be implemented to fetch real data from Supabase
  // For now, return empty context
  return {
    metrics: {
      feedback_count: 0,
      avg_sentiment: 0,
      theme_count: 0,
      recent_activity: 0,
    },
  };
}
