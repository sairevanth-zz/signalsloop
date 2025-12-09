/**
 * Agent Workflow Chaining Types
 * 
 * Types for orchestrating autonomous agent workflows
 * where one agent's output triggers another agent.
 */

export type AgentType =
    | 'feedback_analyzer'
    | 'theme_detector'
    | 'sentiment_analyzer'
    | 'roadmap_suggester'
    | 'spec_writer'
    | 'prediction_engine'
    | 'outcome_tracker'
    | 'pre_mortem'
    | 'competitive_intel';

export type WorkflowTrigger =
    | 'new_feedback'
    | 'theme_spike'
    | 'sentiment_shift'
    | 'feature_shipped'
    | 'competitor_detected'
    | 'churn_signal'
    | 'spec_created'
    | 'manual';

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface WorkflowStep {
    id: string;
    agentType: AgentType;
    status: WorkflowStatus;

    // Input/Output
    input: Record<string, unknown>;
    output?: Record<string, unknown>;

    // Execution
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
    error?: string;

    // Dependencies
    dependsOn?: string[]; // Step IDs that must complete first

    // Conditional execution
    condition?: {
        field: string;
        operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
        value: unknown;
    };
}

export interface Workflow {
    id: string;
    projectId: string;
    name: string;
    description?: string;

    // Trigger
    trigger: WorkflowTrigger;
    triggerData?: Record<string, unknown>;

    // Steps
    steps: WorkflowStep[];
    currentStepIndex: number;

    // Status
    status: WorkflowStatus;
    progress: number; // 0-100

    // Results
    finalOutput?: Record<string, unknown>;

    // Timestamps
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    trigger: WorkflowTrigger;
    steps: Omit<WorkflowStep, 'id' | 'status' | 'output' | 'startedAt' | 'completedAt'>[];
    isDefault: boolean;
}

export interface WorkflowExecutionResult {
    workflowId: string;
    success: boolean;
    stepsCompleted: number;
    totalSteps: number;
    finalOutput?: Record<string, unknown>;
    error?: string;
    durationMs: number;
}

// Pre-defined workflow templates
export const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    {
        id: 'feedback_to_roadmap',
        name: 'Feedback to Roadmap',
        description: 'Analyze new feedback, detect themes, and update roadmap suggestions',
        trigger: 'new_feedback',
        steps: [
            { agentType: 'sentiment_analyzer', input: { source: 'trigger' } },
            { agentType: 'theme_detector', input: { source: 'trigger' }, dependsOn: ['step_0'] },
            { agentType: 'roadmap_suggester', input: { source: 'step_1' }, dependsOn: ['step_1'] }
        ],
        isDefault: true
    },
    {
        id: 'spec_to_prediction',
        name: 'Spec to Prediction',
        description: 'When a spec is created, run prediction and pre-mortem analysis',
        trigger: 'spec_created',
        steps: [
            { agentType: 'prediction_engine', input: { source: 'trigger' } },
            { agentType: 'pre_mortem', input: { source: 'trigger' }, dependsOn: ['step_0'] }
        ],
        isDefault: true
    },
    {
        id: 'ship_to_outcome',
        name: 'Ship to Outcome',
        description: 'After feature ships, track outcomes and close prediction loops',
        trigger: 'feature_shipped',
        steps: [
            { agentType: 'outcome_tracker', input: { source: 'trigger' } }
        ],
        isDefault: true
    },
    {
        id: 'competitor_response',
        name: 'Competitor Response',
        description: 'When competitor activity detected, analyze impact and adjust roadmap',
        trigger: 'competitor_detected',
        steps: [
            { agentType: 'competitive_intel', input: { source: 'trigger' } },
            { agentType: 'roadmap_suggester', input: { source: 'step_0' }, dependsOn: ['step_0'] }
        ],
        isDefault: true
    }
];
