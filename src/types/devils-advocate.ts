/**
 * TypeScript Types for Devil's Advocate Agent
 *
 * Adversarial AI agent that challenges PRDs with risk alerts
 * based on competitor intelligence and internal data.
 */

import { z } from 'zod';

// ============================================================================
// Competitor Events
// ============================================================================

export type EventType =
  | 'feature_launch'
  | 'pricing_change'
  | 'funding'
  | 'acquisition'
  | 'partnership'
  | 'executive_change'
  | 'product_sunset'
  | 'expansion';

export type SourceType =
  | 'changelog'
  | 'press_release'
  | 'news'
  | 'social'
  | 'sec_filing'
  | 'job_posting';

export type ImpactAssessment = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface StrategicImplications {
  threat_to_features?: string[];
  opportunity?: string;
  recommended_response?: string;
}

export interface CompetitorEvent {
  id: string;
  project_id: string;
  competitor_id: string;
  event_type: EventType;
  event_title: string;
  event_summary: string;
  event_date: string; // ISO date string
  source_url: string | null;
  source_type: SourceType | null;
  impact_assessment: ImpactAssessment | null;
  strategic_implications: StrategicImplications | null;
  embedding: number[] | null; // Vector embedding
  created_at: string;
}

// Zod schema for validation
export const CompetitorEventSchema = z.object({
  event_type: z.enum([
    'feature_launch',
    'pricing_change',
    'funding',
    'acquisition',
    'partnership',
    'executive_change',
    'product_sunset',
    'expansion',
  ]),
  event_title: z.string().max(100),
  event_summary: z.string().min(10),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  source_url: z.string().url().optional(),
  source_type: z
    .enum(['changelog', 'press_release', 'news', 'social', 'sec_filing', 'job_posting'])
    .optional(),
  impact_assessment: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  strategic_implications: z.object({
    threat_to_features: z.array(z.string()).optional(),
    opportunity: z.string().optional(),
    recommended_response: z.string().optional(),
  }),
});

// ============================================================================
// PRD Risk Alerts
// ============================================================================

export type RiskType =
  | 'competitive_threat'
  | 'data_contradiction'
  | 'assumption_challenge'
  | 'market_shift'
  | 'technical_risk'
  | 'resource_constraint';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export interface Evidence {
  sources: Array<{
    type: 'competitor_event' | 'feedback' | 'spec' | 'external';
    id?: string;
    title: string;
    url?: string;
  }>;
  data_points: string[];
  quotes: string[];
}

export interface ReasoningStep {
  step_number: number;
  description: string;
  evidence: string[];
  conclusion: string;
  confidence: number;
}

export interface RiskAlertReasoningTrace {
  decision_summary: string;
  reasoning_steps: ReasoningStep[];
  alternatives_considered: Array<{
    alternative: string;
    why_rejected: string;
  }>;
}

export interface PRDRiskAlert {
  id: string;
  spec_id: string;
  project_id: string;
  risk_type: RiskType;
  severity: Severity;
  title: string;
  description: string;
  evidence: Evidence;
  recommended_action: string;
  status: AlertStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  reasoning_trace: RiskAlertReasoningTrace | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

// Zod schema for risk alert creation
export const PRDRiskAlertInputSchema = z.object({
  spec_id: z.string().uuid(),
  project_id: z.string().uuid(),
  risk_type: z.enum([
    'competitive_threat',
    'data_contradiction',
    'assumption_challenge',
    'market_shift',
    'technical_risk',
    'resource_constraint',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string().min(10).max(200),
  description: z.string().min(20),
  evidence: z.object({
    sources: z.array(
      z.object({
        type: z.enum(['competitor_event', 'feedback', 'spec', 'external']),
        id: z.string().optional(),
        title: z.string(),
        url: z.string().url().optional(),
      })
    ),
    data_points: z.array(z.string()),
    quotes: z.array(z.string()),
  }),
  recommended_action: z.string().min(10),
  confidence_score: z.number().min(0).max(1).optional(),
  reasoning_trace: z
    .object({
      decision_summary: z.string(),
      reasoning_steps: z.array(
        z.object({
          step_number: z.number(),
          description: z.string(),
          evidence: z.array(z.string()),
          conclusion: z.string(),
          confidence: z.number().min(0).max(1),
        })
      ),
      alternatives_considered: z.array(
        z.object({
          alternative: z.string(),
          why_rejected: z.string(),
        })
      ),
    })
    .optional(),
});

export type PRDRiskAlertInput = z.infer<typeof PRDRiskAlertInputSchema>;

// ============================================================================
// API Response Types
// ============================================================================

export interface RiskAlertsSummary {
  total_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  open_alerts: number;
  alerts_last_7d: number;
  top_risk_types: Array<{
    risk_type: RiskType;
    count: number;
  }>;
}

export interface CompetitorEventSearchResult extends CompetitorEvent {
  similarity: number;
}

// ============================================================================
// Service Types
// ============================================================================

export interface CompetitorScrapeResult {
  success: boolean;
  events_created: number;
  errors: Array<{
    competitor_id: string;
    error: string;
  }>;
}

export interface RedTeamAnalysisInput {
  spec_id: string;
  project_id: string;
  spec_content: string;
  competitor_events?: CompetitorEvent[];
  internal_feedback?: any[]; // From feedback table
}

export interface RedTeamAnalysisOutput {
  alerts: PRDRiskAlertInput[];
  analysis_summary: string;
  total_risks_found: number;
}
