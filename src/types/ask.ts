/**
 * Ask SignalsLoop Anything - Type Definitions
 * Types for ChatGPT-style chat interface for querying product feedback
 */

// ============================================================================
// Query Classification Types
// ============================================================================

/**
 * Query type classification
 */
export type QueryType =
  | 'feedback'     // Questions about specific feedback, bugs, feature requests
  | 'sentiment'    // Sentiment trends, satisfaction, NPS-like queries
  | 'competitive'  // Competitor mentions, competitive landscape
  | 'themes'       // Patterns, recurring topics, common issues
  | 'metrics'      // Numbers, counts, percentages, statistics
  | 'actions'      // What to do, recommendations, priorities
  | 'general';     // Greetings, help, other

/**
 * Entities extracted from query
 */
export interface ExtractedEntities {
  competitors?: string[];      // Mentioned competitor names
  themes?: string[];           // Mentioned themes/topics
  timeRange?: {                // Time range for the query
    start?: string;
    end?: string;
    relative?: string;         // e.g., "last week", "this month"
  };
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  metrics?: string[];          // Requested metric types
  feedbackTypes?: string[];    // e.g., "bug", "feature request", "complaint"
  priorities?: string[];       // e.g., "high", "urgent", "critical"
}

/**
 * Classification result from query classifier
 */
