/**
 * Universal Inbox Types
 * Type definitions for the unified feedback inbox system
 */

// ============================================================================
// Integration Types
// ============================================================================

export type IntegrationType =
  | 'slack'
  | 'discord'
  | 'intercom'
  | 'zendesk'
  | 'email_gmail'
  | 'email_outlook'
  | 'twitter'
  | 'g2'
  | 'app_store'
  | 'play_store'
  | 'reddit'
  | 'producthunt'
  | 'hackernews'
  | 'typeform'
  | 'widget';

export interface IntegrationConfig {
  // Common config
  enabled: boolean;
  syncFrequencyMinutes: number;
  
  // Source-specific config
  channels?: string[]; // Slack/Discord channels to monitor
  keywords?: string[]; // Keywords to filter
  excludeKeywords?: string[];
  minEngagement?: number; // Minimum likes/upvotes
  languages?: string[];
  
  // For email
  inboxEmail?: string;
  labelFilter?: string;
  
  // For app stores
  appId?: string;
  countries?: string[];
}

export interface IntegrationCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  workspaceId?: string;
  webhookSecret?: string;
  expiresAt?: string;
}

export interface FeedbackIntegration {
  id: string;
  projectId: string;
  integrationType: IntegrationType;
  displayName: string;
  iconUrl?: string;
  credentials: IntegrationCredentials;
  config: IntegrationConfig;
  syncEnabled: boolean;
  syncFrequencyMinutes: number;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failed' | 'partial';
  lastSyncError?: string;
  lastSyncItemsCount: number;
  totalItemsSynced: number;
  totalItemsThisMonth: number;
  isActive: boolean;
  isConnected: boolean;
  connectionVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Customer Types
// ============================================================================

export interface CustomerIdentities {
  [source: string]: string; // e.g., { slack: 'U123', intercom: 'user_456' }
}

export interface Customer {
  id: string;
  projectId: string;
  email?: string;
  name?: string;
  company?: string;
  avatarUrl?: string;
  identities: CustomerIdentities;
  totalFeedbackCount: number;
  averageSentiment: number;
  lastFeedbackAt?: Date;
  firstSeenAt: Date;
  crmId?: string;
  crmSource?: 'hubspot' | 'salesforce';
  mrr?: number;
  arr?: number;
  planName?: string;
  customerSince?: Date;
  healthScore?: number;
  churnRisk?: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Feedback Item Types
// ============================================================================

export type FeedbackCategory =
  | 'bug'
  | 'feature_request'
  | 'praise'
  | 'complaint'
  | 'question'
  | 'churn_risk'
  | 'other';

export type FeedbackStatus =
  | 'new'
  | 'read'
  | 'starred'
  | 'replied'
  | 'archived'
  | 'converted'
  | 'spam';

export type SentimentLabel = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface EngagementMetrics {
  likes?: number;
  shares?: number;
  comments?: number;
  replies?: number;
  upvotes?: number;
  downvotes?: number;
  retweets?: number;
  score?: number;
  views?: number;
}

export interface AuthorMetadata {
  profileUrl?: string;
  followerCount?: number;
  isVerified?: boolean;
  accountAge?: string;
  role?: string;
  company?: string;
  [key: string]: any;
}

export interface UnifiedFeedbackItem {
  id: string;
  projectId: string;
  integrationId?: string;
  
  // Source
  sourceType: IntegrationType;
  sourceId?: string;
  sourceUrl?: string;
  sourceChannel?: string;
  sourceThreadId?: string;
  
  // Content
  title?: string;
  content: string;
  contentHtml?: string;
  contentPlain?: string;
  language: string;
  
  // Author
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  authorMetadata: AuthorMetadata;
  
  // Customer linking
  customerId?: string;
  customer?: Customer;
  
  // Classification
  category?: FeedbackCategory;
  categoryConfidence?: number;
  sentimentScore?: number;
  sentimentLabel?: SentimentLabel;
  urgencyScore?: number;
  urgencyReason?: string;
  tags: string[];
  aiSummary?: string;
  
  // Deduplication
  contentHash?: string;
  duplicateOf?: string;
  duplicateConfidence?: number;
  isDuplicate: boolean;
  
  // Engagement
  engagementMetrics: EngagementMetrics;
  engagementScore: number;
  
  // Status
  status: FeedbackStatus;
  starred: boolean;
  readAt?: Date;
  readBy?: string;
  
  // Reply
  repliedAt?: Date;
  repliedBy?: string;
  replyContent?: string;
  replySentVia?: string;
  
  // Conversion
  convertedToPostId?: string;
  convertedAt?: Date;
  convertedBy?: string;
  
