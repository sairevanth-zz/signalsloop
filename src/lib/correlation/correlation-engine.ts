import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'
import { addAction } from '@/lib/actions/action-queue'

export interface SignalEvent {
  id?: string
  projectId: string
  eventType: 'feedback_spike' | 'sentiment_drop' | 'theme_emerged' | 'competitor_action' |
             'roadmap_prioritized' | 'feature_released' | 'churn_risk_increase'
  entityType: string
  entityId: string
  entityName: string
  metricValue: number
  baselineValue?: number
  deviation?: number
  metadata?: Record<string, any>
  detectedAt?: Date
}

export interface Correlation {
  id?: string
  projectId: string
  correlationType: 'feedback_to_competitor' | 'feedback_to_roadmap' | 'competitor_to_roadmap' |
                   'sentiment_to_feature' | 'feedback_to_theme' | 'theme_to_roadmap'
  sourceType: string
  sourceId: string
  sourceDescription: string
  targetType: string
  targetId: string
  targetDescription: string
  correlationScore: number
  confidenceLevel: 'low' | 'medium' | 'high'
  evidence: Record<string, any>
  detectedBy?: 'auto' | 'manual'
}

/**
 * Correlation Engine - Detects relationships between signals
 */
export class CorrelationEngine {

  /**
   * Record a signal event (e.g., feedback spike, sentiment drop)
   */
  async recordEvent(event: SignalEvent): Promise<string> {
    console.log(`[Correlation] Recording event: ${event.eventType} for ${event.entityName}`)

    const { data, error } = await getSupabaseServiceRoleClient().rpc('record_signal_event', {
      p_project_id: event.projectId,
      p_event_type: event.eventType,
      p_entity_type: event.entityType,
      p_entity_id: event.entityId,
      p_entity_name: event.entityName,
      p_metric_value: event.metricValue,
      p_baseline_value: event.baselineValue,
      p_metadata: event.metadata || {}
    })

    if (error) {
      console.error('[Correlation] Failed to record event:', error)
      throw new Error(`Failed to record event: ${error.message}`)
    }

    console.log(`[Correlation] ✓ Event recorded: ${data}`)
    return data
  }

  /**
   * Detect feedback spike (unusual increase in feedback volume)
   */
  async detectFeedbackSpike(
    projectId: string,
    theme?: string,
    hours: number = 24
  ): Promise<{ detected: boolean; data: any }> {
    const { data, error } = await getSupabaseServiceRoleClient().rpc('detect_feedback_spike', {
      p_project_id: projectId,
      p_theme: theme,
      p_hours: hours
    })

    if (error) {
      throw new Error(`Failed to detect spike: ${error.message}`)
    }

    if (data.spike_detected) {
      console.log(`[Correlation] 🔥 Feedback spike detected!`, data)

      // Record as event
      await this.recordEvent({
        projectId,
        eventType: 'feedback_spike',
        entityType: 'theme',
        entityId: theme || 'all',
        entityName: theme || 'All feedback',
        metricValue: data.current_count,
        baselineValue: data.baseline_count,
        deviation: data.deviation_percentage / 100,
        metadata: {
          theme,
          hours,
          deviationPercentage: data.deviation_percentage
        }
      })

      // Create action item
      await addAction({
        projectId,
        actionType: 'feedback_spike',
        priority: data.deviation_percentage > 200 ? 1 : 2,
        severity: data.deviation_percentage > 200 ? 'critical' : 'warning',
        title: `Feedback spike detected${theme ? ` for ${theme}` : ''}`,
        description: `Received ${data.current_count} feedback items in last ${hours}h (${data.deviation_percentage}% above baseline of ${data.baseline_count})`,
        metadata: {
          theme,
          currentCount: data.current_count,
          baselineCount: data.baseline_count,
          deviationPercentage: data.deviation_percentage,
          hours
        }
      })
    }

    return { detected: data.spike_detected, data }
  }

