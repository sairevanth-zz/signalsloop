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
} from '@/types/hunter';
import { createClient } from '@supabase/supabase-js';
import { cacheManager } from '@/lib/ai-cache-manager';

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

      // Check cache first
      const cacheKey = `classify:${this.hashContent(feedback.content)}`;
      const cached = await cacheManager.get<ClassificationOutput>(cacheKey);

      if (cached) {
        return this.buildClassifiedFeedback(feedback, cached);
      }

      // Call OpenAI for classification
      const classification = await this.callOpenAIClassification(input);

      // Cache the result
      await cacheManager.set(cacheKey, classification, 7 * 24 * 60 * 60); // 7 days

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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
          discovered_at: item.discovered_at.toISOString(),
          processed_at: new Date().toISOString(),
        });

        if (error) {
          console.error(`[${this.platform}] Error storing feedback:`, error);
        } else {
          stored++;
        }
      } catch (error) {
        console.error(`[${this.platform}] Error processing item:`, error);
      }
    }

    // Check if theme detection should be triggered
    await this.checkThemeDetectionTrigger(projectId);

    return { stored, duplicates };
  }

  /**
   * Execute a complete scan: hunt, classify, and store
   */
  async scan(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<HunterScanResult> {
    const startTime = Date.now();

    try {
      // Hunt for feedback
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

      // Classify feedback
      const classifiedFeedback = await this.classifyBatch(rawFeedback);

      // Store feedback
      const { stored, duplicates } = await this.store(
        classifiedFeedback,
        config.project_id
      );

      return {
        platform: this.platform,
        itemsFound: rawFeedback.length,
        itemsStored: stored,
        itemsDuplicates: duplicates,
        durationMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      console.error(`[${this.platform}] Scan error:`, error);
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
   * Log scan results to the database
   */
  async logScan(
    result: HunterScanResult,
    integrationId: string,
    projectId: string,
    scanType: 'scheduled' | 'manual' | 'test' = 'scheduled'
  ): Promise<void> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
   */
  private async callOpenAIClassification(
    input: ClassificationInput
  ): Promise<ClassificationOutput> {
    const systemPrompt = `You are an expert at analyzing customer feedback. Analyze the following feedback and provide a detailed classification.

Return a JSON object with:
- classification: bug | feature_request | praise | complaint | churn_risk | question | other
- confidence: 0-1 (how confident are you in this classification)
- reasoning: brief explanation of why you chose this classification
- urgency_score: 1-5 (5 = critical, needs response <2h, 1 = low priority)
- urgency_reason: why you assigned this urgency score
- sentiment_score: -1 to +1 (-1 = very negative, 0 = neutral, +1 = very positive)
- sentiment_category: positive | negative | neutral | mixed
- tags: array of relevant tags (max 5)`;

    const userPrompt = `Platform: ${input.platform}
${input.title ? `Title: ${input.title}\n` : ''}Content: ${input.content}
${input.authorMetadata ? `\nAuthor Info: ${JSON.stringify(input.authorMetadata)}` : ''}
${input.engagementMetrics ? `\nEngagement: ${JSON.stringify(input.engagementMetrics)}` : ''}`;

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