  // Timestamps
  originalCreatedAt: Date;
  importedAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncResult {
  integrationId: string;
  integrationType: IntegrationType;
  status: 'success' | 'failed' | 'partial';
  itemsFound: number;
  itemsImported: number;
  itemsDuplicates: number;
  itemsErrors: number;
  errorMessage?: string;
  errorDetails?: any;
  durationMs: number;
}

export interface SyncLog {
  id: string;
  projectId: string;
  integrationId: string;
  syncType: 'scheduled' | 'manual' | 'webhook';
  status: 'started' | 'completed' | 'failed';
  itemsFound: number;
  itemsImported: number;
  itemsDuplicates: number;
  itemsErrors: number;
  errorMessage?: string;
  errorDetails?: any;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Raw Feedback (from source, before processing)
// ============================================================================

export interface RawFeedbackItem {
  sourceType: IntegrationType;
  sourceId: string;
  sourceUrl?: string;
  sourceChannel?: string;
  sourceThreadId?: string;
  
  title?: string;
  content: string;
  contentHtml?: string;
  
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  authorMetadata?: AuthorMetadata;
  
  engagementMetrics?: EngagementMetrics;
  
  originalCreatedAt: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface InboxFilters {
  status?: FeedbackStatus | FeedbackStatus[];
  category?: FeedbackCategory | FeedbackCategory[];
  sourceType?: IntegrationType | IntegrationType[];
  sentimentMin?: number;
  sentimentMax?: number;
  urgencyMin?: number;
  starred?: boolean;
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

export interface InboxSortOptions {
  field: 'originalCreatedAt' | 'importedAt' | 'urgencyScore' | 'sentimentScore' | 'engagementScore';
  direction: 'asc' | 'desc';
}

export interface InboxPagination {
  page: number;
  limit: number;
}

export interface InboxListResponse {
  items: UnifiedFeedbackItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface InboxStats {
  totalItems: number;
  newItems: number;
  unreadItems: number;
  starredItems: number;
  itemsToday: number;
  itemsThisWeek: number;
  avgSentiment: number;
  byCategory: Record<FeedbackCategory, number>;
  bySource: Record<IntegrationType, number>;
}

// ============================================================================
// Integration Setup Types
// ============================================================================

export interface IntegrationSetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface IntegrationSetupConfig {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  authType: 'oauth' | 'api_key' | 'webhook' | 'none';
  oauthUrl?: string;
  requiredFields?: string[];
  setupSteps: IntegrationSetupStep[];
  category: 'communication' | 'support' | 'review' | 'social' | 'survey' | 'custom';
}

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationSetupConfig> = {
  slack: {
    type: 'slack',
    name: 'Slack',
    description: 'Import feedback from Slack channels',
    icon: '/integrations/slack.svg',
    authType: 'oauth',
    category: 'communication',
    setupSteps: [
      { id: 'connect', title: 'Connect Slack', description: 'Authorize SignalsLoop to access your Slack workspace', completed: false },
      { id: 'channels', title: 'Select Channels', description: 'Choose which channels to monitor for feedback', completed: false },
    ],
  },
  discord: {
    type: 'discord',
    name: 'Discord',
    description: 'Import feedback from Discord servers',
    icon: '/integrations/discord.svg',
    authType: 'oauth',
    category: 'communication',
    setupSteps: [
      { id: 'connect', title: 'Connect Discord', description: 'Add SignalsLoop bot to your Discord server', completed: false },
      { id: 'channels', title: 'Select Channels', description: 'Choose which channels to monitor', completed: false },
    ],
  },
  intercom: {
    type: 'intercom',
    name: 'Intercom',
    description: 'Import conversations from Intercom',
    icon: '/integrations/intercom.svg',
    authType: 'oauth',
    category: 'support',
    setupSteps: [
      { id: 'connect', title: 'Connect Intercom', description: 'Authorize access to your Intercom workspace', completed: false },
      { id: 'configure', title: 'Configure Sync', description: 'Set up conversation filters and sync frequency', completed: false },
    ],
  },
  zendesk: {
    type: 'zendesk',
    name: 'Zendesk',
    description: 'Import tickets from Zendesk',
    icon: '/integrations/zendesk.svg',
    authType: 'oauth',
    category: 'support',
    setupSteps: [
      { id: 'connect', title: 'Connect Zendesk', description: 'Authorize access to your Zendesk account', completed: false },
      { id: 'configure', title: 'Configure Sync', description: 'Set up ticket filters', completed: false },
    ],
  },
  email_gmail: {
    type: 'email_gmail',
    name: 'Gmail',
    description: 'Import feedback from Gmail inbox',
    icon: '/integrations/gmail.svg',
    authType: 'oauth',
    category: 'communication',
    setupSteps: [
      { id: 'connect', title: 'Connect Gmail', description: 'Authorize access to your Gmail account', completed: false },
      { id: 'configure', title: 'Configure Filters', description: 'Set up email filters and labels', completed: false },
    ],
  },
  email_outlook: {
    type: 'email_outlook',
    name: 'Outlook',
    description: 'Import feedback from Outlook inbox',
    icon: '/integrations/outlook.svg',
    authType: 'oauth',
    category: 'communication',
    setupSteps: [
      { id: 'connect', title: 'Connect Outlook', description: 'Authorize access to your Outlook account', completed: false },
      { id: 'configure', title: 'Configure Filters', description: 'Set up email filters', completed: false },
    ],
  },
  twitter: {
    type: 'twitter',
    name: 'Twitter/X',
    description: 'Monitor mentions and keywords on Twitter',
    icon: '/integrations/twitter.svg',
    authType: 'api_key',
    category: 'social',
    setupSteps: [
      { id: 'credentials', title: 'Enter API Credentials', description: 'Provide your Twitter API keys', completed: false },
      { id: 'keywords', title: 'Set Keywords', description: 'Define keywords and mentions to track', completed: false },
    ],
  },
  g2: {
    type: 'g2',
    name: 'G2',
    description: 'Import reviews from G2',
    icon: '/integrations/g2.svg',
    authType: 'api_key',
    category: 'review',
    setupSteps: [
      { id: 'credentials', title: 'Enter G2 API Key', description: 'Provide your G2 API credentials', completed: false },
      { id: 'product', title: 'Select Product', description: 'Choose which G2 product to monitor', completed: false },
    ],
  },
  app_store: {
    type: 'app_store',
    name: 'App Store',
    description: 'Import reviews from Apple App Store',
    icon: '/integrations/appstore.svg',
    authType: 'none',
    category: 'review',
    setupSteps: [
      { id: 'appId', title: 'Enter App ID', description: 'Provide your App Store app ID', completed: false },
      { id: 'countries', title: 'Select Countries', description: 'Choose which countries to monitor', completed: false },
    ],
  },
  play_store: {
    type: 'play_store',
    name: 'Google Play',
    description: 'Import reviews from Google Play Store',
    icon: '/integrations/playstore.svg',
    authType: 'none',
    category: 'review',
    setupSteps: [
      { id: 'appId', title: 'Enter Package Name', description: 'Provide your Play Store package name', completed: false },
    ],
  },
  reddit: {
    type: 'reddit',
    name: 'Reddit',
    description: 'Monitor subreddits for feedback',
    icon: '/integrations/reddit.svg',
    authType: 'none',
    category: 'social',
    setupSteps: [
      { id: 'subreddits', title: 'Select Subreddits', description: 'Choose subreddits to monitor', completed: false },
      { id: 'keywords', title: 'Set Keywords', description: 'Define keywords to track', completed: false },
    ],
  },
  producthunt: {
    type: 'producthunt',
    name: 'Product Hunt',
    description: 'Import feedback from Product Hunt',
    icon: '/integrations/producthunt.svg',
    authType: 'none',
    category: 'review',
    setupSteps: [
      { id: 'product', title: 'Enter Product URL', description: 'Provide your Product Hunt product URL', completed: false },
    ],
  },
  hackernews: {
    type: 'hackernews',
    name: 'Hacker News',
    description: 'Monitor Hacker News for mentions',
    icon: '/integrations/hackernews.svg',
    authType: 'none',
    category: 'social',
    setupSteps: [
      { id: 'keywords', title: 'Set Keywords', description: 'Define keywords to track', completed: false },
    ],
  },
  typeform: {
    type: 'typeform',
    name: 'Typeform',
    description: 'Import survey responses from Typeform',
    icon: '/integrations/typeform.svg',
    authType: 'oauth',
    category: 'survey',
    setupSteps: [
      { id: 'connect', title: 'Connect Typeform', description: 'Authorize access to your Typeform account', completed: false },
      { id: 'forms', title: 'Select Forms', description: 'Choose which forms to import', completed: false },
    ],
  },
  widget: {
    type: 'widget',
    name: 'In-App Widget',
    description: 'Feedback from your embedded widget',
    icon: '/integrations/widget.svg',
    authType: 'none',
    category: 'custom',
    setupSteps: [
      { id: 'installed', title: 'Widget Installed', description: 'Your widget is automatically connected', completed: true },
    ],
  },
};
