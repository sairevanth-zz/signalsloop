'use client';

/**
 * ConversationSidebar Component
 * Shows conversation history with pinned and recent sections
 * Plus tabs for Proactive Suggestions and Scheduled Queries
 */

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquarePlus,
  Pin,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Lightbulb,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAskStore, type AskConversation } from '@/stores/ask-store';
import { ProactiveSuggestionsPanel } from './ProactiveSuggestionsPanel';
import { ScheduledQueriesPanel } from './ScheduledQueriesPanel';

// ============================================================================
// Props Interface
// ============================================================================

export interface ConversationSidebarProps {
  projectId: string;
}

// ============================================================================
// Component
// ============================================================================

type SidebarTab = 'conversations' | 'suggestions' | 'scheduled';

export function ConversationSidebar({ projectId }: ConversationSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.conversationId as string | undefined;

  const conversations = useAskStore((state) => state.conversations);
  const loadConversations = useAskStore((state) => state.loadConversations);
  const deleteConversation = useAskStore((state) => state.deleteConversation);
  const pinConversation = useAskStore((state) => state.pinConversation);
  const isLoadingConversations = useAskStore((state) => state.isLoadingConversations);
  const sendMessage = useAskStore((state) => state.sendMessage);
  const startNewConversation = useAskStore((state) => state.startNewConversation);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('conversations');

  // Load conversations on mount - use ref to ensure it only runs once per projectId
  const hasLoaded = React.useRef<string | null>(null);
  useEffect(() => {
    if (hasLoaded.current === projectId) return;
    hasLoaded.current = projectId;

    loadConversations(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Separate pinned and recent conversations
  const pinnedConversations = conversations.filter((conv) => conv.is_pinned);
  const recentConversations = conversations.filter((conv) => !conv.is_pinned);

  // Handle new conversation
  const handleNewConversation = () => {
    router.push('/dashboard/ask');
  };

  // Handle pin/unpin
  const handleTogglePin = async (conv: AskConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pinConversation(conv.id, !conv.is_pinned);
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Handle delete
  const handleDelete = async (conv: AskConversation, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this conversation?')) return;

    setDeletingId(conv.id);

    try {
      // Delete using store action (handles both server and local state)
      await deleteConversation(conv.id);

      // Navigate away if current conversation was deleted
      if (conversationId === conv.id) {
        router.push('/dashboard/ask');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle conversation click
  const handleConversationClick = (conv: AskConversation) => {
    router.push(`/dashboard/ask/${conv.id}`);
  };

  // Handle suggestion click - auto-fill and send query
  const handleSuggestionClick = async (query: string) => {
    try {
      router.push('/dashboard/ask');
      setTimeout(() => {
        startNewConversation(query);
      }, 100);
    } catch (error) {
      console.error('Error starting conversation from suggestion:', error);
    }
  };

  const tabs: Array<{ id: SidebarTab; label: string; icon: React.ElementType }> = [
    { id: 'conversations', label: 'Chats', icon: MessageSquare },
    { id: 'suggestions', label: 'Insights', icon: Lightbulb },
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
  ];

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header with New Conversation Button */}
      <div className="p-4 border-b">
        <Button
          onClick={handleNewConversation}
          className="w-full justify-start gap-2"
          variant="default"
        >
          <MessageSquarePlus className="size-4" />
          New Conversation
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
                'border-b-2',
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div>
            {/* Loading State */}
            {isLoadingConversations && conversations.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading conversations...
              </div>
            )}

            {/* Empty State */}
            {!isLoadingConversations && conversations.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet.
                <br />
                Start by asking a question!
              </div>
            )}

            {/* Pinned Conversations */}
            {pinnedConversations.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pinned
                </div>
                <div className="space-y-1 px-2">
                  {pinnedConversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conversationId === conv.id}
                      isDeleting={deletingId === conv.id}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                      onClick={() => handleConversationClick(conv)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Conversations */}
            {recentConversations.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent
                </div>
                <div className="space-y-1 px-2">
                  {recentConversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conversationId === conv.id}
                      isDeleting={deletingId === conv.id}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                      onClick={() => handleConversationClick(conv)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <ProactiveSuggestionsPanel
            projectId={projectId}
            onQueryClick={handleSuggestionClick}
          />
        )}

        {/* Scheduled Queries Tab */}
        {activeTab === 'scheduled' && (
          <ScheduledQueriesPanel projectId={projectId} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ConversationItem Component
// ============================================================================

interface ConversationItemProps {
  conversation: AskConversation;
  isActive: boolean;
  isDeleting: boolean;
  onTogglePin: (conv: AskConversation, e: React.MouseEvent) => void;
  onDelete: (conv: AskConversation, e: React.MouseEvent) => void;
  onClick: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  isDeleting,
  onTogglePin,
  onDelete,
  onClick,
}: ConversationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Format relative timestamp
  let relativeTime = 'Just now';
  try {
    const date = new Date(conversation.last_message_at);
    if (!isNaN(date.getTime())) {
      relativeTime = formatDistanceToNow(date, { addSuffix: true });
    }
  } catch (err) {
    console.warn('Invalid conversation timestamp', conversation.last_message_at, err);
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative rounded-lg px-3 py-2 cursor-pointer transition-all',
        'hover:bg-muted/50',
        isActive && 'bg-muted',
        isDeleting && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-1.5 mb-1">
            {conversation.is_pinned && (
              <Pin className="size-3 text-primary flex-shrink-0" />
            )}
            <p className="text-sm font-medium truncate">
              {conversation.title || 'New conversation'}
            </p>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground">{relativeTime}</p>
        </div>

        {/* Dropdown Menu */}
        {isHovered && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(conversation, e);
                }}
              >
                <Pin className="size-4 mr-2" />
                {conversation.is_pinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation, e);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
