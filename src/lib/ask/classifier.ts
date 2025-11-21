/**
 * Query Classification Service
 * Classifies user queries using GPT-4o-mini to determine intent and extract entities
 */

import OpenAI from 'openai';
import { ClassificationResult, QueryType, ExtractedEntities } from '@/types/ask';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * System prompt for query classification
 */
const CLASSIFICATION_SYSTEM_PROMPT = `You are a query classification system for a product feedback management tool called SignalsLoop.

Your task is to analyze user queries and classify them into one of these 7 categories:

1. **feedback**: Questions about specific feedback items, bugs, feature requests, or customer complaints
   Examples: "Show me all bug reports", "What feature requests do we have?", "Find feedback about login issues"

2. **sentiment**: Questions about sentiment trends, satisfaction levels, NPS-like queries, or emotional tone
   Examples: "How are customers feeling?", "What's our NPS?", "Are users happy with the new feature?"

3. **competitive**: Questions about competitors, competitive landscape, or comparative analysis
   Examples: "What are competitors doing?", "How do we compare to Acme Corp?", "Any mentions of Competitor X?"

4. **themes**: Questions about patterns, recurring topics, common issues, or topic clustering
   Examples: "What are the main themes?", "Common issues this month?", "What topics are trending?"

5. **metrics**: Questions requesting numbers, counts, percentages, statistics, or quantitative data
   Examples: "How many feedback items?", "What percentage are bugs?", "Show me the numbers"

6. **actions**: Questions about recommendations, priorities, what to do next, or action items
   Examples: "What should we work on?", "Top priorities?", "What actions should we take?"

7. **general**: Greetings, help requests, unclear queries, or anything that doesn't fit above categories
   Examples: "Hello", "Help me", "What can you do?", "I don't know"

For each query, you must:
- Classify into ONE of the 7 types above
- Assign a confidence score (0.0 to 1.0)
- Extract relevant entities (competitors, themes, time ranges, sentiment, metrics, feedback types, priorities)
- Rewrite the query for optimal semantic search (expand abbreviations, add context, make it more descriptive)

Return your response as JSON with this exact structure:
{
  "queryType": "one of: feedback | sentiment | competitive | themes | metrics | actions | general",
  "confidence": 0.95,
  "entities": {
    "competitors": ["Company A", "Company B"],
    "themes": ["login", "performance"],
    "timeRange": {
      "relative": "last week"
    },
    "sentiment": "negative",
    "metrics": ["count", "percentage"],
    "feedbackTypes": ["bug", "feature request"],
    "priorities": ["high", "urgent"]
  },
  "searchQuery": "rewritten query optimized for semantic search"
}

Guidelines:
- Be decisive: Choose the BEST matching category
- High confidence (0.8+) when query clearly fits one category
- Medium confidence (0.5-0.8) when query could fit multiple categories
- Low confidence (<0.5) for ambiguous or general queries
- Extract ALL relevant entities, but omit fields that don't apply
- For searchQuery, expand the user's intent into a more descriptive search phrase
- Time ranges can be absolute (start/end dates) or relative ("last week", "this month")
- Sentiment can be: positive, negative, neutral, or mixed`;

/**
 * User prompt template
 */
function buildUserPrompt(query: string): string {
  return `Classify this user query:

"${query}"

Return JSON with queryType, confidence, entities, and searchQuery.`;
}

/**
 * Classifies a user query using GPT-4o-mini
 *
 * @param query - The user's query string
 * @returns ClassificationResult with query type, confidence, entities, and search query
 * @throws Error if OpenAI API call fails or response is invalid
 */
export async function classifyQuery(query: string): Promise<ClassificationResult> {
  try {
    // Validate input
    if (!query || query.trim().length === 0) {
      // Return default general classification for empty queries
      return {
        queryType: 'general',
        confidence: 1.0,
        entities: {},
        searchQuery: '',
      };
    }

    // Call OpenAI with JSON mode for structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(query) },
      ],
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 500,
      response_format: { type: 'json_object' }, // Enforce JSON output
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate the JSON response
    const parsed = JSON.parse(responseContent);

    // Validate the structure
    const result: ClassificationResult = {
      queryType: validateQueryType(parsed.queryType),
      confidence: validateConfidence(parsed.confidence),
      entities: validateEntities(parsed.entities || {}),
      searchQuery: parsed.searchQuery || query, // Fallback to original query
    };

    return result;

  } catch (error) {
    console.error('Query classification error:', error);

    // Fallback to general classification on error
    return {
      queryType: 'general',
      confidence: 0.3,
      entities: {},
      searchQuery: query,
    };
  }
}

