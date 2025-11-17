/**
 * Disconnect Jira Integration API Route
 *
 * Disconnects a Jira connection and marks it as inactive.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { disconnectJira } from '@/lib/jira/oauth';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { connection_id } = req.body;

    if (!connection_id) {
      return res.status(400).json({ error: 'connection_id is required' });
    }

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Get authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Disconnect the connection
    await disconnectJira(connection_id, user.id);

    res.status(200).json({
      success: true,
      message: 'Jira connection disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Jira:', error);
    res.status(500).json({
      error: 'Failed to disconnect Jira',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
