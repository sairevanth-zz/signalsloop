/**
 * Ask SignalsLoop Global Store
 * Comprehensive state management for AI chat feature with streaming support
 */

import { create } from 'zustand';
import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AskConversation {
  id: string;
  user_id: string;
  project_id: string;
  title?: string;
  is_pinned: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface AskMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  query_type?: string;
  sources?: Array<{
    type: 'feedback' | 'theme' | 'competitor' | 'metric' | 'roadmap' | 'persona' | 'product_doc';
    id: string;
    title?: string;
    preview?: string;
    similarity?: number;
  }>;
  metadata?: {
    model?: string;
    tokens?: number;
    latency_ms?: number;
    temperature?: number;
  };
  created_at: string;
}

// ============================================================================
// Store State Interface
// ============================================================================

interface AskStore {
  // Current conversation state
  currentConversation: AskConversation | null;
  messages: AskMessage[];
  currentProjectId: string | null;

  // Streaming state
  isStreaming: boolean;
  streamingContent: string;

  // Conversations list
  conversations: AskConversation[];
  isLoadingConversations: boolean;

  // Suggested questions
  suggestedQuestions: string[];

  // Actions - Setup
  setCurrentProjectId: (projectId: string | null) => void;
  setCurrentConversation: (conversation: AskConversation | null) => void;
  clearConversation: () => void;

  // Actions - Conversations
  loadConversations: (projectId: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  pinConversation: (conversationId: string, pinned: boolean) => Promise<void>;

  // Actions - Messages
  startNewConversation: (initialQuery: string) => Promise<string>;
  sendMessage: (query: string) => Promise<void>;
  submitFeedback: (messageId: string, rating: number, feedback?: string) => Promise<void>;

  // Internal helpers
  _streamResponse: (
    response: Response,
    conversationId: string,
    userMessageId: string
  ) => Promise<void>;
}

// ============================================================================
// Default Suggested Questions
// ============================================================================

const DEFAULT_SUGGESTED_QUESTIONS = [
  'What are the top feature requests this week?',
  'How is customer sentiment trending?',
  'What are the most common complaints?',
  'Show me competitive mentions',
  'What should I prioritize next?',
];

// ============================================================================
// Store Implementation
// ============================================================================

export const useAskStore = create<AskStore>((set, get) => ({
  // Initial state
  currentConversation: null,
  messages: [],
  currentProjectId: null,
  isStreaming: false,
  streamingContent: '',
  conversations: [],
  isLoadingConversations: false,
  suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,

  // ============================================================================
  // Setup Actions
  // ============================================================================

  setCurrentProjectId: (projectId) => {
    set({ currentProjectId: projectId });
  },

  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  clearConversation: () => {
    set({
      currentConversation: null,
      messages: [],
      streamingContent: '',
      isStreaming: false,
    });
  },

  // ============================================================================
  // Load Conversations
  // ============================================================================

  loadConversations: async (projectId) => {
    set({ isLoadingConversations: true });

    try {
      const response = await fetch(`/api/ask/conversations?projectId=${projectId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();

      if (data.success && data.conversations) {
        set({ conversations: data.conversations });
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  // ============================================================================
  // Load Single Conversation
  // ============================================================================

  loadConversation: async (conversationId) => {
    const { currentProjectId } = get();

    if (!currentProjectId) {
      console.error('No project ID set');
      return;
    }

    try {
      const response = await fetch(`/api/ask/conversations/${conversationId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();

      if (data.success) {
        set({
          currentConversation: data.conversation,
          messages: data.messages || [],
        });
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  },

  // ============================================================================
  // Delete Conversation
  // ============================================================================

  deleteConversation: async (conversationId) => {
    try {
      const response = await fetch(`/api/ask/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // Update local state
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        currentConversation:
          state.currentConversation?.id === conversationId
            ? null
            : state.currentConversation,
        messages:
          state.currentConversation?.id === conversationId ? [] : state.messages,
      }));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  // ============================================================================
  // Pin/Unpin Conversation
  // ============================================================================

  pinConversation: async (conversationId, pinned) => {
    try {
      const response = await fetch(`/api/ask/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: pinned }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to pin conversation');
      }

      // Update local state
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, is_pinned: pinned } : c
        ),
        currentConversation:
          state.currentConversation?.id === conversationId
            ? { ...state.currentConversation, is_pinned: pinned }
            : state.currentConversation,
      }));
    } catch (error) {
      console.error('Error pinning conversation:', error);
      throw error;
    }
  },

  // ============================================================================
  // Start New Conversation
  // ============================================================================

  startNewConversation: async (initialQuery) => {
    const { currentProjectId, _streamResponse } = get();

    if (!currentProjectId) {
      throw new Error('No project ID set');
    }

    try {
      // Create temporary user message
      const tempUserMessageId = `temp-user-${Date.now()}`;
      const userMessage: AskMessage = {
        id: tempUserMessageId,
        conversation_id: 'temp',
        role: 'user',
        content: initialQuery,
        created_at: new Date().toISOString(),
      };

      // Add user message to UI
      set({ messages: [userMessage], isStreaming: true, streamingContent: '' });

      // Make API request
      const response = await fetch('/api/ask/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: initialQuery,
          projectId: currentProjectId,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      // Get conversation ID from headers
      const conversationId = response.headers.get('X-Conversation-Id');
      if (!conversationId) {
        throw new Error('No conversation ID returned');
      }

      // Update user message with real conversation ID
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === tempUserMessageId ? { ...m, conversation_id: conversationId } : m
        ),
      }));

