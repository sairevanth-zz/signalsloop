/**
 * Centralized AI Prompts Configuration
 *
 * This file contains all AI prompts used across the application.
 * Edit these prompts to customize AI behavior throughout the app.
 */

// ============================================================================
// WRITING ASSISTANT PROMPTS
// ============================================================================

export const WRITING_ASSISTANT_SYSTEM_PROMPT = (context: string, action: string) => `You are a helpful writing assistant that helps users articulate their thoughts better. Your role is to:
1. Preserve the user's original voice and intent
2. Enhance clarity, structure, and flow
3. Keep it authentic - not robotic or overly formal (unless professional tone is requested)
4. Return ONLY the improved text, no explanations or meta-commentary
5. Keep it concise - similar length unless expansion is specifically requested

Context (what they're responding to): "${context}"

${action}`;

export const WRITING_ASSISTANT_ACTIONS = {
  improve: `Improve the following text to make it clearer, more concise, and better structured. Keep the user's original voice and intent, but enhance readability and flow. Don't make it overly formal unless needed.`,

  expand: `Take the following brief text and expand it with more details, examples, or context. Help the user express their ideas more completely while maintaining their original intent and tone.`,

  clarify: `Rewrite the following text to be clearer and more specific. Remove ambiguity, organize thoughts better, and make the message easier to understand. Keep the user's voice.`,

  professional: `Rewrite the following text in a more professional and polished tone, suitable for business communication. Keep the core message but enhance professionalism and clarity.`
};

export const WRITING_ASSISTANT_USER_PROMPT = (text: string) => `Original text to improve:
"${text}"

Provide the improved version directly, no explanations.`;

// ============================================================================
// SMART REPLIES (FOLLOW-UP QUESTIONS) PROMPTS
// ============================================================================

export const SMART_REPLIES_SYSTEM_PROMPT = `You are an AI assistant that generates helpful follow-up questions for user feedback posts. Your goal is to help collect more detailed information from users to improve their feedback.

Guidelines:
1. Generate 2-3 thoughtful follow-up questions
2. Questions should be specific and actionable
3. Avoid generic questions like "Can you provide more details?"
4. Focus on gathering information that would help prioritize and implement the feedback
5. Be friendly and professional
6. Consider the post content when crafting questions

Reply types:
- "follow_up": General follow-up questions
- "clarification": Questions seeking clarification on specific points
- "details": Questions asking for more technical or specific details

Return your response as a JSON array of objects with "text" and "type" fields.`;

export const SMART_REPLIES_USER_PROMPT = (title: string, description: string) => `Post Title: ${title}
Post Description: ${description || 'No description provided'}

Generate 2-3 smart follow-up questions for this feedback post.`;

export const SMART_REPLIES_FALLBACK = [
  {
    text: "Could you provide more specific examples of how this would work in your use case?",
    type: "clarification"
  },
  {
    text: "What would be the expected outcome or benefit if this feature was implemented?",
    type: "follow_up"
  },
  {
    text: "Are there any specific requirements or constraints we should consider?",
    type: "details"
  }
];

// ============================================================================
// AI CATEGORIZATION PROMPTS
// ============================================================================

export const CATEGORIZATION_SYSTEM_PROMPT = `You are an expert at categorizing user feedback. Always respond with valid JSON only.`;

export const CATEGORIZATION_USER_PROMPT = (content: string) => `You are an expert at categorizing user feedback for software products.
Analyze the following feedback and categorize it into one of these categories:

- Bug: Reports of broken functionality, errors, or unexpected behavior
- Feature Request: Requests for new features or functionality
- Improvement: Suggestions to enhance existing features
- UI/UX: Issues or suggestions related to user interface or user experience
- Integration: Requests or issues related to third-party integrations
- Performance: Issues or suggestions related to speed, efficiency, or resource usage
- Documentation: Requests for better documentation or help content
- Other: Anything that doesn't fit the above categories

Feedback to categorize:
"${content}"

Respond with a JSON object containing:
- "category": one of the categories above
- "confidence": a number between 0 and 1 indicating your confidence
- "reasoning": a brief explanation of why you chose this category

Only respond with the JSON object, no additional text.`;

export const CATEGORY_DESCRIPTIONS = {
  'Bug': 'Reports of broken functionality, errors, or unexpected behavior',
  'Feature Request': 'Requests for new features or functionality',
  'Improvement': 'Suggestions to enhance existing features',
  'UI/UX': 'Issues or suggestions related to user interface or user experience',
  'Integration': 'Requests or issues related to third-party integrations',
  'Performance': 'Issues or suggestions related to speed, efficiency, or resource usage',
  'Documentation': 'Requests for better documentation or help content',
  'Other': 'Anything that doesn\'t fit the above categories'
};

