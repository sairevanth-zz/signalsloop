/**
 * Theme Detection Service for SignalsLoop
 * Provides AI-powered theme and pattern detection using OpenAI GPT-4
 */

import OpenAI from 'openai';
import { withCache } from '../ai-cache-manager';
import {
  FeedbackItem,
  DetectedTheme,
  ThemeDetectionAIResult,
  BatchThemeDetectionResult,
  ThemeDetectionError,
  THEME_DETECTION_CONFIG,
} from '@/types/themes';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODELS = {
  THEME_DETECTION: process.env.THEME_DETECTION_MODEL || 'gpt-4o',
};

// Configuration constants
const DEFAULT_BATCH_SIZE = THEME_DETECTION_CONFIG.maxBatchSize;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * System prompt for theme detection
 */
const THEME_DETECTION_SYSTEM_PROMPT = `You are an expert at analyzing user feedback and identifying recurring themes and patterns for SaaS products.

Your task is to analyze a batch of feedback items and identify 3-10 recurring themes or patterns.

IMPORTANT RULES:
1. Only create themes that appear in at least 3 feedback items
2. Themes should be meaningful patterns, not just single keywords
3. Each theme needs a concise name (2-5 words) and a one-sentence description
4. For each theme, list the indices of feedback items that match
5. Assign a confidence score (0-1) for how well items fit the theme
6. Look for semantic similarity, not just keyword matching

THEME CATEGORIES TO LOOK FOR:
- Feature requests (new functionality users want)
- Bug reports (technical issues and problems)
- User experience issues (UI/UX complaints or confusion)
- Performance concerns (speed, reliability, scalability)
- Integration requests (connecting with other tools)
- Pricing/billing feedback
- Documentation/learning curve issues
- Mobile/platform-specific feedback
- Security/privacy concerns
- Workflow/process improvements

QUALITY GUIDELINES:
- Prefer specific themes over generic ones
  ✓ GOOD: "Mobile app crashes on Android devices"
  ✗ BAD: "App issues"

- Combine related feedback into meaningful themes
  ✓ GOOD: "Request for bulk edit operations"
  ✗ BAD: "Edit button", "Bulk features"

- Focus on actionable insights
  ✓ GOOD: "Users want dark mode for better readability"
  ✗ BAD: "UI preferences"

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "themes": [
    {
      "theme_name": "Concise theme name",
      "description": "One-sentence description of what this theme represents",
      "item_indices": [0, 2, 5, 8],
      "confidence": 0.85
    }
  ]
}

CONFIDENCE SCORING:
- 0.9-1.0: Very clear pattern with strong semantic similarity
- 0.7-0.9: Clear pattern with good similarity
- 0.5-0.7: Moderate pattern, some variation
- Below 0.5: Weak pattern (do not include)

Remember: Minimum 3 items per theme, 3-10 themes total, confidence >= 0.5`;

/**
 * Format feedback items for AI analysis
 */
function formatFeedbackForAI(items: FeedbackItem[]): string {
  return items
    .map((item, index) => {
      let text = `[${index}] ${item.title}`;

      if (item.description && item.description !== item.title) {
        text += `\n    ${item.description}`;
      }

      if (item.category) {
        text += `\n    Category: ${item.category}`;
      }

      if (item.sentiment_category) {
        text += `\n    Sentiment: ${item.sentiment_category}`;
      }

      return text;
    })
    .join('\n\n');
}

/**
 * Detect themes from a batch of feedback items
 * Internal function without caching
 */
