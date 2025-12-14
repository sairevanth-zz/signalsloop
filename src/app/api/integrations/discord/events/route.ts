/**
 * Discord Interactions Handler (Slash Commands + NLP)
 *
 * Supports:
 * - Structured slash commands (fast, no AI)
 * - /ask command for natural language processing (uses intent parser)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { parseIntent } from '@/lib/ai/intent-parser';
import { executeAction } from '@/lib/ai/chat-actions';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Discord interaction types
const INTERACTION_TYPES = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
} as const;

// Discord response types
const RESPONSE_TYPES = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,  // For async responses (shows "thinking...")
} as const;

/**
 * Verify Discord request signature using Ed25519
 */
async function verifyDiscordRequest(
    signature: string | null,
    timestamp: string | null,
    body: string
): Promise<boolean> {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!publicKey || !signature || !timestamp) {
        console.error('[Discord] Missing publicKey, signature, or timestamp');
        return false;
    }

    try {
        const key = await crypto.subtle.importKey(
            'raw',
            Buffer.from(publicKey, 'hex'),
            { name: 'Ed25519' },
            false,
            ['verify']
        );

        const isValid = await crypto.subtle.verify(
            'Ed25519',
            key,
            Buffer.from(signature, 'hex'),
            Buffer.from(timestamp + body)
        );

        return isValid;
    } catch (error) {
        console.error('[Discord] Signature verification error:', error);
        return false;
    }
}

/**
 * POST /api/integrations/discord/events
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();

        // Verify request from Discord
        const signature = request.headers.get('x-signature-ed25519');
        const timestamp = request.headers.get('x-signature-timestamp');

        const isValid = await verifyDiscordRequest(signature, timestamp, rawBody);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const interaction = JSON.parse(rawBody);

        // Handle Discord ping (for URL verification)
        if (interaction.type === INTERACTION_TYPES.PING) {
            return NextResponse.json({ type: RESPONSE_TYPES.PONG });
        }

        // Handle slash commands - direct fast responses
        if (interaction.type === INTERACTION_TYPES.APPLICATION_COMMAND) {
            const result = await handleSlashCommand(interaction);
            return NextResponse.json({
                type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: result },
            });
        }

        // Handle button interactions
        if (interaction.type === INTERACTION_TYPES.MESSAGE_COMPONENT) {
            const action = interaction.data.custom_id?.split(':')[0] || 'unknown';
            const userId = interaction.user?.id || interaction.member?.user?.id;

            return NextResponse.json({
                type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `✅ ${action} by <@${userId}>` },
            });
        }

        return NextResponse.json({ type: RESPONSE_TYPES.PONG });
    } catch (error) {
        console.error('[Discord] Error:', error);
        return NextResponse.json(
            { type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: '❌ Error' } },
            { status: 500 }
        );
    }
}

/**
 * Handle slash command - direct database calls, no AI
 */
async function handleSlashCommand(interaction: any): Promise<string> {
    const commandName = interaction.data.name;
    const options = interaction.data.options || [];
    const guildId = interaction.guild_id;

    console.log(`[Discord] Command: ${commandName}, Guild: ${guildId}`);

    try {
        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return '❌ Database unavailable';
        }

        // Get project ID (with fallback)
        const projectId = await getProjectId(supabase, guildId);
        if (!projectId) {
            return '❌ No projects found. Create one at signalsloop.com';
        }

        // Handle each command directly
        switch (commandName) {
            case 'briefing':
                return await handleBriefingCommand(supabase, projectId);

            case 'health':
                return await handleHealthCommand(supabase, projectId);

            case 'insights':
                return await handleInsightsCommand(supabase, projectId);

            case 'feedback': {
                const action = options.find((o: any) => o.name === 'action')?.value;
                const text = options.find((o: any) => o.name === 'text')?.value || '';
                const priority = options.find((o: any) => o.name === 'priority')?.value;
                return await handleFeedbackCommand(supabase, projectId, action, text, priority);
            }

            case 'ask': {
                // NLP not supported on serverless - guide users to structured commands
                return `💡 **Use these commands instead:**

• \`/briefing\` - Get today's product briefing
• \`/health\` - Get product health score  
• \`/insights\` - Get top themes from feedback
• \`/feedback action:create text:your feedback\` - Create feedback
• \`/feedback action:search text:keyword\` - Search feedback
• \`/feedback action:vote text:keyword\` - Vote on feedback`;
            }

            default:
                return `Unknown command: ${commandName}`;
        }
    } catch (error) {
        console.error('[Discord] Command error:', error);
        return '❌ Something went wrong. Please try again.';
    }
}

/**
 * Handle NLP command using AI intent parsing
 * Reuses the same intent parser and action executor as Slack
 */
