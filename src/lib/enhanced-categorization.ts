/**
 * Enhanced AI Categorization System for SignalsLoop
 * Provides intelligent categorization with business context
 */

import OpenAI from 'openai';
import { withCache } from './ai-cache-manager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODELS = {
  CATEGORIZATION: process.env.CATEGORIZATION_MODEL || 'gpt-4o-mini',
};

export const SAAS_CATEGORIES = {
  'Critical Bug': {
    description: 'System crashes, data loss, security vulnerabilities',
    keywords: ['crash', 'data loss', 'security', 'vulnerability', 'down', 'broken completely'],
    urgency: 'critical',
    color: '#dc2626' // red-600
  },
  'Bug': {
    description: 'Functionality not working as expected',
    keywords: ['error', 'not working', 'bug', 'issue', 'problem', 'fails'],
    urgency: 'high',
    color: '#ef4444' // red-500
  },
  'Feature Request': {
    description: 'Completely new functionality',
    keywords: ['add', 'new feature', 'would like', 'request', 'need', 'want'],
    urgency: 'medium',
    color: '#3b82f6' // blue-500
  },
  'Enhancement': {
    description: 'Improvements to existing features',
    keywords: ['improve', 'enhance', 'better', 'optimize', 'update'],
    urgency: 'medium',
    color: '#8b5cf6' // violet-500
  },
  'UI/UX': {
    description: 'Interface and usability issues',
    keywords: ['ui', 'ux', 'design', 'interface', 'usability', 'confusing', 'layout'],
    urgency: 'low',
    color: '#ec4899' // pink-500
  },
  'Performance': {
    description: 'Speed and resource usage issues',
    keywords: ['slow', 'performance', 'speed', 'loading', 'memory', 'cpu'],
    urgency: 'high',
    color: '#f59e0b' // amber-500
  },
  'Integration': {
    description: 'Third-party connections and APIs',
    keywords: ['api', 'integration', 'webhook', 'connect', 'sync', 'import', 'export'],
    urgency: 'medium',
    color: '#10b981' // emerald-500
  },
  'Documentation': {
    description: 'Help content and guides',
    keywords: ['docs', 'documentation', 'guide', 'tutorial', 'help', 'explain'],
    urgency: 'low',
    color: '#6b7280' // gray-500
  },
  'Billing/Pricing': {
    description: 'Payment and subscription issues',
    keywords: ['payment', 'billing', 'price', 'subscription', 'charge', 'invoice'],
    urgency: 'high',
    color: '#14b8a6' // teal-500
  },
  'Security/Compliance': {
    description: 'Data privacy and compliance requirements',
    keywords: ['security', 'privacy', 'gdpr', 'compliance', 'encryption', 'authentication'],
    urgency: 'critical',
    color: '#991b1b' // red-800
  }
} as const;

export interface CategorizationResult {
  primaryCategory: keyof typeof SAAS_CATEGORIES;
  secondaryCategories: (keyof typeof SAAS_CATEGORIES)[];
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  userSegment: 'enterprise' | 'smb' | 'individual' | 'developer';
  estimatedComplexity: 'trivial' | 'small' | 'medium' | 'large';
  revenueImpact: boolean;
  confidence: number;
  keywords: string[];
  reasoning: string;
  suggestedTags: string[];
  autoResponse?: string;
}