  /**
   * Find temporal correlations (events that occurred close in time)
   */
  async findTemporalCorrelations(
    projectId: string,
    timeWindowHours: number = 48
  ): Promise<any[]> {
    const { data, error } = await getSupabaseServiceRoleClient().rpc('find_temporal_correlations', {
      p_project_id: projectId,
      p_time_window_hours: timeWindowHours
    })

    if (error) {
      throw new Error(`Failed to find correlations: ${error.message}`)
    }

    // Create correlation records for high-confidence pairs
    for (const correlation of data || []) {
      if (correlation.correlation_score >= 0.7) {
        await this.createCorrelation({
          projectId,
          correlationType: this.inferCorrelationType(
            correlation.event1_type,
            correlation.event2_type
          ),
          sourceType: correlation.event1_type,
          sourceId: correlation.event1_id,
          sourceDescription: `${correlation.event1_type} event`,
          targetType: correlation.event2_type,
          targetId: correlation.event2_id,
          targetDescription: `${correlation.event2_type} event`,
          correlationScore: correlation.correlation_score,
          confidenceLevel: correlation.correlation_score >= 0.85 ? 'high' : 'medium',
          evidence: {
            timeDiffHours: correlation.time_diff_hours,
            event1Time: correlation.event1_time,
            event2Time: correlation.event2_time
          }
        })
      }
    }

    return data || []
  }

  /**
   * Create a correlation record
   */
  async createCorrelation(correlation: Correlation): Promise<string> {
    console.log(`[Correlation] Creating correlation: ${correlation.correlationType}`)

    const { data, error } = await getSupabaseServiceRoleClient()
      .from('signal_correlations')
      .insert({
        project_id: correlation.projectId,
        correlation_type: correlation.correlationType,
        source_type: correlation.sourceType,
        source_id: correlation.sourceId,
        source_description: correlation.sourceDescription,
        target_type: correlation.targetType,
        target_id: correlation.targetId,
        target_description: correlation.targetDescription,
        correlation_score: correlation.correlationScore,
        confidence_level: correlation.confidenceLevel,
        evidence: correlation.evidence || {},
        detected_by: correlation.detectedBy || 'auto'
      })
      .select('id')
      .single()

    if (error) {
      // Ignore duplicates
      if (error.code === '23505') {
        console.log('[Correlation] Correlation already exists (skipping)')
        return ''
      }
      throw new Error(`Failed to create correlation: ${error.message}`)
    }

    console.log(`[Correlation] ✓ Correlation created: ${data.id}`)
    return data.id
  }

