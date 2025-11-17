/**
 * Jira OAuth 2.0 (3LO) Implementation
 *
 * Handles the complete OAuth flow for Jira Cloud:
 * 1. Authorization URL generation
 * 2. Code exchange for tokens
 * 3. Token refresh
 * 4. Resource discovery (accessible Jira sites)
 * 5. Token storage with encryption
 */

import { encryptToken, decryptToken } from './encryption';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

// Atlassian OAuth endpoints
const JIRA_AUTH_URL = 'https://auth.atlassian.com/authorize';
const JIRA_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const JIRA_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';

// OAuth scopes required for Jira integration
const JIRA_SCOPES = [
  'read:jira-work',
  'write:jira-work',
  'read:jira-user',
  'manage:jira-webhook',
  'offline_access' // Required for refresh tokens
].join(' ');

/**
 * Interface for OAuth token response
 */
export interface JiraTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  scope: string;
  token_type: string;
}

/**
 * Interface for Jira accessible resource
 */
export interface JiraResource {
  id: string; // cloud_id
  url: string; // site URL
  name: string; // site name
  scopes: string[];
  avatarUrl?: string;
}

/**
 * Interface for stored Jira connection
 */
export interface JiraConnection {
  id: string;
  user_id: string;
  project_id: string;
  cloud_id: string;
  site_url: string;
  site_name?: string;
  default_project_key?: string;
  default_issue_type?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generates the OAuth authorization URL for Jira.
 *
 * User should be redirected to this URL to grant permissions.
 *
 * @param stateToken - CSRF protection token (should be stored in DB)
 * @returns Authorization URL
 */
export function getAuthorizationUrl(stateToken: string): string {
  const redirectUri = process.env.JIRA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/jira/callback`;

  if (!process.env.JIRA_CLIENT_ID) {
    throw new Error('JIRA_CLIENT_ID environment variable is not set');
  }

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: process.env.JIRA_CLIENT_ID,
    scope: JIRA_SCOPES,
    redirect_uri: redirectUri,
    state: stateToken,
    response_type: 'code',
    prompt: 'consent'
  });

  return `${JIRA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 *
 * @param code - Authorization code from OAuth callback
 * @returns OAuth tokens
 * @throws Error if exchange fails
 */
export async function exchangeCodeForTokens(code: string): Promise<JiraTokens> {
  const redirectUri = process.env.JIRA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/jira/callback`;

  if (!process.env.JIRA_CLIENT_ID || !process.env.JIRA_CLIENT_SECRET) {
    throw new Error('Missing Jira OAuth credentials (JIRA_CLIENT_ID or JIRA_CLIENT_SECRET)');
  }

  try {
    const response = await fetch(JIRA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type
    };
  } catch (error) {
    console.error('Failed to exchange code for tokens:', error);
    throw new Error('Failed to complete OAuth flow. Please try again.');
  }
}

/**
 * Refreshes an expired access token using a refresh token.
 *
 * @param refreshToken - Valid refresh token
 * @returns New OAuth tokens
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(refreshToken: string): Promise<JiraTokens> {
  if (!process.env.JIRA_CLIENT_ID || !process.env.JIRA_CLIENT_SECRET) {
    throw new Error('Missing Jira OAuth credentials (JIRA_CLIENT_ID or JIRA_CLIENT_SECRET)');
  }

  try {
    const response = await fetch(JIRA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.text();

      // If refresh token is invalid, mark connection as expired
      if (response.status === 400 || response.status === 401) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }

      throw new Error(`Token refresh failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type
    };
  } catch (error) {
    console.error('Failed to refresh access token:', error);

    if (error instanceof Error && error.message === 'REFRESH_TOKEN_EXPIRED') {
      throw error;
    }

    throw new Error('Failed to refresh authentication. Please reconnect your Jira account.');
  }
}

/**
 * Gets the list of Jira Cloud sites the user has access to.
 *
 * @param accessToken - Valid OAuth access token
 * @returns Array of accessible Jira resources
 * @throws Error if request fails
 */
export async function getAccessibleResources(accessToken: string): Promise<JiraResource[]> {
  try {
    const response = await fetch(JIRA_RESOURCES_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get accessible resources: ${response.status} - ${error}`);
    }

    const resources = await response.json();

    return resources.map((resource: any) => ({
      id: resource.id,
      url: resource.url,
      name: resource.name,
      scopes: resource.scopes || [],
      avatarUrl: resource.avatarUrl
    }));
  } catch (error) {
    console.error('Failed to get accessible resources:', error);
    throw new Error('Failed to get your Jira sites. Please try again.');
  }
}

/**
 * Stores a new Jira connection in the database with encrypted tokens.
 *
 * @param userId - Supabase user ID
 * @param projectId - SignalsLoop project ID
 * @param tokens - OAuth tokens
 * @param cloudId - Atlassian cloud ID
 * @param siteUrl - Jira site URL
 * @param siteName - Jira site name
 * @param scopes - Granted OAuth scopes
 * @returns Created connection record
 * @throws Error if storage fails
 */
export async function storeConnection(
  userId: string,
  projectId: string,
  tokens: JiraTokens,
  cloudId: string,
  siteUrl: string,
  siteName: string,
  scopes: string
): Promise<JiraConnection> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  try {
    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt tokens before storage (SECURITY CRITICAL)
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);

    // Check if connection already exists for this user+project
    const { data: existing } = await supabase
      .from('jira_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();

    let data;

    if (existing) {
      // Update existing connection
      const { data: updated, error } = await supabase
        .from('jira_connections')
        .update({
          cloud_id: cloudId,
          site_url: siteUrl,
          site_name: siteName,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt.toISOString(),
          scopes: scopes.split(' '),
          status: 'active',
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      data = updated;
    } else {
      // Create new connection
      const { data: created, error } = await supabase
        .from('jira_connections')
        .insert({
          user_id: userId,
          project_id: projectId,
          cloud_id: cloudId,
          site_url: siteUrl,
          site_name: siteName,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt.toISOString(),
          scopes: scopes.split(' '),
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      data = created;
    }

    // Log the connection creation
    await supabase.from('jira_sync_logs').insert({
      jira_connection_id: data.id,
      action: 'connection_created',
      success: true,
      details: {
        cloud_id: cloudId,
        site_url: siteUrl,
        scopes: scopes.split(' ')
      },
      user_id: userId
    });

    return data;
  } catch (error) {
    console.error('Failed to store Jira connection:', error);
    throw new Error('Failed to save Jira connection. Please try again.');
  }
}

/**
 * Gets a valid access token for a Jira connection.
 *
 * Automatically refreshes the token if it's expired or about to expire.
 *
 * @param connectionId - Jira connection ID
 * @returns Valid access token
 * @throws Error if token cannot be obtained
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  try {
    // Get connection details
    const { data: connection, error } = await supabase
      .from('jira_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !connection) {
      throw new Error('Jira connection not found');
    }

    if (connection.status === 'disconnected') {
      throw new Error('Jira connection is disconnected');
    }

    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    const bufferMinutes = 5; // Refresh if expiring within 5 minutes

    // Check if token is still valid (with buffer)
    if (expiresAt.getTime() - now.getTime() > bufferMinutes * 60 * 1000) {
      // Token is still valid, decrypt and return
      return decryptToken(connection.access_token_encrypted);
    }

    // Token expired or about to expire, refresh it
    console.log(`Refreshing access token for connection ${connectionId}`);

    const refreshToken = decryptToken(connection.refresh_token_encrypted);
    const newTokens = await refreshAccessToken(refreshToken);

    // Update stored tokens
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

    await supabase
      .from('jira_connections')
      .update({
        access_token_encrypted: encryptToken(newTokens.access_token),
        refresh_token_encrypted: encryptToken(newTokens.refresh_token),
        token_expires_at: newExpiresAt.toISOString(),
        status: 'active',
        last_error: null,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    // Log token refresh
    await supabase.from('jira_sync_logs').insert({
      jira_connection_id: connectionId,
      action: 'token_refreshed',
      success: true,
      details: {
        expires_at: newExpiresAt.toISOString()
      }
    });

    return newTokens.access_token;
  } catch (error) {
    console.error('Failed to get valid access token:', error);

    // If refresh token is expired, mark connection as expired
    if (error instanceof Error && error.message === 'REFRESH_TOKEN_EXPIRED') {
      await supabase
        .from('jira_connections')
        .update({
          status: 'expired',
          last_error: 'Refresh token expired. Please reconnect.'
        })
        .eq('id', connectionId);

      throw new Error('Your Jira connection has expired. Please reconnect your account.');
    }

    throw new Error('Failed to authenticate with Jira. Please try again.');
  }
}

/**
 * Disconnects a Jira connection.
 *
 * @param connectionId - Connection ID to disconnect
 * @param userId - User ID (for authorization)
 * @returns true if successful
 */
export async function disconnectJira(connectionId: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  try {
    // Verify ownership
    const { data: connection } = await supabase
      .from('jira_connections')
      .select('id')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (!connection) {
      throw new Error('Connection not found or unauthorized');
    }

    // Update status to disconnected
    const { error } = await supabase
      .from('jira_connections')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (error) throw error;

    // Log disconnection
    await supabase.from('jira_sync_logs').insert({
      jira_connection_id: connectionId,
      action: 'connection_disconnected',
      success: true,
      user_id: userId
    });

    return true;
  } catch (error) {
    console.error('Failed to disconnect Jira:', error);
    throw new Error('Failed to disconnect Jira. Please try again.');
  }
}

/**
 * Creates and stores an OAuth state token for CSRF protection.
 *
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns State token string
 */
export async function createOAuthState(userId: string, projectId: string): Promise<string> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  // Generate random state token
  const stateToken = crypto.randomUUID();

  // Store in database
  await supabase.from('jira_oauth_states').insert({
    state_token: stateToken,
    user_id: userId,
    project_id: projectId
  });

  return stateToken;
}

/**
 * Verifies and consumes an OAuth state token (CSRF protection).
 *
 * @param stateToken - State token from OAuth callback
 * @returns Object with userId and projectId if valid
 * @throws Error if token is invalid or expired
 */
export async function verifyOAuthState(stateToken: string): Promise<{ userId: string; projectId: string }> {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    throw new Error('Database connection not available');
  }

  // Get state record
  const { data: state, error } = await supabase
    .from('jira_oauth_states')
    .select('*')
    .eq('state_token', stateToken)
    .single();

  if (error || !state) {
    throw new Error('Invalid or expired OAuth state token');
  }

  // Check if already consumed (replay attack prevention)
  if (state.consumed) {
    throw new Error('OAuth state token already used');
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(state.expires_at);

  if (now > expiresAt) {
    throw new Error('OAuth state token expired');
  }

  // Mark as consumed
  await supabase
    .from('jira_oauth_states')
    .update({
      consumed: true,
      consumed_at: new Date().toISOString()
    })
    .eq('state_token', stateToken);

  return {
    userId: state.user_id,
    projectId: state.project_id
  };
}
