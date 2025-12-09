/**
 * Types for Self-Correcting Roadmaps Feature
 */

// ============================================
// TRIGGER TYPES
// ============================================

export type TriggerType =
    | 'sentiment_shift'
    | 'competitor_move'
    | 'theme_spike'
    | 'churn_signal';

export type TriggerSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AdjustmentTrigger {
    type: TriggerType;
    severity: TriggerSeverity;
    themeId: string;
    themeName: string;
    description: string;
    dataPoints: string[];
    recommendedAction: string;
    detectedAt: Date;
}

export interface TriggerDetectionInput {
    projectId: string;
    projectName: string;
    sentimentChanges: Array<{
        themeId: string;
        themeName: string;
        previousSentiment: number;
        currentSentiment: number;
        changePercent: number;
    }>;
    themeVelocity: Array<{
        themeId: string;
        themeName: string;
        previousMentions: number;
        currentMentions: number;
        changePercent: number;
    }>;
    competitorMoves: Array<{
        competitorName: string;
        activity: string;
        detectedAt: string;
        relatedThemes: string[];
    }>;
    churnSignals: Array<{
        themeId: string;
        themeName: string;
        atRiskUsers: number;
        churnRiskScore: number;
    }>;
    currentPriorities: Array<{
        suggestionId: string;
        themeId: string;
        themeName: string;
        priority: string;
        score: number;
    }>;
}

// ============================================
// PROPOSAL TYPES
// ============================================

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface PriorityChange {
    suggestionId: string;
    themeId: string;
    themeName: string;
    oldPriority: string;
    newPriority: string;
    oldScore: number;
    newScore: number;
    reasoning: string;
    impactIfIgnored: string;
}

export interface AdjustmentProposal {
    id: string;
    projectId: string;
    triggerType: TriggerType;
    triggerSeverity: TriggerSeverity;
    triggerDescription: string;
    triggerData: Record<string, unknown>;
    status: ProposalStatus;
    proposedChanges: PriorityChange[];
    aiReasoning: string | null;
    confidenceScore: number;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProposalGenerationInput {
    projectId: string;
    trigger: AdjustmentTrigger;
    currentRoadmap: Array<{
        suggestionId: string;
        themeId: string;
        themeName: string;
        priorityLevel: string;
        priorityScore: number;
        frequency: number;
        avgSentiment: number;
    }>;
}

export interface ProposalGenerationResult {
    title: string;
    summary: string;
    changes: Array<{
        suggestionId: string;
        themeName: string;
        oldPriority: string;
        newPriority: string;
        reasoning: string;
        impactIfIgnored: string;
    }>;
    confidence: number;
    urgency: 'immediate' | 'within_week' | 'within_month';
}

// ============================================
// HISTORY TYPES
// ============================================

export interface AdjustmentHistory {
    id: string;
    proposalId: string;
    projectId: string;
    suggestionId: string;
    themeName: string;
    oldPriority: string;
    newPriority: string;
    oldScore: number;
    newScore: number;
    outcomeValidated: boolean;
    outcomeCorrect: boolean | null;
    validatedAt: Date | null;
    validationNotes: string | null;
    createdAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface DetectionResult {
    adjustmentsNeeded: boolean;
    triggers: AdjustmentTrigger[];
    proposalsCreated: number;
}

export interface ApprovalResult {
    success: boolean;
    appliedChanges: PriorityChange[];
    historyIds: string[];
}

export interface ProposalStats {
    totalProposals: number;
    pendingProposals: number;
    approvedProposals: number;
    rejectedProposals: number;
    approvalRate: number;
    avgConfidence: number;
    lastProposalAt: Date | null;
}

// ============================================
// DATABASE ROW TYPES (for Supabase)
// ============================================

export interface RoadmapAdjustmentProposalRow {
    id: string;
    project_id: string;
    trigger_type: TriggerType;
    trigger_severity: TriggerSeverity;
    trigger_description: string;
    trigger_data: Record<string, unknown>;
    status: ProposalStatus;
    proposed_changes: PriorityChange[];
    ai_reasoning: string | null;
    confidence_score: number;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    expires_at: string;
    created_at: string;
    updated_at: string;
}

export interface RoadmapAdjustmentHistoryRow {
    id: string;
    proposal_id: string;
    project_id: string;
    suggestion_id: string;
    theme_name: string;
    old_priority: string;
    new_priority: string;
    old_score: number;
    new_score: number;
    outcome_validated: boolean;
    outcome_correct: boolean | null;
    validated_at: string | null;
    validation_notes: string | null;
    created_at: string;
}
