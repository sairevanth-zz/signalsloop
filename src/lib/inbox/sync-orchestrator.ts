/**
 * Sync Orchestrator
 * Manages syncing feedback from all connected integrations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseSyncer } from './base-syncer';
import {
  IntegrationType,
  FeedbackIntegration,
  SyncResult,
  SyncLog,
} from './types';

// Import individual syncers
import { IntercomSyncer } from './syncers/intercom-syncer';
import { SlackSyncer } from './syncers/slack-syncer';
import { DiscordSyncer } from './syncers/discord-syncer';
import { GmailSyncer } from './syncers/gmail-syncer';
import { TwitterSyncer } from './syncers/twitter-syncer';
import { RedditSyncer } from './syncers/reddit-syncer';
import { G2Syncer } from './syncers/g2-syncer';
import { AppStoreSyncer } from './syncers/appstore-syncer';

export class SyncOrchestrator {
  private supabase: SupabaseClient;
  private syncers: Map<IntegrationType, BaseSyncer>;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Initialize all available syncers
    this.syncers = new Map();
    this.syncers.set('intercom', new IntercomSyncer());
    this.syncers.set('slack', new SlackSyncer());
    this.syncers.set('discord', new DiscordSyncer());
    this.syncers.set('email_gmail', new GmailSyncer());
    this.syncers.set('twitter', new TwitterSyncer());
    this.syncers.set('reddit', new RedditSyncer());
    this.syncers.set('g2', new G2Syncer());
    this.syncers.set('app_store', new AppStoreSyncer());
  }
  
  /**
   * Sync all active integrations for a project
   */
  async syncProject(projectId: string): Promise<SyncResult[]> {
    const integrations = await this.getActiveIntegrations(projectId);
    const results: SyncResult[] = [];
    
    console.log(`[SyncOrchestrator] Syncing ${integrations.length} integrations for project ${projectId}`);
    
    for (const integration of integrations) {
      const result = await this.syncIntegration(integration);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Sync a single integration
   */
  async syncIntegration(integration: FeedbackIntegration): Promise<SyncResult> {
    const syncer = this.syncers.get(integration.integrationType);
    
    if (!syncer) {
      console.warn(`[SyncOrchestrator] No syncer available for ${integration.integrationType}`);
      return {
        integrationId: integration.id,
        integrationType: integration.integrationType,
        status: 'failed',
        itemsFound: 0,
        itemsImported: 0,
        itemsDuplicates: 0,
        itemsErrors: 0,
        errorMessage: `No syncer available for ${integration.integrationType}`,
        durationMs: 0,
      };
    }
    
    try {
      console.log(`[SyncOrchestrator] Starting sync for ${integration.integrationType} (${integration.id})`);
      const result = await syncer.sync(integration);
      
      // Log completed sync
      await this.logSyncComplete(integration, result);
      
      console.log(`[SyncOrchestrator] Sync complete: ${result.itemsImported} imported, ${result.itemsDuplicates} duplicates`);
      return result;
      
    } catch (error) {
      console.error(`[SyncOrchestrator] Sync error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logSyncError(integration, errorMessage);
      
      return {
        integrationId: integration.id,
        integrationType: integration.integrationType,
        status: 'failed',
        itemsFound: 0,
        itemsImported: 0,
        itemsDuplicates: 0,
        itemsErrors: 1,
        errorMessage,
        durationMs: 0,
      };
    }
  }
  
  /**
   * Sync all integrations due for scheduled sync
   */
  async syncDueIntegrations(): Promise<Map<string, SyncResult[]>> {
    const results = new Map<string, SyncResult[]>();
    
    // Get all integrations that are due for sync
    const { data: integrations, error } = await this.supabase
      .from('feedback_integrations')
      .select('*')
      .eq('is_active', true)
      .eq('sync_enabled', true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${this.getMinSyncTime()}`);
    
    if (error || !integrations) {
      console.error('[SyncOrchestrator] Error fetching due integrations:', error);
      return results;
    }
    
    // Group by project
    const byProject = new Map<string, FeedbackIntegration[]>();
    for (const raw of integrations) {
      const integration = this.mapIntegration(raw);
      const projectIntegrations = byProject.get(integration.projectId) || [];
      projectIntegrations.push(integration);
      byProject.set(integration.projectId, projectIntegrations);
    }
    
    // Sync each project's integrations
    for (const [projectId, projectIntegrations] of byProject) {
      const projectResults: SyncResult[] = [];
      
      for (const integration of projectIntegrations) {
        const result = await this.syncIntegration(integration);
        projectResults.push(result);
        
        // Small delay between integrations to avoid rate limiting
        await this.delay(500);
      }
      
      results.set(projectId, projectResults);
    }
    
    return results;
  }
  
  /**
   * Get active integrations for a project
   */
  async getActiveIntegrations(projectId: string): Promise<FeedbackIntegration[]> {
    const { data, error } = await this.supabase
      .from('feedback_integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);
    
    if (error || !data) {
      console.error('[SyncOrchestrator] Error fetching integrations:', error);
      return [];
    }
    
    return data.map(this.mapIntegration);
  }
  
  /**
   * Get all integrations for a project
   */
  async getAllIntegrations(projectId: string): Promise<FeedbackIntegration[]> {
    const { data, error } = await this.supabase
      .from('feedback_integrations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error || !data) {
      console.error('[SyncOrchestrator] Error fetching integrations:', error);
      return [];
    }
    
    return data.map(this.mapIntegration);
  }
  
  /**
   * Create a new integration
   */
  async createIntegration(
    projectId: string,
    integrationType: IntegrationType,
    displayName: string,
    credentials: Record<string, any>,
    config: Record<string, any>
  ): Promise<FeedbackIntegration | null> {
    const { data, error } = await this.supabase
      .from('feedback_integrations')
      .insert({
        project_id: projectId,
        integration_type: integrationType,
        display_name: displayName,
        credentials,
        config,
        is_active: true,
        is_connected: true,
        connection_verified_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error || !data) {
      console.error('[SyncOrchestrator] Error creating integration:', error);
      return null;
    }
    
    return this.mapIntegration(data);
  }
  
  /**
   * Update integration credentials
   */
  async updateCredentials(
    integrationId: string,
    credentials: Record<string, any>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('feedback_integrations')
      .update({
        credentials,
        is_connected: true,
        connection_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId);
    
    return !error;
  }
  
  /**
   * Update integration config
   */
  async updateConfig(
    integrationId: string,
    config: Record<string, any>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('feedback_integrations')
      .update({
        config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId);
    
    return !error;
  }
  
  /**
   * Deactivate integration
   */
  async deactivateIntegration(integrationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('feedback_integrations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId);
    
    return !error;
  }
  
  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('feedback_integrations')
      .delete()
      .eq('id', integrationId);
    
    return !error;
  }
  
  /**
   * Test integration connection
   */
  async testConnection(integration: FeedbackIntegration): Promise<{ success: boolean; error?: string }> {
    const syncer = this.syncers.get(integration.integrationType);
    
    if (!syncer) {
      return { success: false, error: `No syncer available for ${integration.integrationType}` };
    }
    
    try {
      // Try to fetch with a small limit to test connection
      await syncer.fetchFeedback({
        ...integration,
        config: { ...integration.config, limit: 1 },
      } as FeedbackIntegration);
      
      // Update connection status
      await this.supabase
        .from('feedback_integrations')
        .update({
          is_connected: true,
          connection_verified_at: new Date().toISOString(),
        })
        .eq('id', integration.id);
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      
      await this.supabase
        .from('feedback_integrations')
        .update({
          is_connected: false,
          last_sync_error: errorMessage,
        })
        .eq('id', integration.id);
      
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * Get sync logs for an integration
   */
  async getSyncLogs(integrationId: string, limit = 20): Promise<SyncLog[]> {
    const { data, error } = await this.supabase
      .from('inbox_sync_logs')
      .select('*')
      .eq('integration_id', integrationId)
      .order('started_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(log => ({
      id: log.id,
      projectId: log.project_id,
      integrationId: log.integration_id,
      syncType: log.sync_type,
      status: log.status,
      itemsFound: log.items_found,
      itemsImported: log.items_imported,
      itemsDuplicates: log.items_duplicates,
      itemsErrors: log.items_errors,
      errorMessage: log.error_message,
      errorDetails: log.error_details,
      startedAt: new Date(log.started_at),
      completedAt: log.completed_at ? new Date(log.completed_at) : undefined,
      durationMs: log.duration_ms,
      metadata: log.metadata,
    }));
  }
  
  /**
   * Log completed sync
   */
  private async logSyncComplete(integration: FeedbackIntegration, result: SyncResult): Promise<void> {
    await this.supabase.from('inbox_sync_logs').insert({
      project_id: integration.projectId,
      integration_id: integration.id,
      sync_type: 'scheduled',
      status: 'completed',
      items_found: result.itemsFound,
      items_imported: result.itemsImported,
      items_duplicates: result.itemsDuplicates,
      items_errors: result.itemsErrors,
      duration_ms: result.durationMs,
      error_message: result.errorMessage,
    });
  }
  
  /**
   * Log sync error
   */
  private async logSyncError(integration: FeedbackIntegration, errorMessage: string): Promise<void> {
    await this.supabase.from('inbox_sync_logs').insert({
      project_id: integration.projectId,
      integration_id: integration.id,
      sync_type: 'scheduled',
      status: 'failed',
      error_message: errorMessage,
    });
  }
  
  /**
   * Get minimum sync time (now - default sync frequency)
   */
  private getMinSyncTime(): string {
    const minTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    return minTime.toISOString();
  }
  
  /**
   * Map raw database row to FeedbackIntegration
   */
  private mapIntegration(row: any): FeedbackIntegration {
    return {
      id: row.id,
      projectId: row.project_id,
      integrationType: row.integration_type,
      displayName: row.display_name,
      iconUrl: row.icon_url,
      credentials: row.credentials || {},
      config: row.config || {},
      syncEnabled: row.sync_enabled,
      syncFrequencyMinutes: row.sync_frequency_minutes,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
      lastSyncStatus: row.last_sync_status,
      lastSyncError: row.last_sync_error,
      lastSyncItemsCount: row.last_sync_items_count || 0,
      totalItemsSynced: row.total_items_synced || 0,
      totalItemsThisMonth: row.total_items_this_month || 0,
      isActive: row.is_active,
      isConnected: row.is_connected,
      connectionVerifiedAt: row.connection_verified_at ? new Date(row.connection_verified_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const syncOrchestrator = new SyncOrchestrator();
