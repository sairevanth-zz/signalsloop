/**
 * Slack API Client Wrapper
 *
 * Provides high-level functions for interacting with Slack API.
 * Handles authentication, error handling, and message logging.
 */

import { WebClient, ChatPostMessageResponse, ConversationsListResponse } from '@slack/web-api';
import { createServerClient } from '@/lib/supabase-client';
import { decryptToken } from '@/lib/jira/encryption';
import type { Block, KnownBlock } from '@slack/web-api';

export interface SlackMessage {
  channel: string;
  blocks: (Block | KnownBlock)[];
  text?: string;
  thread_ts?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
}

/**
 * Gets a configured Slack WebClient for a connection
 */
async function getSlackClient(connectionId: string): Promise<WebClient> {
  const supabase = await createServerClient();

  const { data: connection, error } = await supabase
    .from('slack_connections')
    .select('bot_token_encrypted, status')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('Slack connection not found');
  }

  if (connection.status !== 'active') {
    throw new Error(`Slack connection is ${connection.status}`);
  }

  // Decrypt token
  const botToken = decryptToken(connection.bot_token_encrypted);

  return new WebClient(botToken);
}

/**
 * Posts a message to Slack with full logging and error handling
 *
 * @param connectionId - Slack connection ID
 * @param message - Message details (channel, blocks, etc.)
 * @param alertType - Type of alert being sent
 * @param entityId - Related entity ID (feedback_id, theme_id, etc.)
 * @param entityType - Type of entity ('feedback', 'theme', etc.)
 * @param mentionUsers - Array of Slack user IDs to mention
 * @returns Slack API response including message timestamp
 *
 * @example
 * await postMessage(connectionId, {
 *   channel: 'C01234567',
 *   blocks: buildCriticalFeedbackAlert(data),
 *   text: 'Critical feedback detected'
 * }, 'critical_feedback', feedbackId, 'feedback');
 */
export async function postMessage(
  connectionId: string,
  message: SlackMessage,
  alertType: string,
  entityId?: string,
  entityType?: string,
  mentionUsers?: string[]
): Promise<ChatPostMessageResponse> {
  const client = await getSlackClient(connectionId);
  const supabase = await createServerClient();

  try {
    // Post main message
    const result = await client.chat.postMessage({
      channel: message.channel,
      blocks: message.blocks,
      text: message.text || 'New alert from SignalsLoop',
      thread_ts: message.thread_ts,
      unfurl_links: false,
      unfurl_media: false,
    });

    // If mention_users provided, post mention in thread
    if (mentionUsers && mentionUsers.length > 0 && result.ts) {
      const mentions = mentionUsers.map(userId => `<@${userId}>`).join(' ');
      await client.chat.postMessage({
        channel: message.channel,
        text: `${mentions} - This alert requires your attention`,
        thread_ts: result.ts, // Reply in thread
      });
    }

    // Log successful message
    await supabase.from('slack_message_logs').insert({
      slack_connection_id: connectionId,
      alert_type: alertType,
      channel_id: message.channel,
      message_ts: result.ts,
      blocks: message.blocks,
      text_fallback: message.text,
      success: true,
      entity_id: entityId,
      entity_type: entityType,
    });

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed message
    await supabase.from('slack_message_logs').insert({
      slack_connection_id: connectionId,
      alert_type: alertType,
      channel_id: message.channel,
      blocks: message.blocks,
      text_fallback: message.text,
      success: false,
      error_message: errorMessage,
      entity_id: entityId,
      entity_type: entityType,
    });

    throw error;
  }
}

/**
 * Lists all channels accessible to the bot
 *
 * @param connectionId - Slack connection ID
 * @param includePrivate - Whether to include private channels (default: true)
 * @returns Array of channels
 */
