/**
 * AI Intent Parser for Slack/Discord Messages
 *
 * Uses Claude or GPT-4 to parse natural language commands and extract
 * structured actions that can be executed by SignalsLoop.
 *
 * Supports:
 * - Creating feedback
 * - Voting on posts
 * - Changing status
 * - Getting briefings/health scores
 * - Searching feedback
 * - Generating specs
 */

import Anthropic from '@anthropic-ai/sdk';
import { getOpenAI } from '../openai-client';

// Supported actions that can be parsed from natural language
export type IntentAction =
    | 'create_feedback'
    | 'vote_on_post'
    | 'update_status'
    | 'get_briefing'
    | 'get_health_score'
    | 'search_feedback'
    | 'generate_spec'
    | 'get_insights'
    | 'unknown';

export interface ParsedIntent {
    action: IntentAction;
    confidence: number;
    parameters: Record<string, any>;
    rawMessage: string;
}

// Tool definitions for Claude function calling
const tools: Anthropic.Tool[] = [
    {
        name: 'create_feedback',
        description: 'Create a new feedback post in SignalsLoop',
        input_schema: {
            type: 'object' as const,
            properties: {
                title: {
                    type: 'string',
                    description: 'Title of the feedback (brief summary)',
                },
                description: {
                    type: 'string',
                    description: 'Detailed description of the feedback',
                },
                category: {
                    type: 'string',
                    enum: ['Bug', 'Feature Request', 'Improvement', 'Question', 'Other'],
                    description: 'Category of the feedback',
                },
            },
            required: ['title'],
        },
    },
    {
        name: 'vote_on_post',
        description: 'Vote on an existing feedback post',
        input_schema: {
            type: 'object' as const,
            properties: {
                search_query: {
                    type: 'string',
                    description: 'Search query to find the post to vote on',
                },
                priority: {
                    type: 'string',
                    enum: ['must_have', 'important', 'nice_to_have'],
                    description: 'Priority level of the vote',
                },
            },
            required: ['search_query', 'priority'],
        },
    },
    {
        name: 'update_status',
        description: 'Change the status of a feedback post',
        input_schema: {
            type: 'object' as const,
            properties: {
                search_query: {
                    type: 'string',
                    description: 'Search query to find the post to update',
                },
                new_status: {
                    type: 'string',
                    enum: ['open', 'in_progress', 'planned', 'completed', 'closed'],
                    description: 'New status to set',
                },
            },
            required: ['search_query', 'new_status'],
        },
    },
    {
        name: 'get_briefing',
        description: "Get today's Mission Control briefing with critical items and health overview",
        input_schema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_health_score',
        description: 'Get the current product health score with top issues',
        input_schema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },
    {
        name: 'search_feedback',
        description: 'Search for feedback matching a query',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query to find feedback',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (default 5)',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'generate_spec',
        description: 'Generate a product spec from feedback',
        input_schema: {
            type: 'object' as const,
            properties: {
                search_query: {
                    type: 'string',
                    description: 'Search query to find the feedback to generate spec from',
                },
            },
            required: ['search_query'],
        },
    },
    {
        name: 'get_insights',
        description: 'Get current insights and emerging themes from feedback',
        input_schema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },
];

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
    if (!process.env.ANTHROPIC_API_KEY) {
        return null;
    }
    if (!anthropicClient) {
        anthropicClient = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }
    return anthropicClient;
}

/**
 * Parse a natural language message to extract intent using Claude
 */
