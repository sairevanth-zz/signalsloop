/**
 * Competitor War Room Types
 * Real-time competitor monitoring and alerts
 */

export type AlertType =
  | 'feature_launch'
  | 'pricing_change'
  | 'acquisition'
  | 'job_posting'
  | 'review_trend'
  | 'social_mention'
  | 'press_release';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AlertStatus = 'new' | 'acknowledged' | 'in_progress' | 'addressed' | 'dismissed';

export type SourceType = 'website' | 'linkedin' | 'twitter' | 'g2' | 'news' | 'job_board';

export type Department = 'engineering' | 'product' | 'sales' | 'marketing' | 'ai_ml' | 'security' | 'design' | 'other';

export type SeniorityLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'director' | 'vp' | 'c_level';

export interface CompetitorAlert {
  id: string;
  project_id: string;
  competitor_name: string;
  competitor_id?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  source_url?: string;
  source_type?: SourceType;
  customer_impact_count: number;
  revenue_at_risk: number;
  urgency_score: number;
  ai_summary?: string;
  ai_recommended_action?: string;
  feature_comparison?: Record<string, any>;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  addressed_by?: string;
  addressed_at?: string;
  resolution_notes?: string;
  raw_data?: Record<string, any>;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitorJobPosting {
  id: string;
  project_id: string;
  competitor_name: string;
  competitor_id?: string;
  job_title: string;
  department?: Department;
  location?: string;
  job_type?: 'full_time' | 'contract' | 'intern';
  seniority_level?: SeniorityLevel;
  source_url?: string;
  source_platform?: string;
  strategic_signals?: string[];
  skills_mentioned?: string[];
  tech_stack_hints?: string[];
  ai_interpretation?: string;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CompetitorMonitoringConfig {
  id: string;
  project_id: string;
  competitor_name: string;
  competitor_id?: string;
  is_active: boolean;
  website_url?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  careers_page_url?: string;
  changelog_url?: string;
  alert_on_feature_launch: boolean;
  alert_on_pricing_change: boolean;
  alert_on_job_postings: boolean;
  alert_on_social_mentions: boolean;
  alert_on_review_trends: boolean;
  slack_channel_id?: string;
  email_recipients?: string[];
  last_checked_at?: string;
  next_check_at?: string;
  check_frequency_hours: number;
  created_at: string;
  updated_at: string;
}

export interface WarRoomSummary {
  total_alerts: number;
  new_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  total_job_postings: number;
  ai_ml_postings: number;
  engineering_postings: number;
  monitored_competitors: number;
  revenue_at_risk: number;
  last_alert_at?: string;
}

export interface HiringTrend {
  competitor: string;
  total_jobs: number;
  departments: Record<string, number>;
}

export interface AlertFilters {
  status?: AlertStatus[];
  severity?: AlertSeverity[];
  alert_type?: AlertType[];
  competitor_name?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateAlertInput {
  project_id: string;
  competitor_name: string;
  competitor_id?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  source_url?: string;
  source_type?: SourceType;
  customer_impact_count?: number;
  revenue_at_risk?: number;
  raw_data?: Record<string, any>;
}

// AI Weight Preferences
export type FeatureType = 'prioritization' | 'churn_prediction' | 'feature_scoring';

export type WeightPreset = 'roi_focused' | 'customer_first' | 'balanced' | 'competitive' | 'custom';

export interface WeightConfig {
  customer_requests: number;
  revenue_impact: number;
  strategic_alignment: number;
  competitive_pressure: number;
  technical_effort: number;
}

export interface AIWeightPreference {
  id: string;
  project_id: string;
  user_id?: string;
  feature_type: FeatureType;
  preset_name?: WeightPreset;
  weights: WeightConfig;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_WEIGHTS: WeightConfig = {
  customer_requests: 30,
  revenue_impact: 25,
  strategic_alignment: 20,
  competitive_pressure: 15,
  technical_effort: 10,
};

export const WEIGHT_PRESETS: Record<WeightPreset, WeightConfig> = {
  balanced: {
    customer_requests: 25,
    revenue_impact: 25,
    strategic_alignment: 20,
    competitive_pressure: 15,
    technical_effort: 15,
  },
  roi_focused: {
    customer_requests: 15,
    revenue_impact: 40,
    strategic_alignment: 20,
    competitive_pressure: 15,
    technical_effort: 10,
  },
  customer_first: {
    customer_requests: 45,
    revenue_impact: 15,
    strategic_alignment: 15,
    competitive_pressure: 15,
    technical_effort: 10,
  },
  competitive: {
    customer_requests: 15,
    revenue_impact: 20,
    strategic_alignment: 15,
    competitive_pressure: 40,
    technical_effort: 10,
  },
  custom: DEFAULT_WEIGHTS,
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  feature_launch: 'Feature Launch',
  pricing_change: 'Pricing Change',
  acquisition: 'Acquisition',
  job_posting: 'Job Posting Trend',
  review_trend: 'Review Trend',
  social_mention: 'Social Mention',
  press_release: 'Press Release',
};

export const SEVERITY_COLORS: Record<AlertSeverity, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  engineering: 'Engineering',
  product: 'Product',
  sales: 'Sales',
  marketing: 'Marketing',
  ai_ml: 'AI/ML',
  security: 'Security',
  design: 'Design',
  other: 'Other',
};
