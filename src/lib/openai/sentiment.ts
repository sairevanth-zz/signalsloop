/**
 * Sentiment Analysis Service for SignalsLoop
 * Provides AI-powered sentiment analysis using OpenAI GPT-4
 */

import OpenAI from 'openai';
import { withCache } from '../ai-cache-manager';
import {
  SentimentAnalysisInput,
  SentimentAnalysisOutput,
  BatchSentimentInput,
  BatchSentimentResult,
  SentimentAnalysisResult,
  SentimentAnalysisError,
} from '@/types/sentiment';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODELS = {
  SENTIMENT: process.env.SENTIMENT_MODEL || 'gpt-4o-mini',
};

// Configuration constants
const DEFAULT_BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * System prompt for sentiment analysis
 */
const SENTIMENT_SYSTEM_PROMPT = `You are an expert at analyzing the sentiment and emotional tone of user feedback for SaaS products.

Your task is to analyze feedback text and determine:
1. Overall sentiment category (positive, negative, neutral, or mixed)
2. Sentiment score from -1 (very negative) to 1 (very positive)
3. Emotional tone of the feedback
4. Confidence in your analysis

Sentiment Categories:
- positive: User is satisfied, excited, or appreciative
- negative: User is frustrated, angry, disappointed, or dissatisfied
- neutral: User is providing factual information without strong emotion
- mixed: Feedback contains both positive and negative elements

Emotional Tones (pick the most prominent):
- excited: User is enthusiastic about something
- satisfied: User is content and happy
- frustrated: User is experiencing difficulty or annoyance
- angry: User is very upset or angry
- confused: User doesn't understand something
- concerned: User is worried about something
- disappointed: User expected more
- hopeful: User is optimistic about improvements
- neutral: User is matter-of-fact
- urgent: User needs immediate attention

Sentiment Score Guidelines:
- 0.7 to 1.0: Very positive (praising, thanking, loving features)
- 0.3 to 0.7: Somewhat positive (likes but has suggestions)
- -0.3 to 0.3: Neutral (factual, informational)
- -0.7 to -0.3: Somewhat negative (frustrated, minor complaints)
- -1.0 to -0.7: Very negative (angry, major issues, considering leaving)

Confidence Score:
- 0.9-1.0: Very clear sentiment with strong indicators
- 0.7-0.9: Clear sentiment with good indicators
- 0.5-0.7: Moderately clear sentiment
- Below 0.5: Ambiguous or unclear sentiment

Important: Consider context like:
- Technical issues (bugs) are typically negative even if politely worded
- Feature requests can be neutral or positive depending on tone
- Mixed feedback should be categorized as "mixed" not neutral

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "sentiment_category": "positive|negative|neutral|mixed",
  "sentiment_score": -1.0 to 1.0,
  "emotional_tone": "one of the listed tones",
  "confidence_score": 0.0 to 1.0,
  "reasoning": "brief explanation of the sentiment analysis"
}`;

/**
 * Analyze sentiment of a single feedback text
 * Internal function without caching
 */
