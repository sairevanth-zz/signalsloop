/**
 * Strategy Shift Types
 * Types for the Live Strategy Co-Pilot feature
 */

export type ShiftType = 'pause' | 'accelerate' | 'pivot' | 'deprioritize' | 'experiment';
export type ShiftStatus = 'proposed' | 'approved' | 'rejected' | 'auto_applied' | 'expired';
export type SignalSource = 'churn' | 'anomaly' | 'competitor' | 'sentiment' | 'usage' | 'feedback';
export type SignalSeverity = 'info' | 'warning' | 'critical';

export interface SignalEvidence {
    source: SignalSource;
    signal: string;
    severity: SignalSeverity;
    dataPoints: Record<string, any>;
    timestamp?: string;
}

export interface StrategyShift {
    id: string;
    projectId: string;
    type: ShiftType;
    targetFeature: string;
    action: string;
    rationale: string;
    signals: SignalEvidence[];
    expectedImpact: string | null;
    confidence: number;
    status: ShiftStatus;
    experimentId: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface StrategyShiftCreate {
    projectId: string;
    type: ShiftType;
    targetFeature: string;
    action: string;
    rationale: string;
    signals: SignalEvidence[];
    expectedImpact?: string;
    confidence: number;
}

export interface StrategyShiftUpdate {
    status?: ShiftStatus;
    reviewedBy?: string;
    reviewNotes?: string;
    experimentId?: string;
}

export interface StrategyShiftSummary {
    totalProposed: number;
    totalApproved: number;
    totalRejected: number;
    avgConfidence: number;
    topShiftType: ShiftType | null;
}

export interface GenerateShiftsRequest {
    projectId: string;
    forceRefresh?: boolean;
}

export interface GenerateShiftsResponse {
    success: boolean;
    shiftsGenerated: number;
    shifts: StrategyShift[];
    error?: string;
}

export interface ApproveShiftRequest {
    shiftId: string;
    notes?: string;
    createExperiment?: boolean;
}

export interface RejectShiftRequest {
    shiftId: string;
    notes?: string;
}
