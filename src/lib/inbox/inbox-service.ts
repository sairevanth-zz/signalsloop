/**
 * Inbox Service
 * Service for querying and managing unified feedback items
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UnifiedFeedbackItem,
  Customer,
  InboxFilters,
  InboxSortOptions,
  InboxPagination,
  InboxListResponse,
  InboxStats,
  FeedbackStatus,
} from './types';

export class InboxService {
  private supabase: SupabaseClient;
  
  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  /**
   * List feedback items with filters, sorting, and pagination
   */
  async listItems(
    projectId: string,
    filters: InboxFilters = {},
    sort: InboxSortOptions = { field: 'originalCreatedAt', direction: 'desc' },
    pagination: InboxPagination = { page: 1, limit: 20 }
  ): Promise<InboxListResponse> {
    let query = this.supabase
      .from('unified_feedback_items')
      .select(`
        *,
        customer:customers(id, name, email, avatar_url, company, mrr, health_score, churn_risk)
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .eq('is_duplicate', false);
    
    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        query = query.in('category', filters.category);
      } else {
        query = query.eq('category', filters.category);
      }
    }
    
    if (filters.sourceType) {
      if (Array.isArray(filters.sourceType)) {
        query = query.in('source_type', filters.sourceType);
      } else {
        query = query.eq('source_type', filters.sourceType);
      }
    }
    
    if (filters.sentimentMin !== undefined) {
      query = query.gte('sentiment_score', filters.sentimentMin);
    }
    
    if (filters.sentimentMax !== undefined) {
      query = query.lte('sentiment_score', filters.sentimentMax);
    }
    
    if (filters.urgencyMin !== undefined) {
      query = query.gte('urgency_score', filters.urgencyMin);
    }
    
    if (filters.starred !== undefined) {
      query = query.eq('starred', filters.starred);
    }
    
    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    
    if (filters.dateFrom) {
      query = query.gte('original_created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('original_created_at', filters.dateTo);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    
    if (filters.search) {
      query = query.textSearch('search_vector', filters.search, {
        type: 'websearch',
        config: 'english',
      });
    }
    
    // Apply sorting
    const sortColumn = this.getSortColumn(sort.field);
    query = query.order(sortColumn, { ascending: sort.direction === 'asc' });
    
    // Apply pagination
    const start = (pagination.page - 1) * pagination.limit;
    query = query.range(start, start + pagination.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[InboxService] Error listing items:', error);
      throw error;
    }
    
    const items = (data || []).map(this.mapItem);
    const total = count || 0;
    
    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      hasMore: start + items.length < total,
    };
  }
  
  /**
   * Get a single feedback item by ID
   */
  async getItem(itemId: string): Promise<UnifiedFeedbackItem | null> {
    const { data, error } = await this.supabase
      .from('unified_feedback_items')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', itemId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return this.mapItem(data);
  }
  
  /**
   * Mark item as read
   */
  async markAsRead(itemId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('unified_feedback_items')
      .update({
        read_at: new Date().toISOString(),
        read_by: userId,
        status: 'read',
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    
    return !error;
  }
  
  /**
   * Toggle starred status
   */
  async toggleStarred(itemId: string): Promise<boolean> {
    // Get current state
    const { data: current } = await this.supabase
      .from('unified_feedback_items')
      .select('starred')
      .eq('id', itemId)
      .single();
    
    if (!current) return false;
    
    const { error } = await this.supabase
      .from('unified_feedback_items')
      .update({
        starred: !current.starred,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    
    return !error;
  }
  
  /**
   * Update item status
   */
  async updateStatus(itemId: string, status: FeedbackStatus): Promise<boolean> {
    const { error } = await this.supabase
      .from('unified_feedback_items')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    
    return !error;
  }
  
  /**
   * Archive item
   */
  async archiveItem(itemId: string): Promise<boolean> {
    return this.updateStatus(itemId, 'archived');
  }
  
  /**
   * Mark as spam
   */
  async markAsSpam(itemId: string): Promise<boolean> {
    return this.updateStatus(itemId, 'spam');
  }
  
  /**
   * Record a reply to feedback
   */
  async recordReply(
    itemId: string,
    userId: string,
    replyContent: string,
    sentVia: string
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('unified_feedback_items')
      .update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        replied_by: userId,
        reply_content: replyContent,
        reply_sent_via: sentVia,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    
    return !error;
  }
  
  /**
   * Convert feedback to a formal post
   */
  async convertToPost(
    itemId: string,
    userId: string,
    postId: string
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('unified_feedback_items')
      .update({
        status: 'converted',
        converted_to_post_id: postId,
        converted_at: new Date().toISOString(),
        converted_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    
    return !error;
  }
  
  /**
   * Bulk update status
   */
  async bulkUpdateStatus(itemIds: string[], status: FeedbackStatus): Promise<boolean> {
    const { error } = await this.supabase
      .from('unified_feedback_items')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .in('id', itemIds);
    
    return !error;
  }
  
  /**
   * Get inbox statistics
   */
  async getStats(projectId: string): Promise<InboxStats> {
    const { data, error } = await this.supabase
      .rpc('get_inbox_stats', { p_project_id: projectId });
    
    if (error || !data || data.length === 0) {
      return {
        totalItems: 0,
        newItems: 0,
        unreadItems: 0,
        starredItems: 0,
        itemsToday: 0,
        itemsThisWeek: 0,
        avgSentiment: 0,
        byCategory: {} as any,
        bySource: {} as any,
      };
    }
    
    const row = data[0];
    return {
      totalItems: row.total_items || 0,
      newItems: row.new_items || 0,
      unreadItems: row.unread_items || 0,
      starredItems: row.starred_items || 0,
      itemsToday: row.items_today || 0,
      itemsThisWeek: row.items_this_week || 0,
      avgSentiment: row.avg_sentiment || 0,
      byCategory: row.by_category || {},
      bySource: row.by_source || {},
    };
  }
  
  /**
   * Get recent items for a customer
   */
  async getCustomerFeedback(
    projectId: string,
    customerId: string,
    limit = 10
  ): Promise<UnifiedFeedbackItem[]> {
    const { data, error } = await this.supabase
      .from('unified_feedback_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('customer_id', customerId)
      .eq('is_duplicate', false)
      .order('original_created_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(this.mapItem);
  }
  
  /**
   * Get similar items (potential duplicates)
   */
  async getSimilarItems(
    projectId: string,
    itemId: string,
    limit = 5
  ): Promise<UnifiedFeedbackItem[]> {
    // Get the item's content hash
    const { data: item } = await this.supabase
      .from('unified_feedback_items')
      .select('content_plain, tags')
      .eq('id', itemId)
      .single();
    
    if (!item) return [];
    
    // Search for items with overlapping tags
    const { data, error } = await this.supabase
      .from('unified_feedback_items')
      .select('*')
      .eq('project_id', projectId)
      .neq('id', itemId)
      .eq('is_duplicate', false)
      .overlaps('tags', item.tags || [])
      .order('original_created_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(this.mapItem);
  }
  
  // ============================================================================
  // Customer Methods
  // ============================================================================
  
  /**
   * List customers
   */
  async listCustomers(
    projectId: string,
    pagination: InboxPagination = { page: 1, limit: 20 },
    filters?: { churnRisk?: string; search?: string }
  ): Promise<{ customers: Customer[]; total: number }> {
    let query = this.supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);
    
    if (filters?.churnRisk) {
      query = query.eq('churn_risk', filters.churnRisk);
    }
    
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
    }
    
    query = query.order('last_feedback_at', { ascending: false, nullsFirst: false });
    
    const start = (pagination.page - 1) * pagination.limit;
    query = query.range(start, start + pagination.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[InboxService] Error listing customers:', error);
      return { customers: [], total: 0 };
    }
    
    return {
      customers: (data || []).map(this.mapCustomer),
      total: count || 0,
    };
  }
  
  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return this.mapCustomer(data);
  }
  
  /**
   * Update customer
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<Customer>
  ): Promise<boolean> {
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.company !== undefined) dbUpdates.company = updates.company;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;
    
    const { error } = await this.supabase
      .from('customers')
      .update(dbUpdates)
      .eq('id', customerId);
    
    return !error;
  }
  
  // ============================================================================
  // Private Helpers
  // ============================================================================
  
  private getSortColumn(field: InboxSortOptions['field']): string {
    const mapping: Record<InboxSortOptions['field'], string> = {
      originalCreatedAt: 'original_created_at',
      importedAt: 'imported_at',
      urgencyScore: 'urgency_score',
      sentimentScore: 'sentiment_score',
      engagementScore: 'engagement_score',
    };
    return mapping[field] || 'original_created_at';
  }
  
  private mapItem(row: any): UnifiedFeedbackItem {
    return {
      id: row.id,
      projectId: row.project_id,
      integrationId: row.integration_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceUrl: row.source_url,
      sourceChannel: row.source_channel,
      sourceThreadId: row.source_thread_id,
      title: row.title,
      content: row.content,
      contentHtml: row.content_html,
      contentPlain: row.content_plain,
      language: row.language || 'en',
      authorId: row.author_id,
      authorName: row.author_name,
      authorEmail: row.author_email,
      authorUsername: row.author_username,
      authorAvatarUrl: row.author_avatar_url,
      authorMetadata: row.author_metadata || {},
      customerId: row.customer_id,
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        email: row.customer.email,
        avatarUrl: row.customer.avatar_url,
        company: row.customer.company,
        mrr: row.customer.mrr,
        healthScore: row.customer.health_score,
        churnRisk: row.customer.churn_risk,
      } as any : undefined,
      category: row.category,
      categoryConfidence: row.category_confidence,
      sentimentScore: row.sentiment_score,
      sentimentLabel: row.sentiment_label,
      urgencyScore: row.urgency_score,
      urgencyReason: row.urgency_reason,
      tags: row.tags || [],
      aiSummary: row.ai_summary,
      contentHash: row.content_hash,
      duplicateOf: row.duplicate_of,
      duplicateConfidence: row.duplicate_confidence,
      isDuplicate: row.is_duplicate || false,
      engagementMetrics: row.engagement_metrics || {},
      engagementScore: row.engagement_score || 0,
      status: row.status || 'new',
      starred: row.starred || false,
      readAt: row.read_at ? new Date(row.read_at) : undefined,
      readBy: row.read_by,
      repliedAt: row.replied_at ? new Date(row.replied_at) : undefined,
      repliedBy: row.replied_by,
      replyContent: row.reply_content,
      replySentVia: row.reply_sent_via,
      convertedToPostId: row.converted_to_post_id,
      convertedAt: row.converted_at ? new Date(row.converted_at) : undefined,
      convertedBy: row.converted_by,
      originalCreatedAt: new Date(row.original_created_at),
      importedAt: new Date(row.imported_at),
      updatedAt: new Date(row.updated_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    };
  }
  
  private mapCustomer(row: any): Customer {
    return {
      id: row.id,
      projectId: row.project_id,
      email: row.email,
      name: row.name,
      company: row.company,
      avatarUrl: row.avatar_url,
      identities: row.identities || {},
      totalFeedbackCount: row.total_feedback_count || 0,
      averageSentiment: row.average_sentiment || 0,
      lastFeedbackAt: row.last_feedback_at ? new Date(row.last_feedback_at) : undefined,
      firstSeenAt: new Date(row.first_seen_at),
      crmId: row.crm_id,
      crmSource: row.crm_source,
      mrr: row.mrr,
      arr: row.arr,
      planName: row.plan_name,
      customerSince: row.customer_since ? new Date(row.customer_since) : undefined,
      healthScore: row.health_score,
      churnRisk: row.churn_risk,
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Export singleton
export const inboxService = new InboxService();