// Internal function without caching
async function categorizePostInternal(
  title: string,
  description: string = '',
  additionalContext?: {
    authorEmail?: string;
    voteCount?: number;
    userTier?: string;
  }
): Promise<CategorizationResult> {
  // Quick keyword-based pre-categorization for common cases
  const quickCategory = performQuickCategorization(title + ' ' + description);

  // If high confidence quick categorization, return immediately to save API call
  if (quickCategory && quickCategory.confidence > 0.9) {
    console.log('[CATEGORIZATION] Quick categorization used - no API call');
    return quickCategory;
  }

  const systemPrompt = `You are an expert at categorizing SaaS product feedback with deep understanding of software development and business priorities.

Categories and their definitions:
${Object.entries(SAAS_CATEGORIES).map(([cat, info]) =>
  `- ${cat}: ${info.description} (Keywords: ${info.keywords.join(', ')})`
).join('\n')}

Analyze the feedback considering:
1. Technical implications and development effort
2. Business impact and revenue implications
3. User segment affected
4. Urgency based on language and context
5. Potential for automation or self-service

${additionalContext?.userTier === 'enterprise' ? 'Note: This is from an ENTERPRISE customer - prioritize accordingly.' : ''}
${additionalContext?.voteCount && additionalContext.voteCount > 5 ? `Note: This has ${additionalContext.voteCount} votes already - likely affects multiple users.` : ''}

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "primaryCategory": "exact category name from the list",
  "secondaryCategories": ["up to 2 secondary categories"],
  "urgencyLevel": "critical|high|medium|low",
  "userSegment": "enterprise|smb|individual|developer",
  "estimatedComplexity": "trivial|small|medium|large",
  "revenueImpact": true or false,
  "confidence": 0.0 to 1.0,
  "keywords": ["key", "extracted", "terms"],
  "reasoning": "one sentence explanation",
  "suggestedTags": ["relevant", "tags"],
  "autoResponse": "optional suggested auto-response if appropriate"
}`;

  const userPrompt = `Categorize this feedback:
Title: ${title}
Description: ${description}
${additionalContext?.authorEmail ? `From: ${additionalContext.authorEmail}` : ''}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.CATEGORIZATION,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 250,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content) as CategorizationResult;

    // Validate and clean the result
    result.primaryCategory = validateCategory(result.primaryCategory);
    result.secondaryCategories = result.secondaryCategories
      ?.map(cat => validateCategory(cat))
      .filter(cat => cat !== result.primaryCategory)
      .slice(0, 2) || [];

    // Add color coding for UI
    (result as any).color = SAAS_CATEGORIES[result.primaryCategory].color;

    return result;

  } catch (error) {
    console.error('Categorization error:', error);
    return getFallbackCategorization(title, description);
  }
}

function validateCategory(category: string): keyof typeof SAAS_CATEGORIES {
  // Ensure the category exists in our defined categories
  if (category in SAAS_CATEGORIES) {
    return category as keyof typeof SAAS_CATEGORIES;
  }

  // Fuzzy match for slight variations
  const normalizedCat = category.toLowerCase().replace(/[^a-z]/g, '');
  for (const [key] of Object.entries(SAAS_CATEGORIES)) {
    if (key.toLowerCase().replace(/[^a-z]/g, '').includes(normalizedCat)) {
      return key as keyof typeof SAAS_CATEGORIES;
    }
  }

  return 'Feature Request'; // Default fallback
}

function performQuickCategorization(text: string): CategorizationResult | null {
  const lowerText = text.toLowerCase();

  // Critical bug detection
  if (
    lowerText.includes('data loss') ||
    lowerText.includes('security vulnerability') ||
    lowerText.includes('system crash') ||
    lowerText.includes('completely broken')
  ) {
    return {
      primaryCategory: 'Critical Bug',
      secondaryCategories: [],
      urgencyLevel: 'critical',
      userSegment: 'enterprise',
      estimatedComplexity: 'large',
      revenueImpact: true,
      confidence: 0.95,
      keywords: extractKeywords(text),
      reasoning: 'Critical issue detected based on keywords',
      suggestedTags: ['urgent', 'critical', 'bug']
    };
  }

  // Billing issues
  if (
    lowerText.includes('payment failed') ||
    lowerText.includes('cannot subscribe') ||
    lowerText.includes('billing error')
  ) {
    return {
      primaryCategory: 'Billing/Pricing',
      secondaryCategories: [],
      urgencyLevel: 'high',
      userSegment: 'enterprise',
      estimatedComplexity: 'small',
      revenueImpact: true,
      confidence: 0.92,
      keywords: extractKeywords(text),
      reasoning: 'Payment/billing issue requiring immediate attention',
      suggestedTags: ['billing', 'urgent', 'revenue-impact']
    };
  }

  return null;
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const words = text.toLowerCase().split(/\W+/);
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'with', 'by', 'from', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once']);

  return words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5);
}

function getFallbackCategorization(title: string, description: string): CategorizationResult {
  // Fallback categorization based on simple keyword matching
  const text = (title + ' ' + description).toLowerCase();

  for (const [category, info] of Object.entries(SAAS_CATEGORIES)) {
    for (const keyword of info.keywords) {
      if (text.includes(keyword)) {
        return {
          primaryCategory: category as keyof typeof SAAS_CATEGORIES,
          secondaryCategories: [],
          urgencyLevel: info.urgency as any,
          userSegment: 'individual',
          estimatedComplexity: 'medium',
          revenueImpact: false,
          confidence: 0.6,
          keywords: extractKeywords(text),
          reasoning: `Categorized based on keyword: ${keyword}`,
          suggestedTags: [category.toLowerCase().replace(/[^a-z]/g, '')]
        };
      }
    }
  }

  // Ultimate fallback
  return {
    primaryCategory: 'Feature Request',
    secondaryCategories: [],
    urgencyLevel: 'medium',
    userSegment: 'individual',
    estimatedComplexity: 'medium',
    revenueImpact: false,
    confidence: 0.3,
    keywords: extractKeywords(text),
    reasoning: 'Default categorization - unable to determine specific category',
    suggestedTags: ['needs-review']
  };
}

// Export cached version of categorizePost
export const categorizePost = withCache(
  categorizePostInternal,
  'categorization',
  (title: string, description: string = '', additionalContext?: any) => ({
    title,
    description,
    // Don't cache based on authorEmail as it's just metadata
    userTier: additionalContext?.userTier,
    voteCount: additionalContext?.voteCount
  })
);
