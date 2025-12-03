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

// ============================================================================
// V2: Voice Input Types
// ============================================================================

/**
 * Voice recording state
 */
export type VoiceRecordingState = 'idle' | 'recording' | 'processing' | 'error';

/**
 * Voice recording result
 */
export interface VoiceRecordingResult {
  blob: Blob;
  duration: number;
  mimeType: string;
}

/**
 * Transcription result from Whisper API
 */
export interface TranscriptionResult {
  text: string;
  duration: number;
  language?: string;
}

// ============================================================================
// V2: Action Execution Types
// ============================================================================

/**
 * Action type that can be executed
 */
export type ActionType =
  | 'create_prd'
  | 'create_spec'
  | 'escalate_issue'
  | 'generate_report'
  | 'create_roadmap_item'
  | 'send_notification'
  | 'schedule_query';

/**
 * Action execution status
 */
export type ActionStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Action intent detection result
 */
export interface ActionIntent {
  requires_action: boolean;
  action_type?: ActionType;
  parameters?: Record<string, any>;
  confirmation_message?: string;
  confidence: number;
}

/**
 * Action result after execution
 */
export interface ActionResult {
  success: boolean;
  action_type: ActionType;
  data?: any;
  error?: string;
  created_resource_id?: string;
  created_resource_url?: string;
}

/**
 * Action execution log entry
 */
export interface ActionExecution {
  id: string;
  message_id: string;
  project_id: string;
  user_id: string;
  action_type: ActionType;
  action_parameters: Record<string, any>;
  status: ActionStatus;
  result_data?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at: string;
}

// ============================================================================
// V2: Scheduled Queries Types
// ============================================================================

/**
 * Scheduled query frequency
 */
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * Scheduled query delivery method
 */
export type DeliveryMethod = 'email' | 'slack' | 'both';

/**
 * Scheduled query entity
 */
export interface ScheduledQuery {
  id: string;
  project_id: string;
  user_id: string;
  query_text: string;
  frequency: ScheduleFrequency;
  day_of_week?: number;        // 0-6 (Sunday-Saturday)
  day_of_month?: number;        // 1-31
  time_utc: string;
  delivery_method: DeliveryMethod;
  slack_channel_id?: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// V2: Proactive Suggestions Types
// ============================================================================

/**
 * Suggestion type
 */
export type SuggestionType =
  | 'sentiment_drop'
  | 'theme_spike'
  | 'churn_risk'
  | 'opportunity'
  | 'competitor_move';

/**
 * Suggestion priority
 */
export type SuggestionPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Suggestion status
 */
export type SuggestionStatus = 'active' | 'dismissed' | 'acted_upon';

/**
 * Proactive suggestion entity
 */
export interface ProactiveSuggestion {
  id: string;
  project_id: string;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  query_suggestion: string;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  context_data?: Record<string, any>;
  viewed_by_users: string[];
  dismissed_by?: string;
  dismissed_at?: string;
  acted_upon_at?: string;
  created_at: string;
  expires_at?: string;
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
  // V2 additions
  is_voice_input?: boolean;
  voice_transcript?: string;
  voice_duration_seconds?: number;
  action_executed?: string;
  action_result?: ActionResult;
  action_status?: ActionStatus;
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
// V2: Voice API Types
// ============================================================================

/**
 * Transcribe audio request
 */
export interface TranscribeRequest {
  audio: File | Blob;
  language?: string;
}

/**
 * Transcribe audio response
 */
export interface TranscribeResponse {
  success: boolean;
  transcription?: TranscriptionResult;
  error?: string;
}

// ============================================================================
// V2: Action API Types
// ============================================================================

/**
 * Detect action intent request
 */
export interface DetectActionRequest {
  query: string;
  projectId: string;
  conversationContext?: Message[];
}

/**
 * Detect action intent response
 */
export interface DetectActionResponse {
  success: boolean;
  intent?: ActionIntent;
  error?: string;
}

/**
 * Execute action request
 */
export interface ExecuteActionRequest {
  messageId: string;
  projectId: string;
  actionType: ActionType;
  parameters: Record<string, any>;
}

/**
 * Execute action response
 */
export interface ExecuteActionResponse {
  success: boolean;
  execution?: ActionExecution;
  result?: ActionResult;
  error?: string;
}

// ============================================================================
// V2: Scheduled Queries API Types
// ============================================================================

/**
 * Create scheduled query request
 */
export interface CreateScheduledQueryRequest {
  projectId: string;
  query_text: string;
  frequency: ScheduleFrequency;
  day_of_week?: number;
  day_of_month?: number;
  time_utc: string;
  delivery_method: DeliveryMethod;
  slack_channel_id?: string;
}

/**
 * Create scheduled query response
 */
export interface CreateScheduledQueryResponse {
  success: boolean;
  scheduled_query?: ScheduledQuery;
  error?: string;
}

/**
 * List scheduled queries response
 */
export interface ListScheduledQueriesResponse {
  success: boolean;
  queries?: ScheduledQuery[];
  error?: string;
}

/**
 * Update scheduled query request
 */
export interface UpdateScheduledQueryRequest {
  queryId: string;
  is_active?: boolean;
  query_text?: string;
  frequency?: ScheduleFrequency;
  day_of_week?: number;
  day_of_month?: number;
  time_utc?: string;
  delivery_method?: DeliveryMethod;
  slack_channel_id?: string;
}

/**
 * Update scheduled query response
 */
export interface UpdateScheduledQueryResponse {
  success: boolean;
  scheduled_query?: ScheduledQuery;
  error?: string;
}

// ============================================================================
// V2: Proactive Suggestions API Types
// ============================================================================

/**
 * List proactive suggestions response
 */
export interface ListProactiveSuggestionsResponse {
  success: boolean;
  suggestions?: ProactiveSuggestion[];
  error?: string;
}

/**
 * Dismiss suggestion request
 */
export interface DismissSuggestionRequest {
  suggestionId: string;
}

/**
 * Dismiss suggestion response
 */
export interface DismissSuggestionResponse {
  success: boolean;
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
