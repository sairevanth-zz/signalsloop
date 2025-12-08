/**
 * User Story Generation Service for SignalsLoop
 * AI-powered conversion of themes into sprint-ready user stories with GPT-4
 */

import { getOpenAI } from '@/lib/openai-client';
import { withCache } from '../ai-cache-manager';
import {
  GenerateStoryInput,
  GeneratedStoryResult,
  FeedbackItemForStory,
  AcceptanceCriterion,
  DefinitionOfDoneItem,
  StoryPriority,
  StoryGenerationError,
  GENERATION_MODELS,
  USER_STORY_CONFIG,
} from '@/types/user-stories';
import { Theme } from '@/types/themes';


const MODELS = {
  STORY_GENERATION: process.env.STORY_GENERATION_MODEL || GENERATION_MODELS.GPT4O,
};

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * System prompt for user story generation
 */
const STORY_GENERATION_SYSTEM_PROMPT = `You are an expert product manager and agile coach specializing in writing professional, development-ready user stories.

Your task is to transform feedback themes into well-structured user stories that engineering teams can immediately work on.

USER STORY FORMAT:
Use the standard format: "As a [user type], I want [goal] so that [benefit]"

IMPORTANT RULES:
1. User stories must be SPECIFIC and ACTIONABLE - developers should know exactly what to build
2. Each story must have 3-5 clear, testable acceptance criteria
3. Estimate story points using Fibonacci scale (1, 2, 3, 5, 8, 13, 21) based on complexity, uncertainty, and effort
4. Include technical notes to guide implementation
5. Suggest appropriate labels and priority level
6. Create definition of done checklist items
7. Base everything on the actual feedback data provided - be data-driven

STORY POINT ESTIMATION GUIDE:
- 1 point: Trivial change, < 2 hours (e.g., text change, simple config)
- 2 points: Simple feature, < 4 hours (e.g., add a button, basic validation)
- 3 points: Small feature, < 1 day (e.g., new form field with validation)
- 5 points: Medium feature, 1-2 days (e.g., new dashboard widget, API endpoint)
- 8 points: Large feature, 3-4 days (e.g., complete CRUD feature, complex integration)
- 13 points: Very large feature, 1 week (e.g., major new module, complex workflow)
- 21 points: Epic-level, 2 weeks (consider breaking down into smaller stories)

COMPLEXITY FACTORS (0-1 scale):
- Technical complexity: How difficult is the implementation?
- Uncertainty: How well-defined are the requirements?
- Effort: How much work is required?

ACCEPTANCE CRITERIA GUIDELINES:
- Each criterion must be TESTABLE and SPECIFIC
- Use "Given-When-Then" format when appropriate
- Focus on behavior, not implementation
- Include edge cases and error handling
- Be precise about what "done" looks like

Example GOOD acceptance criteria:
✓ "Given user uploads a file > 10MB, when processing completes, then show success message with file size"
✓ "Search results update within 500ms of keystroke"
✓ "Mobile view adjusts layout for screens < 768px width"

Example BAD acceptance criteria:
✗ "It should work well"
✗ "Users can upload files"
✗ "Make it fast"

PRIORITY LEVELS:
- critical: Blocks users, revenue impact, security issue (P0)
- high: Major pain point, requested by multiple users (P1)
- medium: Nice to have, improves experience (P2)
- low: Minor enhancement, edge case (P3)

LABELS TO CONSIDER:
- Technical: "frontend", "backend", "mobile", "api", "database"
- Category: "performance", "ux", "security", "integration", "bug-fix"
- Platform: "ios", "android", "web", "desktop"
- Team: "design-needed", "requires-research", "breaking-change"

DEFINITION OF DONE:
Include standard checklist items like:
- Code reviewed and approved
- Unit tests written and passing
- Integration tests passing
- Documentation updated
- Accessibility requirements met
- Performance benchmarks met
- Design review completed (if UI changes)

Return ONLY a JSON object with this exact structure:
{
  "title": "Brief, action-oriented title (max 100 chars)",
  "user_type": "Specific user persona (e.g., 'enterprise customer', 'mobile user', 'team admin')",
  "user_goal": "What the user wants to do (I want...)",
  "user_benefit": "Why they want it (so that...)",
  "full_story": "Complete formatted story: As a [user_type], I want [user_goal] so that [user_benefit].",
  "acceptance_criteria": [
    {
      "id": "ac-1",
      "text": "Main acceptance criterion",
      "details": ["Specific detail 1", "Specific detail 2"]
    }
  ],
  "suggested_story_points": 5,
  "complexity_score": 0.6,
  "uncertainty_score": 0.4,
  "effort_score": 0.7,
  "estimation_reasoning": "Detailed explanation of the story point estimate and complexity scores",
  "suggested_labels": ["frontend", "performance", "high-priority"],
  "technical_notes": "Implementation guidance, architectural considerations, dependencies, risks",
  "definition_of_done": [
    {
      "id": "dod-1",
      "text": "Specific completion criterion"
    }
  ],
  "priority_level": "high"
}

QUALITY CHECKLIST before returning:
✓ Is the user story specific and actionable?
✓ Are acceptance criteria testable and clear?
✓ Is the story point estimate justified?
✓ Are technical notes helpful for developers?
✓ Does priority match the business impact?
✓ Is this truly sprint-ready?`;

