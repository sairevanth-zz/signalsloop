/**
 * Universal Inbox Module
 * Exports all inbox-related functionality
 */

// Types
export * from './types';

// Services
export { InboxService, inboxService } from './inbox-service';
export { SyncOrchestrator, syncOrchestrator } from './sync-orchestrator';
export { BaseSyncer } from './base-syncer';

// Syncers
export { IntercomSyncer } from './syncers/intercom-syncer';
export { SlackSyncer } from './syncers/slack-syncer';
export { DiscordSyncer } from './syncers/discord-syncer';
export { GmailSyncer } from './syncers/gmail-syncer';
export { TwitterSyncer } from './syncers/twitter-syncer';
export { RedditSyncer } from './syncers/reddit-syncer';
export { G2Syncer } from './syncers/g2-syncer';
export { AppStoreSyncer } from './syncers/appstore-syncer';
