/**
 * AI Reasoning Capture Service
 * Feature F: Gen 3
 * 
 * Captures, stores, and retrieves reasoning traces for AI decisions
 * Provides transparency into "Why?" for any AI recommendation
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { getOpenAI } from '@/lib/openai-client';
import {
  ReasoningTrace,
  ReasoningStep,
  Alternative,
  ReasoningFeature,
  ReasoningInputs,
  ReasoningOutputs,
  ReasoningMetadata,
  CaptureReasoningOptions,
  ReasoningCaptureResult,
  ReasoningExtractionResult,
  DataSource,
} from '@/types/reasoning';

// Use the singleton Supabase client that supports both env var names
function getSupabase(): SupabaseClient | null {
  return getServiceRoleClient();
}

/**
 * GPT-4o prompt for extracting structured reasoning from raw AI output
 */
const REASONING_EXTRACTION_PROMPT = `You are an AI reasoning analyst. Given an AI decision and its raw reasoning, extract a structured trace.

DECISION TYPE: {decision_type}
RAW OUTPUT: {raw_output}
RAW REASONING: {raw_reasoning}

Extract the reasoning into this exact JSON structure:
{
  "decision_summary": "One sentence summary of what was decided",
  "reasoning_steps": [
    {
      "step_number": 1,
      "description": "What was considered at this step",
      "evidence": ["Evidence item 1", "Evidence item 2"],
      "conclusion": "What was concluded from this evidence",
      "confidence": 0.85
    }
  ],
  "alternatives_considered": [
    {
      "alternative": "What else could have been decided",
      "why_rejected": "Why this wasn't chosen"
    }
  ]
}

Rules:
1. Break down the reasoning into 2-5 logical steps
2. Each step should have at least 1 piece of evidence
3. Confidence scores should be between 0.0 and 1.0
4. Include at least 1 alternative that was considered (or could have been)
5. Keep the decision_summary under 100 characters
6. Be specific about the evidence and conclusions

Respond with ONLY the JSON object, no other text.`;

/**
 * Extract structured reasoning from raw AI output
 */
export async function extractReasoningFromOutput(
  decisionType: string,
  rawOutput: string,
  rawReasoning: string
): Promise<ReasoningExtractionResult> {
  const startTime = Date.now();

  try {
    const prompt = REASONING_EXTRACTION_PROMPT
      .replace('{decision_type}', decisionType)
      .replace('{raw_output}', rawOutput)
      .replace('{raw_reasoning}', rawReasoning);

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    const result = JSON.parse(content) as ReasoningExtractionResult;

    // Validate the structure
    if (!result.decision_summary || !result.reasoning_steps || !result.alternatives_considered) {
      throw new Error('Invalid reasoning structure');
    }

    return result;
  } catch (error) {
    console.error('[ReasoningCapture] Failed to extract reasoning:', error);

    // Return a fallback structure
    return {
      decision_summary: rawOutput.slice(0, 100),
      reasoning_steps: [
        {
          step_number: 1,
          description: 'AI analysis performed',
          evidence: [rawReasoning.slice(0, 200)],
          conclusion: rawOutput.slice(0, 200),
          confidence: 0.7,
        },
      ],
      alternatives_considered: [],
    };
  }
}

/**
 * Main function to capture reasoning during AI execution
 * Wraps any AI function and captures its reasoning
 */
export async function captureReasoning<T>(
  options: CaptureReasoningOptions,
  executeFn: () => Promise<{ result: T; reasoning: string }>
): Promise<ReasoningCaptureResult<T>> {
  const startTime = Date.now();
  let tokensUsed = 0;

  try {
    // Execute the AI function
    const { result, reasoning: rawReasoning } = await executeFn();

    const executionTime = Date.now() - startTime;

    // Convert result to string for extraction
    const rawOutput = typeof result === 'string'
      ? result
      : JSON.stringify(result, null, 2);

    // Extract structured reasoning
    const extractedReasoning = await extractReasoningFromOutput(
      options.decisionType,
      rawOutput,
      rawReasoning
    );

    // Build the complete trace
    const inputs: ReasoningInputs = {
      data_sources: options.dataSources || [],
      context: options.context ? { additional_context: options.context } : undefined,
    };

    const outputs: ReasoningOutputs = {
      decision: extractedReasoning.decision_summary,
      confidence: extractedReasoning.reasoning_steps.reduce(
        (acc, step) => acc + step.confidence, 0
      ) / extractedReasoning.reasoning_steps.length,
      alternatives_considered: extractedReasoning.alternatives_considered,
    };

    const metadata: ReasoningMetadata = {
      model_used: 'gpt-4o',
      tokens_used: tokensUsed,
      latency_ms: executionTime,
      timestamp: new Date().toISOString(),
      prompt_version: 'v1.0',
    };

    // Store the trace
    const trace = await storeReasoningTrace({
      project_id: options.projectId,
      feature: options.feature,
      decision_type: options.decisionType,
      decision_summary: extractedReasoning.decision_summary,
      inputs,
      reasoning_steps: extractedReasoning.reasoning_steps,
      outputs,
      metadata,
      entity_type: options.entityType,
      entity_id: options.entityId,
      triggered_by: options.triggeredBy,
    });

    return { result, trace };
  } catch (error) {
    console.error('[ReasoningCapture] Error capturing reasoning:', error);
    throw error;
  }
}

