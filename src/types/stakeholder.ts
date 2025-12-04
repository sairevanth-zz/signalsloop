/**
 * Conversational Stakeholder Interface - Type Definitions
 * Feature E: Gen 3
 */

// ============================================================================
// Stakeholder Types
// ============================================================================

export type StakeholderRole = 'ceo' | 'sales' | 'engineering' | 'marketing' | 'customer_success' | 'product';

// ============================================================================
// Component Types
// ============================================================================

export interface DataSource {
  type: 'feedback' | 'theme' | 'competitor' | 'metric' | 'roadmap' | 'prd';
  id: string;
  title?: string;
  preview?: string;
}

/**
 * Base component props
 */
export interface BaseComponentProps {
  order: number;
}

/**
 * SummaryText component props
 */
export interface SummaryTextProps extends BaseComponentProps {
  content: string;
  sources: DataSource[];
}

/**
 * MetricCard component props
 */
export interface MetricCardProps extends BaseComponentProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  delta?: string;
  description?: string;
}

/**
 * SentimentChart component props
 */
export interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface SentimentChartProps extends BaseComponentProps {
  data: DataPoint[];
  timeRange: '7d' | '30d' | '90d' | 'all';
  title?: string;
}

/**
 * FeedbackList component props
 */
export interface FeedbackItem {
  id: string;
  title: string;
  content?: string;
  sentiment?: number;
  source?: string;
  created_at: string;
  themes?: string[];
}

export interface FeedbackListProps extends BaseComponentProps {
  items: FeedbackItem[];
  limit?: number;
  showSentiment?: boolean;
  title?: string;
}

/**
 * ActionCard component props
 */
export interface ActionCardProps extends BaseComponentProps {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cta: string;
  actionUrl?: string;
  actionType?: 'create_prd' | 'escalate' | 'notify' | 'review';
}

/**
 * CompetitorCompare component props
 */
export interface CompetitorMetric {
  name: string;
  value: string | number;
  advantage?: 'yours' | 'theirs' | 'tie';
}

export interface CompetitorCompareProps extends BaseComponentProps {
  competitors: string[];
  metrics: CompetitorMetric[];
  title?: string;
}

/**
 * ThemeCloud component props
 */
export interface Theme {
  name: string;
  count: number;
  sentiment?: number;
  trend?: 'rising' | 'falling' | 'stable';
}

export interface ThemeCloudProps extends BaseComponentProps {
  themes: Theme[];
  maxThemes?: number;
  title?: string;
}

/**
 * TimelineEvents component props
 */
export interface TimelineEvent {
  id: string;
  type: 'feature_launch' | 'feedback_spike' | 'competitor_move' | 'milestone' | 'issue';
  title: string;
  description: string;
  date: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

export interface TimelineEventsProps extends BaseComponentProps {
  events: TimelineEvent[];
  filterByType?: TimelineEvent['type'][];
  title?: string;
}

/**
 * Union type for all component props
 */
export type ComponentProps =
  | SummaryTextProps
  | MetricCardProps
  | SentimentChartProps
  | FeedbackListProps
  | ActionCardProps
  | CompetitorCompareProps
  | ThemeCloudProps
  | TimelineEventsProps;

/**
 * Component specification
 */
export interface ComponentSpec {
  type: 'SummaryText' | 'MetricCard' | 'SentimentChart' | 'FeedbackList' | 'ActionCard' | 'CompetitorCompare' | 'ThemeCloud' | 'TimelineEvents';
  order: number;
  props: Record<string, any>;
  data_query?: {
    type: 'feedback' | 'themes' | 'competitors' | 'metrics' | 'events';
    filter?: string;
    limit?: number;
    params?: Record<string, any>;
  };
}

// ============================================================================
// Query & Response Types
// ============================================================================

/**
 * Stakeholder query
 */
export interface StakeholderQuery {
  id: string;
  project_id: string;
  user_id: string;
  query_text: string;
  user_role: StakeholderRole;
  response_components: ComponentSpec[];
  follow_up_questions: string[];
  generation_time_ms?: number;
  model_used?: string;
  tokens_used?: number;
  rating?: number;
  feedback_text?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Query request payload
 */
export interface QueryRequest {
  query: string;
  role?: StakeholderRole;
  context?: {
    previous_queries?: string[];
    focus_area?: string;
  };
}

/**
 * Query response payload
 */
export interface QueryResponse {
  query_id: string;
  components: ComponentSpec[];
  follow_up_questions: string[];
  metadata: {
    generation_time_ms: number;
    model_used: string;
    tokens_used?: number;
  };
}

/**
 * Component data fetching result
 */
export interface ComponentDataResult {
  data: any;
  error?: string;
}

// ============================================================================
// AI Generation Types
// ============================================================================

/**
 * GPT-4o component selection response
 */
export interface ComponentSelectionResponse {
  components: ComponentSpec[];
  follow_up_questions: string[];
  reasoning?: string;
}

/**
 * Context data for AI generation
 */
export interface ContextData {
  sentiment?: number;
  themes?: Array<{ name: string; count: number; sentiment?: number }>;
  competitor_events?: Array<{ competitor: string; event: string; date: string }>;
  metrics?: {
    feedback_count: number;
    avg_sentiment: number;
    theme_count: number;
    recent_activity: number;
  };
  recent_feedback?: Array<{ id: string; title: string; sentiment: number }>;
}