/**
 * Format theme and feedback for AI analysis
 */
function formatThemeForAI(
  theme: Theme,
  feedbackItems: FeedbackItemForStory[],
  projectContext?: string
): string {
  let prompt = `THEME TO CONVERT:
Name: ${theme.theme_name}
Description: ${theme.description}
Frequency: ${theme.frequency} occurrences
Average Sentiment: ${theme.avg_sentiment.toFixed(2)} (-1 to +1 scale)
First Seen: ${theme.first_seen}
Last Seen: ${theme.last_seen}
${theme.is_emerging ? '⚠️ This is an EMERGING theme (growing rapidly)' : ''}
`;

  if (projectContext) {
    prompt += `\nPROJECT CONTEXT:
${projectContext}
`;
  }

  prompt += `\nSUPPORTING FEEDBACK (${feedbackItems.length} items):
`;

  feedbackItems.forEach((item, index) => {
    prompt += `\n[${index + 1}] `;
    if (item.title) {
      prompt += `${item.title}\n    `;
    }
    prompt += `${item.content}`;

    if (item.sentiment_score !== undefined) {
      const sentiment = item.sentiment_score > 0.3 ? '😊 Positive' :
                        item.sentiment_score < -0.3 ? '😞 Negative' :
                        '😐 Neutral';
      prompt += `\n    Sentiment: ${sentiment} (${item.sentiment_score.toFixed(2)})`;
    }

    if (item.classification) {
      prompt += `\n    Type: ${item.classification}`;
    }

    if (item.author_username) {
      prompt += `\n    From: ${item.author_username}`;
    }

    prompt += `\n    Date: ${new Date(item.created_at).toLocaleDateString()}`;
    prompt += '\n';
  });

  return prompt;
}

/**
 * Create user prompt for story generation
 */
function createUserPrompt(
  theme: Theme,
  feedbackItems: FeedbackItemForStory[],
  projectContext?: string,
  customInstructions?: string
): string {
  let prompt = formatThemeForAI(theme, feedbackItems, projectContext);

  prompt += `\n\nYOUR TASK:
Create ONE well-structured, sprint-ready user story that addresses this theme.

Requirements:
- Synthesize the feedback into a clear, actionable user story
- Write ${USER_STORY_CONFIG.minAcceptanceCriteria}-${USER_STORY_CONFIG.maxAcceptanceCriteria} specific acceptance criteria
- Provide accurate story point estimate (1, 2, 3, 5, 8, 13, or 21)
- Include helpful technical notes for the development team
- Set appropriate priority based on feedback volume, sentiment, and business impact
- Suggest relevant labels
- Create definition of done checklist

`;

  if (customInstructions) {
    prompt += `\nADDITIONAL INSTRUCTIONS:
${customInstructions}
`;
  }

  prompt += `\nGenerate the user story now in the specified JSON format.`;

  return prompt;
}

