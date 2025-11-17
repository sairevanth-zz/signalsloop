/**
 * TypeScript Type Definitions for Jira Integration
 */

// ============================================================================
// Database Types
// ============================================================================

export type JiraConnectionStatus = 'active' | 'expired' | 'disconnected' | 'error';
export type JiraWebhookStatus = 'active' | 'failed' | 'disabled';
export type JiraSyncAction =
  | 'issue_created'
  | 'issue_updated'
  | 'status_synced'
  | 'webhook_received'
  | 'token_refreshed'
  | 'connection_created'
  | 'connection_disconnected';

export interface JiraConnection {
  id: string;
  user_id: string;
  project_id: string;
  cloud_id: string;
  site_url: string;
  site_name?: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  scopes: string[];
  default_project_key?: string;
  default_issue_type?: string;
  default_priority?: string;
  default_assignee_id?: string;
  status: JiraConnectionStatus;
  last_error?: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JiraIssueLink {
  id: string;
  feedback_id: string;
  jira_connection_id: string;
  issue_key: string;
  issue_id: string;
  issue_url: string;
  project_key: string;
  issue_type: string;
  status: string;
  priority?: string;
  summary: string;
  assignee?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  sprint_id?: string;
  sprint_name?: string;
  epic_key?: string;
  sync_enabled: boolean;
  last_synced_at?: string;
  created_in_jira_at: string;
  created_at: string;
  updated_at: string;
}

export interface JiraWebhook {
  id: string;
  jira_connection_id: string;
  webhook_id: string;
  webhook_url: string;
  events: string[];
  secret: string;
  status: JiraWebhookStatus;
  last_error?: string;
  last_triggered_at?: string;
  total_events_received: number;
  failed_events: number;
  created_at: string;
  updated_at: string;
}

export interface JiraLabelMapping {
  id: string;
  project_id: string;
  theme_id: string;
  jira_labels: string[];
  auto_apply: boolean;
  created_at: string;
  updated_at: string;
}

export interface JiraSyncLog {
  id: string;
  jira_connection_id?: string;
  action: JiraSyncAction;
  jira_issue_key?: string;
  success: boolean;
  error_message?: string;
  error_stack?: string;
  details?: Record<string, any>;
  duration_ms?: number;
  user_id?: string;
  created_at: string;
}

export interface JiraOAuthState {
  id: string;
  state_token: string;
  user_id: string;
  project_id: string;
  expires_at: string;
  consumed: boolean;
  consumed_at?: string;
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateJiraIssueRequest {
  feedback_id: string;
  connection_id: string;
  project_key?: string;
  issue_type?: string;
  use_ai?: boolean;
  manual_summary?: string;
  manual_description?: string;
  manual_priority?: string;
  manual_labels?: string[];
}

export interface CreateJiraIssueResponse {
  success: boolean;
  issue: {
    id: string;
    key: string;
    url: string;
    summary: string;
    status: string;
    priority?: string;
  };
  link_id?: string;
}

export interface BulkCreateJiraIssuesRequest {
  feedback_ids: string[];
  connection_id: string;
  project_key?: string;
  issue_type?: string;
  create_epic?: boolean;
  theme_name?: string;
}

export interface BulkCreateJiraIssuesResponse {
  success: boolean;
  created_count: number;
  error_count: number;
  epic?: {
    key: string;
    url: string;
  };
  issues: Array<{
    feedback_id: string;
    key: string;
    url: string;
    summary: string;
  }>;
  errors?: Array<{
    feedback_id?: string;
    type?: string;
    error: string;
  }>;
}

export interface JiraConnectionInfo {
  id: string;
  site_url: string;
  site_name?: string;
  status: JiraConnectionStatus;
  default_project_key?: string;
  last_sync_at?: string;
  created_at: string;
}

export interface JiraSyncStats {
  total_issues_created: number;
  issues_created_today: number;
  issues_created_this_week: number;
  total_sync_events: number;
  successful_syncs: number;
  failed_syncs: number;
  last_sync_at?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ConnectJiraButtonProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export interface CreateIssueModalProps {
  feedbackId: string;
  connectionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (issueKey: string, issueUrl: string) => void;
}

export interface JiraIssueBadgeProps {
  issueLink: JiraIssueLink;
  showStatus?: boolean;
  showPriority?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface IssueStatusSyncProps {
  issueLink: JiraIssueLink;
  showTimeline?: boolean;
  className?: string;
}

export interface JiraSettingsProps {
  projectId: string;
  connection?: JiraConnection;
  onConnectionChange?: () => void;
}

export interface BulkIssueCreatorProps {
  feedbackIds: string[];
  connectionId: string;
  themeName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: BulkCreateJiraIssuesResponse) => void;
}

// ============================================================================
// Jira API Types (from Jira REST API)
// ============================================================================

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  subtask: boolean;
  iconUrl?: string;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active: boolean;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    id: number;
    key: string;
    name: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export interface FeedbackForJira {
  id: string;
  content: string;
  platform: string;
  sentiment_score?: number;
  theme_name?: string;
  classification?: string;
  urgency_score?: number;
  author_username?: string;
  platform_url?: string;
}

export interface GeneratedJiraIssue {
  summary: string;
  description: any; // ADF format
  descriptionMarkdown: string;
  priority: string;
  labels: string[];
  issueType: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class JiraIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'JiraIntegrationError';
  }
}

export type JiraErrorCode =
  | 'CONNECTION_NOT_FOUND'
  | 'CONNECTION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'ISSUE_ALREADY_EXISTS'
  | 'FEEDBACK_NOT_FOUND'
  | 'TOKEN_REFRESH_FAILED'
  | 'API_ERROR'
  | 'WEBHOOK_ERROR'
  | 'INVALID_CONFIGURATION';
