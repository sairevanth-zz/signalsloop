/**
 * Chat Action Executor
 *
 * Executes actions parsed from natural language commands in Slack/Discord.
 * Handles creating feedback, voting, status changes, briefings, etc.
 */

import { getSupabaseServiceRoleClient } from '../supabase-client';
import { ParsedIntent } from './intent-parser';
import { getTodayBriefing, getDashboardMetrics } from './mission-control';

export interface ActionResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

/**
 * Execute a parsed intent and return the result
 */
export async function executeAction(
    intent: ParsedIntent,
    projectId: string,
    userId?: string
): Promise<ActionResult> {
    const supabase = getSupabaseServiceRoleClient();

    switch (intent.action) {
        case 'create_feedback':
            return await createFeedback(supabase, projectId, intent.parameters, userId);

        case 'vote_on_post':
            return await voteOnPost(supabase, projectId, intent.parameters, userId);

        case 'update_status':
            return await updateStatus(supabase, projectId, intent.parameters);

        case 'get_briefing':
            return await getBriefing(projectId);

        case 'get_health_score':
            return await getHealthScore(projectId);

        case 'search_feedback':
            return await searchFeedback(supabase, projectId, intent.parameters);

        case 'generate_spec':
            return await triggerSpecGeneration(projectId, intent.parameters);

        case 'get_insights':
            return await getInsights(supabase, projectId);

        case 'unknown':
            return {
                success: true,
                message: intent.parameters.response || "I'm not sure what you want to do. Try asking me to create feedback, vote on posts, or get your briefing.",
            };

        default:
            return {
                success: false,
                message: 'Unknown action',
                error: `Action "${intent.action}" is not implemented`,
            };
    }
}

/**
 * Create a new feedback post
 */