export interface ClassificationResult {
  queryType: QueryType;
  confidence: number;          // 0-1
  entities: ExtractedEntities;
  searchQuery: string;         // Rewritten query optimized for semantic search
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Conversation entity
 */
export interface Conversation {
  id: string;
  user_id: string;
  project_id: string;
  title?: string;
  is_pinned: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Message source reference
 */
export interface MessageSource {
  type: 'feedback' | 'theme' | 'competitor' | 'metric' | 'roadmap' | 'persona' | 'product_doc';
  id: string;
  title?: string;
  preview?: string;
  similarity?: number;         // Similarity score for semantic search results
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  model?: string;              // AI model used
  tokens?: number;             // Tokens consumed
  latency_ms?: number;         // Response latency
  temperature?: number;        // Temperature used
  search_results_count?: number; // Number of search results used
  cached?: boolean;            // Whether response was cached
}

/**
 * Message entity
 */
export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  query_type?: QueryType;
  sources: MessageSource[];
  metadata: MessageMetadata;
  created_at: string;
}

/**
 * Analytics entry
 */
export interface Analytics {
  id: string;
  message_id: string;
  project_id: string;
  query_text: string;
  query_type?: string;
  response_rating?: number;    // 1-5
  feedback_text?: string;
  tokens_used?: number;
  latency_ms?: number;
  created_at: string;
}

/**
 * Feedback embedding
 */
export interface FeedbackEmbedding {
  id: string;
  feedback_id: string;
  project_id: string;
  embedding: number[];         // vector(1536)
  content_hash: string;
  created_at: string;
}

// ============================================================================
// Semantic Search Types
// ============================================================================

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  feedback_id: string;
  content: string;
  title: string;
  status: string;
  category?: string;
  upvotes: number;
  created_at: string;
  similarity: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  projectId: string;
  matchThreshold?: number;     // Default 0.7
  matchCount?: number;         // Default 10
  filters?: {
    status?: string[];
    category?: string[];
    minVotes?: number;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Create conversation request
 */
export interface CreateConversationRequest {
  projectId: string;
  title?: string;
  initialMessage?: string;
}

/**
 * Create conversation response
 */
export interface CreateConversationResponse {
  success: boolean;
  conversation?: Conversation;
  message?: Message;
  error?: string;
}

/**
 * Send message request
 */
export interface SendMessageRequest {
  conversationId: string;
  content: string;
  projectId: string;
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  assistantMessage?: Message;
  error?: string;
}

/**
 * Get conversation request
 */
export interface GetConversationRequest {
  conversationId: string;
}

/**
 * Get conversation response
 */
export interface GetConversationResponse {
  success: boolean;
  conversation?: Conversation;
  messages?: Message[];
  error?: string;
}

/**
 * List conversations request
 */
export interface ListConversationsRequest {
  projectId: string;
  limit?: number;
  offset?: number;
  pinnedOnly?: boolean;
}

/**
 * List conversations response
 */
export interface ListConversationsResponse {
  success: boolean;
  conversations?: Conversation[];
  total?: number;
  error?: string;
}

/**
 * Update conversation request
 */
export interface UpdateConversationRequest {
  conversationId: string;
  title?: string;
  is_pinned?: boolean;
}

/**
 * Update conversation response
 */
export interface UpdateConversationResponse {
  success: boolean;
  conversation?: Conversation;
  error?: string;
}

/**
 * Delete conversation request
 */
export interface DeleteConversationRequest {
  conversationId: string;
}

/**
 * Delete conversation response
 */
export interface DeleteConversationResponse {
  success: boolean;
  error?: string;
}

/**
 * Rate message request
 */
export interface RateMessageRequest {
  messageId: string;
  projectId: string;
  rating: number;              // 1-5
  feedback?: string;
}

/**
 * Rate message response
 */
export interface RateMessageResponse {
  success: boolean;
  error?: string;
}

/**
 * Generate embedding request
 */
export interface GenerateEmbeddingRequest {
  feedbackId: string;
  projectId: string;
  content: string;
}

/**
 * Generate embedding response
 */
export interface GenerateEmbeddingResponse {
  success: boolean;
  embeddingId?: string;
  error?: string;
}

/**
 * Batch generate embeddings request
 */
export interface BatchGenerateEmbeddingsRequest {
  projectId: string;
  feedbackIds?: string[];      // If not provided, generates for all feedback
  force?: boolean;             // Force regeneration even if embeddings exist
}

/**
 * Batch generate embeddings response
 */
export interface BatchGenerateEmbeddingsResponse {
  success: boolean;
  generated: number;
  skipped: number;
  failed: number;
  error?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Chat interface props
 */
export interface ChatInterfaceProps {
  projectId: string;
  conversationId?: string;
  onConversationChange?: (conversationId: string) => void;
}

/**
 * Conversation list props
 */
export interface ConversationListProps {
  projectId: string;
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

/**
 * Message list props
 */
export interface MessageListProps {
  conversationId: string;
  messages: Message[];
  onRateMessage?: (messageId: string, rating: number, feedback?: string) => void;
}

/**
 * Message input props
 */
export interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Message bubble props
 */
export interface MessageBubbleProps {
  message: Message;
  onRate?: (rating: number, feedback?: string) => void;
  showSources?: boolean;
}

/**
 * Source citation props
 */
export interface SourceCitationProps {
  source: MessageSource;
  onClick?: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Query type display info
 */
export interface QueryTypeInfo {
  label: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * Get query type display info
 */
export function getQueryTypeInfo(queryType: QueryType): QueryTypeInfo {
  switch (queryType) {
    case 'feedback':
      return {
        label: 'Feedback',
        description: 'Questions about specific feedback, bugs, and feature requests',
        icon: '💬',
        color: 'blue',
      };
    case 'sentiment':
      return {
        label: 'Sentiment',
        description: 'Sentiment trends and satisfaction metrics',
        icon: '📊',
        color: 'green',
      };
    case 'competitive':
      return {
        label: 'Competitive',
        description: 'Competitor analysis and competitive landscape',
        icon: '🎯',
        color: 'purple',
      };
    case 'themes':
      return {
        label: 'Themes',
        description: 'Patterns, recurring topics, and common issues',
        icon: '🏷️',
        color: 'yellow',
      };
    case 'metrics':
      return {
        label: 'Metrics',
        description: 'Numbers, counts, and statistics',
        icon: '📈',
        color: 'indigo',
      };
    case 'actions':
      return {
        label: 'Actions',
        description: 'Recommendations and priorities',
        icon: '⚡',
        color: 'orange',
      };
    case 'general':
      return {
        label: 'General',
        description: 'General queries and help',
        icon: '❓',
        color: 'gray',
      };
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default match threshold for semantic search
 */
export const DEFAULT_MATCH_THRESHOLD = 0.7;

/**
 * Default match count for semantic search
 */
export const DEFAULT_MATCH_COUNT = 10;

/**
 * Default classification confidence threshold
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Maximum conversation title length
 */
export const MAX_CONVERSATION_TITLE_LENGTH = 100;

/**
 * Maximum message content length
 */
export const MAX_MESSAGE_CONTENT_LENGTH = 4000;

/**
 * Query type labels
 */
export const QUERY_TYPE_LABELS: Record<QueryType, string> = {
  feedback: 'Feedback Query',
  sentiment: 'Sentiment Analysis',
  competitive: 'Competitive Analysis',
  themes: 'Theme Analysis',
  metrics: 'Metrics Query',
  actions: 'Action Recommendations',
  general: 'General Query',
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Ask error codes
 */
export type AskErrorCode =
  | 'CONVERSATION_NOT_FOUND'
  | 'MESSAGE_NOT_FOUND'
  | 'CLASSIFICATION_FAILED'
  | 'EMBEDDING_GENERATION_FAILED'
  | 'SEARCH_FAILED'
  | 'AI_GENERATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'PROJECT_NOT_FOUND';

/**
 * Ask error
 */
export class AskError extends Error {
  constructor(
    message: string,
    public code: AskErrorCode,
    public conversationId?: string
  ) {
    super(message);
    this.name = 'AskError';
  }
}
