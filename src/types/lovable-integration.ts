/**
 * Lovable Integration Types
 * 
 * Types for integrating with Lovable AI to generate
 * working prototypes from PRDs and specs.
 */

export interface LovableProject {
    id: string;
    name: string;
    description?: string;
    url: string;
    createdAt: Date;
    status: 'creating' | 'ready' | 'error';
}

export interface LovableGenerationRequest {
    projectId: string; // SignalsLoop project ID
    specId?: string;

    // Content to send to Lovable
    title: string;
    prompt: string;

    // Optional context
    userStories?: string[];
    designPreferences?: {
        style?: 'modern' | 'minimal' | 'enterprise' | 'playful';
        colorScheme?: 'light' | 'dark' | 'auto';
        components?: string[]; // e.g., ['forms', 'tables', 'charts']
    };
}

export interface LovableGenerationResult {
    success: boolean;
    lovableProjectId?: string;
    lovableUrl?: string;
    error?: string;

    // Tracking
    generatedAt: Date;
    specId?: string;
}

export interface LovableIntegrationConfig {
    apiKey: string;
    baseUrl: string;
    defaultStyle: 'modern' | 'minimal' | 'enterprise' | 'playful';
}
