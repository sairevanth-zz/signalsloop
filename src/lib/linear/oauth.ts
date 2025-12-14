/**
 * Linear OAuth 2.0 Implementation
 * 
 * Handles the complete OAuth flow for Linear:
 * 1. Authorization URL generation
 * 2. Code exchange for tokens
 * 3. Token storage with encryption
 * 4. Connection management
 */

import crypto from 'crypto';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

// Linear OAuth configuration
const LINEAR_CLIENT_ID = process.env.LINEAR_CLIENT_ID!;
const LINEAR_CLIENT_SECRET = process.env.LINEAR_CLIENT_SECRET!;
const LINEAR_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/linear/callback`
    : 'http://localhost:3000/api/integrations/linear/callback';

const LINEAR_AUTH_URL = 'https://linear.app/oauth/authorize';
const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token';
const LINEAR_API_URL = 'https://api.linear.app/graphql';

// Encryption key for token storage
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 32) || '';

/**
 * Interface for OAuth token response
 */
export interface LinearTokens {
    access_token: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
}

/**
 * Interface for Linear organization
 */
export interface LinearOrganization {
    id: string;
    name: string;
    urlKey: string;
    logoUrl?: string;
}

/**
 * Interface for stored Linear connection
 */
export interface LinearConnection {
    id: string;
    user_id: string;
    project_id: string;
    organization_id: string;
    organization_name: string;
    organization_url_key: string;
    status: string;
    created_at: string;
    updated_at: string;
}

/**
 * Encrypt a string using AES-256-GCM
 */
function encrypt(text: string): string {
    if (!ENCRYPTION_KEY) return text;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
        iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string using AES-256-GCM
 */
function decrypt(encryptedText: string): string {
    if (!ENCRYPTION_KEY || !encryptedText.includes(':')) return encryptedText;

    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
        iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Generates the OAuth authorization URL for Linear.
 */
export function getAuthorizationUrl(stateToken: string): string {
    const params = new URLSearchParams({
        client_id: LINEAR_CLIENT_ID,
        redirect_uri: LINEAR_REDIRECT_URI,
        response_type: 'code',
        scope: 'read,write,issues:create,comments:create',
        state: stateToken,
        actor: 'application', // Actions appear from the app, not the user
    });

    return `${LINEAR_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<LinearTokens> {
    const response = await fetch(LINEAR_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: LINEAR_CLIENT_ID,
            client_secret: LINEAR_CLIENT_SECRET,
            redirect_uri: LINEAR_REDIRECT_URI,
            code,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('[Linear OAuth] Token exchange failed:', error);
        throw new Error(`Token exchange failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Gets the current user's organization from Linear.
 */
export async function getOrganization(accessToken: string): Promise<LinearOrganization> {
    const response = await fetch(LINEAR_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken,
        },
        body: JSON.stringify({
            query: `
        query {
          organization {
            id
            name
            urlKey
            logoUrl
          }
        }
      `,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch organization');
    }

    const json = await response.json();

    if (json.errors) {
        throw new Error(json.errors[0].message);
    }

    return json.data.organization;
}

/**
 * Stores a new Linear connection in the database with encrypted tokens.
 */
export async function storeConnection(
    userId: string,
    projectId: string,
    tokens: LinearTokens,
    organization: LinearOrganization
): Promise<LinearConnection> {
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
        throw new Error('Database not available');
    }

    // Encrypt the access token
    const encryptedToken = encrypt(tokens.access_token);

    // Check if connection already exists
    const { data: existing } = await supabase
        .from('linear_connections')
        .select('id')
        .eq('project_id', projectId)
        .eq('organization_id', organization.id)
        .single();

    if (existing) {
        // Update existing connection
        const { data, error } = await supabase
            .from('linear_connections')
            .update({
                access_token_encrypted: encryptedToken,
                organization_name: organization.name,
                organization_url_key: organization.urlKey,
                status: 'active',
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        return data as LinearConnection;
    }

    // Create new connection
    const { data, error } = await supabase
        .from('linear_connections')
        .insert({
            user_id: userId,
            project_id: projectId,
            organization_id: organization.id,
            organization_name: organization.name,
            organization_url_key: organization.urlKey,
            access_token_encrypted: encryptedToken,
            status: 'active',
        })
        .select()
        .single();

    if (error) throw error;
    return data as LinearConnection;
}

/**
 * Gets the decrypted access token for a Linear connection.
 */
export async function getAccessToken(connectionId: string): Promise<string> {
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
        throw new Error('Database not available');
    }

    const { data, error } = await supabase
        .from('linear_connections')
        .select('access_token_encrypted')
        .eq('id', connectionId)
        .single();

    if (error || !data) {
        throw new Error('Connection not found');
    }

    return decrypt(data.access_token_encrypted);
}

/**
 * Disconnects a Linear connection.
 */
export async function disconnectLinear(connectionId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
        throw new Error('Database not available');
    }

    const { error } = await supabase
        .from('linear_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', userId);

    return !error;
}

/**
 * Creates and stores an OAuth state token for CSRF protection.
 */
export async function createOAuthState(userId: string, projectId: string): Promise<string> {
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
        throw new Error('Database not available');
    }

    const stateToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await supabase.from('oauth_states').insert({
        state_token: stateToken,
        user_id: userId,
        project_id: projectId,
        provider: 'linear',
        expires_at: expiresAt.toISOString(),
    });

    return stateToken;
}

/**
 * Verifies and consumes an OAuth state token.
 */
export async function verifyOAuthState(stateToken: string): Promise<{ userId: string; projectId: string }> {
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
        throw new Error('Database not available');
    }

    const { data, error } = await supabase
        .from('oauth_states')
        .select('user_id, project_id, expires_at')
        .eq('state_token', stateToken)
        .eq('provider', 'linear')
        .single();

    if (error || !data) {
        throw new Error('Invalid state token');
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
        await supabase.from('oauth_states').delete().eq('state_token', stateToken);
        throw new Error('State token expired');
    }

    // Delete used state
    await supabase.from('oauth_states').delete().eq('state_token', stateToken);

    return { userId: data.user_id, projectId: data.project_id };
}
