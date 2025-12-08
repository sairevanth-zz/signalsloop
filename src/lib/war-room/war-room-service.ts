/**
 * Competitor War Room Service
 * Manages competitor alerts, job postings, and monitoring
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  CompetitorAlert,
  CompetitorJobPosting,
  CompetitorMonitoringConfig,
  WarRoomSummary,
  HiringTrend,
  AlertFilters,
  CreateAlertInput,
  AlertStatus,
  AIWeightPreference,
  FeatureType,
  WeightPreset,
  WeightConfig,
  DEFAULT_WEIGHTS,
  WEIGHT_PRESETS,
} from './types';

export class WarRoomService {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // ============================================================================
  // WAR ROOM SUMMARY
  // ============================================================================

  async getSummary(projectId: string): Promise<WarRoomSummary> {
    const { data, error } = await this.supabase.rpc('get_war_room_summary', {
      p_project_id: projectId,
    });

    if (error) {
      console.error('[WarRoomService] Error getting summary:', error);
      return {
        total_alerts: 0,
        new_alerts: 0,
        critical_alerts: 0,
        high_alerts: 0,
        total_job_postings: 0,
        ai_ml_postings: 0,
        engineering_postings: 0,
        monitored_competitors: 0,
        revenue_at_risk: 0,
      };
    }

    return data as WarRoomSummary;
  }

  // ============================================================================
  // ALERTS MANAGEMENT
  // ============================================================================

  async listAlerts(
    projectId: string,
    filters: AlertFilters = {},
    limit = 50,
    offset = 0
  ): Promise<{ alerts: CompetitorAlert[]; total: number }> {
    let query = this.supabase
      .from('competitor_alerts')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('detected_at', { ascending: false });

    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters.severity?.length) {
      query = query.in('severity', filters.severity);
    }
    if (filters.alert_type?.length) {
      query = query.in('alert_type', filters.alert_type);
    }
    if (filters.competitor_name) {
      query = query.ilike('competitor_name', `%${filters.competitor_name}%`);
    }
    if (filters.date_from) {
      query = query.gte('detected_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('detected_at', filters.date_to);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[WarRoomService] Error listing alerts:', error);
      return { alerts: [], total: 0 };
    }

    return { alerts: data as CompetitorAlert[], total: count || 0 };
  }

  async getAlert(alertId: string): Promise<CompetitorAlert | null> {
    const { data, error } = await this.supabase
      .from('competitor_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (error) {
      console.error('[WarRoomService] Error getting alert:', error);
      return null;
    }

    return data as CompetitorAlert;
  }

  async createAlert(input: CreateAlertInput): Promise<CompetitorAlert | null> {
    // Use AI to analyze and enrich the alert
    const aiAnalysis = await this.analyzeAlert(input);

    const { data, error } = await this.supabase
      .from('competitor_alerts')
      .insert({
        ...input,
        urgency_score: aiAnalysis.urgency_score,
        ai_summary: aiAnalysis.summary,
        ai_recommended_action: aiAnalysis.recommended_action,
      })
      .select()
      .single();

    if (error) {
      console.error('[WarRoomService] Error creating alert:', error);
      return null;
    }

    return data as CompetitorAlert;
  }

  async updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    userId: string,
    notes?: string
  ): Promise<boolean> {
    const updates: Record<string, any> = { status };

    if (status === 'acknowledged') {
      updates.acknowledged_by = userId;
      updates.acknowledged_at = new Date().toISOString();
    } else if (status === 'addressed' || status === 'dismissed') {
      updates.addressed_by = userId;
      updates.addressed_at = new Date().toISOString();
      if (notes) {
        updates.resolution_notes = notes;
      }
    }

    const { error } = await this.supabase
      .from('competitor_alerts')
      .update(updates)
      .eq('id', alertId);

    if (error) {
      console.error('[WarRoomService] Error updating alert:', error);
      return false;
    }

    return true;
  }

  private async analyzeAlert(input: CreateAlertInput): Promise<{
    urgency_score: number;
    summary: string;
    recommended_action: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a competitive intelligence analyst. Analyze this competitor alert and provide:
1. An urgency score (0-100)
2. A concise summary (1-2 sentences)
3. A recommended action

Return JSON: { "urgency_score": number, "summary": string, "recommended_action": string }`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              competitor: input.competitor_name,
              type: input.alert_type,
              severity: input.severity,
              title: input.title,
              description: input.description,
              customer_impact: input.customer_impact_count,
              revenue_at_risk: input.revenue_at_risk,
            }),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        urgency_score: result.urgency_score || 50,
        summary: result.summary || 'Competitor activity detected',
        recommended_action: result.recommended_action || 'Review and assess impact',
      };
    } catch (error) {
      console.error('[WarRoomService] AI analysis error:', error);
      return {
        urgency_score: 50,
        summary: 'Competitor activity detected',
        recommended_action: 'Review and assess impact',
      };
    }
  }

  // ============================================================================
  // JOB POSTINGS
  // ============================================================================

  async listJobPostings(
    projectId: string,
    options: {
      competitor_name?: string;
      department?: string;
      is_active?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ postings: CompetitorJobPosting[]; total: number }> {
    let query = this.supabase
      .from('competitor_job_postings')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('first_seen_at', { ascending: false });

    if (options.competitor_name) {
      query = query.ilike('competitor_name', `%${options.competitor_name}%`);
    }
    if (options.department) {
      query = query.eq('department', options.department);
    }
    if (options.is_active !== undefined) {
      query = query.eq('is_active', options.is_active);
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[WarRoomService] Error listing job postings:', error);
      return { postings: [], total: 0 };
    }

    return { postings: data as CompetitorJobPosting[], total: count || 0 };
  }

  async getHiringTrends(projectId: string, days = 30): Promise<HiringTrend[]> {
    const { data, error } = await this.supabase.rpc('get_competitor_hiring_trends', {
      p_project_id: projectId,
      p_days: days,
    });

    if (error) {
      console.error('[WarRoomService] Error getting hiring trends:', error);
      return [];
    }

    return (data as HiringTrend[]) || [];
  }

  async analyzeJobPosting(posting: Partial<CompetitorJobPosting>): Promise<{
    department: string;
    strategic_signals: string[];
    ai_interpretation: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are analyzing competitor job postings to extract strategic intelligence.
Given a job posting, determine:
1. The department (engineering, product, sales, marketing, ai_ml, security, design, other)
2. Strategic signals (e.g., "expanding_ai", "enterprise_focus", "mobile_team", "infrastructure_scale")
3. A brief interpretation of what this hiring suggests about their strategy

Return JSON: { "department": string, "strategic_signals": string[], "ai_interpretation": string }`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              title: posting.job_title,
              competitor: posting.competitor_name,
              skills: posting.skills_mentioned,
            }),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('[WarRoomService] Job analysis error:', error);
      return {
        department: 'other',
        strategic_signals: [],
        ai_interpretation: 'Unable to analyze',
      };
    }
  }

  // ============================================================================
  // MONITORING CONFIGURATION
  // ============================================================================

  async listMonitoringConfigs(projectId: string): Promise<CompetitorMonitoringConfig[]> {
    const { data, error } = await this.supabase
      .from('competitor_monitoring_config')
      .select('*')
      .eq('project_id', projectId)
      .order('competitor_name');

    if (error) {
      console.error('[WarRoomService] Error listing configs:', error);
      return [];
    }

    return data as CompetitorMonitoringConfig[];
  }

  async upsertMonitoringConfig(
    config: Partial<CompetitorMonitoringConfig> & { project_id: string; competitor_name: string }
  ): Promise<CompetitorMonitoringConfig | null> {
    const { data, error } = await this.supabase
      .from('competitor_monitoring_config')
      .upsert(config, { onConflict: 'project_id,competitor_name' })
      .select()
      .single();

    if (error) {
      console.error('[WarRoomService] Error upserting config:', error);
      return null;
    }

    return data as CompetitorMonitoringConfig;
  }

  async deleteMonitoringConfig(configId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('competitor_monitoring_config')
      .delete()
      .eq('id', configId);

    if (error) {
      console.error('[WarRoomService] Error deleting config:', error);
      return false;
    }

    return true;
  }

  // ============================================================================
  // AI WEIGHT PREFERENCES
  // ============================================================================

  async getWeightPreferences(
    projectId: string,
    featureType: FeatureType,
    userId?: string
  ): Promise<AIWeightPreference | null> {
    let query = this.supabase
      .from('ai_weight_preferences')
      .select('*')
      .eq('project_id', projectId)
      .eq('feature_type', featureType);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('is_default', true);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('[WarRoomService] Error getting weight preferences:', error);
    }

    return data as AIWeightPreference | null;
  }

  async saveWeightPreferences(
    projectId: string,
    featureType: FeatureType,
    weights: WeightConfig,
    userId?: string,
    presetName?: WeightPreset
  ): Promise<AIWeightPreference | null> {
    const { data, error } = await this.supabase
      .from('ai_weight_preferences')
      .upsert(
        {
          project_id: projectId,
          user_id: userId,
          feature_type: featureType,
          weights,
          preset_name: presetName || 'custom',
          is_default: !userId,
        },
        { onConflict: 'project_id,feature_type,is_default' }
      )
      .select()
      .single();

    if (error) {
      console.error('[WarRoomService] Error saving weight preferences:', error);
      return null;
    }

    return data as AIWeightPreference;
  }

  applyWeightPreset(preset: WeightPreset): WeightConfig {
    return WEIGHT_PRESETS[preset] || DEFAULT_WEIGHTS;
  }
}

// Lazy singleton pattern to avoid build-time initialization errors
let _warRoomServiceInstance: WarRoomService | null = null;

export function getWarRoomService(): WarRoomService {
  if (!_warRoomServiceInstance) {
    _warRoomServiceInstance = new WarRoomService();
  }
  return _warRoomServiceInstance;
}

// For backwards compatibility - but using getter is preferred
export const warRoomService = {
  getSummary: (...args: Parameters<WarRoomService['getSummary']>) => getWarRoomService().getSummary(...args),
  listAlerts: (...args: Parameters<WarRoomService['listAlerts']>) => getWarRoomService().listAlerts(...args),
  getAlert: (...args: Parameters<WarRoomService['getAlert']>) => getWarRoomService().getAlert(...args),
  createAlert: (...args: Parameters<WarRoomService['createAlert']>) => getWarRoomService().createAlert(...args),
  updateAlertStatus: (...args: Parameters<WarRoomService['updateAlertStatus']>) => getWarRoomService().updateAlertStatus(...args),
  listJobPostings: (...args: Parameters<WarRoomService['listJobPostings']>) => getWarRoomService().listJobPostings(...args),
  getHiringTrends: (...args: Parameters<WarRoomService['getHiringTrends']>) => getWarRoomService().getHiringTrends(...args),
  analyzeJobPosting: (...args: Parameters<WarRoomService['analyzeJobPosting']>) => getWarRoomService().analyzeJobPosting(...args),
  listMonitoringConfigs: (...args: Parameters<WarRoomService['listMonitoringConfigs']>) => getWarRoomService().listMonitoringConfigs(...args),
  upsertMonitoringConfig: (...args: Parameters<WarRoomService['upsertMonitoringConfig']>) => getWarRoomService().upsertMonitoringConfig(...args),
  deleteMonitoringConfig: (...args: Parameters<WarRoomService['deleteMonitoringConfig']>) => getWarRoomService().deleteMonitoringConfig(...args),
  getWeightPreferences: (...args: Parameters<WarRoomService['getWeightPreferences']>) => getWarRoomService().getWeightPreferences(...args),
  saveWeightPreferences: (...args: Parameters<WarRoomService['saveWeightPreferences']>) => getWarRoomService().saveWeightPreferences(...args),
  applyWeightPreset: (preset: WeightPreset) => getWarRoomService().applyWeightPreset(preset),
};