/**
 * Generate user story from theme
 * Internal function without caching
 */
async function generateUserStoryInternal(
  input: GenerateStoryInput
): Promise<GeneratedStoryResult> {
  const { theme, feedbackItems, projectContext, customInstructions } = input;

  if (feedbackItems.length === 0) {
    throw new StoryGenerationError(
      'No feedback items provided for story generation',
      'INSUFFICIENT_DATA',
      theme.id
    );
  }

  const userPrompt = createUserPrompt(
    theme,
    feedbackItems,
    projectContext,
    customInstructions
  );

  try {
    console.log(
      `[USER-STORIES] Generating story for theme: ${theme.theme_name} (${feedbackItems.length} feedback items)...`
    );

    const response = await getOpenAI().chat.completions.create({
      model: MODELS.STORY_GENERATION,
      messages: [
        { role: 'system', content: STORY_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4, // Slightly higher for creativity but still focused
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new StoryGenerationError(
        'No response from AI',
        'NO_RESPONSE',
        theme.id
      );
    }

    const result = JSON.parse(content) as GeneratedStoryResult;

    // Validate and enhance the result
    const validatedResult = validateAndEnhanceStoryResult(result, theme, feedbackItems);

    console.log(
      `[USER-STORIES] Successfully generated story: "${validatedResult.title}" (${validatedResult.suggested_story_points} points)`
    );

    return validatedResult;
  } catch (error) {
    if (error instanceof StoryGenerationError) {
      throw error;
    }

    console.error('[USER-STORIES] Generation error:', error);
    throw new StoryGenerationError(
      `Failed to generate user story: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GENERATION_FAILED',
      theme.id,
      { error }
    );
  }
}

/**
 * Validate and enhance the generated story result
 */
function validateAndEnhanceStoryResult(
  result: GeneratedStoryResult,
  theme: Theme,
  feedbackItems: FeedbackItemForStory[]
): GeneratedStoryResult {
  // Validate required fields
  if (!result.title || !result.user_type || !result.user_goal || !result.user_benefit) {
    throw new StoryGenerationError(
      'Generated story missing required fields',
      'INVALID_STORY',
      theme.id
    );
  }

  // Validate title length
  if (result.title.length > USER_STORY_CONFIG.maxTitleLength) {
    result.title = result.title.substring(0, USER_STORY_CONFIG.maxTitleLength - 3) + '...';
  }

  // Ensure full_story is properly formatted
  result.full_story = `As a ${result.user_type}, I want ${result.user_goal} so that ${result.user_benefit}.`;

  // Validate acceptance criteria
  if (!Array.isArray(result.acceptance_criteria) || result.acceptance_criteria.length < USER_STORY_CONFIG.minAcceptanceCriteria) {
    console.warn(
      `[USER-STORIES] Insufficient acceptance criteria (${result.acceptance_criteria?.length || 0}), using fallback`
    );
    result.acceptance_criteria = generateFallbackAcceptanceCriteria(theme);
  }

  // Ensure each AC has proper structure
  result.acceptance_criteria = result.acceptance_criteria.map((ac, index) => ({
    id: ac.id || `ac-${index + 1}`,
    text: ac.text || 'Acceptance criterion',
    details: Array.isArray(ac.details) ? ac.details : [],
  }));

  // Validate story points (must be Fibonacci: 1, 2, 3, 5, 8, 13, 21)
  const validStoryPoints = [1, 2, 3, 5, 8, 13, 21];
  if (!validStoryPoints.includes(result.suggested_story_points)) {
    // Find closest valid value
    result.suggested_story_points = validStoryPoints.reduce((prev, curr) =>
      Math.abs(curr - result.suggested_story_points) < Math.abs(prev - result.suggested_story_points)
        ? curr
        : prev
    );
  }

  // Validate complexity scores (0-1)
  result.complexity_score = Math.max(0, Math.min(1, result.complexity_score || 0.5));
  result.uncertainty_score = Math.max(0, Math.min(1, result.uncertainty_score || 0.5));
  result.effort_score = Math.max(0, Math.min(1, result.effort_score || 0.5));

  // Validate priority level
  const validPriorities: StoryPriority[] = ['critical', 'high', 'medium', 'low'];
  if (!validPriorities.includes(result.priority_level)) {
    // Determine priority based on theme data
    result.priority_level = determinePriorityFromTheme(theme, feedbackItems);
  }

  // Ensure labels is an array
  if (!Array.isArray(result.suggested_labels)) {
    result.suggested_labels = [];
  }

  // Ensure definition of done exists
  if (!Array.isArray(result.definition_of_done) || result.definition_of_done.length === 0) {
    result.definition_of_done = generateDefaultDefinitionOfDone();
  }

  // Ensure each DOD item has proper structure
  result.definition_of_done = result.definition_of_done.map((dod, index) => ({
    id: dod.id || `dod-${index + 1}`,
    text: dod.text || 'Completion criterion',
  }));

  // Ensure estimation_reasoning exists
  if (!result.estimation_reasoning) {
    result.estimation_reasoning = `Estimated ${result.suggested_story_points} points based on complexity (${result.complexity_score.toFixed(2)}), uncertainty (${result.uncertainty_score.toFixed(2)}), and effort (${result.effort_score.toFixed(2)}).`;
  }

  // Ensure technical_notes exists
  if (!result.technical_notes) {
    result.technical_notes = 'Implementation details to be determined during sprint planning.';
  }

  return result;
}

/**
 * Generate fallback acceptance criteria
 */
function generateFallbackAcceptanceCriteria(theme: Theme): AcceptanceCriterion[] {
  return [
    {
      id: 'ac-1',
      text: `Implement ${theme.theme_name} functionality`,
      details: ['Meets user requirements from feedback', 'Works across all supported platforms'],
    },
    {
      id: 'ac-2',
      text: 'Testing and quality assurance',
      details: ['Unit tests pass', 'Integration tests pass', 'Manual testing completed'],
    },
    {
      id: 'ac-3',
      text: 'User experience validation',
      details: ['UI matches design requirements', 'Responsive on all devices', 'Accessible to all users'],
    },
  ];
}

/**
 * Generate default definition of done
 */
function generateDefaultDefinitionOfDone(): DefinitionOfDoneItem[] {
  return [
    { id: 'dod-1', text: 'Code reviewed and approved' },
    { id: 'dod-2', text: 'Unit tests written and passing' },
    { id: 'dod-3', text: 'Integration tests passing' },
    { id: 'dod-4', text: 'Documentation updated' },
    { id: 'dod-5', text: 'Deployed to staging environment' },
    { id: 'dod-6', text: 'Product owner acceptance' },
  ];
}

/**
 * Determine priority from theme data
 */
function determinePriorityFromTheme(
  theme: Theme,
  feedbackItems: FeedbackItemForStory[]
): StoryPriority {
  const frequency = theme.frequency;
  const sentiment = theme.avg_sentiment;
  const isEmerging = theme.is_emerging;

  // Critical: High frequency + negative sentiment OR emerging with very negative sentiment
  if ((frequency > 50 && sentiment < -0.5) || (isEmerging && sentiment < -0.7)) {
    return 'critical';
  }

  // High: High frequency OR emerging OR very negative sentiment
  if (frequency > 30 || isEmerging || sentiment < -0.5) {
    return 'high';
  }

  // Low: Low frequency + neutral/positive sentiment
  if (frequency < 10 && sentiment > 0) {
    return 'low';
  }

  // Default to medium
  return 'medium';
}

/**
 * Generate user story with caching
 */
export const generateUserStory = withCache(
  generateUserStoryInternal,
  'user-story-generation',
  // Cache key generator
  (input: GenerateStoryInput) => {
    return `story-${input.theme.id}-${input.feedbackItems.length}-${input.template?.id || 'no-template'}`;
  }
);

/**
 * Generate user story with retry logic
 */
export async function generateUserStoryWithRetry(
  input: GenerateStoryInput,
  maxRetries: number = MAX_RETRIES
): Promise<GeneratedStoryResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateUserStory(input);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(
        `[USER-STORIES] Attempt ${attempt + 1}/${maxRetries} failed:`,
        lastError.message
      );

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastError || new StoryGenerationError(
    'All retry attempts failed',
    'MAX_RETRIES_EXCEEDED',
    input.theme.id
  );
}

/**
 * Generate multiple user stories from multiple themes
 */
export async function generateUserStoriesBatch(
  inputs: GenerateStoryInput[],
  delayBetweenMs: number = 1000
): Promise<Array<{ themeId: string; result?: GeneratedStoryResult; error?: Error }>> {
  const results: Array<{ themeId: string; result?: GeneratedStoryResult; error?: Error }> = [];

  console.log(`[USER-STORIES] Generating ${inputs.length} user stories in batch...`);

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    console.log(
      `[USER-STORIES] Processing ${i + 1}/${inputs.length}: ${input.theme.theme_name}`
    );

    try {
      const result = await generateUserStoryWithRetry(input);
      results.push({ themeId: input.theme.id, result });

      console.log(
        `[USER-STORIES] ✓ Generated story ${i + 1}/${inputs.length}: "${result.title}"`
      );
    } catch (error) {
      console.error(
        `[USER-STORIES] ✗ Failed to generate story ${i + 1}/${inputs.length}:`,
        error
      );
      results.push({
        themeId: input.theme.id,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
    }

    // Add delay between requests to avoid rate limits
    if (i < inputs.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
    }
  }

  const successCount = results.filter((r) => r.result).length;
  console.log(
    `[USER-STORIES] Batch complete: ${successCount}/${inputs.length} stories generated successfully`
  );

  return results;
}

/**
 * Apply template to story generation
 */
export function applyTemplateToStory(
  generatedStory: GeneratedStoryResult,
  templateValues: Record<string, string>
): GeneratedStoryResult {
  // Replace placeholders in user_type, user_goal, user_benefit
  let userType = generatedStory.user_type;
  let userGoal = generatedStory.user_goal;
  let userBenefit = generatedStory.user_benefit;

  for (const [key, value] of Object.entries(templateValues)) {
    const placeholder = `{{${key}}}`;
    userType = userType.replace(new RegExp(placeholder, 'g'), value);
    userGoal = userGoal.replace(new RegExp(placeholder, 'g'), value);
    userBenefit = userBenefit.replace(new RegExp(placeholder, 'g'), value);
  }

  return {
    ...generatedStory,
    user_type: userType,
    user_goal: userGoal,
    user_benefit: userBenefit,
    full_story: `As a ${userType}, I want ${userGoal} so that ${userBenefit}.`,
  };
}

/**
 * Validate story before saving
 */
export function validateStory(story: GeneratedStoryResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!story.title || story.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!story.user_type || story.user_type.trim().length === 0) {
    errors.push('User type is required');
  }

  if (!story.user_goal || story.user_goal.trim().length === 0) {
    errors.push('User goal is required');
  }

  if (!story.user_benefit || story.user_benefit.trim().length === 0) {
    errors.push('User benefit is required');
  }

  if (!story.acceptance_criteria || story.acceptance_criteria.length < USER_STORY_CONFIG.minAcceptanceCriteria) {
    errors.push(`At least ${USER_STORY_CONFIG.minAcceptanceCriteria} acceptance criteria required`);
  }

  const validStoryPoints = [1, 2, 3, 5, 8, 13, 21];
  if (!validStoryPoints.includes(story.suggested_story_points)) {
    errors.push('Invalid story points value (must be 1, 2, 3, 5, 8, 13, or 21)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
