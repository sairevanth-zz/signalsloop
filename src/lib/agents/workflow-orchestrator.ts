/**
 * Workflow Orchestrator
 * 
 * Manages execution of multi-agent workflows.
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type {
    Workflow,
    WorkflowStep,
    WorkflowTemplate,
    WorkflowExecutionResult,
    WorkflowTrigger,
    AgentType,
    DEFAULT_WORKFLOW_TEMPLATES
} from '@/types/agent-workflow';

// Agent executor registry
const AGENT_EXECUTORS: Record<AgentType, (input: Record<string, unknown>, projectId: string) => Promise<Record<string, unknown>>> = {
    feedback_analyzer: async (input, projectId) => {
        // Would call feedback analysis service
        return { analyzed: true, feedbackId: input.feedbackId };
    },
    theme_detector: async (input, projectId) => {
        // Would call theme detection
        return { themes: [], newThemes: 0 };
    },
    sentiment_analyzer: async (input, projectId) => {
        // Would call sentiment analysis
        return { sentiment: 0.5, analyzed: true };
    },
    roadmap_suggester: async (input, projectId) => {
        // Would call roadmap suggestion
        return { suggestionsCreated: 0 };
    },
    spec_writer: async (input, projectId) => {
        // Would call spec writer
        return { specId: null };
    },
    prediction_engine: async (input, projectId) => {
        // Would call prediction engine
        return { predicted: true, adoptionRate: 0.6 };
    },
    outcome_tracker: async (input, projectId) => {
        // Would call outcome tracker
        return { tracked: true };
    },
    pre_mortem: async (input, projectId) => {
        // Would call pre-mortem analysis
        const { runPreMortemAnalysis } = await import('@/lib/analysis/pre-mortem-service');
        const result = await runPreMortemAnalysis({
            projectId,
            featureName: input.featureName as string || 'Unknown',
            featureDescription: input.featureDescription as string || ''
        });
        return { analysisId: result.id, riskLevel: result.overallRiskLevel };
    },
    competitive_intel: async (input, projectId) => {
        // Would call competitive intel
        return { analyzed: true };
    }
};

/**
 * Create a workflow from a template
 */
export function createWorkflowFromTemplate(
    template: WorkflowTemplate,
    projectId: string,
    triggerData: Record<string, unknown>
): Workflow {
    const steps: WorkflowStep[] = template.steps.map((s, i) => ({
        id: `step_${i}`,
        agentType: s.agentType,
        status: 'pending',
        input: s.input,
        dependsOn: s.dependsOn
    }));

    return {
        id: `wf_${Date.now()}`,
        projectId,
        name: template.name,
        description: template.description,
        trigger: template.trigger,
        triggerData,
        steps,
        currentStepIndex: 0,
        status: 'pending',
        progress: 0,
        createdAt: new Date()
    };
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
    workflow: Workflow
): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    let stepsCompleted = 0;

    workflow.status = 'running';
    workflow.startedAt = new Date();

    const stepOutputs: Record<string, Record<string, unknown>> = {};
    stepOutputs['trigger'] = workflow.triggerData || {};

    try {
        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];
            workflow.currentStepIndex = i;

            // Check dependencies
            if (step.dependsOn) {
                const depsComplete = step.dependsOn.every(depId => {
                    const depStep = workflow.steps.find(s => s.id === depId);
                    return depStep?.status === 'completed';
                });

                if (!depsComplete) {
                    console.warn(`[Workflow] Step ${step.id} dependencies not met, skipping`);
                    continue;
                }
            }

            // Resolve input
            const resolvedInput = resolveStepInput(step.input, stepOutputs);

            // Execute agent
            step.status = 'running';
            step.startedAt = new Date();

            console.log(`[Workflow] Executing step ${step.id} (${step.agentType})`);

            try {
                const executor = AGENT_EXECUTORS[step.agentType];
                const output = await executor(resolvedInput, workflow.projectId);

                step.output = output;
                step.status = 'completed';
                step.completedAt = new Date();
                step.durationMs = Date.now() - step.startedAt.getTime();

                stepOutputs[step.id] = output;
                stepsCompleted++;

                workflow.progress = Math.round((stepsCompleted / workflow.steps.length) * 100);
            } catch (stepError) {
                step.status = 'failed';
                step.error = stepError instanceof Error ? stepError.message : 'Unknown error';
                console.error(`[Workflow] Step ${step.id} failed:`, stepError);
            }
        }

        workflow.status = 'completed';
        workflow.completedAt = new Date();
        workflow.finalOutput = stepOutputs;

        return {
            workflowId: workflow.id,
            success: true,
            stepsCompleted,
            totalSteps: workflow.steps.length,
            finalOutput: workflow.finalOutput,
            durationMs: Date.now() - startTime
        };
    } catch (error) {
        workflow.status = 'failed';

        return {
            workflowId: workflow.id,
            success: false,
            stepsCompleted,
            totalSteps: workflow.steps.length,
            error: error instanceof Error ? error.message : 'Unknown error',
            durationMs: Date.now() - startTime
        };
    }
}

/**
 * Resolve step input from previous outputs
 */
function resolveStepInput(
    inputConfig: Record<string, unknown>,
    stepOutputs: Record<string, Record<string, unknown>>
): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(inputConfig)) {
        if (typeof value === 'string' && value.startsWith('trigger') || value.startsWith('step_')) {
            // Reference to previous output
            const sourceKey = value as string;
            resolved[key] = stepOutputs[sourceKey] || {};
        } else if (typeof value === 'object' && value !== null && 'source' in value) {
            // Nested source reference
            const sourceKey = (value as { source: string }).source;
            Object.assign(resolved, stepOutputs[sourceKey] || {});
        } else {
            resolved[key] = value;
        }
    }

    return resolved;
}

/**
 * Trigger a workflow based on an event
 */
export async function triggerWorkflow(
    projectId: string,
    trigger: WorkflowTrigger,
    triggerData: Record<string, unknown>
): Promise<WorkflowExecutionResult | null> {
    // Import templates dynamically to avoid circular deps
    const { DEFAULT_WORKFLOW_TEMPLATES } = await import('@/types/agent-workflow');

    // Find matching template
    const template = DEFAULT_WORKFLOW_TEMPLATES.find(t => t.trigger === trigger);

    if (!template) {
        console.log(`[Workflow] No template for trigger: ${trigger}`);
        return null;
    }

    const workflow = createWorkflowFromTemplate(template, projectId, triggerData);

    // Store workflow
    const supabase = getServiceRoleClient();
    if (supabase) {
        await supabase.from('workflows').insert({
            id: workflow.id,
            project_id: workflow.projectId,
            name: workflow.name,
            trigger: workflow.trigger,
            trigger_data: workflow.triggerData,
            steps: workflow.steps,
            status: 'pending',
            created_at: workflow.createdAt
        });
    }

    // Execute
    const result = await executeWorkflow(workflow);

    // Update workflow
    if (supabase) {
        await supabase.from('workflows').update({
            status: workflow.status,
            steps: workflow.steps,
            progress: workflow.progress,
            final_output: workflow.finalOutput,
            started_at: workflow.startedAt,
            completed_at: workflow.completedAt
        }).eq('id', workflow.id);
    }

    return result;
}