/**
 * Validates and coerces query type
 */
function validateQueryType(value: any): QueryType {
  const validTypes: QueryType[] = [
    'feedback',
    'sentiment',
    'competitive',
    'themes',
    'metrics',
    'actions',
    'general',
  ];

  if (validTypes.includes(value)) {
    return value as QueryType;
  }

  // Default to general if invalid
  return 'general';
}

/**
 * Validates and normalizes confidence score
 */
function validateConfidence(value: any): number {
  const confidence = typeof value === 'number' ? value : 0.5;
  return Math.max(0, Math.min(1, confidence)); // Clamp between 0 and 1
}

/**
 * Validates and cleans extracted entities
 */
function validateEntities(entities: any): ExtractedEntities {
  const result: ExtractedEntities = {};

  // Validate competitors array
  if (Array.isArray(entities.competitors) && entities.competitors.length > 0) {
    result.competitors = entities.competitors
      .filter((c: any) => typeof c === 'string')
      .map((c: string) => c.trim());
  }

  // Validate themes array
  if (Array.isArray(entities.themes) && entities.themes.length > 0) {
    result.themes = entities.themes
      .filter((t: any) => typeof t === 'string')
      .map((t: string) => t.trim());
  }

  // Validate time range
  if (entities.timeRange && typeof entities.timeRange === 'object') {
    result.timeRange = {
      start: entities.timeRange.start,
      end: entities.timeRange.end,
      relative: entities.timeRange.relative,
    };
  }

  // Validate sentiment
  if (
    entities.sentiment === 'positive' ||
    entities.sentiment === 'negative' ||
    entities.sentiment === 'neutral' ||
    entities.sentiment === 'mixed'
  ) {
    result.sentiment = entities.sentiment;
  }

  // Validate metrics array
  if (Array.isArray(entities.metrics) && entities.metrics.length > 0) {
    result.metrics = entities.metrics
      .filter((m: any) => typeof m === 'string')
      .map((m: string) => m.trim());
  }

  // Validate feedback types array
  if (Array.isArray(entities.feedbackTypes) && entities.feedbackTypes.length > 0) {
    result.feedbackTypes = entities.feedbackTypes
      .filter((ft: any) => typeof ft === 'string')
      .map((ft: string) => ft.trim());
  }

  // Validate priorities array
  if (Array.isArray(entities.priorities) && entities.priorities.length > 0) {
    result.priorities = entities.priorities
      .filter((p: any) => typeof p === 'string')
      .map((p: string) => p.trim());
  }

  return result;
}

/**
 * Batch classify multiple queries (useful for analytics)
 *
 * @param queries - Array of query strings
 * @returns Array of ClassificationResults
 */
export async function batchClassifyQueries(
  queries: string[]
): Promise<ClassificationResult[]> {
  // Process in parallel with a reasonable limit to avoid rate limiting
  const batchSize = 5;
  const results: ClassificationResult[] = [];

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((query) => classifyQuery(query))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Gets a suggested query type based on simple keyword matching
 * (Useful as a fallback or for client-side predictions)
 *
 * @param query - The user's query string
 * @returns Suggested QueryType
 */
export function getSuggestedQueryType(query: string): QueryType {
  const lowerQuery = query.toLowerCase();

  // Keywords for each type
  const keywords = {
    feedback: [
      'feedback',
      'bug',
      'feature request',
      'complaint',
      'issue',
      'report',
      'suggestion',
    ],
    sentiment: [
      'sentiment',
      'satisfaction',
      'happy',
      'unhappy',
      'nps',
      'feeling',
      'mood',
      'emotion',
    ],
    competitive: [
      'competitor',
      'competition',
      'vs',
      'compare',
      'alternative',
      'rival',
    ],
    themes: [
      'theme',
      'pattern',
      'topic',
      'common',
      'recurring',
      'trend',
      'cluster',
    ],
    metrics: [
      'how many',
      'count',
      'number',
      'percentage',
      'stats',
      'statistics',
      'total',
      'average',
    ],
    actions: [
      'what should',
      'recommend',
      'priority',
      'action',
      'next step',
      'todo',
      'focus',
    ],
  };

  // Check each category
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some((word) => lowerQuery.includes(word))) {
      return type as QueryType;
    }
  }

  // Default to general
  return 'general';
}
