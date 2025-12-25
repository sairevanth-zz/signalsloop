/**
 * Knowledge Gap Detection
 * 
 * Detects themes that have high volume but low specificity,
 * indicating areas where more structured feedback (polls) could help.
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getOpenAI } from '@/lib/openai-client';
import { addAction } from '@/lib/actions/action-queue';

export interface KnowledgeGap {
    theme_id: string;
    theme_name: string;
    description: string;
    feedback_count: number;
    specificity_score: number; // 0-1, lower = less specific
    suggested_poll_title: string;
    suggested_options: string[];
    reasoning: string;
}

export interface KnowledgeGapDetectionResult {
    gaps: KnowledgeGap[];
    actions_created: number;
}

/**
 * Detect knowledge gaps in a project's feedback
 * Creates poll_suggested actions for significant gaps
 */
export async function detectKnowledgeGaps(
    projectId: string,
    options: {
        minFeedbackCount?: number;
        maxSpecificity?: number;
        createActions?: boolean;
    } = {}
): Promise<KnowledgeGapDetectionResult> {
    const {
        minFeedbackCount = 5,
        maxSpecificity = 0.4,
        createActions = true
    } = options;

    const supabase = getSupabaseServiceRoleClient();
    const openai = getOpenAI();

    console.log(`[Knowledge Gap] Analyzing project ${projectId}`);

    // Get themes with significant feedback volume
    const { data: themes, error: themesError } = await supabase
        .from('themes')
        .select(`
      id,
      theme_name,
      description,
      frequency,
      avg_sentiment,
      feedback_themes(
        feedback:posts(id, title, description)
      )
    `)
        .eq('project_id', projectId)
        .gte('frequency', minFeedbackCount)
        .order('frequency', { ascending: false })
        .limit(20);

    if (themesError || !themes || themes.length === 0) {
        console.log('[Knowledge Gap] No qualifying themes found');
        return { gaps: [], actions_created: 0 };
    }

    // Analyze each theme for specificity
    const analyzedThemes: KnowledgeGap[] = [];

    for (const theme of themes) {
        const feedback = theme.feedback_themes
            ?.map((ft: any) => ft.feedback)
            .filter(Boolean)
            .slice(0, 10) || [];

        if (feedback.length < 3) continue;

        // Combine feedback for analysis
        const feedbackText = feedback
            .map((f: any) => `- ${f.title}: ${f.description?.slice(0, 200) || 'No description'}`)
            .join('\n');

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Analyze user feedback for a specific theme to determine if there's a "knowledge gap" - 
meaning the feedback is vague or diverse enough that a structured poll could help understand what users actually want.

Return JSON:
{
  "specificity_score": 0.0-1.0 (lower = less specific, more diverse viewpoints),
  "is_knowledge_gap": true/false,
  "reasoning": "Brief explanation",
  "suggested_poll_title": "A question to clarify the gap",
  "suggested_options": ["Option 1", "Option 2", "Option 3", "Option 4"]
}

High specificity (>0.6): Users are clear about what they want
Low specificity (<0.4): Users mention the topic but with varied/vague requests - a poll would help`
                    },
                    {
                        role: 'user',
                        content: `Theme: "${theme.theme_name}"
Description: ${theme.description || 'Not available'}
Feedback Count: ${theme.frequency}

Sample Feedback:
${feedbackText}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 400,
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0]?.message?.content;
            if (!content) continue;

            const analysis = JSON.parse(content);

            if (analysis.is_knowledge_gap && analysis.specificity_score <= maxSpecificity) {
                analyzedThemes.push({
                    theme_id: theme.id,
                    theme_name: theme.theme_name,
                    description: theme.description || '',
                    feedback_count: theme.frequency,
                    specificity_score: analysis.specificity_score,
                    suggested_poll_title: analysis.suggested_poll_title,
                    suggested_options: analysis.suggested_options || [],
                    reasoning: analysis.reasoning
                });
            }
        } catch (error) {
            console.error(`[Knowledge Gap] Error analyzing theme ${theme.id}:`, error);
        }
    }

    console.log(`[Knowledge Gap] Found ${analyzedThemes.length} knowledge gaps`);

    // Create actions if enabled
    let actionsCreated = 0;

    if (createActions && analyzedThemes.length > 0) {
        for (const gap of analyzedThemes.slice(0, 3)) { // Limit to top 3
            try {
                await addAction({
                    projectId,
                    actionType: 'poll_suggested',
                    priority: 2,
                    severity: 'info',
                    title: `Suggest Poll: ${gap.suggested_poll_title}`,
                    description: `Knowledge gap detected in "${gap.theme_name}" theme with ${gap.feedback_count} feedback items. ` +
                        `Users are requesting various things but lack specific direction. A poll could help prioritize. ` +
                        `Reasoning: ${gap.reasoning}`,
                    metadata: {
                        theme_id: gap.theme_id,
                        theme_name: gap.theme_name,
                        specificity_score: gap.specificity_score,
                        suggested_poll_title: gap.suggested_poll_title,
                        suggested_options: gap.suggested_options,
                        feedback_count: gap.feedback_count,
                        reasoning: gap.reasoning
                    },
                    requiresApproval: true
                });
                actionsCreated++;
            } catch (error) {
                console.error(`[Knowledge Gap] Failed to create action for theme ${gap.theme_id}:`, error);
            }
        }
    }

    console.log(`[Knowledge Gap] Created ${actionsCreated} poll suggestion actions`);

    return {
        gaps: analyzedThemes,
        actions_created: actionsCreated
    };
}

/**
 * Get existing poll suggestions for a project
 */
export async function getPollSuggestions(projectId: string) {
    const supabase = getSupabaseServiceRoleClient();

    const { data, error } = await supabase
        .from('unified_action_queue')
        .select('*')
        .eq('project_id', projectId)
        .eq('action_type', 'poll_suggested')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Knowledge Gap] Error fetching suggestions:', error);
        return [];
    }

    return data || [];
}
