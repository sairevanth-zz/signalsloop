/**
 * Retrospective Types
 * Type definitions for the Period-Aware Retrospective Tool
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

export type RetroPeriod = 'sprint' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type ActionStatus = 'not_started' | 'in_progress' | 'completed';
export type BoardStatus = 'active' | 'completed' | 'archived';

export interface RetroMetric {
    label: string;
    value: string;
    trend?: 'up' | 'down' | null;
}

export interface ColumnConfig {
    key: string;
    title: string;
    emoji: string;
    color: string;
}

export interface PeriodConfig {
    id: RetroPeriod;
    label: string;
    icon: string;
    duration: string;
    templates: string[];
    defaultColumns: ColumnConfig[];
    defaultMetricLabels: string[];
}

// ============================================================================
// Period Configurations
// ============================================================================

export const PERIOD_CONFIGS: Record<RetroPeriod, PeriodConfig> = {
    sprint: {
        id: 'sprint',
        label: 'Sprint',
        icon: '🏃',
        duration: '2 weeks',
        templates: ['Start/Stop/Continue', 'Mad/Sad/Glad', '4Ls', 'Sailboat'],
        defaultColumns: [
            { key: 'start', title: 'Start', emoji: '🚀', color: '#10b981' },
            { key: 'stop', title: 'Stop', emoji: '🛑', color: '#ef4444' },
            { key: 'continue', title: 'Continue', emoji: '✨', color: '#06d6a0' },
        ],
        defaultMetricLabels: ['Shipped', 'Sentiment', 'Themes Addressed', 'Velocity'],
    },
    monthly: {
        id: 'monthly',
        label: 'Monthly (MBR)',
        icon: '📅',
        duration: '1 month',
        templates: ["What Worked/Didn't/Learned", 'Goals Review', 'Customer Health', 'Team Performance'],
        defaultColumns: [
            { key: 'achieved', title: 'Achieved', emoji: '✅', color: '#10b981' },
            { key: 'challenges', title: 'Challenges', emoji: '⚠️', color: '#ef4444' },
            { key: 'learned', title: 'Learned', emoji: '📚', color: '#8b5cf6' },
            { key: 'next', title: 'Next Month', emoji: '📋', color: '#06d6a0' },
        ],
        defaultMetricLabels: ['Shipped', 'Sentiment', 'MRR Impact', 'Churn Prevented'],
    },
    quarterly: {
        id: 'quarterly',
        label: 'Quarterly (QBR)',
        icon: '📊',
        duration: '3 months',
        templates: ['OKR Review', 'Strategic Themes', 'Competitive Position', 'Customer Journey'],
        defaultColumns: [
            { key: 'wins', title: 'Strategic Wins', emoji: '🏆', color: '#10b981' },
            { key: 'misses', title: 'Misses & Learnings', emoji: '📉', color: '#ef4444' },
            { key: 'insights', title: 'Key Insights', emoji: '💡', color: '#8b5cf6' },
            { key: 'next', title: 'Next Period Focus', emoji: '🎯', color: '#06d6a0' },
        ],
        defaultMetricLabels: ['Shipped', 'Sentiment', 'MRR Impact', 'Prediction Accuracy'],
    },
    yearly: {
        id: 'yearly',
        label: 'Yearly',
        icon: '🎯',
        duration: '1 year',
        templates: ['Year in Review', 'Strategic Wins/Misses', 'Culture & Process', 'Vision Alignment'],
        defaultColumns: [
            { key: 'wins', title: 'Strategic Wins', emoji: '🏆', color: '#10b981' },
            { key: 'misses', title: 'Misses & Learnings', emoji: '📉', color: '#ef4444' },
            { key: 'insights', title: 'Key Insights', emoji: '💡', color: '#8b5cf6' },
            { key: 'next', title: 'Next Period Focus', emoji: '🎯', color: '#06d6a0' },
        ],
        defaultMetricLabels: ['Shipped', 'Sentiment', 'ARR Growth', 'Team Growth'],
    },
    custom: {
        id: 'custom',
        label: 'Custom',
        icon: '📆',
        duration: 'Custom',
        templates: ['Start/Stop/Continue', 'Custom Template'],
        defaultColumns: [
            { key: 'start', title: 'Start', emoji: '🚀', color: '#10b981' },
            { key: 'stop', title: 'Stop', emoji: '🛑', color: '#ef4444' },
            { key: 'continue', title: 'Continue', emoji: '✨', color: '#06d6a0' },
        ],
        defaultMetricLabels: ['Shipped', 'Sentiment', 'Themes'],
    },
};

export const PERIOD_AI_CALLOUTS: Record<RetroPeriod, string> = {
    sprint: 'Sprint retros focus on tactical improvements. AI surfaces recent feedback spikes, immediate outcome data, and sprint velocity metrics.',
    monthly: 'Monthly Business Reviews (MBRs) track operational metrics. AI shows month-over-month trends, customer health changes, and team performance data.',
    quarterly: 'Quarterly Business Reviews (QBRs) align with OKRs. AI surfaces strategic themes, competitive movements, revenue impact, and prediction accuracy trends.',
    yearly: 'Annual retrospectives inform long-term strategy. AI provides year-over-year analysis, prediction accuracy review, market position changes, and team growth metrics.',
    custom: 'Custom periods let you analyze any timeframe. AI adapts insights based on the selected date range and available data.',
};

// ============================================================================
// Database Models
// ============================================================================

export interface RetroBoard {
    id: string;
    project_id: string;
    title: string;
    period_type: RetroPeriod;
    template?: string;
    start_date: string;
    end_date: string;
    team_happiness?: number;
    customer_sentiment?: number;
    metrics: RetroMetric[];
    ai_summary?: string;
    status: BoardStatus;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface RetroColumn {
    id: string;
    board_id: string;
    column_key: string;
    title: string;
    emoji?: string;
    color?: string;
    sort_order: number;
    created_at: string;
}

export interface RetroCard {
    id: string;
    column_id: string;
    content: string;
    is_ai: boolean;
    source?: string;
    data_badge?: string;
    is_success: boolean;
    is_alert: boolean;
    vote_count: number;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface RetroCardVote {
    id: string;
    card_id: string;
    user_id?: string;
    created_at: string;
}

export interface RetroAction {
    id: string;
    board_id: string;
    title: string;
    description?: string;
    owner?: string;
    due_date?: string;
    status: ActionStatus;
    completed_at?: string;
    from_card_id?: string;
    from_source?: string;
    external_id?: string;
    external_url?: string;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Composite Types
// ============================================================================

export interface RetroColumnWithCards extends RetroColumn {
    cards: RetroCard[];
}

export interface RetroBoardWithDetails extends RetroBoard {
    columns: RetroColumnWithCards[];
    actions: RetroAction[];
}

export interface OutcomeTimelineItem {
    feature: string;
    shipped: string;
    status: 'success' | 'partial' | 'failed';
    adoption: string;
    predicted: string;
    sentiment: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateRetroBoardRequest {
    project_id: string;
    title: string;
    period_type: RetroPeriod;
    template?: string;
    start_date: string;
    end_date: string;
}

export interface UpdateRetroBoardRequest {
    title?: string;
    template?: string;
    team_happiness?: number;
    customer_sentiment?: number;
    metrics?: RetroMetric[];
    ai_summary?: string;
    status?: BoardStatus;
}

export interface CreateRetroCardRequest {
    column_id: string;
    content: string;
    is_ai?: boolean;
    source?: string;
    data_badge?: string;
    is_success?: boolean;
    is_alert?: boolean;
}

export interface UpdateRetroCardRequest {
    content?: string;
    data_badge?: string;
    is_success?: boolean;
    is_alert?: boolean;
}

export interface CreateRetroActionRequest {
    title: string;
    description?: string;
    owner?: string;
    due_date?: string;
    from_card_id?: string;
    from_source?: string;
}

export interface UpdateRetroActionRequest {
    title?: string;
    description?: string;
    owner?: string;
    due_date?: string;
    status?: ActionStatus;
}

export interface AIPopulateRequest {
    board_id: string;
}

export interface AIPopulateResponse {
    success: boolean;
    cards: RetroCard[];
    metrics?: RetroMetric[];
}

export interface GenerateSummaryResponse {
    success: boolean;
    summary: string;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreateRetroBoardSchema = z.object({
    project_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    period_type: z.enum(['sprint', 'monthly', 'quarterly', 'yearly', 'custom']),
    template: z.string().max(100).optional(),
    start_date: z.string(),
    end_date: z.string(),
});

export const UpdateRetroBoardSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    template: z.string().max(100).optional(),
    team_happiness: z.number().min(0).max(10).optional(),
    customer_sentiment: z.number().min(-1).max(1).optional(),
    metrics: z.array(z.object({
        label: z.string(),
        value: z.string(),
        trend: z.enum(['up', 'down']).nullable().optional(),
    })).optional(),
    ai_summary: z.string().max(10000).optional(),
    status: z.enum(['active', 'completed', 'archived']).optional(),
});

export const CreateRetroCardSchema = z.object({
    column_id: z.string().uuid(),
    content: z.string().min(1).max(2000),
    is_ai: z.boolean().optional(),
    source: z.string().max(100).optional(),
    data_badge: z.string().max(100).optional(),
    is_success: z.boolean().optional(),
    is_alert: z.boolean().optional(),
});

export const CreateRetroActionSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    owner: z.string().max(100).optional(),
    due_date: z.string().optional(),
    from_card_id: z.string().uuid().optional(),
    from_source: z.string().max(100).optional(),
});

export const UpdateRetroActionSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(2000).optional(),
    owner: z.string().max(100).optional(),
    due_date: z.string().optional(),
    status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
});

// ============================================================================
// Utility Functions
// ============================================================================

export function getPeriodConfig(period: RetroPeriod): PeriodConfig {
    return PERIOD_CONFIGS[period];
}

export function getPeriodAICallout(period: RetroPeriod): string {
    return PERIOD_AI_CALLOUTS[period];
}

export function getActionStatusColor(status: ActionStatus): string {
    switch (status) {
        case 'completed': return '#10b981';
        case 'in_progress': return '#fbbf24';
        case 'not_started': return '#64748b';
    }
}

export function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

export function getDefaultColumnsForPeriod(period: RetroPeriod): ColumnConfig[] {
    return PERIOD_CONFIGS[period].defaultColumns;
}

export function getDefaultMetricLabelsForPeriod(period: RetroPeriod): string[] {
    return PERIOD_CONFIGS[period].defaultMetricLabels;
}
