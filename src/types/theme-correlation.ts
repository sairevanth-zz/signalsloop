/**
 * Theme Correlation Types
 * 
 * Types for analyzing relationships between feedback themes.
 */

export interface ThemeCorrelation {
    themeId1: string;
    themeName1: string;
    themeId2: string;
    themeName2: string;

    // Correlation strength (0-1)
    correlationScore: number;

    // Correlation type
    correlationType: 'positive' | 'negative' | 'neutral';

    // Evidence
    coOccurrences: number; // Number of posts mentioning both
    samplePosts: string[]; // Sample post IDs

    // Temporal relationship
    temporalRelation?: 'leads' | 'lags' | 'concurrent';
    lagDays?: number; // If one leads the other
}

export interface ThemeNode {
    id: string;
    name: string;
    frequency: number;
    sentiment: number;
    priority?: string;
    group?: string; // For clustering
}

export interface ThemeEdge {
    source: string;
    target: string;
    weight: number; // Correlation strength
    type: 'positive' | 'negative';
}

export interface ThemeNetwork {
    nodes: ThemeNode[];
    edges: ThemeEdge[];
    clusters: {
        id: string;
        name: string;
        themeIds: string[];
    }[];
}

export interface CorrelationInsight {
    type: 'cluster' | 'driver' | 'effect' | 'opposing';
    title: string;
    description: string;
    themeIds: string[];
    actionable: boolean;
    suggestedAction?: string;
}

export interface CorrelationAnalysis {
    projectId: string;
    network: ThemeNetwork;
    correlations: ThemeCorrelation[];
    insights: CorrelationInsight[];
    analyzedAt: Date;
}
