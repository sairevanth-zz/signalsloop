/**
 * API: Inbox Sync
 * Trigger sync for integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { SyncOrchestrator } from '@/lib/inbox/sync-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { projectId, integrationId } = body;
    
    if (!projectId && !integrationId) {
      return NextResponse.json(
        { error: 'Project ID or integration ID required' },
        { status: 400 }
      );
    }
    
    const orchestrator = new SyncOrchestrator();
    
    if (integrationId) {
      // Sync single integration
      const { data: integration } = await supabase
        .from('feedback_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();
      
      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }
      
      const mappedIntegration = {
        id: integration.id,
        projectId: integration.project_id,
        integrationType: integration.integration_type,
        displayName: integration.display_name,
        credentials: integration.credentials,
        config: integration.config,
        syncEnabled: integration.sync_enabled,
        syncFrequencyMinutes: integration.sync_frequency_minutes,
        lastSyncAt: integration.last_sync_at ? new Date(integration.last_sync_at) : undefined,
        lastSyncStatus: integration.last_sync_status,
        lastSyncItemsCount: integration.last_sync_items_count,
        totalItemsSynced: integration.total_items_synced,
        totalItemsThisMonth: integration.total_items_this_month,
        isActive: integration.is_active,
        isConnected: integration.is_connected,
        createdAt: new Date(integration.created_at),
        updatedAt: new Date(integration.updated_at),
      };
      
      const result = await orchestrator.syncIntegration(mappedIntegration as any);
      return NextResponse.json({ results: [result] });
    }
    
    // Sync all project integrations
    const results = await orchestrator.syncProject(projectId);
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error('[API] Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}

// Get sync logs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const integrationId = searchParams.get('integrationId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 });
    }
    
    const orchestrator = new SyncOrchestrator();
    const logs = await orchestrator.getSyncLogs(integrationId, limit);
    
    return NextResponse.json({ logs });
    
  } catch (error) {
    console.error('[API] Get sync logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync logs' },
      { status: 500 }
    );
  }
}
