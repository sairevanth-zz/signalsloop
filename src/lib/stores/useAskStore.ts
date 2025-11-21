/**
 * Ask SignalsLoop Store
 * Zustand store for managing chat conversations and messages
 */

import { create } from 'zustand';
import type { Conversation, Message } from '@/types/ask';

// ============================================================================
// Store State Interface
// ============================================================================

interface AskStore {
  // Current conversation
  currentConversationId: string | null;
  conversations: Conversation[];
  messages: Record<string, Message[]>; // conversationId -> messages[]

  // UI state
  isLoading: boolean;
  streamingMessageId: string | null;

  // Actions
  setCurrentConversation: (conversationId: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  deleteConversation: (conversationId: string) => void;

  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;

  setLoading: (loading: boolean) => void;
  setStreamingMessageId: (messageId: string | null) => void;

  // Helper actions
  startNewConversation: (projectId: string, initialQuery?: string) => Promise<string>;
  clearConversations: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAskStore = create<AskStore>((set, get) => ({
  // Initial state
  currentConversationId: null,
  conversations: [],
  messages: {},
  isLoading: false,
  streamingMessageId: null,

  // Actions
  setCurrentConversation: (conversationId) => {
    set({ currentConversationId: conversationId });
  },

  addConversation: (conversation) => {
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      messages: {
        ...state.messages,
        [conversation.id]: [],
      },
    }));
  },

  updateConversation: (conversationId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ),
    }));
  },

  deleteConversation: (conversationId) => {
    set((state) => {
      const { [conversationId]: _, ...remainingMessages } = state.messages;
      return {
        conversations: state.conversations.filter((conv) => conv.id !== conversationId),
        messages: remainingMessages,
        currentConversationId:
          state.currentConversationId === conversationId
            ? null
            : state.currentConversationId,
      };
    });
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    }));
  },

  updateMessage: (conversationId, messageId, updates) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setStreamingMessageId: (messageId) => {
    set({ streamingMessageId: messageId });
  },

  startNewConversation: async (projectId, initialQuery) => {
    try {
      // Create a temporary conversation ID
      const tempConversationId = `temp-${Date.now()}`;

      // Create temporary conversation object
      const tempConversation: Conversation = {
        id: tempConversationId,
        user_id: '', // Will be set by API
        project_id: projectId,
        title: initialQuery || 'New conversation',
        is_pinned: false,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add to store
      get().addConversation(tempConversation);
      get().setCurrentConversation(tempConversationId);

      return tempConversationId;
    } catch (error) {
      console.error('Error starting new conversation:', error);
      throw error;
    }
  },

  clearConversations: () => {
    set({
      currentConversationId: null,
      conversations: [],
      messages: {},
    });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get messages for current conversation
 */
export const useCurrentMessages = () => {
  return useAskStore((state) => {
    if (!state.currentConversationId) return [];
    return state.messages[state.currentConversationId] || [];
  });
};

/**
 * Get current conversation
 */
export const useCurrentConversation = () => {
  return useAskStore((state) => {
    if (!state.currentConversationId) return null;
    return (
      state.conversations.find((conv) => conv.id === state.currentConversationId) || null
    );
  });
};

/**
 * Get conversations sorted by last message
 */
export const useSortedConversations = () => {
  return useAskStore((state) =>
    [...state.conversations].sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )
  );
};
