/**
 * Scheduled Customer Sync from CRM
 * Runs daily to keep customer data fresh
 *
 * Called by orchestrator in morning batch
 * GET /api/cron/sync-customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { SalesforceClient } from '@/lib/crm/salesforce';
import { HubSpotClient } from '@/lib/crm/hubspot';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();

    console.log('🔄 [CRM Sync] Starting scheduled customer sync...');

    // Get all active CRM integrations
    const { data: credentials, error: fetchError } = await supabase
      .from('integration_credentials')
      .select('id, project_id, provider, api_key, additional_config')
      .eq('is_active', true)
      .in('provider', ['salesforce', 'hubspot']);

    if (fetchError) {
      console.error('[CRM Sync] Error fetching credentials:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch CRM credentials',
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!credentials || credentials.length === 0) {
      console.log('ℹ️  [CRM Sync] No active CRM integrations found');
      return NextResponse.json({
        success: true,
        message: 'No CRM integrations configured',
        synced: 0,
      });
    }

    console.log(`📦 [CRM Sync] Found ${credentials.length} active integrations`);

    const results = [];
    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;

    for (const cred of credentials) {
      const syncStartTime = Date.now();

      try {
        console.log(`  → Syncing ${cred.provider} for project ${cred.project_id}...`);

        let customers: any[] = [];

        // Fetch customers from CRM
        if (cred.provider === 'salesforce') {
          const config = cred.additional_config || {};
          const client = new SalesforceClient({
            instanceUrl: config.instance_url || 'https://login.salesforce.com',
            accessToken: cred.api_key,
          });

          customers = await client.fetchAccounts(500);
        } else if (cred.provider === 'hubspot') {
          const client = new HubSpotClient({
            accessToken: cred.api_key,
          });

          customers = await client.fetchCompanies(500);
        }

        let customersCreated = 0;
        let customersUpdated = 0;

        // Upsert each customer
        for (const customer of customers) {
          const { data: existingCustomer } = await supabase
            .from('customer_profiles')
            .select('id')
            .eq('project_id', cred.project_id)
            .eq('email', customer.email.toLowerCase())
            .single();

          const isNew = !existingCustomer;

          // Upsert customer profile (automatically enriches feedback via trigger)
          await supabase.rpc('upsert_customer_profile', {
            p_project_id: cred.project_id,
            p_email: customer.email,
            p_external_id: customer.externalId,
            p_name: customer.name,
            p_company_name: customer.companyName,
            p_mrr: customer.mrr,
            p_arr: customer.arr,
            p_plan_tier: customer.planTier,
            p_segment: customer.segment,
            p_status: customer.status,
            p_crm_provider: cred.provider,
            p_crm_url: customer.crmUrl,
            p_crm_data: customer.rawData,
          });

          if (isNew) {
            customersCreated++;
          } else {
            customersUpdated++;
          }
        }

        // Record sync log
        await supabase.rpc('record_customer_sync', {
          p_project_id: cred.project_id,
          p_sync_type: 'scheduled',
          p_provider: cred.provider,
          p_status: 'success',
          p_customers_synced: customers.length,
          p_customers_created: customersCreated,
          p_customers_updated: customersUpdated,
        });

        totalSynced += customers.length;
        totalCreated += customersCreated;
        totalUpdated += customersUpdated;

        const syncDuration = Date.now() - syncStartTime;
        console.log(`  ✅ ${cred.provider}: ${customers.length} customers synced (${customersCreated} new, ${customersUpdated} updated) in ${syncDuration}ms`);

        results.push({
          project_id: cred.project_id,
          provider: cred.provider,
          success: true,
          customers_synced: customers.length,
          customers_created: customersCreated,
          customers_updated: customersUpdated,
        });
      } catch (error) {
        console.error(`  ❌ ${cred.provider} sync failed:`, error);

        // Record failed sync
        await supabase.rpc('record_customer_sync', {
          p_project_id: cred.project_id,
          p_sync_type: 'scheduled',
          p_provider: cred.provider,
          p_status: 'failed',
          p_customers_synced: 0,
          p_customers_created: 0,
          p_customers_updated: 0,
          p_error_message: error instanceof Error ? error.message : 'Unknown error',
        });

        results.push({
          project_id: cred.project_id,
          provider: cred.provider,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    console.log(`🔄 [CRM Sync] Complete: ${successCount}/${results.length} succeeded, ${totalSynced} customers synced (${totalDuration}ms total)`);

    return NextResponse.json({
      success: failedCount === 0,
      summary: {
        total_integrations: results.length,
        succeeded: successCount,
        failed: failedCount,
        total_customers_synced: totalSynced,
        total_customers_created: totalCreated,
        total_customers_updated: totalUpdated,
        total_duration_ms: totalDuration,
      },
      results,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('[CRM Sync] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'CRM sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: totalDuration,
      },
      { status: 500 }
    );
  }
}
