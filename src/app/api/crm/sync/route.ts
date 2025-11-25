/**
 * CRM Sync API
 * Manually trigger customer data sync from Salesforce or HubSpot
 *
 * POST /api/crm/sync
 * Body: { project_id: string, provider?: 'salesforce' | 'hubspot' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { SalesforceClient } from '@/lib/crm/salesforce';
import { HubSpotClient } from '@/lib/crm/hubspot';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

interface SyncResult {
  success: boolean;
  provider: string;
  customersSync ed: number;
  customersCreated: number;
  customersUpdated: number;
  feedbackEnriched: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, provider } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 });
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', project_id)
      .eq('owner_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const serviceSupabase = getServiceRoleClient();

    // If provider specified, sync only that provider
    if (provider) {
      const result = await syncProvider(serviceSupabase, project_id, provider, user.id);
      return NextResponse.json(result);
    }

    // Otherwise, sync all configured providers
    const { data: credentials } = await serviceSupabase
      .from('integration_credentials')
      .select('provider, api_key, additional_config')
      .eq('project_id', project_id)
      .eq('is_active', true)
      .in('provider', ['salesforce', 'hubspot']);

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({
        error: 'No CRM integrations configured',
        hint: 'Configure Salesforce or HubSpot in project settings',
      }, { status: 400 });
    }

    const results: SyncResult[] = [];

    for (const cred of credentials) {
      const result = await syncProvider(serviceSupabase, project_id, cred.provider, user.id);
      results.push(result);
    }

    const totalSynced = results.reduce((sum, r) => sum + r.customersSynced, 0);
    const totalCreated = results.reduce((sum, r) => sum + r.customersCreated, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.customersUpdated, 0);
    const allSuccess = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      summary: {
        total_synced: totalSynced,
        total_created: totalCreated,
        total_updated: totalUpdated,
      },
    });
  } catch (error) {
    console.error('[CRM Sync] Error:', error);
    return NextResponse.json(
      {
        error: 'CRM sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Sync customers from a specific CRM provider
 */
async function syncProvider(
  supabase: any,
  projectId: string,
  provider: string,
  userId?: string
): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // Get credentials
    const { data: credential } = await supabase
      .from('integration_credentials')
      .select('api_key, additional_config')
      .eq('project_id', projectId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (!credential) {
      return {
        success: false,
        provider,
        customersSynced: 0,
        customersCreated: 0,
        customersUpdated: 0,
        feedbackEnriched: 0,
        error: `No ${provider} credentials found`,
      };
    }

    let customers: any[] = [];

    // Fetch customers from CRM
    if (provider === 'salesforce') {
      const config = credential.additional_config || {};
      const client = new SalesforceClient({
        instanceUrl: config.instance_url || 'https://login.salesforce.com',
        accessToken: credential.api_key,
      });

      customers = await client.fetchAccounts(500);
    } else if (provider === 'hubspot') {
      const client = new HubSpotClient({
        accessToken: credential.api_key,
      });

      customers = await client.fetchCompanies(500);
    }

    let customersCreated = 0;
    let customersUpdated = 0;
    let totalFeedbackEnriched = 0;

    // Upsert each customer
    for (const customer of customers) {
      const { data: existingCustomer } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('project_id', projectId)
        .eq('email', customer.email.toLowerCase())
        .single();

      const isNew = !existingCustomer;

      // Upsert customer profile
      await supabase.rpc('upsert_customer_profile', {
        p_project_id: projectId,
        p_email: customer.email,
        p_external_id: customer.externalId,
        p_name: customer.name,
        p_company_name: customer.companyName,
        p_mrr: customer.mrr,
        p_arr: customer.arr,
        p_plan_tier: customer.planTier,
        p_segment: customer.segment,
        p_status: customer.status,
        p_crm_provider: provider,
        p_crm_url: customer.crmUrl,
        p_crm_data: customer.rawData,
      });

      if (isNew) {
        customersCreated++;
      } else {
        customersUpdated++;
      }

      // Count enriched feedback (done automatically by trigger)
      const { count } = await supabase
        .from('discovered_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('customer_email', customer.email.toLowerCase());

      totalFeedbackEnriched += count || 0;
    }

    // Record sync log
    await supabase.rpc('record_customer_sync', {
      p_project_id: projectId,
      p_sync_type: 'manual',
      p_provider: provider,
      p_status: 'success',
      p_customers_synced: customers.length,
      p_customers_created: customersCreated,
      p_customers_updated: customersUpdated,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [CRM Sync] ${provider}: ${customers.length} customers synced in ${duration}ms`);

    return {
      success: true,
      provider,
      customersSynced: customers.length,
      customersCreated,
      customersUpdated,
      feedbackEnriched: totalFeedbackEnriched,
    };
  } catch (error) {
    // Record failed sync
    await supabase.rpc('record_customer_sync', {
      p_project_id: projectId,
      p_sync_type: 'manual',
      p_provider: provider,
      p_status: 'failed',
      p_customers_synced: 0,
      p_customers_created: 0,
      p_customers_updated: 0,
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      provider,
      customersSynced: 0,
      customersCreated: 0,
      customersUpdated: 0,
      feedbackEnriched: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