export async function listChannels(
  connectionId: string,
  includePrivate = true
): Promise<SlackChannel[]> {
  const client = await getSlackClient(connectionId);

  const types = includePrivate
    ? 'public_channel,private_channel'
    : 'public_channel';

  try {
    const result: ConversationsListResponse = await client.conversations.list({
      types,
      exclude_archived: true,
      limit: 200,
    });

    if (!result.channels) {
      return [];
    }

    return result.channels.map(channel => ({
      id: channel.id!,
      name: channel.name!,
      is_private: channel.is_private || false,
      is_archived: channel.is_archived || false,
    }));
  } catch (error) {
    console.error('Error listing Slack channels:', error);
    throw new Error('Failed to list Slack channels');
  }
}

/**
 * Gets information about a specific channel
 */
export async function getChannelInfo(
  connectionId: string,
  channelId: string
) {
  const client = await getSlackClient(connectionId);

  try {
    const result = await client.conversations.info({
      channel: channelId,
    });

    return result.channel;
  } catch (error) {
    console.error('Error getting channel info:', error);
    return null;
  }
}

/**
 * Updates an existing message (used for interactive responses)
 */
export async function updateMessage(
  connectionId: string,
  channelId: string,
  messageTs: string,
  blocks: (Block | KnownBlock)[],
  text?: string
) {
  const client = await getSlackClient(connectionId);

  try {
    const result = await client.chat.update({
      channel: channelId,
      ts: messageTs,
      blocks,
      text: text || 'Updated message',
    });

    return result;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

/**
 * Posts a message in a thread (reply to existing message)
 */
export async function postThreadReply(
  connectionId: string,
  channelId: string,
  threadTs: string,
  text: string
) {
  const client = await getSlackClient(connectionId);

  try {
    const result = await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text,
    });

    return result;
  } catch (error) {
    console.error('Error posting thread reply:', error);
    throw error;
  }
}

/**
 * Tests the Slack connection
 */
export async function testConnection(connectionId: string): Promise<boolean> {
  try {
    const client = await getSlackClient(connectionId);
    const result = await client.auth.test();
    return result.ok === true;
  } catch (error) {
    console.error('Slack connection test failed:', error);
    return false;
  }
}

/**
 * Gets the bot user info
 */
export async function getBotInfo(connectionId: string) {
  const client = await getSlackClient(connectionId);

  try {
    const authResult = await client.auth.test();

    if (authResult.user_id) {
      const userResult = await client.users.info({
        user: authResult.user_id,
      });

      return userResult.user;
    }

    return null;
  } catch (error) {
    console.error('Error getting bot info:', error);
    return null;
  }
}

/**
 * Sends a test message to verify channel access
 */
export async function sendTestMessage(
  connectionId: string,
  channelId: string
): Promise<boolean> {
  const supabase = await createServerClient();

  try {
    // Get connection details
    const { data: connection } = await supabase
      .from('slack_connections')
      .select('team_name')
      .eq('id', connectionId)
      .single();

    await postMessage(
      connectionId,
      {
        channel: channelId,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ *SignalsLoop Connected Successfully!*\n\nYour Slack integration is working. You\'ll start receiving intelligent alerts here.',
            },
          },
        ],
        text: 'SignalsLoop test message',
      },
      'test',
      undefined,
      undefined
    );

    return true;
  } catch (error) {
    console.error('Error sending test message:', error);
    return false;
  }
}

/**
 * Gets recent message logs for a connection
 */
export async function getMessageLogs(
  connectionId: string,
  limit = 50
) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('slack_message_logs')
    .select('*')
    .eq('slack_connection_id', connectionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Gets message statistics for a connection
 */
export async function getMessageStats(connectionId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('slack_message_logs')
    .select('success, alert_type, created_at')
    .eq('slack_connection_id', connectionId);

  if (error) throw error;

  const total = data.length;
  const successful = data.filter(m => m.success).length;
  const failed = total - successful;

  // Count by alert type
  const byType = data.reduce((acc, msg) => {
    acc[msg.alert_type] = (acc[msg.alert_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    successful,
    failed,
    success_rate: total > 0 ? (successful / total) * 100 : 0,
    by_type: byType,
  };
}
