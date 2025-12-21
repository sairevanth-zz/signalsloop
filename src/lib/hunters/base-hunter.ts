/**
 * Base Hunter Class
 * Abstract class for platform-specific feedback hunters
 */

import OpenAI from 'openai';
import {
  PlatformType,
  RawFeedback,
  ClassifiedFeedback,
  HunterConfig,
  PlatformIntegration,
  ClassificationOutput,
  ClassificationInput,
  HunterScanResult,
  HunterError,
  FeedbackClassification,
} from '@/types/hunter';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { buildProductContext, formatContextBlock, ProductContext } from './product-context';
import { filterByRelevance, RelevanceResult } from './relevance-filter';

/**
 * Abstract base class for all hunters
 */
export abstract class BaseHunter {
  abstract platform: PlatformType;
  protected openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Hunt for feedback on the platform
   * Must be implemented by each platform hunter
   */
  abstract hunt(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<RawFeedback[]>;

  /**
   * Build formatted Product Context block from HunterConfig
   * Use this in subclass prompts for disambiguation
   */
  protected getProductContextBlock(config: HunterConfig): string {
    const context = buildProductContext(config);
    return formatContextBlock(context);
  }

  /**
   * Classify a single feedback item using OpenAI
   */
  async classify(feedback: RawFeedback): Promise<ClassifiedFeedback> {
    try {
      const input: ClassificationInput = {
        content: feedback.content,
        title: feedback.title,
        platform: feedback.platform,
        authorMetadata: feedback.author_metadata,
        engagementMetrics: feedback.engagement_metrics,
      };

      // Skip caching for now - directly call OpenAI for classification
      // TODO: Re-implement caching with proper key-value interface
      const classification = await this.callOpenAIClassification(input);

      return this.buildClassifiedFeedback(feedback, classification);
    } catch (error) {
      console.error(`[${this.platform}] Classification error:`, error);
      throw new HunterError(
        `Failed to classify feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLASSIFICATION_ERROR',
        this.platform
      );
    }
  }

  /**
   * Classify multiple feedback items in batches
   */
  async classifyBatch(feedbackItems: RawFeedback[]): Promise<ClassifiedFeedback[]> {
    const results: ClassifiedFeedback[] = [];
    const batchSize = 10;

    for (let i = 0; i < feedbackItems.length; i += batchSize) {
      const batch = feedbackItems.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item) => this.classify(item))
      );
      results.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < feedbackItems.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Store classified feedback items in the database
   */
  async store(
    items: ClassifiedFeedback[],
    projectId: string
  ): Promise<{ stored: number; duplicates: number }> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      console.error(`[${this.platform}] Supabase client not available`);
      return { stored: 0, duplicates: 0 };
    }
    let stored = 0;
    let duplicates = 0;

    for (const item of items) {
      try {
        // Check if item already exists
        const { data: existing } = await supabase
          .from('discovered_feedback')
          .select('id')
          .eq('project_id', projectId)
          .eq('platform', item.platform)
          .eq('platform_id', item.platform_id)
          .single();

        if (existing) {
          duplicates++;
          continue;
        }

        // Insert new feedback
        const { error } = await supabase.from('discovered_feedback').insert({
          project_id: projectId,
          platform: item.platform,
          platform_id: item.platform_id,
          platform_url: item.platform_url,
          author_username: item.author_username,
          author_profile_url: item.author_profile_url,
          author_metadata: item.author_metadata || {},
          title: item.title,
          content: item.content,
          classification: item.classification,
          classification_confidence: item.classification_confidence,
          classification_reason: item.classification_reason,
          urgency_score: item.urgency_score,
          urgency_reason: item.urgency_reason,
          sentiment_score: item.sentiment_score,
          sentiment_category: item.sentiment_category,
          engagement_score: item.engagement_score,
          engagement_metrics: item.engagement_metrics || {},
          tags: item.tags,
          auto_tagged: true,
          is_duplicate: false,
          is_archived: false,
          processing_status: 'complete', // Mark as fully processed
          discovered_at: (item.discovered_at instanceof Date && !isNaN(item.discovered_at.getTime()))
            ? item.discovered_at.toISOString()
            : new Date().toISOString(),
          processed_at: new Date().toISOString(),
        });

        if (error) {
          console.error(`[${this.platform}] Error storing feedback: `, error);
        } else {
          stored++;
        }
      } catch (error) {
        console.error(`[${this.platform}] Error processing item: `, error);
      }
    }

    // Check if theme detection should be triggered
    await this.checkThemeDetectionTrigger(projectId);

    return { stored, duplicates };
  }
  /**
   * Execute a complete scan: hunt, filter, classify, and store
   * 
   * HYBRID 3-Stage Pipeline:
   *   Stage 1: Discovery - Find raw feedback [SYNC]
   *   Stage 2: Relevance Filter - Score 0-100 [SYNC for first N items]
   *   Stage 3: Classification - Classify feedback [SYNC for first N items]
   *   
   * Items beyond SYNC_LIMIT are stored as pending for background cron
   */
  private SYNC_LIMIT = 15; // Process first 15 items sync for immediate value

  async scan(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<HunterScanResult> {
    const startTime = Date.now();

    try {
      // ==================== STAGE 1: DISCOVERY ====================
      console.log(`[${this.platform}] Stage 1: Discovering feedback...`);
      const rawFeedback = await this.hunt(config, integration);

      if (rawFeedback.length === 0) {
        return {
          platform: this.platform,
          itemsFound: 0,
          itemsStored: 0,
          itemsDuplicates: 0,
          durationMs: Date.now() - startTime,
          success: true,
        };
      }

      console.log(`[${this.platform}] Stage 1: Found ${rawFeedback.length} items`);

      // ==================== SPLIT: SYNC vs ASYNC ====================
      // Process first N items synchronously for immediate value
      // Store remaining items as pending for background cron
      const syncBatch = rawFeedback.slice(0, this.SYNC_LIMIT);
      const asyncBatch = rawFeedback.slice(this.SYNC_LIMIT);

      if (asyncBatch.length > 0) {
        console.log(`[${this.platform}] Queuing ${asyncBatch.length} items for background processing`);
        // Store async items as pending (cron will handle Stage 2+3)
        const { stored: pendingStored } = await this.storeAsPending(asyncBatch, config.project_id);
        console.log(`[${this.platform}] ${pendingStored} items queued for cron`);
      }

      console.log(`[${this.platform}] Processing ${syncBatch.length} items synchronously...`);

      // ==================== STAGE 2: RELEVANCE FILTER (sync batch only) ====================
      let toClassify: RawFeedback[] = syncBatch;
      let toReview: { item: RawFeedback; relevanceScore: number; relevanceReasoning: string; }[] = [];
      let excluded: { item: RawFeedback; relevanceScore: number; relevanceReasoning: string; }[] = [];

      // Run Stage 2 if we have ANY context (company name counts)
      const hasContext = config.company_name || config.product_description ||
        config.product_tagline || (config.keywords && config.keywords.length > 0);

      if (hasContext && syncBatch.length > 0) {
        console.log(`[${this.platform}] Stage 2: Filtering by relevance...`);

        try {
          // 15-second timeout for Stage 2
          const context = buildProductContext(config);
          const filterPromise = filterByRelevance(syncBatch, context);
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Stage 2 timeout')), 15000)
          );

          const filterResult = await Promise.race([filterPromise, timeoutPromise]);

          if (filterResult) {
            console.log(`[${this.platform}] Stage 2 Results:`, {
              included: filterResult.stats.includedCount,
              needsReview: filterResult.stats.needsReviewCount,
              excluded: filterResult.stats.excludedCount,
              avgScore: filterResult.stats.avgScore.toFixed(1),
            });

            toClassify = filterResult.included.map((r: RelevanceResult) => r.item);
            toReview = filterResult.needsReview.map((r: RelevanceResult) => ({
              item: r.item,
              relevanceScore: r.relevanceScore,
              relevanceReasoning: r.reasoning,
            }));
            excluded = filterResult.excluded.map((r: RelevanceResult) => ({
              item: r.item,
              relevanceScore: r.relevanceScore,
              relevanceReasoning: r.reasoning,
            }));
          }
        } catch (error) {
          console.warn(`[${this.platform}] Stage 2 skipped:`, error instanceof Error ? error.message : 'Unknown error');
          // Keep all items for classification if Stage 2 fails
        }
      } else {
        console.log(`[${this.platform}] Stage 2: Skipped (no product context)`);
      }

      // ==================== STAGE 3: CLASSIFICATION ====================
      let classifiedFeedback: ClassifiedFeedback[] = [];

      if (toClassify.length > 0) {
        console.log(`[${this.platform}] Stage 3: Classifying ${toClassify.length} items...`);
        try {
          classifiedFeedback = await this.classifyBatchWithTimeout(toClassify, 20000);
        } catch (error) {
          console.warn(`[${this.platform}] Stage 3 error, storing as unclassified:`, error);
          // Convert to unclassified feedback with all required fields
          classifiedFeedback = toClassify.map(item => ({
            ...item,
            classification: 'other' as FeedbackClassification,
            classification_confidence: 0,
            classification_reason: 'Classification failed',
            urgency_score: 0,
            urgency_reason: '',
            sentiment_score: 0,
            sentiment_category: 'neutral',
            tags: [],
            engagement_score: 0,
          }));
        }
      }

      // Classify needs_review items
      let reviewFeedback: ClassifiedFeedback[] = [];
      if (toReview.length > 0) {
        console.log(`[${this.platform}] Stage 3: Classifying ${toReview.length} review items...`);
        try {
          const reviewItems = toReview.map(r => r.item);
          const classified = await this.classifyBatchWithTimeout(reviewItems, 15000);
          reviewFeedback = classified.map((cf, i) => ({
            ...cf,
            relevance_score: toReview[i].relevanceScore,
            relevance_reasoning: toReview[i].relevanceReasoning,
            needs_review: true,
          }));
        } catch (error) {
          console.warn(`[${this.platform}] Stage 3 review error:`, error);
        }
      }

      // Combine all classified feedback
      const allClassified = [...classifiedFeedback, ...reviewFeedback];

      // ==================== STORE RESULTS ====================
      const { stored, duplicates } = await this.store(allClassified, config.project_id);

      // Also store excluded items as archived (low relevance)
      let excludedStored = 0;
      for (const ex of excluded) {
        const result = await this.storeExcluded(
          ex.item,
          config.project_id,
          ex.relevanceScore,
          ex.relevanceReasoning
        );
        if (result) excludedStored++;
      }

      console.log(`[${this.platform}] Complete: ${stored} stored, ${excludedStored} excluded, ${duplicates} duplicates`);

      return {
        platform: this.platform,
        itemsFound: rawFeedback.length,
        itemsStored: stored,
        itemsDuplicates: duplicates,
        durationMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      console.error(`[${this.platform}] Scan error: `, error);
      return {
        platform: this.platform,
        itemsFound: 0,
        itemsStored: 0,
        itemsDuplicates: 0,
        durationMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Classify batch with timeout
   */
  private async classifyBatchWithTimeout(items: RawFeedback[], timeoutMs: number): Promise<ClassifiedFeedback[]> {
    const classifyPromise = this.classifyBatch(items);
    const timeoutPromise = new Promise<ClassifiedFeedback[]>((_, reject) =>
      setTimeout(() => reject(new Error('Classification timeout')), timeoutMs)
    );
    return Promise.race([classifyPromise, timeoutPromise]);
  }

  /**
   * Store an excluded (low relevance) item as archived
   */
  private async storeExcluded(
    item: RawFeedback,
    projectId: string,
    relevanceScore: number,
    relevanceReasoning: string
  ): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    // Check for duplicate
    const { data: existing } = await supabase
      .from('discovered_feedback')
      .select('id')
      .eq('project_id', projectId)
      .eq('platform_id', item.platform_id)
      .limit(1);

    if (existing && existing.length > 0) return false;

    const { error } = await supabase.from('discovered_feedback').insert({
      project_id: projectId,
      platform: item.platform,
      platform_id: item.platform_id,
      platform_url: item.platform_url,
      title: item.title,
      content: item.content,
      author_username: item.author_username,
      author_profile_url: item.author_profile_url,
      classification: 'other',
      sentiment_score: 0,
      sentiment_category: 'neutral',
      urgency_score: 0,
      relevance_score: relevanceScore,
      relevance_reasoning: relevanceReasoning,
      discovered_at: item.discovered_at || new Date().toISOString(),
      engagement_metrics: item.engagement_metrics || {},
      processing_status: 'complete',
      is_duplicate: false,
      is_archived: true, // Excluded items are archived
    });

    return !error;
  }

  /**
   * Store raw feedback items with pending processing status
   * Classification will happen in background via cron job
   */
  protected async storeAsPending(
    items: RawFeedback[],
    projectId: string
  ): Promise<{ stored: number; duplicates: number }> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      console.error(`[${this.platform}] Could not store feedback - Supabase not available`);
      return { stored: 0, duplicates: 0 };
    }

    let stored = 0;
    let duplicates = 0;

    for (const item of items) {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('discovered_feedback')
        .select('id')
        .eq('project_id', projectId)
        .eq('platform_id', item.platform_id)
        .limit(1);

      if (existing && existing.length > 0) {
        duplicates++;
        continue;
      }

      // Store with pending status - classification will be filled by cron job
      const { error } = await supabase.from('discovered_feedback').insert({
        project_id: projectId,
        platform: item.platform,
        platform_id: item.platform_id,
        platform_url: item.platform_url,
        title: item.title,
        content: item.content,
        author_username: item.author_username,
        author_profile_url: item.author_profile_url,
        discovered_at: item.discovered_at || new Date().toISOString(),
        engagement_metrics: item.engagement_metrics || {},
        // Mark for background processing - classification null means "pending"
        processing_status: 'pending',
        is_duplicate: false,
        is_archived: false,
      });

      if (!error) {
        stored++;
      } else {
        console.error(`[${this.platform}] Error storing item:`, error.message);
      }
    }

    return { stored, duplicates };
  }

  /**
   * Log scan results to the database
   */
  async logScan(
    result: HunterScanResult,
    integrationId: string,
    projectId: string,
    scanType: 'scheduled' | 'manual' | 'test' = 'scheduled'
  ): Promise<void> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      console.error(`[${this.platform}] Could not log scan result - Supabase not available`);
      return;
    }

    await supabase.from('hunter_logs').insert({
      project_id: projectId,
      platform: this.platform,
      integration_id: integrationId,
      scan_type: scanType,
      items_found: result.itemsFound,
      items_stored: result.itemsStored,
      items_duplicates: result.itemsDuplicates,
      duration_ms: result.durationMs,
      success: result.success,
      error_message: result.error,
    });

    // Update platform integration stats
    await supabase.rpc('update_platform_stats', {
      p_integration_id: integrationId,
      p_success: result.success,
      p_items_found: result.itemsFound,
      p_error_message: result.error || null,
    });
  }

  /**
   * Call OpenAI for feedback classification
   * Enhanced with expanded taxonomy and detailed urgency rules
   */
  private async callOpenAIClassification(
    input: ClassificationInput
  ): Promise<ClassificationOutput> {
    const systemPrompt = `You are an expert product feedback analyst. You're analyzing feedback that has been verified as relevant to the product. Provide deep classification and insight extraction.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASSIFICATION TAXONOMY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIMARY CLASSIFICATION (mutually exclusive):

1. bug - Something isn't working as expected (errors, crashes, broken features)
2. feature_request - User wants new functionality ("I wish...", "Please add...")
3. usability_issue - It works but is confusing/hard to use (UX problems)
4. praise - Positive sentiment, endorsement, recommendation
5. complaint - Negative sentiment without specific bug (frustration)
6. comparison - Discussing product vs competitors, switch stories
7. question - Seeking help or information ("How do I...")
8. churn_risk - Indicators of potential cancellation ("Thinking of switching...")
9. other - Doesn't fit above categories

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URGENCY SCORING (1-5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5 - CRITICAL (respond within 2 hours):
  - Data loss or security issues
  - Complete inability to use product
  - High-profile user (verified, high followers)
  - Viral negative post
  - Explicit churn threat

4 - HIGH (respond within 24 hours):
  - Major feature broken
  - Blocking user workflow
  - Multiple users reporting same issue

3 - MEDIUM (respond within 3 days):
  - Feature request with good traction
  - Usability complaints
  - Moderate negative sentiment

2 - LOW (respond within 1 week):
  - Minor UX suggestions
  - Nice-to-have feature requests

1 - INFORMATIONAL (no response needed):
  - Pure praise (but track it!)
  - General feedback

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SENTIMENT SCALE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-1.0 to -0.6: very_negative (anger, threats to leave)
-0.6 to -0.2: negative (disappointment, criticism)
-0.2 to +0.2: neutral (factual, balanced)
+0.2 to +0.6: positive (satisfaction, mild praise)
+0.6 to +1.0: very_positive (enthusiasm, advocacy)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "classification": "feature_request",
  "confidence": 0.92,
  "reasoning": "brief explanation",
  "urgency_score": 3,
  "urgency_reason": "why this urgency",
  "sentiment_score": 0.35,
  "sentiment_category": "positive",
  "tags": ["integrations", "slack", "feature-request"],
  "churn_risk_level": "low" | "medium" | "high",
  "competitors_mentioned": ["Canny", "ProductBoard"],
  "features_mentioned": ["AI categorization", "Slack integration"]
}`;

    const userPrompt = `Platform: ${input.platform}
${input.title ? `Title: ${input.title}\n` : ''} Content: ${input.content}
${input.authorMetadata ? `\nAuthor Info: ${JSON.stringify(input.authorMetadata)}` : ''}
${input.engagementMetrics ? `\nEngagement: ${JSON.stringify(input.engagementMetrics)}` : ''} `;

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
      classification: result.classification,
      confidence: result.confidence,
      reasoning: result.reasoning,
      urgency_score: result.urgency_score,
      urgency_reason: result.urgency_reason,
      sentiment_score: result.sentiment_score,
      sentiment_category: result.sentiment_category,
      tags: result.tags || [],
    };
  }

  /**
   * Build a ClassifiedFeedback object from raw feedback and classification
   */
  private buildClassifiedFeedback(
    raw: RawFeedback,
    classification: ClassificationOutput
  ): ClassifiedFeedback {
    return {
      ...raw,
      classification: classification.classification,
      classification_confidence: classification.confidence,
      classification_reason: classification.reasoning,
      urgency_score: classification.urgency_score,
      urgency_reason: classification.urgency_reason,
      sentiment_score: classification.sentiment_score,
      sentiment_category: classification.sentiment_category,
      tags: classification.tags,
      engagement_score: this.calculateEngagementScore(raw.engagement_metrics),
    };
  }

  /**
   * Calculate engagement score from metrics
   */
  protected calculateEngagementScore(
    metrics?: Record<string, any>
  ): number {
    if (!metrics) return 0;

    let score = 0;
    score += (metrics.likes || 0) * 1;
    score += (metrics.shares || 0) * 2;
    score += (metrics.retweets || 0) * 2;
    score += (metrics.comments || 0) * 3;
    score += (metrics.replies || 0) * 3;
    score += (metrics.upvotes || 0) * 1;
    score += (metrics.score || 0) * 1;

    return Math.min(score, 1000); // Cap at 1000
  }

  /**
   * Check if theme detection should be triggered
   */
  private async checkThemeDetectionTrigger(projectId: string): Promise<void> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return;
    }

    // Get hunter config
    const { data: config } = await supabase
      .from('hunter_configs')
      .select('theme_detection_threshold, auto_theme_detection')
      .eq('project_id', projectId)
      .single();

    if (!config || !config.auto_theme_detection) {
      return;
    }

    // Count unanalyzed feedback
    const { count } = await supabase
      .from('discovered_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('theme_analyzed_at', null);

    if (count && count >= config.theme_detection_threshold) {
      console.log(
        `[Hunter] Theme detection threshold met for project ${projectId}: ${count} items`
      );
      // In a real implementation, you would trigger theme detection here
      // For now, we'll just log it
    }
  }

  /**
   * Hash content for cache keys
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Delay helper for rate limiting
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sanitize text (remove extra whitespace, etc.)
   */
  protected sanitizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Extract keywords from text
   */
  protected extractKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if text contains excluded keywords
   */
  protected containsExcludedKeywords(
    text: string,
    excludedKeywords: string[]
  ): boolean {
    const lowerText = text.toLowerCase();
    return excludedKeywords.some((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );
  }
}