      // Stream the response
      await _streamResponse(response, conversationId, tempUserMessageId);

      return conversationId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      set({ isStreaming: false, streamingContent: '' });
      throw error;
    }
  },

  // ============================================================================
  // Send Message (Follow-up in existing conversation)
  // ============================================================================

  sendMessage: async (query) => {
    const { currentConversation, currentProjectId, _streamResponse } = get();

    if (!currentConversation || !currentProjectId) {
      throw new Error('No active conversation');
    }

    try {
      // Create temporary user message
      const tempUserMessageId = `temp-user-${Date.now()}`;
      const userMessage: AskMessage = {
        id: tempUserMessageId,
        conversation_id: currentConversation.id,
        role: 'user',
        content: query,
        created_at: new Date().toISOString(),
      };

      // Add user message to UI
      set((state) => ({
        messages: [...state.messages, userMessage],
        isStreaming: true,
        streamingContent: '',
      }));

      // Make API request
      const response = await fetch('/api/ask/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversationId: currentConversation.id,
          projectId: currentProjectId,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Stream the response
      await _streamResponse(response, currentConversation.id, tempUserMessageId);
    } catch (error) {
      console.error('Error sending message:', error);
      set({ isStreaming: false, streamingContent: '' });
      throw error;
    }
  },

  // ============================================================================
  // Submit Feedback
  // ============================================================================

  submitFeedback: async (messageId, rating, feedback) => {
    const { currentProjectId } = get();

    if (!currentProjectId) {
      throw new Error('No project ID set');
    }

    try {
      const response = await fetch('/api/ask/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          projectId: currentProjectId,
          rating,
          feedback,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  // ============================================================================
  // Internal: Stream Response
  // ============================================================================

  _streamResponse: async (response, conversationId, userMessageId) => {
    try {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      // Get sources from headers
      const sourcesHeader = response.headers.get('X-Sources');
      const sources = sourcesHeader ? JSON.parse(sourcesHeader) : [];
      const queryType = response.headers.get('X-Query-Type');

      // Create temporary assistant message
      const tempAssistantMessageId = `temp-assistant-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        // Update streaming content
        set({ streamingContent: accumulatedContent });
      }

      // Streaming complete - create final assistant message
      const assistantMessage: AskMessage = {
        id: tempAssistantMessageId,
        conversation_id: conversationId,
        role: 'assistant',
        content: accumulatedContent,
        query_type: queryType || undefined,
        sources: sources,
        created_at: new Date().toISOString(),
      };

      // Add assistant message to messages
      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isStreaming: false,
        streamingContent: '',
      }));

      // Reload conversations list to update last_message_at
      const { currentProjectId, loadConversations } = get();
      if (currentProjectId) {
        loadConversations(currentProjectId);
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      set({ isStreaming: false, streamingContent: '' });
      throw error;
    }
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get pinned conversations
 */
export const usePinnedConversations = () => {
  return useAskStore((state) =>
    state.conversations.filter((c) => c.is_pinned).sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )
  );
};

/**
 * Get recent (non-pinned) conversations
 */
export const useRecentConversations = () => {
  return useAskStore((state) =>
    state.conversations.filter((c) => !c.is_pinned).sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )
  );
};

/**
 * Get all messages with streaming content
 * Uses shallow comparison to prevent unnecessary re-renders
 */
export const useMessagesWithStreaming = () => {
  const messages = useAskStore((state) => state.messages);
  const isStreaming = useAskStore((state) => state.isStreaming);
  const streamingContent = useAskStore((state) => state.streamingContent);
  const currentConversation = useAskStore((state) => state.currentConversation);

  return React.useMemo(() => {
    if (!isStreaming) {
      return messages;
    }

    // Add streaming message
    return [
      ...messages,
      {
        id: 'streaming',
        conversation_id: currentConversation?.id || '',
        role: 'assistant' as const,
        content: streamingContent,
        created_at: new Date().toISOString(),
      },
    ];
  }, [messages, isStreaming, streamingContent, currentConversation?.id]);
};

/**
 * Check if there's an active conversation
 */
export const useHasActiveConversation = () => {
  return useAskStore((state) => state.currentConversation !== null);
};
