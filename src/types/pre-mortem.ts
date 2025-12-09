/**
 * Pre-Mortem Analysis Types
 * 
 * Types for AI-powered "pre-mortem" analysis that imagines
 * why a feature might fail before it's built.
 */

export type RiskCategory =
    | 'technical'
    | 'adoption'
    | 'market'
    | 'resource'
    | 'competitive'
    | 'timing'
    | 'scope';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface PreMortemRisk {
    id: string;
    category: RiskCategory;
    severity: RiskSeverity;

    // The failure scenario
    title: string;
    description: string;
    failureScenario: string; // "Imagine it's 6 months from now..."

    // Impact
    probabilityScore: number; // 0-1
    impactScore: number; // 0-1
    riskScore: number; // probability * impact

    // Evidence
    warningSignals: string[];
    relatedThemes?: string[];
    historicalPrecedent?: string;

    // Mitigation
    mitigationStrategies: string[];
    monitoringIndicators: string[];

    // Status
    acknowledged: boolean;
    mitigated: boolean;
    mitigationNotes?: string;
}

export interface PreMortemAnalysis {
    id: string;
    projectId: string;
    featureId: string;
    featureName: string;
    featureDescription?: string;

    // Analysis results
    risks: PreMortemRisk[];
    overallRiskLevel: RiskSeverity;
    confidenceScore: number;

    // AI reasoning
    executiveSummary: string;
    topConcerns: string[];
    recommendedProceed: boolean;
    proceedConditions?: string[];

    // Metadata
    analyzedAt: Date;
    specId?: string;
}

export interface PreMortemRequest {
    projectId: string;
    featureName: string;
    featureDescription: string;
    specContent?: string;
    targetSegment?: string;
    estimatedEffort?: string;
}

export interface PreMortemResponse {
    success: boolean;
    analysis: PreMortemAnalysis | null;
    error?: string;
}
