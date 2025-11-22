/**
 * API Route: Ask SignalsLoop Anything - Streaming Chat
 * POST /api/ask/stream
 *
 * Handles streaming AI chat responses for querying product feedback
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { createServerClient } from '@/lib/supabase-client';
import { classifyQuery } from '@/lib/ask/classifier';
import { retrieveContext } from '@/lib/ask/retrieval';
import type { Message, MessageSource } from '@/types/ask';

// ============================================================================
// Configuration
// ============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Request Type
// ============================================================================

interface AskRequest {
  query: string;
  conversationId?: string;
  projectId: string;
}

// ============================================================================
// System Prompts
// ============================================================================

const SYSTEM_PROMPT = `You are a professional AI assistant for SignalsLoop, a product feedback management platform.

Your role is to help product teams analyze and understand their customer feedback by:
- Answering questions about specific feedback items, bugs, and feature requests
- Providing insights on sentiment trends and customer satisfaction
- Analyzing competitive mentions and competitive landscape
- Identifying patterns, themes, and recurring topics
- Delivering metrics, statistics, and quantitative data
- Recommending actions and priorities based on feedback

Guidelines:
- Be concise, clear, and actionable
- Use data and specific examples from the context provided
- Format responses using markdown for readability
- Cite sources when referencing specific feedback items
- Acknowledge limitations if you don't have enough data
- Focus on insights that help product teams make better decisions
- Use bullet points and tables when appropriate for clarity

When the context doesn't contain relevant information, be honest about it and suggest alternative ways to phrase the query.`;

function buildContextSystemMessage(context: string, sources: MessageSource[]): string {
  let message = `Here is the relevant context for answering the user's query:\n\n${context}`;

  if (sources.length > 0) {
    message += `\n\n---\n\nSources available:\n`;
    sources.forEach((source, index) => {
      message += `[${index + 1}] ${source.type}: ${source.title || source.id}\n`;
    });
    message += `\nWhen referencing these sources in your response, use citations like [1], [2], etc.`;
  }

  return message;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('[Ask Stream] Request received');

    // 1. Get Supabase client
    const supabase = await createServerClient();
    console.log('[Ask Stream] Supabase client created');

    // 2. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[Ask Stream] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });

    if (authError || !user) {
      console.error('[Ask Stream] Authentication failed:', authError);
      return new Response('Unauthorized', { status: 401 });
    }

    // 3. Parse request body
    const body = await request.json() as AskRequest;
    const { query, conversationId, projectId } = body;

    if (!query || !projectId) {
      return new Response('Missing required fields: query and projectId', { status: 400 });
    }

    if (query.trim().length === 0) {
      return new Response('Query cannot be empty', { status: 400 });
    }

    // 4. Validate project access
    const { data: projectAccess, error: accessError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', projectId)
      .single();

    if (accessError || !projectAccess) {
      // Check if user is a member
      const { data: memberAccess } = await supabase
        .from('members')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!memberAccess && projectAccess?.owner_id !== user.id) {
        return new Response('Project not found or access denied', { status: 403 });
      }
    }

    // 5. Classify the query
    const classification = await classifyQuery(query);

    // 6. Retrieve relevant context
    const { context, sources } = await retrieveContext(
      projectId,
      classification.queryType,
      classification.searchQuery,
      classification.entities
    );

    // 7. Create or get conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('ask_conversations')
        .insert({
          user_id: user.id,
          project_id: projectId,
          title: query.substring(0, 100), // Use first 100 chars as title
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (convError || !newConversation) {
        console.error('Error creating conversation:', convError);
        return new Response('Failed to create conversation', { status: 500 });
      }

      activeConversationId = newConversation.id;
    } else {
      // Update existing conversation timestamp
      await supabase
        .from('ask_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversationId);
    }

    // 8. Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('ask_messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: query,
        query_type: classification.queryType,
        sources: [],
        metadata: {
          classification: {
            queryType: classification.queryType,
            confidence: classification.confidence,
            entities: classification.entities,
          },
        },
      })
      .select('id')
      .single();

    if (userMsgError || !userMessage) {
      console.error('Error saving user message:', userMsgError);
      return new Response('Failed to save message', { status: 500 });
    }

    // 9. Get conversation history (last 20 messages)
    const { data: historyMessages, error: historyError } = await supabase
      .from('ask_messages')
      .select('role, content')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('Error fetching history:', historyError);
    }

    // Build OpenAI messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: buildContextSystemMessage(context, sources) },
    ];

    // Add conversation history (excluding the current user message we just added)
    if (historyMessages && historyMessages.length > 1) {
      // Exclude the last message (which is the current query)
      const previousMessages = historyMessages.slice(0, -1);
      previousMessages.forEach((msg: any) => {
        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        });
      });
    }

    // Add current user query
    messages.push({ role: 'user', content: query });

    // 10. Call OpenAI with streaming
    const startTime = Date.now();
    let accumulatedResponse = '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Create streaming response with callbacks
    const stream = OpenAIStream(response, {
      onToken: async (token: string) => {
        accumulatedResponse += token;
      },
      onFinal: async (finalText: string) => {
        const latencyMs = Date.now() - startTime;

        try {
          // Save assistant message
          const { data: assistantMessage, error: assistantMsgError } = await supabase
            .from('ask_messages')
            .insert({
              conversation_id: activeConversationId,
              role: 'assistant',
              content: finalText,
              query_type: classification.queryType,
              sources: sources,
              metadata: {
                model: 'gpt-4o',
                temperature: 0.7,
                latency_ms: latencyMs,
              },
            })
            .select('id')
            .single();

          if (assistantMsgError) {
            console.error('Error saving assistant message:', assistantMsgError);
          }

          // Update conversation last_message_at
          await supabase
            .from('ask_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', activeConversationId);

          // Log analytics
          if (assistantMessage) {
            await supabase
              .from('ask_analytics')
              .insert({
                message_id: assistantMessage.id,
                project_id: projectId,
                query_text: query,
                query_type: classification.queryType,
                tokens_used: Math.ceil(finalText.length / 4), // Rough estimate
                latency_ms: latencyMs,
              });
          }
        } catch (error) {
          console.error('Error in onFinal callback:', error);
        }
      },
    });

    // 11. Return streaming response with custom headers
    return new StreamingTextResponse(stream, {
      headers: {
        'X-Conversation-Id': activeConversationId,
        'X-Query-Type': classification.queryType,
        'X-Sources': JSON.stringify(sources),
        'Access-Control-Expose-Headers': 'X-Conversation-Id, X-Query-Type, X-Sources',
      },
    });

  } catch (error) {
    console.error('Error in /api/ask/stream:', error);

    // Return error as JSON
    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
