/**
 * Launch (Go/No-Go) Types
 * Type definitions for the Go/No-Go Dashboard feature
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

export type DimensionType =
    | 'customer_readiness'
    | 'risk_assessment'
    | 'competitive_timing'
    | 'success_prediction';

export type RiskSeverity = 'low' | 'medium' | 'high';
export type RiskStatus = 'open' | 'mitigated' | 'acknowledged';
export type VoteType = 'go' | 'no_go' | 'conditional';
export type BoardStatus = 'draft' | 'reviewing' | 'decided';
export type DecisionType = 'go' | 'no_go' | 'conditional';

export const DIMENSION_CONFIG: Record<DimensionType, {
    name: string;
    icon: string;
    color: string;
}> = {
    customer_readiness: { name: 'Customer Readiness', icon: '👥', color: '#10b981' },
    risk_assessment: { name: 'Risk Assessment', icon: '⚠️', color: '#fbbf24' },
    competitive_timing: { name: 'Competitive Timing', icon: '🎯', color: '#06d6a0' },
    success_prediction: { name: 'Success Prediction', icon: '🔮', color: '#8b5cf6' },
};

// ============================================================================
// Sub-types
// ============================================================================

export interface AIInsight {
    text: string;
    source: string;
    positive: boolean;
}

export interface CustomerQuote {
    text: string;
    customer: string;
    mrr: string;
}

export interface PredictionData {
    adoption: number;
    sentiment: number;
    revenue: number;
}

// ============================================================================
// Database Models
// ============================================================================

export interface LaunchBoard {
    id: string;
    project_id: string;
    feature_id?: string;
    title: string;
    description?: string;
    target_date?: string;
    status: BoardStatus;
    decision?: DecisionType;
    decision_at?: string;
    decision_notes?: string;
    overall_score?: number;
    share_token?: string;
    is_public?: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface LaunchDimension {
    id: string;
    board_id: string;
    dimension_type: DimensionType;
    ai_score?: number;
    ai_insights: AIInsight[];
    team_notes?: string;
    customer_quotes: CustomerQuote[];
    prediction_data?: PredictionData;
    created_at: string;
    updated_at: string;
}

export interface LaunchRisk {
    id: string;
    board_id: string;
    title: string;
    description?: string;
    severity: RiskSeverity;
    status: RiskStatus;
    is_ai: boolean;
    source?: string;
    mitigation?: string;
    owner?: string;
    created_at: string;
    updated_at: string;
}

export interface LaunchVote {
    id: string;
    board_id: string;
    user_id?: string;
    name: string;
    email?: string;
    role?: string;
    is_required: boolean;
    vote?: VoteType;
    comment?: string;
    voted_at?: string;
    created_at: string;
}

export interface LaunchChecklistItem {
    id: string;
    board_id: string;
    title: string;
    description?: string;
    is_ai: boolean;
    auto_verified: boolean;
    completed: boolean;
    completed_at?: string;
    owner?: string;
    sort_order: number;
    created_at: string;
}

// ============================================================================
// Composite Types
// ============================================================================

export interface LaunchBoardWithDetails extends LaunchBoard {
    dimensions: LaunchDimension[];
    risks: LaunchRisk[];
    votes: LaunchVote[];
    checklist_items: LaunchChecklistItem[];
}

export interface VoteSummary {
    go: number;
    no_go: number;
    conditional: number;
    pending: number;
    total: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateLaunchBoardRequest {
    project_id: string;
    title: string;
    description?: string;
    target_date?: string;
    feature_id?: string;
}

export interface UpdateLaunchBoardRequest {
    title?: string;
    description?: string;
    target_date?: string;
    status?: BoardStatus;
    decision?: DecisionType;
    decision_notes?: string;
}

export interface CreateRiskRequest {
    title: string;
    description?: string;
    severity?: RiskSeverity;
    is_ai?: boolean;
    source?: string;
    mitigation?: string;
    owner?: string;
}

export interface CastVoteRequest {
    vote: VoteType;
    comment?: string;
}

export interface AddStakeholderRequest {
    name: string;
    email?: string;
    role?: string;
    is_required?: boolean;
}

export interface CreateChecklistItemRequest {
    title: string;
    description?: string;
    owner?: string;
}

export interface AIPopulateResponse {
    success: boolean;
    dimensions: LaunchDimension[];
    risks: LaunchRisk[];
    checklist_items: LaunchChecklistItem[];
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreateLaunchBoardSchema = z.object({
    project_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    target_date: z.string().optional(),
    feature_id: z.string().uuid().optional(),
});

export const UpdateLaunchBoardSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    target_date: z.string().optional(),
    status: z.enum(['draft', 'reviewing', 'decided']).optional(),
    decision: z.enum(['go', 'no_go', 'conditional']).optional(),
    decision_notes: z.string().max(5000).optional(),
});

export const CreateRiskSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    severity: z.enum(['low', 'medium', 'high']).optional(),
    is_ai: z.boolean().optional(),
    source: z.string().max(100).optional(),
    mitigation: z.string().max(2000).optional(),
    owner: z.string().max(100).optional(),
});

export const CastVoteSchema = z.object({
    vote: z.enum(['go', 'no_go', 'conditional']),
    comment: z.string().max(1000).optional(),
});

export const AddStakeholderSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().optional(),
    role: z.string().max(100).optional(),
    is_required: z.boolean().optional(),
});

// ============================================================================
// Utility Functions
// ============================================================================

export function calculateOverallScore(dimensions: LaunchDimension[]): number {
    if (dimensions.length === 0) return 0;
    const totalScore = dimensions.reduce((sum, d) => sum + (d.ai_score || 0), 0);
    return Math.round(totalScore / dimensions.length);
}

export function getVoteSummary(votes: LaunchVote[]): VoteSummary {
    return {
        go: votes.filter(v => v.vote === 'go').length,
        no_go: votes.filter(v => v.vote === 'no_go').length,
        conditional: votes.filter(v => v.vote === 'conditional').length,
        pending: votes.filter(v => !v.vote).length,
        total: votes.length,
    };
}

export function getScoreColor(score: number): string {
    if (score >= 75) return '#10b981'; // green
    if (score >= 50) return '#fbbf24'; // yellow
    return '#ef4444'; // red
}

export function getSeverityColor(severity: RiskSeverity): string {
    switch (severity) {
        case 'high': return '#f59e0b';
        case 'medium': return '#fbbf24';
        case 'low': return '#10b981';
    }
}

export function getStatusColor(status: RiskStatus): string {
    switch (status) {
        case 'open': return '#ef4444';
        case 'mitigated': return '#10b981';
        case 'acknowledged': return '#fbbf24';
    }
}