async function analyzeSentimentInternal(
  input: SentimentAnalysisInput,
): Promise<SentimentAnalysisOutput> {
  const { text, metadata } = input;

  // Construct user prompt with optional metadata
  let userPrompt = `Analyze the sentiment of this feedback:\n\n${text}`;

  if (metadata?.title) {
    userPrompt = `Title: ${metadata.title}\n\n${userPrompt}`;
  }

  if (metadata?.category) {
    userPrompt += `\n\nCategory: ${metadata.category}`;
  }

  if (metadata?.authorName) {
    userPrompt += `\nAuthor: ${metadata.authorName}`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.SENTIMENT,
      messages: [
        { role: 'system', content: SENTIMENT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new SentimentAnalysisError(
        'No response from AI',
        'NO_RESPONSE',
        input.postId,
      );
    }

    const result = JSON.parse(content) as SentimentAnalysisOutput;

    // Validate the response
    validateSentimentOutput(result);

    return result;
  } catch (error) {
    if (error instanceof SentimentAnalysisError) {
      throw error;
    }

    console.error('[SENTIMENT] Analysis error:', error);
    throw new SentimentAnalysisError(
      `Failed to analyze sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'ANALYSIS_FAILED',
      input.postId,
    );
  }
}

/**
 * Validate sentiment analysis output
 */
function validateSentimentOutput(output: SentimentAnalysisOutput): void {
  const validCategories = ['positive', 'negative', 'neutral', 'mixed'];

  if (!validCategories.includes(output.sentiment_category)) {
    output.sentiment_category = 'neutral';
  }

  // Ensure sentiment score is in range
  if (typeof output.sentiment_score !== 'number') {
    output.sentiment_score = 0;
  }
  output.sentiment_score = Math.max(-1, Math.min(1, output.sentiment_score));

  // Ensure confidence score is in range
  if (typeof output.confidence_score !== 'number') {
    output.confidence_score = 0.5;
  }
  output.confidence_score = Math.max(0, Math.min(1, output.confidence_score));

  // Ensure emotional tone is set
  if (!output.emotional_tone || typeof output.emotional_tone !== 'string') {
    output.emotional_tone = 'neutral';
  }
}

/**
 * Analyze sentiment with caching
 * This is the main function to use for single sentiment analysis
 */
export const analyzeSentiment = withCache(
  analyzeSentimentInternal,
  'sentiment',
  // Cache key generator: use text content for caching
  (input: SentimentAnalysisInput) => {
    return `${input.text.slice(0, 100)}`; // Use first 100 chars as cache key
  },
);

/**
 * Analyze sentiment with retry logic
 */
export async function analyzeSentimentWithRetry(
  input: SentimentAnalysisInput,
  maxRetries: number = MAX_RETRIES,
): Promise<SentimentAnalysisOutput> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await analyzeSentiment(input);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(
        `[SENTIMENT] Attempt ${attempt + 1}/${maxRetries} failed:`,
        lastError.message,
      );

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastError || new SentimentAnalysisError(
    'All retry attempts failed',
    'MAX_RETRIES_EXCEEDED',
    input.postId,
  );
}

/**
 * Analyze sentiment for multiple items in batches
 * Processes up to maxBatchSize items at a time to avoid rate limits
 */
export async function analyzeSentimentBatch(
  batchInput: BatchSentimentInput,
): Promise<BatchSentimentResult[]> {
  const { items, maxBatchSize = DEFAULT_BATCH_SIZE } = batchInput;

  if (items.length === 0) {
    return [];
  }

  const results: BatchSentimentResult[] = [];
  const totalBatches = Math.ceil(items.length / maxBatchSize);

  for (let i = 0; i < items.length; i += maxBatchSize) {
    const batch = items.slice(i, i + maxBatchSize);
    const batchNumber = Math.floor(i / maxBatchSize) + 1;

    console.log(
      `[SENTIMENT] Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`,
    );

    // Process batch items in parallel
    const batchPromises = batch.map(async (item) => {
      try {
        const analysis = await analyzeSentimentWithRetry(item);
        return {
          postId: item.postId || '',
          sentiment_category: analysis.sentiment_category,
          sentiment_score: analysis.sentiment_score,
          emotional_tone: analysis.emotional_tone,
          confidence_score: analysis.confidence_score,
          success: true,
        } as SentimentAnalysisResult;
      } catch (error) {
        console.error(
          `[SENTIMENT] Failed to analyze post ${item.postId}:`,
          error,
        );
        return {
          postId: item.postId || '',
          sentiment_category: 'neutral' as const,
          sentiment_score: 0,
          emotional_tone: 'neutral',
          confidence_score: 0,
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error',
        } as SentimentAnalysisResult;
      }
    });

    const batchResults = await Promise.all(batchPromises);

    results.push({
      results: batchResults,
      batchNumber,
      totalBatches,
    });

    // Add a small delay between batches to avoid rate limits
    if (batchNumber < totalBatches) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Get fallback sentiment for error cases
 */
export function getFallbackSentiment(): SentimentAnalysisOutput {
  return {
    sentiment_category: 'neutral',
    sentiment_score: 0,
    emotional_tone: 'neutral',
    confidence_score: 0,
    reasoning: 'Fallback sentiment due to analysis error',
  };
}

/**
 * Quick sentiment detection based on keywords (no AI call)
 * Useful for quick filtering or pre-processing
 */
export function detectSentimentQuick(text: string): {
  category: 'positive' | 'negative' | 'neutral';
  confidence: number;
} {
  const lowerText = text.toLowerCase();

  const positiveKeywords = [
    'love',
    'great',
    'excellent',
    'amazing',
    'awesome',
    'fantastic',
    'perfect',
    'thank',
    'appreciate',
    'wonderful',
  ];

  const negativeKeywords = [
    'bug',
    'broken',
    'crash',
    'error',
    'issue',
    'problem',
    'frustrated',
    'angry',
    'terrible',
    'awful',
    'hate',
    'disappointed',
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword)) positiveCount++;
  });

  negativeKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword)) negativeCount++;
  });

  if (positiveCount > negativeCount && positiveCount > 0) {
    return { category: 'positive', confidence: Math.min(0.7, positiveCount * 0.2) };
  }

  if (negativeCount > positiveCount && negativeCount > 0) {
    return { category: 'negative', confidence: Math.min(0.7, negativeCount * 0.2) };
  }

  return { category: 'neutral', confidence: 0.5 };
}
