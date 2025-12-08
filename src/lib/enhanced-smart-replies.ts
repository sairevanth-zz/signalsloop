/**
 * Enhanced Smart Replies System for SignalsLoop
 * Provides intelligent, context-aware follow-up questions for feedback posts
 */

import { getOpenAI } from './openai-client';
import { withCache } from './ai-cache-manager';

const MODELS = {
  SMART_REPLIES: process.env.REPLIES_MODEL || 'gpt-4o-mini',
};

// Category-specific question templates
const CATEGORY_QUESTIONS = {
  bug: {
    critical: [
      "🚨 How many users are currently affected and is there any data loss occurring?",
      "What specific steps reproduce this issue 100% of the time?",
      "Is there a workaround available, and if so, how long does it add to the workflow?"
    ],
    standard: [
      "How frequently does this occur (hourly/daily/weekly)?",
      "Which browser/device/OS version are you using?",
      "Can you share a screenshot or video of the issue?"
    ]
  },
  feature: {
    enterprise: [
      "How many team members would use this feature and what's the expected time savings?",
      "What's your current solution and what are its main limitations?",
      "What would be the business impact if this feature was available?"
    ],
    standard: [
      "Can you describe your ideal workflow with this feature?",
      "How critical is this for your day-to-day operations (nice-to-have vs must-have)?",
      "Are there any security or compliance requirements we should consider?"
    ]
  },
  improvement: [
    "How much time would this save you per day/week?",
    "On a scale of 1-10, how much friction does the current implementation cause?",
    "Would this improvement affect your decision to continue using our product?"
  ],
  integration: [
    "Which specific API endpoints or webhooks would you need?",
    "What's your expected data volume and frequency of sync?",
    "Do you have any specific security or authentication requirements?"
  ],
  performance: [
    "What specific actions or pages are slow?",
    "How does this performance issue impact your team's productivity?",
    "Have you noticed any patterns (time of day, specific data sets)?"
  ]
};

interface SmartReplyOptions {
  title: string;
  description: string;
  category?: string;
  userTier?: 'free' | 'pro' | 'enterprise';
  voteCount?: number;
  previousQuestions?: string[];
}

interface SmartReply {
  text: string;
  type: 'follow_up' | 'clarification' | 'details' | 'quantification';
  priority: 'high' | 'medium' | 'low';
  metadata?: {
    expectedResponseType?: 'number' | 'text' | 'boolean' | 'scale';
    category?: string;
  };
}

async function generateSmartRepliesInternal(options: SmartReplyOptions): Promise<SmartReply[]> {
  const {
    title,
    description,
    category = 'general',
    userTier = 'free',
    voteCount = 0,
    previousQuestions = []
  } = options;

  // Determine urgency based on signals
  const isUrgent =
    title.toLowerCase().includes('broken') ||
    title.toLowerCase().includes('critical') ||
    description?.toLowerCase().includes('blocking') ||
    voteCount > 10 ||
    userTier === 'enterprise';

  // Build context-aware prompt
  const systemPrompt = `You are an expert product manager generating insightful follow-up questions for user feedback on a SaaS feedback board.

Context:
- Feedback Category: ${category}
- User Tier: ${userTier}
- Vote Count: ${voteCount}
- Urgency Level: ${isUrgent ? 'High' : 'Normal'}
${previousQuestions.length > 0 ? `- Already Asked: ${previousQuestions.join(', ')}` : ''}

Guidelines:
1. Generate 2-3 highly specific follow-up questions that will help prioritize and implement this feedback
2. Focus on quantifiable impact (time saved, users affected, frequency)
3. Avoid questions that have already been asked
4. For ${userTier} users, ${userTier === 'enterprise' ? 'focus on scale and business impact' : 'focus on individual workflow improvement'}
5. Questions should be empathetic and show we value their input
6. At least one question should aim to quantify the impact

Return ONLY a JSON array with this structure:
[
  {
    "text": "question text",
    "type": "follow_up|clarification|details|quantification",
    "priority": "high|medium|low",
    "metadata": {
      "expectedResponseType": "number|text|boolean|scale",
      "category": "${category}"
    }
  }
]`;

  const userPrompt = `Generate smart follow-up questions for this feedback:

Title: ${title}
Description: ${description || 'No description provided'}

The questions should help us understand the impact, urgency, and implementation requirements.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODELS.SMART_REPLIES,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse response and validate
    let questions: SmartReply[];
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
    } catch {
      // Fallback to template questions if AI fails
      questions = getFallbackQuestions(category, isUrgent, userTier);
    }

    // Ensure we have valid questions
    if (questions.length === 0) {
      questions = getFallbackQuestions(category, isUrgent, userTier);
    }

    return questions.slice(0, 3); // Return max 3 questions

  } catch (error) {
    console.error('Smart replies generation error:', error);
    return getFallbackQuestions(category, isUrgent, userTier);
  }
}

function getFallbackQuestions(
  category: string,
  isUrgent: boolean,
  userTier: string
): SmartReply[] {
  const categoryQuestions = CATEGORY_QUESTIONS[category as keyof typeof CATEGORY_QUESTIONS];

  if (!categoryQuestions) {
    // Generic fallback questions
    return [
      {
        text: "How frequently do you encounter this issue or need?",
        type: 'quantification',
        priority: 'high',
        metadata: { expectedResponseType: 'text', category }
      },
      {
        text: "What impact does this have on your workflow?",
        type: 'follow_up',
        priority: 'medium',
        metadata: { expectedResponseType: 'text', category }
      },
      {
        text: "Are there any specific requirements or constraints we should consider?",
        type: 'details',
        priority: 'low',
        metadata: { expectedResponseType: 'text', category }
      }
    ];
  }

  // Get category-specific questions
  let questions: string[] = [];

  if (category === 'bug' || category === 'feature') {
    const subCategory = (isUrgent || userTier === 'enterprise') ?
      categoryQuestions[userTier === 'enterprise' ? 'enterprise' : 'critical'] || categoryQuestions.standard :
      categoryQuestions.standard;
    questions = Array.isArray(subCategory) ? subCategory : categoryQuestions.standard || [];
  } else {
    questions = categoryQuestions as string[];
  }

  return questions.slice(0, 3).map((text, index) => ({
    text,
    type: index === 0 ? 'quantification' : index === 1 ? 'clarification' : 'details' as any,
    priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low' as any,
    metadata: {
      expectedResponseType: text.includes('how many') || text.includes('scale') ? 'number' : 'text' as any,
      category
    }
  }));
}

// Cache implementation to reduce API calls
const replyCache = new Map<string, { replies: SmartReply[], timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

export async function generateSmartRepliesWithCache(
  options: SmartReplyOptions
): Promise<SmartReply[]> {
  const cacheKey = `${options.title}-${options.category}-${options.userTier}`;

  // Check cache
  const cached = replyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.replies;
  }

  // Generate new replies
  const replies = await generateSmartRepliesInternal(options);

  // Cache the result
  replyCache.set(cacheKey, { replies, timestamp: Date.now() });

  // Clean old cache entries
  if (replyCache.size > 100) {
    const oldestKey = Array.from(replyCache.keys())[0];
    replyCache.delete(oldestKey);
  }

  return replies;
}

// Export cached version using the centralized cache manager
export const generateSmartReplies = withCache(
  generateSmartRepliesInternal,
  'smartReplies',
  (options: SmartReplyOptions) => ({
    title: options.title,
    description: options.description,
    category: options.category,
    userTier: options.userTier,
    voteCount: options.voteCount,
    // Don't include previousQuestions in cache key as it's contextual
  })
);
