import { getOpenAI } from '@/lib/openai-client';
import { FeedbackItem, ClusteringResult } from './types';

export async function clusterFeedback(
  productName: string,
  sources: string[],
  feedbackItems: FeedbackItem[]
): Promise<ClusteringResult> {
  // Limit to prevent context window overflow if massive, though 4o is huge. 
  // For demo purposes, we will take the top N most relevant or just slice. 
  // Real implementation might need map-reduce, but for "60 seconds" demo, a focused batch is better.
  const analyzedItems = feedbackItems.slice(0, 500); // 500 reviews is a good sample for a demo

  const feedbackText = analyzedItems
    .map((f, i) => `[${i}] Source: ${f.source} | Content: ${f.text}`)
    .join('\n\n');

  const prompt = `
Analyze this product feedback and cluster it into actionable themes.

PRODUCT: ${productName}
TOTAL REVIEWS: ${analyzedItems.length}
SOURCES: ${sources.join(', ')}

FEEDBACK:
${feedbackText}

THEME CATEGORIES:
- feature_request: Users want new capabilities
- bug: Something is broken or not working
- ux_issue: Confusing, frustrating, or inefficient workflows  
- performance: Speed, reliability, uptime issues
- pricing: Cost concerns, value questions
- onboarding: Getting started difficulties
- integration: Third-party connections wanted/broken
- support: Customer service experiences
- praise: What users love (important to identify!)
- comparison: Mentions of competitors

Respond with JSON:
{
  "product_summary": {
    "overall_sentiment": -1.0 to 1.0,
    "sentiment_label": "Very Negative/Negative/Mixed/Positive/Very Positive",
    "total_feedback_analyzed": integer,
    "one_liner": "One sentence summary of how users feel",
    "sources_breakdown": {
      "reddit": { "count": int, "sentiment": float },
      "app_store": { "count": int, "sentiment": float },
      "pasted": { "count": int, "sentiment": float }
    }
  },
  
  "themes": [
    {
      "name": "Specific theme name (e.g., 'Mobile App Needed' not just 'Mobile')",
      "category": "feature_request|bug|ux_issue|etc",
      "mention_count": integer,
      "percentage": "X% of all feedback",
      "sentiment": -1.0 to 1.0,
      "urgency": "critical/high/medium/low",
      "trend": "growing/stable/declining", // if temporal data available
      "summary": "2-3 sentence summary of this theme",
      "sample_quotes": [
        { "quote": "Actual user quote", "source": "reddit" },
        { "quote": "Another quote", "source": "app_store" }
      ],
      "actionable_insight": "What to do about this"
    }
  ],
  
  "top_feature_requests": [
    {
      "feature": "Feature name",
      "mentions": integer,
      "user_quote": "Best quote capturing this need",
      "effort_guess": "low/medium/high",
      "impact_guess": "low/medium/high"
    }
  ],
  
  "critical_issues": [
    {
      "issue": "Issue description",
      "severity": "critical/high",
      "mentions": integer,
      "user_impact": "How this affects users",
      "sample_quote": "User describing the pain"
    }
  ],
  
  "what_users_love": [
    {
      "strength": "What they love",
      "mentions": integer,
      "sample_quote": "Praise quote",
      "leverage_opportunity": "How to lean into this strength"
    }
  ],
  
  "competitor_mentions": [
    {
      "competitor": "Competitor name",
      "context": "switching_from/switching_to/comparison",
      "mentions": integer,
      "summary": "What users say about this competitor"
    }
  ],
  
  "recommended_priorities": [
    {
      "rank": 1,
      "action": "What to prioritize",
      "rationale": "Why this should be #1",
      "theme_reference": "Related theme name"
    }
  ]
}

RULES:
- Themes should be SPECIFIC (not "Performance" but "Dashboard Load Time")
- Include REAL quotes from the feedback
- Rank themes by business impact, not just mention count
- Identify competitor mentions - crucial competitive intel
- "What users love" is just as important as complaints
`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a Product Feedback Analysis Engine.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2 // Low temperature for consistent JSON
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No analysis generated');

  return JSON.parse(content) as ClusteringResult;
}
