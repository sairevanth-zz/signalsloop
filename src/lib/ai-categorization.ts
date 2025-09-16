import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the OpenAI model from environment variables with fallback
const getOpenAIModel = (): string => {
  return process.env.OPENAI_MODEL || 'gpt-4';
};

/**
 * Get the currently configured OpenAI model
 * @returns string - The model name being used
 */
export const getCurrentModel = (): string => {
  return getOpenAIModel();
};

// Define the categories for feedback posts
export type FeedbackCategory = 
  | 'Bug'
  | 'Feature Request'
  | 'Improvement'
  | 'UI/UX'
  | 'Integration'
  | 'Performance'
  | 'Documentation'
  | 'Other';

export interface CategorizationResult {
  category: FeedbackCategory;
  confidence: number;
  reasoning?: string;
}

/**
 * Categorizes a feedback post using OpenAI (configurable model)
 * @param title - The title of the feedback post
 * @param description - The description/content of the feedback post
 * @returns Promise<CategorizationResult> - The AI-determined category and confidence
 */
export async function categorizeFeedback(
  title: string, 
  description?: string
): Promise<CategorizationResult> {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured. Returning default category.');
      return {
        category: 'Other',
        confidence: 0,
        reasoning: 'OpenAI API key not configured'
      };
    }

    // Prepare the content for analysis
    const content = description ? `${title}\n\n${description}` : title;

    // Create the prompt for categorization
    const prompt = `You are an expert at categorizing user feedback for software products. 
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

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        {
          role: 'system',
          content: 'You are an expert at categorizing user feedback. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent categorization
      max_tokens: 200,
    });

    // Extract the response content
    const responseContent = response.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const result = JSON.parse(responseContent);
    
    // Validate the response structure
    if (!result.category || !result.confidence) {
      throw new Error('Invalid response structure from OpenAI');
    }

    // Ensure category is one of our defined types
    const validCategories: FeedbackCategory[] = [
      'Bug', 'Feature Request', 'Improvement', 'UI/UX', 
      'Integration', 'Performance', 'Documentation', 'Other'
    ];

    if (!validCategories.includes(result.category)) {
      result.category = 'Other';
      result.confidence = Math.min(result.confidence, 0.5);
    }

    return {
      category: result.category,
      confidence: Math.min(Math.max(result.confidence, 0), 1), // Clamp between 0 and 1
      reasoning: result.reasoning
    };

  } catch (error) {
    console.error('Error categorizing feedback with AI:', error);
    
    // Fallback: return default category with low confidence
    return {
      category: 'Other',
      confidence: 0,
      reasoning: `AI categorization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Batch categorizes multiple feedback posts
 * @param posts - Array of posts with title and optional description
 * @returns Promise<CategorizationResult[]> - Array of categorization results
 */
export async function batchCategorizeFeedback(
  posts: Array<{ title: string; description?: string }>
): Promise<CategorizationResult[]> {
  try {
    // Process posts in parallel with a small delay to respect rate limits
    const results = await Promise.all(
      posts.map(async (post, index) => {
        // Add a small delay between requests to avoid rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return categorizeFeedback(post.title, post.description);
      })
    );
    
    return results;
  } catch (error) {
    console.error('Error in batch categorization:', error);
    
    // Return default results for all posts
    return posts.map(() => ({
      category: 'Other' as FeedbackCategory,
      confidence: 0,
      reasoning: 'Batch categorization failed'
    }));
  }
}

/**
 * Get a human-readable description of each category
 */
export const categoryDescriptions: Record<FeedbackCategory, string> = {
  'Bug': 'Reports of broken functionality, errors, or unexpected behavior',
  'Feature Request': 'Requests for new features or functionality',
  'Improvement': 'Suggestions to enhance existing features',
  'UI/UX': 'Issues or suggestions related to user interface or user experience',
  'Integration': 'Requests or issues related to third-party integrations',
  'Performance': 'Issues or suggestions related to speed, efficiency, or resource usage',
  'Documentation': 'Requests for better documentation or help content',
  'Other': 'Anything that doesn\'t fit the above categories'
};

/**
 * Get a color for each category (for UI display)
 */
export const categoryColors: Record<FeedbackCategory, string> = {
  'Bug': 'bg-red-100 text-red-800 border-red-200',
  'Feature Request': 'bg-blue-100 text-blue-800 border-blue-200',
  'Improvement': 'bg-green-100 text-green-800 border-green-200',
  'UI/UX': 'bg-purple-100 text-purple-800 border-purple-200',
  'Integration': 'bg-orange-100 text-orange-800 border-orange-200',
  'Performance': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Documentation': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Other': 'bg-gray-100 text-gray-800 border-gray-200'
};