  /**
   * Detect feedback → competitor correlations
   * (Feedback spike happens after competitor launches feature)
   */
  async detectFeedbackToCompetitorCorrelation(
    projectId: string,
    feedbackTheme: string,
    competitorId: string
  ): Promise<Correlation | null> {
    // Get recent feedback spike for theme
    const spike = await this.detectFeedbackSpike(projectId, feedbackTheme, 48)

    if (!spike.detected) {
      return null
    }

    // Check if competitor had recent event
    const { data: competitorEvents } = await getSupabaseServiceRoleClient()
      .from('competitive_events')
      .select('*')
      .eq('competitor_id', competitorId)
      .gte('detected_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('detected_at', { ascending: false })
      .limit(1)

    if (!competitorEvents || competitorEvents.length === 0) {
      return null
    }

    const competitorEvent = competitorEvents[0]

    // Calculate correlation score based on timing and relevance
    const timeDiff = Math.abs(
      new Date(competitorEvent.detected_at).getTime() - Date.now()
    ) / (1000 * 60 * 60) // hours

    const correlationScore = Math.max(0, 1 - timeDiff / 48) // Higher if closer in time

    const correlation: Correlation = {
      projectId,
      correlationType: 'feedback_to_competitor',
      sourceType: 'feedback',
      sourceId: feedbackTheme,
      sourceDescription: `Feedback spike for ${feedbackTheme}`,
      targetType: 'competitor',
      targetId: competitorId,
      targetDescription: competitorEvent.event_type || 'Competitor event',
      correlationScore,
      confidenceLevel: correlationScore >= 0.7 ? 'high' : 'medium',
      evidence: {
        feedbackCount: spike.data.current_count,
        feedbackDeviation: spike.data.deviation_percentage,
        competitorEventType: competitorEvent.event_type,
        competitorEventTime: competitorEvent.detected_at,
        timeDiffHours: timeDiff
      }
    }

    await this.createCorrelation(correlation)

    // Create action item
    await addAction({
      projectId,
      actionType: 'competitive_threat',
      priority: 1,
      severity: 'critical',
      title: 'Feedback spike correlated with competitor activity',
      description: `${spike.data.current_count} feedback items about ${feedbackTheme} detected ${timeDiff.toFixed(0)}h after competitor event`,
      relatedCompetitorId: competitorId,
      metadata: {
        feedbackTheme,
        competitorId,
        correlation
      }
    })

    return correlation
  }

  /**
   * Detect sentiment drop → feature correlations
   */
  async detectSentimentToFeatureCorrelation(
    projectId: string,
    featureId: string
  ): Promise<Correlation | null> {
    // Get sentiment trend for feature-related feedback
    const { data: sentimentData } = await getSupabaseServiceRoleClient()
      .from('sentiment_analysis')
      .select('sentiment_score, created_at, posts!inner(id, title)')
      .eq('posts.project_id', projectId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (!sentimentData || sentimentData.length < 10) {
      return null
    }

    // Calculate average sentiment for last 7 days vs previous 7 days
    const recent = sentimentData.slice(0, Math.floor(sentimentData.length / 2))
    const older = sentimentData.slice(Math.floor(sentimentData.length / 2))

    const recentAvg = recent.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / recent.length
    const olderAvg = older.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / older.length

    const drop = olderAvg - recentAvg

    if (drop >= 0.2) { // Significant drop (≥0.2 on -1 to 1 scale)
      console.log(`[Correlation] 📉 Sentiment drop detected: ${drop.toFixed(2)}`)

      // Record event
      await this.recordEvent({
        projectId,
        eventType: 'sentiment_drop',
        entityType: 'feature',
        entityId: featureId,
        entityName: 'Feature sentiment',
        metricValue: recentAvg,
        baselineValue: olderAvg,
        deviation: drop,
        metadata: {
          recentAvg,
          olderAvg,
          drop,
          sampleSize: sentimentData.length
        }
      })

      const correlation: Correlation = {
        projectId,
        correlationType: 'sentiment_to_feature',
        sourceType: 'sentiment',
        sourceId: 'sentiment_drop',
        sourceDescription: `Sentiment dropped by ${(drop * 100).toFixed(0)}%`,
        targetType: 'feature',
        targetId: featureId,
        targetDescription: 'Feature',
        correlationScore: Math.min(1, drop / 0.5), // Normalize
        confidenceLevel: drop >= 0.3 ? 'high' : 'medium',
        evidence: {
          recentAvg,
          olderAvg,
          drop,
          sampleSize: sentimentData.length
        }
      }

      await this.createCorrelation(correlation)

      // Create action
      await addAction({
        projectId,
        actionType: 'sentiment_drop',
        priority: 1,
        severity: 'warning',
        title: 'Sentiment drop detected',
        description: `Average sentiment decreased by ${(drop * 100).toFixed(0)}% over the last week`,
        metadata: {
          recentAvg,
          olderAvg,
          drop
        }
      })

      return correlation
    }

    return null
  }

  /**
   * Get correlation network for visualization
   */
  async getCorrelationNetwork(projectId: string): Promise<any> {
    const { data, error } = await getSupabaseServiceRoleClient().rpc('get_correlation_network', {
      p_project_id: projectId
    })

    if (error) {
      throw new Error(`Failed to get network: ${error.message}`)
    }

    return data
  }

  /**
   * Run all correlation detection algorithms
   */
  async detectAllCorrelations(projectId: string): Promise<void> {
    console.log(`[Correlation] Running all correlation detection for project: ${projectId}`)

    // 1. Detect feedback spikes
    await this.detectFeedbackSpike(projectId)

    // 2. Find temporal correlations
    await this.findTemporalCorrelations(projectId)

    // 3. Sentiment analysis (would need feature ID)
    // This would be called when specific features are identified

    console.log(`[Correlation] ✓ Correlation detection complete`)
  }

  /**
   * Infer correlation type from event types
   */
  private inferCorrelationType(
    sourceType: string,
    targetType: string
  ): Correlation['correlationType'] {
    const key = `${sourceType}_${targetType}`

    const mappings: Record<string, Correlation['correlationType']> = {
      'feedback_spike_competitor_action': 'feedback_to_competitor',
      'feedback_spike_roadmap_prioritized': 'feedback_to_roadmap',
      'competitor_action_roadmap_prioritized': 'competitor_to_roadmap',
      'sentiment_drop_feature_released': 'sentiment_to_feature',
      'feedback_spike_theme_emerged': 'feedback_to_theme',
      'theme_emerged_roadmap_prioritized': 'theme_to_roadmap'
    }

    return mappings[key] || 'feedback_to_theme'
  }
}

// Export singleton instance
export const correlationEngine = new CorrelationEngine()