// ============================================================================
// DUPLICATE DETECTION PROMPTS
// ============================================================================

export const DUPLICATE_DETECTION_SIMILARITY_PROMPT = (post1: any, post2: any) => `Analyze these two feedback posts and explain why they might be similar or duplicates:

Post 1: "${post1.title}"
Description: "${post1.description}"

Post 2: "${post2.title}"
Description: "${post2.description}"

Provide a brief reason for the similarity (max 100 characters):`;

export const DUPLICATE_DETECTION_CONFIG = {
  EMBEDDING_MODEL: 'text-embedding-3-small',
  SIMILARITY_THRESHOLD: 0.75, // 75% similarity threshold
  MAX_TOKENS: 100,
  TEMPERATURE: 0.3,
} as const;

// ============================================================================
// PRIORITY SCORING PROMPTS
// ============================================================================

export const PRIORITY_SCORING_PROMPT = (post: any, engagement: any) => `Analyze this feedback post and provide priority scoring:

Title: "${post.title}"
Description: "${post.description}"
Vote Count: ${engagement.voteCount}
Comment Count: ${engagement.commentCount}
Author: ${post.author_name || 'Anonymous'}

Please analyze:
1. Urgency level (0-10): How urgent is this request?
2. Impact level (0-10): How much impact would implementing this have?
3. Brief reasoning (max 100 chars): Why this score?

Respond in JSON format:
{
  "urgencyScore": number,
  "impactScore": number,
  "reasoning": "string"
}`;

export const PRIORITY_SCORING_CONFIG = {
  URGENCY_KEYWORDS: [
    'critical', 'urgent', 'emergency', 'broken', 'not working', 'error',
    'bug', 'crash', 'down', 'failed', 'issue', 'problem', 'fix',
    'asap', 'immediately', 'priority', 'important', 'blocking'
  ],
  IMPACT_KEYWORDS: [
    'all users', 'everyone', 'affects many', 'widespread', 'major',
    'significant', 'revenue', 'business', 'customer', 'user experience',
    'performance', 'scalability', 'security', 'data loss', 'privacy'
  ],
  WEIGHTS: {
    URGENCY: 0.3,
    IMPACT: 0.3,
    ENGAGEMENT: 0.4,
  },
  PRIORITY_LEVELS: {
    CRITICAL: 9,
    HIGH: 7,
    MEDIUM: 5,
    LOW: 3,
  },
  MAX_VOTES_NORMALIZATION: 100,
  MAX_COMMENTS_NORMALIZATION: 20,
} as const;

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export const AI_MODELS = {
  WRITING_ASSISTANT: 'gpt-4o-mini',
  SMART_REPLIES: 'gpt-4o-mini',
  CATEGORIZATION: process.env.OPENAI_MODEL || 'gpt-4',
  DUPLICATE_DETECTION: 'gpt-3.5-turbo', // For similarity analysis
  DUPLICATE_EMBEDDING: 'text-embedding-3-small', // For embeddings
  PRIORITY_SCORING: 'gpt-3.5-turbo',
  CALL_ANALYSIS: 'gpt-4o', // Call intelligence analysis
} as const;

// ============================================================================
// TEMPERATURE SETTINGS
// ============================================================================

export const AI_TEMPERATURES = {
  WRITING_ASSISTANT: 0.7,
  SMART_REPLIES: 0.7,
  CATEGORIZATION: 0.3, // Lower for more consistent categorization
  DUPLICATE_DETECTION: 0.3, // Lower for more consistent similarity analysis
  PRIORITY_SCORING: 0.3, // Lower for more consistent priority scoring
  CALL_ANALYSIS: 0.3, // Lower for consistent call analysis
} as const;

// ============================================================================
// MAX TOKENS SETTINGS
// ============================================================================

export const AI_MAX_TOKENS = {
  WRITING_ASSISTANT: 300,
  SMART_REPLIES: 500,
  CATEGORIZATION: 200,
  DUPLICATE_DETECTION: 100, // Brief similarity reason
  PRIORITY_SCORING: 200, // JSON response with scores and reasoning
  CALL_ANALYSIS: 2000, // Comprehensive call analysis
} as const;

// ============================================================================
// CALL INTELLIGENCE PROMPTS
// ============================================================================

export const CALL_ANALYSIS_SYSTEM_PROMPT = `You are an expert customer call analyst specializing in B2B SaaS sales and customer success. Your role is to analyze call transcripts and extract actionable insights including:

1. Feature requests and product feedback
2. Customer objections and concerns
3. Competitor mentions and competitive intelligence
4. Expansion/upsell signals
5. Churn risk indicators
6. Overall sentiment and tone
7. Key moments and highlights

Provide structured, actionable insights that product and sales teams can use immediately.`;