async function detectThemesInternal(
  feedbackItems: FeedbackItem[],
): Promise<ThemeDetectionAIResult> {
  if (feedbackItems.length < THEME_DETECTION_CONFIG.minClusterSize) {
    throw new ThemeDetectionError(
      `Need at least ${THEME_DETECTION_CONFIG.minClusterSize} items for theme detection`,
      'INSUFFICIENT_DATA',
    );
  }

  const formattedFeedback = formatFeedbackForAI(feedbackItems);

  const userPrompt = `Analyze these ${feedbackItems.length} feedback items and identify 3-10 recurring themes.

Each theme must:
- Appear in at least ${THEME_DETECTION_CONFIG.minClusterSize} items
- Have a confidence score >= ${THEME_DETECTION_CONFIG.minConfidence}
- Be semantically meaningful

Feedback items:
${formattedFeedback}

Identify the themes and return them in the JSON format specified.`;

  try {
    console.log(
      `[THEMES] Analyzing ${feedbackItems.length} items for theme detection...`,
    );

    const response = await openai.chat.completions.create({
      model: MODELS.THEME_DETECTION,
      messages: [
        { role: 'system', content: THEME_DETECTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new ThemeDetectionError(
        'No response from AI',
        'NO_RESPONSE',
      );
    }

    const result = JSON.parse(content) as ThemeDetectionAIResult;

    // Validate and filter the response
    const validatedResult = validateThemeDetectionResult(result, feedbackItems.length);

    console.log(
      `[THEMES] Detected ${validatedResult.themes.length} valid themes`,
    );

    return validatedResult;
  } catch (error) {
    if (error instanceof ThemeDetectionError) {
      throw error;
    }

    console.error('[THEMES] Detection error:', error);
    throw new ThemeDetectionError(
      `Failed to detect themes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DETECTION_FAILED',
    );
  }
}

/**
 * Validate and filter theme detection results
 */
function validateThemeDetectionResult(
  result: ThemeDetectionAIResult,
  itemCount: number,
): ThemeDetectionAIResult {
  if (!result.themes || !Array.isArray(result.themes)) {
    return { themes: [] };
  }

  const validThemes = result.themes.filter((theme) => {
    // Validate required fields
    if (!theme.theme_name || !theme.description) {
      console.warn('[THEMES] Theme missing required fields:', theme);
      return false;
    }

    // Validate item_indices
    if (!Array.isArray(theme.item_indices) || theme.item_indices.length < THEME_DETECTION_CONFIG.minClusterSize) {
      console.warn(
        `[THEMES] Theme "${theme.theme_name}" has insufficient items (${theme.item_indices?.length || 0})`,
      );
      return false;
    }

    // Validate indices are within bounds
    const validIndices = theme.item_indices.filter(
      (idx) => idx >= 0 && idx < itemCount,
    );
    if (validIndices.length !== theme.item_indices.length) {
      console.warn(
        `[THEMES] Theme "${theme.theme_name}" has invalid indices`,
      );
      theme.item_indices = validIndices;
    }

    // Validate confidence
    if (
      typeof theme.confidence !== 'number' ||
      theme.confidence < THEME_DETECTION_CONFIG.minConfidence ||
      theme.confidence > 1
    ) {
      console.warn(
        `[THEMES] Theme "${theme.theme_name}" has invalid confidence: ${theme.confidence}`,
      );
      theme.confidence = Math.max(
        THEME_DETECTION_CONFIG.minConfidence,
        Math.min(1, theme.confidence || 0.5),
      );
    }

    return theme.item_indices.length >= THEME_DETECTION_CONFIG.minClusterSize;
  });

  // Remove duplicate themes (same name)
  const uniqueThemes = validThemes.filter(
    (theme, index, self) =>
      index === self.findIndex((t) => t.theme_name.toLowerCase() === theme.theme_name.toLowerCase()),
  );

  // Limit to configured max themes
  const limitedThemes = uniqueThemes.slice(0, THEME_DETECTION_CONFIG.maxThemesPerBatch);

  return { themes: limitedThemes };
}

/**
 * Detect themes with caching
 * This is the main function to use for theme detection
 */
export const detectThemes = withCache(
  detectThemesInternal,
  'theme-detection',
  // Cache key generator: use first 3 items' IDs
  (items: FeedbackItem[]) => {
    const ids = items.slice(0, 3).map((item) => item.id);
    return `themes-${ids.join('-')}-${items.length}`;
  },
);

/**
 * Detect themes with retry logic
 */
export async function detectThemesWithRetry(
  feedbackItems: FeedbackItem[],
  maxRetries: number = MAX_RETRIES,
): Promise<ThemeDetectionAIResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await detectThemes(feedbackItems);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(
        `[THEMES] Attempt ${attempt + 1}/${maxRetries} failed:`,
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
  throw lastError || new ThemeDetectionError(
    'All retry attempts failed',
    'MAX_RETRIES_EXCEEDED',
  );
}

/**
 * Detect themes from multiple batches of feedback items
 * Processes items in batches to avoid rate limits and token limits
 */
export async function detectThemesBatch(
  feedbackItems: FeedbackItem[],
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<BatchThemeDetectionResult[]> {
  if (feedbackItems.length === 0) {
    return [];
  }

  if (feedbackItems.length < THEME_DETECTION_CONFIG.minClusterSize) {
    console.warn(
      `[THEMES] Not enough items for theme detection (${feedbackItems.length} < ${THEME_DETECTION_CONFIG.minClusterSize})`,
    );
    return [];
  }

  const results: BatchThemeDetectionResult[] = [];
  const totalBatches = Math.ceil(feedbackItems.length / batchSize);

  console.log(
    `[THEMES] Processing ${feedbackItems.length} items in ${totalBatches} batches`,
  );

  for (let i = 0; i < feedbackItems.length; i += batchSize) {
    const batch = feedbackItems.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(
      `[THEMES] Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`,
    );

    try {
      const detection = await detectThemesWithRetry(batch);

      // Adjust indices to be absolute (not relative to batch)
      const adjustedThemes = detection.themes.map((theme) => ({
        ...theme,
        item_indices: theme.item_indices.map((idx) => idx + i),
      }));

      results.push({
        batchNumber,
        totalBatches,
        themes: adjustedThemes,
        itemCount: batch.length,
      });

      console.log(
        `[THEMES] Batch ${batchNumber}/${totalBatches}: Detected ${adjustedThemes.length} themes`,
      );

      // Add a small delay between batches to avoid rate limits
      if (batchNumber < totalBatches) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(
        `[THEMES] Failed to process batch ${batchNumber}/${totalBatches}:`,
        error,
      );

      // Continue with next batch instead of failing completely
      results.push({
        batchNumber,
        totalBatches,
        themes: [],
        itemCount: batch.length,
      });
    }
  }

  return results;
}

/**
 * Get fallback theme for error cases
 */
export function getFallbackTheme(): DetectedTheme {
  return {
    theme_name: 'General Feedback',
    description: 'Miscellaneous feedback items',
    item_indices: [],
    confidence: 0.5,
  };
}

/**
 * Merge themes from multiple batches
 * Combines similar themes across batches
 */
export function mergeThemesAcrossBatches(
  batchResults: BatchThemeDetectionResult[],
): DetectedTheme[] {
  const allThemes: DetectedTheme[] = [];

  // Collect all themes
  for (const batch of batchResults) {
    allThemes.push(...batch.themes);
  }

  if (allThemes.length === 0) {
    return [];
  }

  // Group similar themes by name (case-insensitive)
  const themeGroups = new Map<string, DetectedTheme[]>();

  for (const theme of allThemes) {
    const key = theme.theme_name.toLowerCase();
    const existing = themeGroups.get(key);

    if (existing) {
      existing.push(theme);
    } else {
      themeGroups.set(key, [theme]);
    }
  }

  // Merge groups into single themes
  const mergedThemes: DetectedTheme[] = [];

  for (const [key, group] of themeGroups.entries()) {
    // Use the first theme's name and description
    const firstTheme = group[0];

    // Combine all item indices and remove duplicates
    const allIndices = group.flatMap((t) => t.item_indices);
    const uniqueIndices = Array.from(new Set(allIndices)).sort((a, b) => a - b);

    // Average confidence scores
    const avgConfidence =
      group.reduce((sum, t) => sum + t.confidence, 0) / group.length;

    mergedThemes.push({
      theme_name: firstTheme.theme_name,
      description: firstTheme.description,
      item_indices: uniqueIndices,
      confidence: avgConfidence,
    });
  }

  // Sort by frequency (number of items)
  mergedThemes.sort((a, b) => b.item_indices.length - a.item_indices.length);

  console.log(
    `[THEMES] Merged ${allThemes.length} themes into ${mergedThemes.length} unique themes`,
  );

  return mergedThemes;
}

/**
 * Quick theme suggestion based on keywords (no AI call)
 * Useful for quick filtering or pre-processing
 */
export function suggestThemeQuick(text: string): string[] {
  const lowerText = text.toLowerCase();
  const suggestions: string[] = [];

  const themeKeywords: Record<string, string[]> = {
    'Feature Request': [
      'feature',
      'add',
      'implement',
      'support',
      'would like',
      'wish',
      'need',
    ],
    'Bug Report': [
      'bug',
      'error',
      'crash',
      'broken',
      'issue',
      'problem',
      'not working',
      'fail',
    ],
    'Performance': [
      'slow',
      'performance',
      'speed',
      'lag',
      'loading',
      'timeout',
      'fast',
    ],
    'UI/UX': [
      'ui',
      'ux',
      'design',
      'interface',
      'confusing',
      'difficult',
      'hard to use',
    ],
    'Mobile': ['mobile', 'app', 'ios', 'android', 'phone', 'tablet'],
    'Integration': [
      'integration',
      'connect',
      'sync',
      'import',
      'export',
      'api',
    ],
    'Documentation': ['docs', 'documentation', 'help', 'tutorial', 'guide'],
    'Pricing': ['price', 'pricing', 'cost', 'expensive', 'cheap', 'plan'],
  };

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      suggestions.push(theme);
    }
  }

  return suggestions;
}
