/**
 * Action Router
 * Detects action intent from user queries and routes to appropriate executors
 */

import OpenAI from 'openai';
import type { ActionIntent, ActionType, Message } from '@/types/ask';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Action Detection System Prompt
// ============================================================================

const ACTION_DETECTION_PROMPT = `You are an action intent detection system for SignalsLoop, a product feedback management platform.

Your task is to determine if a user query requires an ACTION to be performed, or if it's just a QUESTION.

# Available Actions:

1. **create_spec** - Create a new product specification/PRD
   Examples: "Create a spec for dark mode", "Write a PRD for user authentication"

2. **escalate_issue** - Escalate a specific feedback item to higher priority
   Examples: "Escalate the login bug", "Mark feedback #123 as urgent"

3. **generate_report** - Generate a report on a specific topic
   Examples: "Generate a report on sentiment trends", "Create a summary of last week's feedback"

4. **create_roadmap_item** - Add an item to the product roadmap
   Examples: "Add dark mode to Q2 roadmap", "Schedule API v2 for next quarter"

5. **send_notification** - Send a notification to stakeholders
   Examples: "Notify the team about this", "Send this to engineering"

6. **schedule_query** - Schedule a recurring query
   Examples: "Send me weekly sentiment reports", "Email me this every Monday"

# Decision Rules:

- If the query contains action verbs like "create", "generate", "write", "add", "schedule", "send", "notify", "escalate", "mark", etc., it likely requires an action.
- Questions that ask "what", "how many", "show me", "tell me" are usually just questions, NOT actions.
- Be confident about the distinction - if unclear, default to NO action (requires_action: false).

# Response Format:

Return JSON with this exact structure:

For ACTION queries:
{
  "requires_action": true,
  "action_type": "create_spec",
  "parameters": {
    "feature_description": "dark mode",
    "additional_context": "..."
  },
  "confirmation_message": "I'll create a product spec for dark mode. Should I proceed?",
  "confidence": 0.95
}

For QUESTION queries:
{
  "requires_action": false,
  "confidence": 0.90
}

# Parameter Extraction Rules:

For **create_spec**:
- feature_description: What feature to create a spec for
- target_segment: Who is it for (optional)
- success_metrics: How to measure success (optional)

For **escalate_issue**:
- feedback_id: ID of the feedback item
- new_priority: Priority level (urgent, high, critical)
- reason: Why it needs escalation

For **generate_report**:
- topic: What to report on
- time_range: Time period (last week, last month, etc.)
- format: Report format (optional)

For **create_roadmap_item**:
- feature_name: Name of the feature
- quarter: Target quarter (Q1, Q2, etc.)
- priority: Priority level

For **send_notification**:
- recipient: Who to notify (team, engineering, stakeholder)
- subject: What to notify about

For **schedule_query**:
- query: The query to schedule
- frequency: How often (daily, weekly, monthly)
- delivery: How to deliver (email, slack)

Be smart about extracting parameters from natural language.`;

// ============================================================================
// Action Detection Function
// ============================================================================

/**
 * Detects if a query requires an action and extracts parameters
 *
 * @param query - The user's query
 * @param projectId - Project ID for context
 * @param conversationContext - Previous messages for context
 * @returns Action intent or null if no action required
 */
export async function detectActionIntent(
  query: string,
  projectId: string,
  conversationContext?: Message[]
): Promise<ActionIntent> {
  try {
    // Build context from conversation history
    let contextText = '';
    if (conversationContext && conversationContext.length > 0) {
      const recentMessages = conversationContext.slice(-3); // Last 3 messages
      contextText = '\n\nRecent conversation context:\n';
      recentMessages.forEach((msg) => {
        contextText += `${msg.role}: ${msg.content}\n`;
      });
    }

    // Call GPT-4o to detect intent
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ACTION_DETECTION_PROMPT },
        {
          role: 'user',
          content: `Query: "${query}"${contextText}\n\nDoes this require an action? Extract the action type and parameters.`,
        },
      ],
      temperature: 0.1, // Low temperature for consistent detection
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(responseContent);

    // Validate and return
    const intent: ActionIntent = {
      requires_action: Boolean(parsed.requires_action),
      action_type: parsed.action_type as ActionType,
      parameters: parsed.parameters || {},
      confirmation_message: parsed.confirmation_message,
      confidence: parsed.confidence || 0.5,
    };

    // If requires_action is false, ensure action_type is undefined
    if (!intent.requires_action) {
      intent.action_type = undefined;
      intent.parameters = undefined;
      intent.confirmation_message = undefined;
    }

    return intent;
  } catch (error) {
    console.error('Error detecting action intent:', error);

    // Return default "no action" on error
    return {
      requires_action: false,
      confidence: 0,
    };
  }
}

// ============================================================================
// Action Validation
// ============================================================================

/**
 * Validates if an action type is supported
 */
export function isValidActionType(actionType: string): actionType is ActionType {
  const validTypes: ActionType[] = [
    'create_spec',
    'escalate_issue',
    'generate_report',
    'create_roadmap_item',
    'send_notification',
    'schedule_query',
  ];

  return validTypes.includes(actionType as ActionType);
}

/**
 * Gets a human-readable description of an action type
 */
export function getActionTypeDescription(actionType: ActionType): string {
  const descriptions: Record<ActionType, string> = {
    create_prd: 'Create a Product Requirements Document',
    create_spec: 'Create a Product Specification',
    escalate_issue: 'Escalate a Feedback Item',
    generate_report: 'Generate a Report',
    create_roadmap_item: 'Add to Roadmap',
    send_notification: 'Send a Notification',
    schedule_query: 'Schedule a Recurring Query',
  };

  return descriptions[actionType] || actionType;
}