async function handleNLPCommand(projectId: string, query: string): Promise<string> {
    try {
        console.log('[Discord NLP] Parsing query:', query);

        // Parse intent using AI
        const intent = await parseIntent(query);
        console.log('[Discord NLP] Parsed intent:', intent.action);

        // If it's an unknown action, just return the AI's response
        if (intent.action === 'unknown') {
            return intent.parameters.response || "I'm not sure what you mean. Try asking for a briefing, health score, or insights!";
        }

        // Execute the action
        const result = await executeAction(intent, projectId);

        // Format response for Discord (convert Slack markdown to Discord markdown)
        let message = result.message
            .replace(/\*([^*]+)\*/g, '**$1**') // Slack *bold* to Discord **bold**
            .replace(/\\n/g, '\n'); // Ensure newlines are proper

        return message;
    } catch (error) {
        console.error('[Discord NLP] Error:', error);
        return '❌ Failed to process your request. Please try again.';
    }
}

/**
 * Process /ask command asynchronously and send response via webhook followup
 * This is called after returning a deferred response to Discord
 */
async function processAskCommandAsync(interaction: any): Promise<void> {
    const applicationId = process.env.DISCORD_APPLICATION_ID;
    const interactionToken = interaction.token;
    const guildId = interaction.guild_id;
    const options = interaction.data.options || [];
    const query = options.find((o: any) => o.name === 'query')?.value || '';

    try {
        console.log('[Discord /ask] Processing async query:', query);

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            await sendFollowupMessage(applicationId!, interactionToken, '❌ Database unavailable');
            return;
        }

        const projectId = await getProjectId(supabase, guildId);
        if (!projectId) {
            await sendFollowupMessage(applicationId!, interactionToken, '❌ No projects found. Create one at signalsloop.com');
            return;
        }

        // Process the NLP command
        const result = await handleNLPCommand(projectId, query);

        // Send the result via webhook followup
        await sendFollowupMessage(applicationId!, interactionToken, result);

        console.log('[Discord /ask] Response sent successfully');
    } catch (error) {
        console.error('[Discord /ask] Async processing error:', error);
        await sendFollowupMessage(applicationId!, interactionToken, '❌ Failed to process your request. Please try again.');
    }
}

/**
 * Send a followup message to a deferred interaction
 */
async function sendFollowupMessage(applicationId: string, interactionToken: string, content: string): Promise<void> {
    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('[Discord] Followup message failed:', error);
    }
}

/**
 * Get project ID for guild (with fallback)
 */
async function getProjectId(supabase: any, guildId: string): Promise<string | null> {
    // Try guild connection first
    const { data: connection } = await supabase
        .from('discord_integrations')
        .select('project_id')
        .eq('guild_id', guildId)
        .single();

    if (connection?.project_id) {
        return connection.project_id;
    }

    // Fallback to first project
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .limit(1)
        .single();

    return project?.id || null;
}

/**
 * /briefing - Get today's briefing (uses cached AI briefing if available)
 */