async function parseWithClaude(message: string): Promise<ParsedIntent> {
    const anthropic = getAnthropic();
    if (!anthropic) {
        throw new Error('Anthropic API key not configured');
    }

    const systemPrompt = `You are an AI assistant for SignalsLoop, a product feedback management tool.
Your job is to understand what the user wants to do and call the appropriate function.

Context:
- Users can create feedback, vote on posts, change statuses, get briefings, search, etc.
- Be helpful and infer the most likely intent from casual language
- If the message is just a greeting or unclear, return a helpful message explaining what you can do

Examples:
- "add feedback about slow loading" → create_feedback with title "Slow loading"
- "vote for the mobile app bug as must have" → vote_on_post
- "what's happening today?" → get_briefing
- "how healthy is our product?" → get_health_score
- "find feedback about payments" → search_feedback`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            tools,
            tool_choice: { type: 'auto' },
            messages: [
                {
                    role: 'user',
                    content: message,
                },
            ],
        });

        // Check if Claude called a tool
        const toolUse = response.content.find((block) => block.type === 'tool_use');

        if (toolUse && toolUse.type === 'tool_use') {
            return {
                action: toolUse.name as IntentAction,
                confidence: 0.9,
                parameters: toolUse.input as Record<string, any>,
                rawMessage: message,
            };
        }

        // No tool called - Claude just responded with text
        const textBlock = response.content.find((block) => block.type === 'text');
        return {
            action: 'unknown',
            confidence: 0.5,
            parameters: {
                response: textBlock?.type === 'text' ? textBlock.text : "I'm not sure what you want to do. Try asking me to create feedback, vote on posts, or get your briefing.",
            },
            rawMessage: message,
        };
    } catch (error) {
        console.error('Claude intent parsing error:', error);
        throw error;
    }
}

/**
 * Parse a natural language message to extract intent using GPT-4
 * Fallback when Claude is not available
 */
async function parseWithGPT4(message: string): Promise<ParsedIntent> {
    const openai = getOpenAI();

    const systemPrompt = `You are an AI assistant for SignalsLoop, a product feedback management tool.
Parse the user's message and call the appropriate function.
If the message is unclear, respond with helpful guidance.`;

    // Convert tools to OpenAI format
    const openaiTools = tools.map((tool) => ({
        type: 'function' as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema,
        },
    }));

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
            ],
            tools: openaiTools,
            tool_choice: 'auto',
        });

        const choice = response.choices[0];
        const toolCall = choice.message.tool_calls?.[0];

        if (toolCall) {
            return {
                action: toolCall.function.name as IntentAction,
                confidence: 0.9,
                parameters: JSON.parse(toolCall.function.arguments),
                rawMessage: message,
            };
        }

        return {
            action: 'unknown',
            confidence: 0.5,
            parameters: {
                response: choice.message.content || "I'm not sure what you want to do.",
            },
            rawMessage: message,
        };
    } catch (error) {
        console.error('GPT-4 intent parsing error:', error);
        throw error;
    }
}

/**
 * Main entry point for parsing intents
 * Uses Claude if available, falls back to GPT-4
 */
export async function parseIntent(message: string): Promise<ParsedIntent> {
    // Strip @mentions and clean up message
    const cleanedMessage = message
        .replace(/<@[A-Z0-9]+>/g, '') // Remove Slack user mentions
        .replace(/@\w+/g, '') // Remove @ mentions
        .trim();

    if (!cleanedMessage) {
        return {
            action: 'unknown',
            confidence: 1,
            parameters: {
                response: "Hi! I'm SignalsLoop. I can help you:\n• Create feedback\n• Vote on posts\n• Get your daily briefing\n• Check product health\n• Search feedback\n\nJust tell me what you'd like to do!",
            },
            rawMessage: message,
        };
    }

    // Try Claude first (faster, cheaper for function calling)
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            return await parseWithClaude(cleanedMessage);
        } catch (error) {
            console.warn('Claude failed, falling back to GPT-4:', error);
        }
    }

    // Fall back to GPT-4
    return await parseWithGPT4(cleanedMessage);
}

/**
 * Format action result for Slack response
 */
export function formatActionDescription(intent: ParsedIntent): string {
    switch (intent.action) {
        case 'create_feedback':
            return `Creating feedback: "${intent.parameters.title}"`;
        case 'vote_on_post':
            return `Voting on post matching "${intent.parameters.search_query}" as ${intent.parameters.priority}`;
        case 'update_status':
            return `Updating status to ${intent.parameters.new_status} for "${intent.parameters.search_query}"`;
        case 'get_briefing':
            return "Getting today's briefing...";
        case 'get_health_score':
            return 'Getting product health score...';
        case 'search_feedback':
            return `Searching for "${intent.parameters.query}"...`;
        case 'generate_spec':
            return `Generating spec for "${intent.parameters.search_query}"...`;
        case 'get_insights':
            return 'Getting current insights...';
        default:
            return intent.parameters.response || "I'm not sure what you want to do.";
    }
}
