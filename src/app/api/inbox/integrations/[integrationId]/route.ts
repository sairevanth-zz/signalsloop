/**
 * API: Single Integration
 * Manage individual integration settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { SyncOrchestrator } from '@/lib/inbox/sync-orchestrator';

interface RouteParams {
  params: Promise<{ integrationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { integrationId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get integration directly from database
    const { data, error } = await supabase
      .from('feedback_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[API] Get integration error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { integrationId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const orchestrator = new SyncOrchestrator();
    let success = false;
    
    if (body.credentials) {
      success = await orchestrator.updateCredentials(integrationId, body.credentials);
    }
    
    if (body.config) {
      success = await orchestrator.updateConfig(integrationId, body.config);
    }
    
    if (body.action === 'deactivate') {
      success = await orchestrator.deactivateIntegration(integrationId);
    }
    
    if (body.action === 'test') {
      // Fetch integration to test
      const { data: integration } = await supabase
        .from('feedback_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();
      
      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }
      
      // Map to expected format
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
      
      const result = await orchestrator.testConnection(mappedIntegration as any);
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ success });
    
  } catch (error) {
    console.error('[API] Update integration error:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { integrationId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const orchestrator = new SyncOrchestrator();
    const success = await orchestrator.deleteIntegration(integrationId);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API] Delete integration error:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
