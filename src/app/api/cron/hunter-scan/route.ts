/**
 * Hunter Cron Job
 * Scheduled job to scan all active platform integrations
 * Should be triggered every 15 minutes via cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getHunter } from '@/lib/hunters';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/hunter-scan
 * Triggered by cron every 15 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-here';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client with service role for cron jobs
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    console.log('[Hunter Cron] Starting scheduled scan');

    // Get all active integrations that are due for scanning
    const now = new Date().toISOString();
    const { data: integrations, error: integrationsError } = await supabase
      .from('platform_integrations')
      .select('*, hunter_configs!inner(*)')
      .eq('status', 'active')
      .lte('next_scan_at', now)
      .limit(50); // Limit to prevent overwhelming the system

    if (integrationsError) {
      throw integrationsError;
    }

    if (!integrations || integrations.length === 0) {
      console.log('[Hunter Cron] No integrations due for scanning');
      return NextResponse.json({
        success: true,
        message: 'No integrations due for scanning',
        scanned: 0,
      });
    }

    console.log(`[Hunter Cron] Found ${integrations.length} integrations to scan`);

    // Scan each integration
    const results = [];
    let totalItemsFound = 0;
    let totalItemsStored = 0;

    for (const integration of integrations) {
      try {
        const hunter = getHunter(integration.platform_type);
        const config = (integration as any).hunter_configs;

        console.log(`[Hunter Cron] Scanning ${integration.platform_type} for project ${integration.project_id}`);

        const result = await hunter.scan(config, integration);

        // Log the scan
        await hunter.logScan(
          result,
          integration.id,
          integration.project_id,
          'scheduled'
        );

        // Update next scan time
        const nextScanAt = new Date(
          Date.now() + integration.scan_frequency_minutes * 60 * 1000
        ).toISOString();

        await supabase
          .from('platform_integrations')
          .update({ next_scan_at: nextScanAt })
          .eq('id', integration.id);

        totalItemsFound += result.itemsFound;
        totalItemsStored += result.itemsStored;

        results.push({
          platform: integration.platform_type,
          projectId: integration.project_id,
          success: result.success,
          itemsFound: result.itemsFound,
          itemsStored: result.itemsStored,
        });

        // Small delay between scans to prevent rate limit issues
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(
          `[Hunter Cron] Error scanning ${integration.platform_type}:`,
          error
        );
        results.push({
          platform: integration.platform_type,
          projectId: integration.project_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(
      `[Hunter Cron] Completed. Scanned ${integrations.length} integrations, found ${totalItemsFound} items, stored ${totalItemsStored} items`
    );

    return NextResponse.json({
      success: true,
      message: 'Scan completed',
      scanned: integrations.length,
      totalItemsFound,
      totalItemsStored,
      results,
    });
  } catch (error) {
    console.error('[Hunter Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