export const CALL_ANALYSIS_USER_PROMPT = (
  transcript: string,
  customer?: string,
  amount?: number,
  stage?: string
) => {
  const context = [
    customer && `Customer: ${customer}`,
    amount && `Deal Amount: $${amount}`,
    stage && `Stage: ${stage}`
  ].filter(Boolean).join('\n');

  return `${context ? context + '\n\n' : ''}Analyze this customer call transcript and provide detailed insights:

TRANSCRIPT:
${transcript}

Please provide a JSON response with the following structure:
{
  "highlight_summary": "3-bullet summary of key moments (max 200 words)",
  "sentiment": number between -1 (very negative) and 1 (very positive),
  "priority_score": number from 1-100 based on urgency and impact,
  "feature_requests": [
    {
      "title": "Short feature name",
      "description": "What they want and why",
      "priority": "high" | "medium" | "low",
      "arr_impact": estimated dollar impact if known,
      "timestamp_hint": "relevant quote or context"
    }
  ],
  "objections": [
    {
      "type": "pricing" | "features" | "technical" | "competition" | "timing" | "other",
      "description": "What the objection was",
      "severity": "high" | "medium" | "low",
      "context": "relevant quote"
    }
  ],
  "competitors": [
    {
      "name": "Competitor name",
      "context": "How they were mentioned",
      "sentiment": "positive" | "neutral" | "negative"
    }
  ],
  "expansion_signals": {
    "score": number from 0-100,
    "indicators": ["list of expansion signals detected"],
    "reasoning": "why this score"
  },
  "churn_signals": {
    "score": number from 0-100,
    "indicators": ["list of churn risk signals detected"],
    "reasoning": "why this score"
  },
  "key_themes": ["theme1", "theme2", "theme3"]
}

Return only valid JSON, no additional text.`;
};

export const CALL_SUMMARY_PROMPT = (highlights: string[]) => `Generate a concise executive summary (max 500 words) for these call highlights:

${highlights.map((h, i) => `Call ${i + 1}:\n${h}`).join('\n\n')}

Focus on:
- Top feature requests and their business impact
- Critical objections that need addressing
- Competitive insights
- Revenue opportunities and risks
- Recommended actions

Format as markdown with clear sections.`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get AI configuration for a specific feature
 */
export function getAIConfig(feature: keyof typeof AI_MODELS) {
  return {
    model: AI_MODELS[feature],
    temperature: AI_TEMPERATURES[feature],
    maxTokens: AI_MAX_TOKENS[feature],
  };
}

/**
 * Validate AI response is not empty
 */
export function validateAIResponse(response: string | null | undefined): string {
  if (!response) {
    throw new Error('No response from AI');
  }
  return response.trim();
}

/**
 * Remove quotes from AI response if wrapped
 */
export function cleanAIResponse(response: string): string {
  return response.replace(/^["']|["']$/g, '');
}

/**
 * Calculate priority score from urgency, impact, and engagement metrics
 */
export function calculatePriorityScore(
  urgencyScore: number,
  impactScore: number,
  voteCount: number,
  commentCount: number,
  maxVotes: number = PRIORITY_SCORING_CONFIG.MAX_VOTES_NORMALIZATION
): number {
  const { WEIGHTS, MAX_COMMENTS_NORMALIZATION } = PRIORITY_SCORING_CONFIG;

  // Normalize engagement metrics
  const normalizedVotes = Math.min(voteCount / maxVotes, 1);
  const normalizedComments = Math.min(commentCount / MAX_COMMENTS_NORMALIZATION, 1);
  const engagementScore = (normalizedVotes * 0.7 + normalizedComments * 0.3) * 10;

  // Calculate final score
  const finalScore = (
    urgencyScore * WEIGHTS.URGENCY +
    impactScore * WEIGHTS.IMPACT +
    engagementScore * WEIGHTS.ENGAGEMENT
  );

  return Math.round(finalScore * 10) / 10; // Round to 1 decimal place
}

/**
 * Get priority level from score
 */
export function getPriorityLevel(score: number): string {
  const { PRIORITY_LEVELS } = PRIORITY_SCORING_CONFIG;

  if (score >= PRIORITY_LEVELS.CRITICAL) return 'Critical';
  if (score >= PRIORITY_LEVELS.HIGH) return 'High';
  if (score >= PRIORITY_LEVELS.MEDIUM) return 'Medium';
  if (score >= PRIORITY_LEVELS.LOW) return 'Low';
  return 'Very Low';
}

/**
 * Calculate cosine similarity between two vectors (for embeddings)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}
