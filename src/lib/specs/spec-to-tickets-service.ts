/**
 * Spec to Tickets Service
 * 
 * Transforms a spec into Jira epics and stories with:
 * - AI-generated story breakdown
 * - Effort estimation based on similar past work
 * - Suggested assignees
 * - Telemetry plan
 * - Rollout plan
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Lazy initialization
let _supabase: SupabaseClient | null = null;
let _openai: OpenAI | null = null;

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _supabase;
}

function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

export interface JiraEpic {
    summary: string;
    description: string;
    labels: string[];
    priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
}

export interface JiraStory {
    summary: string;
    description: string;
    acceptanceCriteria: string[];
    storyPoints?: number;
    labels: string[];
}

export interface Assignee {
    id: string;
    name: string;
    email: string;
    expertise: string[];
    currentLoad: number; // 0-100
    matchScore: number; // 0-1
}

export interface TelemetryItem {
    event: string;
    description: string;
    properties: string[];
    purpose: string;
}

export interface RolloutStep {
    phase: string;
    audience: string;
    percentage: number;
    duration: string;
    successCriteria: string[];
}

export interface TicketPlan {
    epic: JiraEpic;
    stories: JiraStory[];
    suggestedAssignees: Assignee[];
    effortEstimate: {
        min: number;
        max: number;
        confidence: number;
        unit: 'days' | 'weeks';
    };
    telemetryPlan: TelemetryItem[];
    rolloutPlan: RolloutStep[];
}

export interface GenerateTicketPlanRequest {
    specId: string;
    projectId: string;
}

export interface GenerateTicketPlanResponse {
    success: boolean;
    plan: TicketPlan | null;
    error?: string;
}

export interface ExecuteTicketPlanRequest {
    projectId: string;
    plan: TicketPlan;
}

export interface ExecuteTicketPlanResponse {
    success: boolean;
    epicKey?: string;
    storyKeys?: string[];
    error?: string;
}

/**
 * Generate a ticket plan from a spec
 */
