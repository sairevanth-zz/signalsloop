/**
 * Jira OAuth Callback API Route
 *
 * Handles the OAuth callback from Atlassian.
 * Exchanges authorization code for tokens and stores the connection.
 */

import type { NextApiRequest, NextApiResponse} from 'next';
import {
  exchangeCodeForTokens,
  getAccessibleResources,
  storeConnection,
  verifyOAuthState
} from '@/lib/jira/oauth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      console.error('OAuth error:', oauthError);
      return res.redirect(
        `/settings/integrations?jira_error=oauth_denied&message=${encodeURIComponent(oauthError as string)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(
        '/settings/integrations?jira_error=missing_params'
      );
    }

    // Verify state token (CSRF protection)
    let userId: string;
    let projectId: string;

    try {
      const verification = await verifyOAuthState(state as string);
      userId = verification.userId;
      projectId = verification.projectId;
    } catch (error) {
      console.error('State verification failed:', error);
      return res.redirect(
        '/settings/integrations?jira_error=invalid_state'
      );
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code as string);

    // Get accessible Jira sites
    const resources = await getAccessibleResources(tokens.access_token);

    if (resources.length === 0) {
      return res.redirect(
        '/settings/integrations?jira_error=no_sites'
      );
    }

    // Use the first site (or let user choose if multiple)
    // In production, you might want to store all sites and let user choose
    const selectedSite = resources[0];

    // Store the connection in database
    const connection = await storeConnection(
      userId,
      projectId,
      tokens,
      selectedSite.id,
      selectedSite.url,
      selectedSite.name,
      tokens.scope
    );

    console.log('Jira connection created:', connection.id);

    // Redirect to success page
    res.redirect(
      `/settings/integrations?jira_success=true&connection_id=${connection.id}`
    );
  } catch (error) {
    console.error('Error in Jira OAuth callback:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.redirect(
      `/settings/integrations?jira_error=callback_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }
}
