/**
 * Jira OAuth Connect API Route
 *
 * Initiates the OAuth flow by redirecting the user to Atlassian's authorization page.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthorizationUrl, createOAuthState } from '@/lib/jira/oauth';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get project_id from query params
    const projectId = req.query.project_id as string;

    if (!projectId) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Get authenticated user from session
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Get user from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No valid session' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid session' });
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return res.status(403).json({ error: 'Project not found or access denied' });
    }

    // Create OAuth state token for CSRF protection
    const stateToken = await createOAuthState(user.id, projectId);

    // Generate authorization URL
    const authUrl = getAuthorizationUrl(stateToken);

    // Redirect to Atlassian OAuth page
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Jira OAuth:', error);
    res.status(500).json({
      error: 'Failed to connect to Jira',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
