/**
 * Base Syncer Class
 * Abstract class for all integration syncers
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';
import {
  IntegrationType,
  FeedbackIntegration,
  RawFeedbackItem,
  UnifiedFeedbackItem,
  SyncResult,
  FeedbackCategory,
  SentimentLabel,
  EngagementMetrics,
} from './types';

export interface ClassificationResult {
  category: FeedbackCategory;
  categoryConfidence: number;
  sentimentScore: number;
  sentimentLabel: SentimentLabel;
  urgencyScore: number;
  urgencyReason: string;
  tags: string[];
  aiSummary: string;
}

export abstract class BaseSyncer {
  abstract integrationType: IntegrationType;
  
  protected supabase: SupabaseClient;
  protected openai: OpenAI;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  /**
   * Fetch raw feedback from the source
   * Must be implemented by each syncer
   */
  abstract fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]>;
  
  /**
   * Main sync method - fetches, processes, and stores feedback
   */
  async sync(integration: FeedbackIntegration): Promise<SyncResult> {
    const startTime = Date.now();
    let itemsFound = 0;
    let itemsImported = 0;
    let itemsDuplicates = 0;
    let itemsErrors = 0;
    let errorMessage: string | undefined;
    
    try {
      // Log sync start
      await this.logSyncStart(integration);
      
      // Fetch raw feedback from source
      const rawItems = await this.fetchFeedback(integration);
      itemsFound = rawItems.length;
      
      if (rawItems.length === 0) {
        return this.buildResult(integration, 'success', itemsFound, 0, 0, 0, startTime);
      }
      
      // Process each item
      for (const rawItem of rawItems) {
        try {
          // Check for duplicates
          const isDuplicate = await this.checkDuplicate(integration.projectId, rawItem);
          if (isDuplicate) {
            itemsDuplicates++;
            continue;
          }
          
          // Classify with AI
          const classification = await this.classify(rawItem);
          
          // Resolve or create customer
          const customerId = await this.resolveCustomer(
            integration.projectId,
            rawItem.authorEmail,
            rawItem.authorName,
            rawItem.sourceType,
            rawItem.authorId
          );
          
          // Store the feedback item
          await this.storeItem(integration, rawItem, classification, customerId);
          itemsImported++;
          
        } catch (itemError) {
          console.error(`[${this.integrationType}] Error processing item:`, itemError);
          itemsErrors++;
        }
      }
      
      // Update integration stats
      await this.updateIntegrationStats(integration.id, itemsImported, 'success');
      
      return this.buildResult(
        integration,
        itemsErrors > 0 ? 'partial' : 'success',
        itemsFound,
        itemsImported,
        itemsDuplicates,
        itemsErrors,
        startTime
      );
      
    } catch (error) {
      console.error(`[${this.integrationType}] Sync error:`, error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.updateIntegrationStats(integration.id, 0, 'failed', errorMessage);
      
      return this.buildResult(
        integration,
        'failed',
        itemsFound,
        itemsImported,
        itemsDuplicates,
        itemsErrors,
        startTime,
        errorMessage
      );
    }
  }
  
  /**
   * Classify feedback using AI
   */
  protected async classify(item: RawFeedbackItem): Promise<ClassificationResult> {
    const systemPrompt = `You are an expert at analyzing customer feedback. Analyze the following feedback and provide a detailed classification.

Return a JSON object with:
- category: one of 'bug', 'feature_request', 'praise', 'complaint', 'question', 'churn_risk', 'other'
- categoryConfidence: 0-1 confidence score
- sentimentScore: -1 to +1 (-1 = very negative, 0 = neutral, +1 = very positive)
- sentimentLabel: 'positive', 'negative', 'neutral', or 'mixed'
- urgencyScore: 1-5 (5 = critical/urgent, 1 = low priority)
- urgencyReason: brief explanation of urgency score
- tags: array of 3-5 relevant tags
- aiSummary: one sentence summary of the feedback`;

    const userPrompt = `Source: ${item.sourceType}
${item.title ? `Title: ${item.title}\n` : ''}
Content: ${item.content}
${item.authorName ? `Author: ${item.authorName}` : ''}
${item.engagementMetrics ? `Engagement: ${JSON.stringify(item.engagementMetrics)}` : ''}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        category: result.category || 'other',
        categoryConfidence: result.categoryConfidence || 0.5,
        sentimentScore: result.sentimentScore || 0,
        sentimentLabel: result.sentimentLabel || 'neutral',
        urgencyScore: result.urgencyScore || 3,
        urgencyReason: result.urgencyReason || '',
        tags: result.tags || [],
        aiSummary: result.aiSummary || '',
      };
    } catch (error) {
      console.error('[Classify] Error:', error);
      // Return default classification on error
      return {
        category: 'other',
        categoryConfidence: 0,
        sentimentScore: 0,
        sentimentLabel: 'neutral',
        urgencyScore: 3,
        urgencyReason: 'Classification failed',
        tags: [],
        aiSummary: '',
      };
    }
  }
  
  /**
   * Check if item already exists (by source ID or content hash)
   */
  protected async checkDuplicate(
    projectId: string,
    item: RawFeedbackItem
  ): Promise<boolean> {
    // Check by source ID first (exact match)
    if (item.sourceId) {
      const { data: existing } = await this.supabase
        .from('unified_feedback_items')
        .select('id')
        .eq('project_id', projectId)
        .eq('source_type', item.sourceType)
        .eq('source_id', item.sourceId)
        .single();
      
      if (existing) return true;
    }
    
    // Check by content hash (near-duplicate)
    const contentHash = this.hashContent(item.content);
    const { data: hashMatch } = await this.supabase
      .from('unified_feedback_items')
      .select('id')
      .eq('project_id', projectId)
      .eq('content_hash', contentHash)
      .single();
    
    return !!hashMatch;
  }
  
  /**
   * Resolve or create customer
   */
  protected async resolveCustomer(
    projectId: string,
    email?: string,
    name?: string,
    sourceType?: string,
    sourceId?: string
  ): Promise<string | null> {
    if (!email) return null;
    
    const { data } = await this.supabase.rpc('resolve_or_create_customer', {
      p_project_id: projectId,
      p_email: email,
      p_name: name || null,
      p_source_type: sourceType || null,
      p_source_id: sourceId || null,
    });
    
    return data;
  }
  
  /**
   * Store processed feedback item
   */
  protected async storeItem(
    integration: FeedbackIntegration,
    rawItem: RawFeedbackItem,
    classification: ClassificationResult,
    customerId: string | null
  ): Promise<void> {
    const contentHash = this.hashContent(rawItem.content);
    const contentPlain = this.stripHtml(rawItem.content);
    const engagementScore = this.calculateEngagementScore(rawItem.engagementMetrics);
    
    await this.supabase.from('unified_feedback_items').insert({
      project_id: integration.projectId,
      integration_id: integration.id,
      source_type: rawItem.sourceType,
      source_id: rawItem.sourceId,
      source_url: rawItem.sourceUrl,
      source_channel: rawItem.sourceChannel,
      source_thread_id: rawItem.sourceThreadId,
      title: rawItem.title,
      content: rawItem.content,
      content_html: rawItem.contentHtml,
      content_plain: contentPlain,
      author_id: rawItem.authorId,
      author_name: rawItem.authorName,
      author_email: rawItem.authorEmail,
      author_username: rawItem.authorUsername,
      author_avatar_url: rawItem.authorAvatarUrl,
      author_metadata: rawItem.authorMetadata || {},
      customer_id: customerId,
      category: classification.category,
      category_confidence: classification.categoryConfidence,
      sentiment_score: classification.sentimentScore,
      sentiment_label: classification.sentimentLabel,
      urgency_score: classification.urgencyScore,
      urgency_reason: classification.urgencyReason,
      tags: classification.tags,
      ai_summary: classification.aiSummary,
      content_hash: contentHash,
      engagement_metrics: rawItem.engagementMetrics || {},
      engagement_score: engagementScore,
      original_created_at: rawItem.originalCreatedAt.toISOString(),
      processed_at: new Date().toISOString(),
    });
  }
  
  /**
   * Log sync start
   */
  protected async logSyncStart(integration: FeedbackIntegration): Promise<void> {
    await this.supabase.from('inbox_sync_logs').insert({
      project_id: integration.projectId,
      integration_id: integration.id,
      sync_type: 'scheduled',
      status: 'started',
    });
  }
  
  /**
   * Update integration stats after sync
   */
  protected async updateIntegrationStats(
    integrationId: string,
    itemsImported: number,
    status: 'success' | 'failed' | 'partial',
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_items_count: itemsImported,
      updated_at: new Date().toISOString(),
    };
    
    if (status === 'success' || status === 'partial') {
      updates.total_items_synced = this.supabase.rpc('increment', { x: itemsImported });
    }
    
    if (errorMessage) {
      updates.last_sync_error = errorMessage;
    }
    
    await this.supabase
      .from('feedback_integrations')
      .update(updates)
      .eq('id', integrationId);
  }
  
  /**
   * Build sync result
   */
  protected buildResult(
    integration: FeedbackIntegration,
    status: 'success' | 'failed' | 'partial',
    itemsFound: number,
    itemsImported: number,
    itemsDuplicates: number,
    itemsErrors: number,
    startTime: number,
    errorMessage?: string
  ): SyncResult {
    return {
      integrationId: integration.id,
      integrationType: this.integrationType,
      status,
      itemsFound,
      itemsImported,
      itemsDuplicates,
      itemsErrors,
      errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
  
  /**
   * Hash content for deduplication
   */
  protected hashContent(content: string): string {
    const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
  
  /**
   * Strip HTML tags from content
   */
  protected stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Calculate engagement score from metrics
   */
  protected calculateEngagementScore(metrics?: EngagementMetrics): number {
    if (!metrics) return 0;
    
    let score = 0;
    score += (metrics.likes || 0) * 1;
    score += (metrics.shares || 0) * 3;
    score += (metrics.comments || 0) * 2;
    score += (metrics.replies || 0) * 2;
    score += (metrics.upvotes || 0) * 1;
    score += (metrics.retweets || 0) * 3;
    score += (metrics.views || 0) * 0.01;
    
    return Math.min(Math.round(score), 10000);
  }
  
  /**
   * Helper to delay for rate limiting
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
