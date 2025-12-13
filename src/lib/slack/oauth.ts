/**
 * Slack OAuth 2.0 Flow
 *
 * Handles secure authentication with Slack workspaces.
 * Provides functions for authorization URL generation and token exchange.
 */

import { createServerClient } from '@/lib/supabase-client';
import { encryptToken } from '@/lib/jira/encryption'; // Reuse existing encryption

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

// Required scopes for full functionality
const REQUIRED_SCOPES = [
  'chat:write',           // Post messages
  'chat:write.public',    // Post to channels without joining
  'channels:read',        // List public channels
  'channels:join',        // Auto-join public channels
  'groups:read',          // List private channels
  'users:read',           // Get user info for mentions
  'im:read',              // Read DMs (for DM events)
  'im:write',             // Send DMs
  'im:history',           // Access DM history (for message.im events)
  'app_mentions:read',    // Required for app_mention events
  'incoming-webhook'      // Optional: webhook support
].join(',');

export interface SlackOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SlackTokenResponse {
  bot_token: string;
  team_id: string;
  team_name: string;
  bot_user_id: string;
  scope: string;
}

/**
 * Gets Slack OAuth configuration from environment variables
 */
function getSlackConfig(): SlackOAuthConfig {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing Slack OAuth configuration. Please set SLACK_CLIENT_ID, ' +
      'SLACK_CLIENT_SECRET, and SLACK_REDIRECT_URI in environment variables.'
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generates the Slack OAuth authorization URL
 *
 * @param state - CSRF protection token (should be stored in session)
 * @param projectId - Optional project ID to include in state
 * @returns Authorization URL to redirect user to
 *
 * @example
 * const state = generateStateToken();
 * const url = getAuthorizationUrl(state, projectId);
 * // Redirect user to `url`
 */
export function getAuthorizationUrl(state: string, projectId?: string): string {
  const config = getSlackConfig();

  // Encode project ID in state if provided
  const stateData = projectId
    ? JSON.stringify({ token: state, projectId })
    : state;

  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: REQUIRED_SCOPES,
    redirect_uri: config.redirectUri,
    state: Buffer.from(stateData).toString('base64')
  });

  return `${SLACK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges OAuth code for access token
 *
 * @param code - Authorization code from Slack redirect
 * @returns Token data including bot token and team info
 * @throws Error if exchange fails
 *
 * @example
 * const tokenData = await exchangeCodeForToken(code);
 * console.log('Connected to:', tokenData.team_name);
 */
export async function exchangeCodeForToken(
  code: string
): Promise<SlackTokenResponse> {
  const config = getSlackConfig();

  const response = await fetch(SLACK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error || 'Unknown error'}`);
  }

  // Validate we got bot token (not just user token)
  if (!data.access_token) {
    throw new Error('No bot token received from Slack');
  }

  return {
    bot_token: data.access_token,
    team_id: data.team.id,
    team_name: data.team.name,
    bot_user_id: data.bot_user_id,
    scope: data.scope,
  };
}

/**
 * Stores Slack connection in database
 *
 * @param userId - User ID performing the connection
 * @param projectId - Project to connect to Slack
 * @param tokenData - Token data from OAuth exchange
 * @returns Created connection record
 *
 * @example
 * const connection = await storeConnection(userId, projectId, tokenData);
 * console.log('Connection ID:', connection.id);
 */
export async function storeConnection(
  userId: string,
  projectId: string,
  tokenData: SlackTokenResponse
) {
  const supabase = await createServerClient();

  // Check if connection already exists for this team
  const { data: existing } = await supabase
    .from('slack_connections')
    .select('id')
    .eq('project_id', projectId)
    .eq('team_id', tokenData.team_id)
    .single();

  if (existing) {
    // Update existing connection
    const { data, error } = await supabase
      .from('slack_connections')
      .update({
        bot_token_encrypted: encryptToken(tokenData.bot_token),
        bot_user_id: tokenData.bot_user_id,
        scope: tokenData.scope,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Create new connection
  const { data, error } = await supabase
    .from('slack_connections')
    .insert({
      user_id: userId,
      project_id: projectId,
      team_id: tokenData.team_id,
      team_name: tokenData.team_name,
      bot_token_encrypted: encryptToken(tokenData.bot_token),
      bot_user_id: tokenData.bot_user_id,
      scope: tokenData.scope,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Gets active Slack connection for a project
 *
 * @param projectId - Project ID to get connection for
 * @returns Connection data or null if not connected
 */
export async function getActiveConnection(projectId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('slack_connections')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Disconnects Slack integration
 *
 * @param connectionId - Connection ID to disconnect
 */
export async function disconnectSlack(connectionId: string) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('slack_connections')
    .update({ status: 'disconnected' })
    .eq('id', connectionId);

  if (error) throw error;
}

/**
 * Generates a random state token for CSRF protection
 */
export function generateStateToken(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

/**
 * Validates state token to prevent CSRF attacks
 */
export function validateState(receivedState: string, expectedState: string): boolean {
  try {
    const decoded = Buffer.from(receivedState, 'base64').toString('utf-8');

    // If state contains JSON (with project ID), extract token
    try {
      const parsed = JSON.parse(decoded);
      return parsed.token === expectedState;
    } catch {
      // Plain state token
      return decoded === expectedState;
    }
  } catch {
    return false;
  }
}

/**
 * Extracts project ID from state if present
 */
export function extractProjectIdFromState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return parsed.projectId || null;
  } catch {
    return null;
  }
}

/**
 * Auto-join bot to public channels after OAuth
 * This ensures the bot can receive app_mention events
 */
export async function autoJoinChannels(botToken: string): Promise<void> {
  try {
    // List public channels
    const listResponse = await fetch('https://slack.com/api/conversations.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
    });

    const listData = await listResponse.json();

    if (!listData.ok) {
      console.error('[Slack] Failed to list channels:', listData.error);
      return;
    }

    const channels = listData.channels || [];
    console.log(`[Slack] Found ${channels.length} public channels`);

    // Join each channel (limit to first 10 to avoid rate limits)
    const channelsToJoin = channels
      .filter((ch: { is_member: boolean; is_archived: boolean }) => !ch.is_member && !ch.is_archived)
      .slice(0, 10);

    for (const channel of channelsToJoin) {
      try {
        const joinResponse = await fetch('https://slack.com/api/conversations.join', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channel: channel.id }),
        });

        const joinData = await joinResponse.json();
        if (joinData.ok) {
          console.log(`[Slack] Joined channel: ${channel.name}`);
        } else {
          console.error(`[Slack] Failed to join ${channel.name}:`, joinData.error);
        }
      } catch (err) {
        console.error(`[Slack] Error joining channel ${channel.name}:`, err);
      }
    }

    console.log('[Slack] Auto-join completed');
  } catch (error) {
    console.error('[Slack] Auto-join error:', error);
  }
}