async function handleBriefingCommand(supabase: any, projectId: string): Promise<string> {
    // First, check if there's a cached AI-generated briefing from today
    const today = new Date().toISOString().split('T')[0];

    const { data: cachedBriefing } = await supabase
        .from('daily_briefings')
        .select('content')
        .eq('project_id', projectId)
        .eq('briefing_date', today)
        .single();

    // If we have an AI-generated briefing, use it!
    if (cachedBriefing?.content) {
        const content = cachedBriefing.content;
        let message = `📋 **Today's Briefing**\n\n`;

        // Sentiment
        const trend = content.sentiment_trend === 'up' ? '📈' : content.sentiment_trend === 'down' ? '📉' : '➡️';
        message += `${trend} **Sentiment:** ${content.sentiment_score || 50}%\n\n`;

        // Critical Items
        if (content.critical_items?.length > 0) {
            message += `🚨 **Critical Items (${content.critical_items.length}):**\n`;
            content.critical_items.slice(0, 3).forEach((item: any) => {
                message += `• ${item.title}\n`;
            });
            message += '\n';
        }

        // Warnings
        if (content.warning_items?.length > 0) {
            message += `⚠️ **Warnings (${content.warning_items.length}):**\n`;
            content.warning_items.slice(0, 3).forEach((item: any) => {
                message += `• ${item.title}\n`;
            });
            message += '\n';
        }

        // Recommended Actions
        if (content.recommended_actions?.length > 0) {
            message += `💡 **Recommended Actions:**\n`;
            content.recommended_actions.slice(0, 3).forEach((action: any) => {
                message += `• ${action.label || action.title || 'Action'}\n`;
            });
        }

        return message;
    }

    // Fallback: Generate a quick summary from database (no AI)
    const { count: totalPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: recentPosts, count: recentCount } = await supabase
        .from('posts')
        .select('id, title, status, category', { count: 'exact' })
        .eq('project_id', projectId)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

    const { data: statusBreakdown } = await supabase
        .from('posts')
        .select('status')
        .eq('project_id', projectId);

    const statusCounts: Record<string, number> = {};
    statusBreakdown?.forEach((p: any) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    let message = `📋 **Today's Briefing**\n\n`;
    message += `📊 **Overview:**\n`;
    message += `• Total feedback: ${totalPosts || 0}\n`;
    message += `• New this week: ${recentCount || 0}\n\n`;

    if (Object.keys(statusCounts).length > 0) {
        message += `📈 **Status Breakdown:**\n`;
        Object.entries(statusCounts).forEach(([status, count]) => {
            const emoji = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : status === 'planned' ? '📅' : '📝';
            message += `• ${emoji} ${status}: ${count}\n`;
        });
        message += '\n';
    }

    if (recentPosts && recentPosts.length > 0) {
        message += `📝 **Recent Feedback:**\n`;
        recentPosts.slice(0, 3).forEach((post: any) => {
            message += `• ${post.title}\n`;
        });
    }

    message += `\n💡 *Tip: Visit signalsloop.com to generate full AI briefing*`;

    return message;
}

/**
 * /health - Get product health metrics
 */
async function handleHealthCommand(supabase: any, projectId: string): Promise<string> {
    // Get total and resolved posts
    const { count: totalPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

    const { count: completedPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'completed');

    const { count: inProgressPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'in_progress');

    // Calculate simple health score
    const resolutionRate = totalPosts ? Math.round((completedPosts || 0) / totalPosts * 100) : 0;
    const activeRate = totalPosts ? Math.round(((completedPosts || 0) + (inProgressPosts || 0)) / totalPosts * 100) : 0;
    const healthScore = Math.round((resolutionRate * 0.6) + (activeRate * 0.4));

    const emoji = healthScore >= 70 ? '🟢' : healthScore >= 40 ? '🟡' : '🔴';
    const grade = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Attention';

    let message = `${emoji} **Product Health: ${healthScore}/100 (${grade})**\n\n`;
    message += `📊 **Metrics:**\n`;
    message += `• Resolution Rate: ${resolutionRate}%\n`;
    message += `• Active Rate: ${activeRate}%\n`;
    message += `• Total Feedback: ${totalPosts || 0}\n`;
    message += `• Completed: ${completedPosts || 0}\n`;
    message += `• In Progress: ${inProgressPosts || 0}\n`;

    return message;
}

/**
 * /insights - Get top themes
 */
async function handleInsightsCommand(supabase: any, projectId: string): Promise<string> {
    // Get category breakdown as a simple insight
    const { data: posts } = await supabase
        .from('posts')
        .select('category')
        .eq('project_id', projectId);

    const categoryCounts: Record<string, number> = {};
    posts?.forEach((p: any) => {
        const cat = p.category || 'Uncategorized';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedCategories.length === 0) {
        return "📊 No insights available yet. Collect more feedback!";
    }

    let message = `📊 **Top Themes by Category:**\n\n`;
    sortedCategories.forEach(([category, count], i) => {
        const emoji = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || '•';
        message += `${emoji} **${category}**: ${count} items\n`;
    });

    return message;
}

/**
 * /feedback - Create, search, or vote on feedback
 */
async function handleFeedbackCommand(
    supabase: any,
    projectId: string,
    action: string,
    text: string,
    priority?: string
): Promise<string> {
    switch (action) {
        case 'create': {
            // Get the project's default board
            const { data: board } = await supabase
                .from('boards')
                .select('id')
                .eq('project_id', projectId)
                .limit(1)
                .single();

            if (!board) {
                return '❌ No feedback board found. Please set up a board first at signalsloop.com';
            }

            const { data: post, error } = await supabase
                .from('posts')
                .insert({
                    project_id: projectId,
                    board_id: board.id,
                    title: text,
                    category: 'Feature Request',
                    status: 'open',
                    source: 'discord',
                })
                .select('id, title')
                .single();

            if (error) throw error;
            return `✅ Created feedback: "${post.title}"`;
        }

        case 'search': {
            const { data: posts } = await supabase
                .from('posts')
                .select('id, title, status, category')
                .eq('project_id', projectId)
                .ilike('title', `%${text}%`)
                .limit(5);

            if (!posts || posts.length === 0) {
                return `🔍 No feedback found matching "${text}"`;
            }

            let message = `🔍 **Found ${posts.length} results:**\n\n`;
            posts.forEach((post: any, i: number) => {
                const emoji = post.status === 'completed' ? '✅' : post.status === 'in_progress' ? '🔄' : '📝';
                message += `${i + 1}. ${emoji} ${post.title}\n`;
            });
            return message;
        }

        case 'vote': {
            // Find matching post
            const { data: posts } = await supabase
                .from('posts')
                .select('id, title')
                .eq('project_id', projectId)
                .ilike('title', `%${text}%`)
                .limit(1);

            if (!posts || posts.length === 0) {
                return `❌ No feedback found matching "${text}"`;
            }

            const post = posts[0];

            // Create vote
            await supabase.from('votes').insert({
                post_id: post.id,
                priority: priority || 'important',
                source: 'discord',
            });

            // Get vote count
            const { count } = await supabase
                .from('votes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

            const priorityEmoji = priority === 'must_have' ? '🔴' : priority === 'nice_to_have' ? '🟢' : '🟡';
            return `${priorityEmoji} Voted on "${post.title}"\n📊 Total votes: ${count || 1}`;
        }

        default:
            return `Unknown action: ${action}`;
    }
}
