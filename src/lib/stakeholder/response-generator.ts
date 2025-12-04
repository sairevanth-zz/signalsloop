/**
 * Stakeholder Response Generator
 * Generates dynamic component-based responses using GPT-4o
 */

import OpenAI from 'openai';
import { ComponentSelectionResponse, ContextData, StakeholderRole } from '@/types/stakeholder';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
 * Main GPT-4o system prompt for component selection
 */
const SYSTEM_PROMPT = `You are an expert product analytics assistant that generates dynamic dashboard responses for stakeholders.

When a stakeholder asks a question, you must:
1. Understand their role and what matters to them
2. Select the most appropriate UI components to answer their question
3. Generate content for each component
4. Suggest relevant follow-up questions

AVAILABLE COMPONENTS:

1. SummaryText - AI-generated text summary with source citations
   Use for: Explaining trends, providing context, answering "why" questions

2. MetricCard - Single metric with trend indicator
   Use for: Showing key numbers, KPIs, changes over time

3. SentimentChart - Line chart of sentiment over time
   Use for: Sentiment trends, tracking changes

4. FeedbackList - List of relevant feedback items
   Use for: Showing specific customer feedback, examples, evidence

5. ActionCard - Recommended action with CTA
   Use for: Urgent issues, recommendations, things requiring attention

6. CompetitorCompare - Comparison table with competitors
   Use for: Competitive questions, feature gaps, positioning

7. ThemeCloud - Visual theme distribution
   Use for: Overview of feedback themes, patterns, topics

8. TimelineEvents - Chronological event display
   Use for: What happened recently, feature launches, milestones

RULES:
- Use 2-4 components per response (not too cluttered)
- Always start with SummaryText to directly answer the question
- Include at least one data visualization (chart, metric, or list)
- End with ActionCard only if there's a clear recommended action
- Keep content concise - stakeholders are busy
- Cite specific data sources when possible
- Match the stakeholder's role priorities

Respond with valid JSON only.`;

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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from GPT-4o');
    }

    const parsed: ComponentSelectionResponse = JSON.parse(content);

    // Validate and add order to components
    parsed.components = parsed.components.map((comp, idx) => ({
      ...comp,
      order: comp.order || idx + 1,
    }));

    const generationTime = Date.now() - startTime;
    console.log(`[Response Generator] Generated response in ${generationTime}ms`);

    return parsed;
  } catch (error) {
    console.error('[Response Generator] Error:', error);

    // Fallback response
    return {
      components: [
        {
          type: 'SummaryText',
          order: 1,
          props: {
            content: `I encountered an error processing your question. Please try rephrasing your query or contact support if the issue persists.`,
            sources: [],
          },
        },
      ],
      follow_up_questions: [
        'What metrics would you like to see?',
        'Would you like me to show recent feedback?',
      ],
    };
  }
}

/**
 * Build the user prompt with role context and data
 */
function buildUserPrompt(
  query: string,
  role: StakeholderRole,
  context: ContextData
): string {
  return `STAKEHOLDER ROLE: ${role}
${ROLE_CONTEXTS[role]}

QUERY: ${query}

AVAILABLE DATA CONTEXT:
${JSON.stringify(context, null, 2)}

Generate a response with the most appropriate UI components. Return JSON with this structure:
{
  "components": [
    {
      "type": "SummaryText|MetricCard|SentimentChart|FeedbackList|ActionCard|CompetitorCompare|ThemeCloud|TimelineEvents",
      "order": 1,
      "props": {
        // Component-specific props based on the component type
        // For SummaryText: { "content": "...", "sources": [] }
        // For MetricCard: { "title": "...", "value": 123, "trend": "up", "delta": "..." }
        // For SentimentChart: { "data": [], "timeRange": "30d" }
        // For FeedbackList: { "items": [], "limit": 5, "showSentiment": true }
        // etc.
      },
      "data_query": {
        // Optional: If component needs live data fetching
        "type": "feedback|themes|competitors|metrics|events",
        "filter": "SQL-like filter condition",
        "limit": 10,
        "params": {}
      }
    }
  ],
  "follow_up_questions": [
    "Relevant follow-up question 1?",
    "Relevant follow-up question 2?",
    "Relevant follow-up question 3?"
  ]
}

IMPORTANT:
- For data_query, use it when you need to fetch live data from the database
- For props, populate with actual data from the context when possible
- Ensure all JSON is valid and properly formatted`;
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