export async function generateTicketPlan(
    request: GenerateTicketPlanRequest
): Promise<GenerateTicketPlanResponse> {
    const { specId, projectId } = request;
    const supabase = getSupabase();
    const openai = getOpenAI();

    try {
        // Get the spec
        const { data: spec, error: specError } = await supabase
            .from('specs')
            .select('*')
            .eq('id', specId)
            .single();

        if (specError || !spec) {
            return {
                success: false,
                plan: null,
                error: 'Spec not found',
            };
        }

        // Generate ticket plan using AI
        const systemPrompt = `You are a technical product manager. Given a product spec, generate a comprehensive ticket plan for Jira.

Return JSON with this structure:
{
  "epic": {
    "summary": "Epic title (max 100 chars)",
    "description": "Markdown description with context, goals, and success metrics",
    "labels": ["feature", "q1-2025"],
    "priority": "High"
  },
  "stories": [
    {
      "summary": "Story title",
      "description": "Story description with context",
      "acceptanceCriteria": ["AC 1", "AC 2"],
      "storyPoints": 3,
      "labels": ["frontend"]
    }
  ],
  "effortEstimate": {
    "min": 2,
    "max": 4,
    "confidence": 0.7,
    "unit": "weeks"
  },
  "telemetryPlan": [
    {
      "event": "feature_used",
      "description": "User interacted with feature",
      "properties": ["user_id", "action_type"],
      "purpose": "Track adoption rate"
    }
  ],
  "rolloutPlan": [
    {
      "phase": "Beta",
      "audience": "Internal team",
      "percentage": 10,
      "duration": "1 week",
      "successCriteria": ["No critical bugs", ">70% task completion"]
    }
  ]
}

Break down into 3-8 stories. Be specific and actionable.`;

        const userPrompt = `Spec Title: ${spec.title}

Spec Content:
${spec.content || 'No detailed content provided.'}

Template: ${spec.template || 'prd'}

Generate a ticket plan for this spec.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return {
                success: false,
                plan: null,
                error: 'AI did not generate a response',
            };
        }

        const parsed = JSON.parse(content);

        // Get suggested assignees (mock for now - would integrate with team data)
        const suggestedAssignees: Assignee[] = [];

        // Try to get team members from project
        try {
            const { data: members } = await supabase
                .from('project_members')
                .select('user_id')
                .eq('project_id', projectId)
                .limit(3);

            if (members) {
                for (const member of members) {
                    const { data: user } = await supabase
                        .from('profiles')
                        .select('id, full_name, email')
                        .eq('id', member.user_id)
                        .single();

                    if (user) {
                        suggestedAssignees.push({
                            id: user.id,
                            name: user.full_name || 'Team Member',
                            email: user.email || '',
                            expertise: ['general'],
                            currentLoad: 50,
                            matchScore: 0.7,
                        });
                    }
                }
            }
        } catch (e) {
            console.log('Could not fetch team members for assignee suggestions');
        }

        const plan: TicketPlan = {
            epic: parsed.epic || {
                summary: spec.title,
                description: spec.content?.substring(0, 500) || '',
                labels: ['feature'],
                priority: 'Medium',
            },
            stories: parsed.stories || [],
            suggestedAssignees,
            effortEstimate: parsed.effortEstimate || {
                min: 1,
                max: 2,
                confidence: 0.5,
                unit: 'weeks',
            },
            telemetryPlan: parsed.telemetryPlan || [],
            rolloutPlan: parsed.rolloutPlan || [
                {
                    phase: 'General Availability',
                    audience: 'All users',
                    percentage: 100,
                    duration: 'Immediate',
                    successCriteria: ['Feature accessible', 'No critical bugs'],
                },
            ],
        };

        return {
            success: true,
            plan,
        };
    } catch (error) {
        console.error('Error generating ticket plan:', error);
        return {
            success: false,
            plan: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Execute a ticket plan - create Jira epic and stories
 */
export async function executeTicketPlan(
    request: ExecuteTicketPlanRequest
): Promise<ExecuteTicketPlanResponse> {
    const { projectId, plan } = request;
    const supabase = getSupabase();

    try {
        // Get Jira integration settings
        const { data: integration } = await supabase
            .from('project_integrations')
            .select('settings')
            .eq('project_id', projectId)
            .eq('provider', 'jira')
            .single();

        if (!integration) {
            return {
                success: false,
                error: 'Jira integration not configured. Please connect Jira in Settings → Integrations.',
            };
        }

        const jiraSettings = integration.settings as any;
        const { cloudId, accessToken, projectKey } = jiraSettings || {};

        if (!cloudId || !accessToken || !projectKey) {
            return {
                success: false,
                error: 'Jira integration incomplete. Please reconnect Jira.',
            };
        }

        // Create Epic
        const epicResponse = await fetch(
            `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        project: { key: projectKey },
                        summary: plan.epic.summary,
                        description: {
                            type: 'doc',
                            version: 1,
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [{ type: 'text', text: plan.epic.description }],
                                },
                            ],
                        },
                        issuetype: { name: 'Epic' },
                        priority: { name: plan.epic.priority },
                        labels: plan.epic.labels,
                    },
                }),
            }
        );

        if (!epicResponse.ok) {
            const errorText = await epicResponse.text();
            console.error('Jira epic creation failed:', errorText);
            return {
                success: false,
                error: `Failed to create Jira epic: ${epicResponse.status}`,
            };
        }

        const epicData = await epicResponse.json();
        const epicKey = epicData.key;

        // Create Stories under the Epic
        const storyKeys: string[] = [];

        for (const story of plan.stories) {
            try {
                const storyResponse = await fetch(
                    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fields: {
                                project: { key: projectKey },
                                summary: story.summary,
                                description: {
                                    type: 'doc',
                                    version: 1,
                                    content: [
                                        {
                                            type: 'paragraph',
                                            content: [{ type: 'text', text: story.description }],
                                        },
                                        {
                                            type: 'heading',
                                            attrs: { level: 3 },
                                            content: [{ type: 'text', text: 'Acceptance Criteria' }],
                                        },
                                        {
                                            type: 'bulletList',
                                            content: story.acceptanceCriteria.map((ac) => ({
                                                type: 'listItem',
                                                content: [
                                                    {
                                                        type: 'paragraph',
                                                        content: [{ type: 'text', text: ac }],
                                                    },
                                                ],
                                            })),
                                        },
                                    ],
                                },
                                issuetype: { name: 'Story' },
                                labels: story.labels,
                                parent: { key: epicKey },
                            },
                        }),
                    }
                );

                if (storyResponse.ok) {
                    const storyData = await storyResponse.json();
                    storyKeys.push(storyData.key);
                }
            } catch (storyError) {
                console.error('Error creating story:', storyError);
            }
        }

        return {
            success: true,
            epicKey,
            storyKeys,
        };
    } catch (error) {
        console.error('Error executing ticket plan:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