async function createFeedback(
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
    projectId: string,
    params: { title: string; description?: string; category?: string },
    userId?: string
): Promise<ActionResult> {
    try {
        const { data: post, error } = await supabase
            .from('posts')
            .insert({
                project_id: projectId,
                title: params.title,
                description: params.description || null,
                category: params.category || 'Feature Request',
                status: 'open',
                author_id: userId || null,
                source: 'slack',
            })
            .select('id, title, category')
            .single();

        if (error) throw error;

        return {
            success: true,
            message: `✅ Created feedback: "${post.title}"\nCategory: ${post.category}`,
            data: post,
        };
    } catch (error) {
        console.error('Error creating feedback:', error);
        return {
            success: false,
            message: '❌ Failed to create feedback',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Vote on an existing post
 */
async function voteOnPost(
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
    projectId: string,
    params: { search_query: string; priority: string },
    userId?: string
): Promise<ActionResult> {
    try {
        // Search for the post
        const { data: posts, error: searchError } = await supabase
            .from('posts')
            .select('id, title')
            .eq('project_id', projectId)
            .ilike('title', `%${params.search_query}%`)
            .limit(1);

        if (searchError) throw searchError;

        if (!posts || posts.length === 0) {
            return {
                success: false,
                message: `❌ No feedback found matching "${params.search_query}"`,
            };
        }

        const post = posts[0];

        // Create the vote
        const { error: voteError } = await supabase.from('votes').insert({
            post_id: post.id,
            voter_id: userId || null,
            priority: params.priority,
            source: 'slack',
        });

        if (voteError) throw voteError;

        // Get vote count
        const { count } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        const priorityEmoji =
            params.priority === 'must_have'
                ? '🔴'
                : params.priority === 'important'
                    ? '🟡'
                    : '🟢';

        return {
            success: true,
            message: `✅ Voted on "${post.title}"\n${priorityEmoji} Priority: ${params.priority.replace('_', ' ')}\n📊 Total votes: ${count || 1}`,
            data: { post, voteCount: count },
        };
    } catch (error) {
        console.error('Error voting on post:', error);
        return {
            success: false,
            message: '❌ Failed to vote on post',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Update the status of a post
 */
async function updateStatus(
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
    projectId: string,
    params: { search_query: string; new_status: string }
): Promise<ActionResult> {
    try {
        // Search for the post
        const { data: posts, error: searchError } = await supabase
            .from('posts')
            .select('id, title, status')
            .eq('project_id', projectId)
            .ilike('title', `%${params.search_query}%`)
            .limit(1);

        if (searchError) throw searchError;

        if (!posts || posts.length === 0) {
            return {
                success: false,
                message: `❌ No feedback found matching "${params.search_query}"`,
            };
        }

        const post = posts[0];
        const oldStatus = post.status;

        // Update the status
        const { error: updateError } = await supabase
            .from('posts')
            .update({ status: params.new_status })
            .eq('id', post.id);

        if (updateError) throw updateError;

        return {
            success: true,
            message: `✅ Updated "${post.title}"\n📋 Status: ${oldStatus} → ${params.new_status}`,
            data: { post, oldStatus, newStatus: params.new_status },
        };
    } catch (error) {
        console.error('Error updating status:', error);
        return {
            success: false,
            message: '❌ Failed to update status',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get today's Mission Control briefing
 */
async function getBriefing(projectId: string): Promise<ActionResult> {
    try {
        const briefing = await getTodayBriefing(projectId);

        const criticalCount = briefing.content.critical_items?.length || 0;
        const warningCount = briefing.content.warning_items?.length || 0;

        let message = `📋 *Today's Briefing*\n\n`;

        // Sentiment
        const trend = briefing.content.sentiment_trend === 'up' ? '📈' : briefing.content.sentiment_trend === 'down' ? '📉' : '➡️';
        message += `${trend} Sentiment: ${(briefing.content.sentiment_score * 100).toFixed(0)}%\n`;

        // Critical items
        if (criticalCount > 0) {
            message += `\n🚨 *Critical Items (${criticalCount}):*\n`;
            briefing.content.critical_items.slice(0, 3).forEach((item) => {
                message += `• ${item.title}\n`;
            });
        }

        // Warnings
        if (warningCount > 0) {
            message += `\n⚠️ *Warnings (${warningCount}):*\n`;
            briefing.content.warning_items.slice(0, 3).forEach((item) => {
                message += `• ${item.title}\n`;
            });
        }

        // Recommended actions
        if (briefing.content.recommended_actions?.length > 0) {
            message += `\n💡 *Recommended Actions:*\n`;
            briefing.content.recommended_actions.slice(0, 3).forEach((action) => {
                message += `• ${action.title}\n`;
            });
        }

        return {
            success: true,
            message,
            data: briefing,
        };
    } catch (error) {
        console.error('Error getting briefing:', error);
        return {
            success: false,
            message: '❌ Failed to get briefing. Make sure Mission Control is set up.',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get current product health score
 */
async function getHealthScore(projectId: string): Promise<ActionResult> {
    try {
        const metrics = await getDashboardMetrics(projectId);

        if (!metrics.health_score) {
            return {
                success: true,
                message: "📊 Health score not available. You may need to analyze more feedback first.",
            };
        }

        const score = metrics.health_score.score;
        const grade = metrics.health_score.grade;
        const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';

        let message = `${emoji} *Product Health: ${score}/100 (${grade})*\n\n`;

        // Components
        const components = metrics.health_score.components;
        message += `📊 *Components:*\n`;
        message += `• Sentiment: ${components.sentiment}%\n`;
        message += `• Response Rate: ${components.response_rate}%\n`;
        message += `• Theme Resolution: ${components.theme_resolution}%\n`;
        message += `• Engagement: ${components.engagement}%\n`;

        // Top actions
        if (metrics.health_score.actions?.length > 0) {
            message += `\n💡 *Top Actions:*\n`;
            metrics.health_score.actions.slice(0, 3).forEach((action) => {
                message += `• ${action}\n`;
            });
        }

        return {
            success: true,
            message,
            data: metrics.health_score,
        };
    } catch (error) {
        console.error('Error getting health score:', error);
        return {
            success: false,
            message: '❌ Failed to get health score',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Search for feedback
 */
async function searchFeedback(
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
    projectId: string,
    params: { query: string; limit?: number }
): Promise<ActionResult> {
    try {
        const limit = params.limit || 5;

        const { data: posts, error } = await supabase
            .from('posts')
            .select('id, title, status, category, created_at')
            .eq('project_id', projectId)
            .ilike('title', `%${params.query}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        if (!posts || posts.length === 0) {
            return {
                success: true,
                message: `🔍 No feedback found matching "${params.query}"`,
            };
        }

        let message = `🔍 *Found ${posts.length} result${posts.length === 1 ? '' : 's'}:*\n\n`;

        posts.forEach((post, i) => {
            const statusEmoji =
                post.status === 'completed'
                    ? '✅'
                    : post.status === 'in_progress'
                        ? '🔄'
                        : post.status === 'planned'
                            ? '📅'
                            : '📝';
            message += `${i + 1}. ${statusEmoji} *${post.title}*\n   ${post.category} • ${post.status}\n`;
        });

        return {
            success: true,
            message,
            data: posts,
        };
    } catch (error) {
        console.error('Error searching feedback:', error);
        return {
            success: false,
            message: '❌ Failed to search feedback',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Trigger spec generation (returns a link to complete in dashboard)
 */
async function triggerSpecGeneration(
    projectId: string,
    params: { search_query: string }
): Promise<ActionResult> {
    // For now, just return a link to the spec generation page
    // Full implementation would find the post and pre-populate the spec generator
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://signalsloop.com';

    return {
        success: true,
        message: `📝 To generate a spec for "${params.search_query}", please visit:\n${baseUrl}/specs/new\n\nSearch for the feedback and click "Generate Spec".`,
    };
}

/**
 * Get current insights and themes
 */
async function getInsights(
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
    projectId: string
): Promise<ActionResult> {
    try {
        // Get recent themes
        const { data: themes } = await supabase
            .from('feedback_themes')
            .select('name, sentiment_score, mention_count')
            .eq('project_id', projectId)
            .order('mention_count', { ascending: false })
            .limit(5);

        if (!themes || themes.length === 0) {
            return {
                success: true,
                message: "📊 No themes detected yet. Keep collecting feedback!",
            };
        }

        let message = `📊 *Top Themes:*\n\n`;

        themes.forEach((theme, i) => {
            const sentimentEmoji =
                theme.sentiment_score > 0.3
                    ? '😊'
                    : theme.sentiment_score < -0.3
                        ? '😞'
                        : '😐';
            message += `${i + 1}. ${sentimentEmoji} *${theme.name}*\n   ${theme.mention_count} mentions\n`;
        });

        return {
            success: true,
            message,
            data: themes,
        };
    } catch (error) {
        console.error('Error getting insights:', error);
        return {
            success: false,
            message: '❌ Failed to get insights',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