/**
 * Store a reasoning trace in the database
 */
export async function storeReasoningTrace(trace: {
  project_id?: string;
  feature: ReasoningFeature;
  decision_type: string;
  decision_summary: string;
  inputs: ReasoningInputs;
  reasoning_steps: ReasoningStep[];
  outputs: ReasoningOutputs;
  metadata: ReasoningMetadata;
  entity_type?: string;
  entity_id?: string;
  triggered_by?: string;
}): Promise<ReasoningTrace> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Database connection not available');
  }

  const { data, error } = await supabase
    .from('reasoning_traces')
    .insert({
      project_id: trace.project_id,
      feature: trace.feature,
      decision_type: trace.decision_type,
      decision_summary: trace.decision_summary,
      inputs: trace.inputs,
      reasoning_steps: trace.reasoning_steps,
      outputs: trace.outputs,
      metadata: trace.metadata,
      entity_type: trace.entity_type,
      entity_id: trace.entity_id,
      triggered_by: trace.triggered_by,
    })
    .select()
    .single();

  if (error) {
    console.error('[ReasoningCapture] Failed to store trace:', error);
    throw new Error(`Failed to store reasoning trace: ${error.message}`);
  }

  return data as ReasoningTrace;
}

/**
 * Get reasoning traces for a specific entity
 */
export async function getReasoningForEntity(
  entityType: string,
  entityId: string
): Promise<ReasoningTrace[]> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[ReasoningCapture] Database connection not available');
    return [];
  }

  const { data, error } = await supabase
    .from('reasoning_traces')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[ReasoningCapture] Failed to fetch traces:', error);
    return [];
  }

  return data as ReasoningTrace[];
}

/**
 * Get reasoning traces for a project
 */
export async function getProjectReasoningTraces(
  projectId: string,
  feature?: ReasoningFeature,
  limit: number = 50
): Promise<ReasoningTrace[]> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[ReasoningCapture] Database connection not available');
    return [];
  }

  let query = supabase
    .from('reasoning_traces')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (feature) {
    query = query.eq('feature', feature);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ReasoningCapture] Failed to fetch project traces:', error);
    return [];
  }

  return data as ReasoningTrace[];
}

/**
 * Get a single reasoning trace by ID
 */
export async function getReasoningTraceById(traceId: string): Promise<ReasoningTrace | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[ReasoningCapture] Database connection not available');
    return null;
  }

  const { data, error } = await supabase
    .from('reasoning_traces')
    .select('*')
    .eq('id', traceId)
    .single();

  if (error) {
    console.error('[ReasoningCapture] Failed to fetch trace:', error);
    return null;
  }

  return data as ReasoningTrace;
}

/**
 * Simple helper to create a reasoning trace without wrapping an AI function
 * Use this when you already have the reasoning data
 */
export async function createReasoningTrace(params: {
  projectId?: string;
  feature: ReasoningFeature;
  decisionType: string;
  decisionSummary: string;
  dataSources: DataSource[];
  reasoningSteps: ReasoningStep[];
  decision: string;
  confidence: number;
  alternatives?: Alternative[];
  modelUsed?: string;
  tokensUsed?: number;
  latencyMs?: number;
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
}): Promise<ReasoningTrace> {
  const inputs: ReasoningInputs = {
    data_sources: params.dataSources,
  };

  const outputs: ReasoningOutputs = {
    decision: params.decision,
    confidence: params.confidence,
    alternatives_considered: params.alternatives || [],
  };

  const metadata: ReasoningMetadata = {
    model_used: params.modelUsed || 'gpt-4o',
    tokens_used: params.tokensUsed || 0,
    latency_ms: params.latencyMs || 0,
    timestamp: new Date().toISOString(),
  };

  return storeReasoningTrace({
    project_id: params.projectId,
    feature: params.feature,
    decision_type: params.decisionType,
    decision_summary: params.decisionSummary,
    inputs,
    reasoning_steps: params.reasoningSteps,
    outputs,
    metadata,
    entity_type: params.entityType,
    entity_id: params.entityId,
    triggered_by: params.triggeredBy,
  });
}

/**
 * Delete reasoning traces older than a certain date
 * Useful for cleanup jobs
 */
export async function cleanupOldTraces(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const supabase = getSupabase();
  if (!supabase) {
    console.error('[ReasoningCapture] Database connection not available');
    return 0;
  }

  const { data, error } = await supabase
    .from('reasoning_traces')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('[ReasoningCapture] Failed to cleanup traces:', error);
    return 0;
  }

  return data?.length || 0;
}
