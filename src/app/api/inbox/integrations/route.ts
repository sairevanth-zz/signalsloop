/**
 * API: Inbox Integrations
 * Manage feedback source integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { SyncOrchestrator } from '@/lib/inbox/sync-orchestrator';
import { IntegrationType } from '@/lib/inbox/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }
    
    const orchestrator = new SyncOrchestrator();
    const integrations = await orchestrator.getAllIntegrations(projectId);
    
    return NextResponse.json({ integrations });
    
  } catch (error) {
    console.error('[API] Get integrations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { projectId, integrationType, displayName, credentials, config } = body;
    
    if (!projectId || !integrationType) {
      return NextResponse.json(
        { error: 'Project ID and integration type required' },
        { status: 400 }
      );
    }
    
    const orchestrator = new SyncOrchestrator();
    const integration = await orchestrator.createIntegration(
      projectId,
      integrationType as IntegrationType,
      displayName || integrationType,
      credentials || {},
      config || {}
    );
    
    if (!integration) {
      return NextResponse.json(
        { error: 'Failed to create integration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ integration }, { status: 201 });
    
  } catch (error) {
    console.error('[API] Create integration error:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}
