/**
 * Discovery Worker
 * Processes one discovery job at a time (one platform per invocation)
 * Triggered by cron every minute
 */

import { NextResponse } from 'next/server';
import {
    claimJob,
    completeJob,
    failJob,
    createJob,
    storeRawItems,
    updateScanStats,
    updatePlatformStatus,
} from '@/lib/hunters/job-queue';
import { getHunter } from '@/lib/hunters';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type { PlatformType, HunterConfig, PlatformIntegration } from '@/types/hunter';

export const maxDuration = 55; // Vercel max for Pro plan
export const dynamic = 'force-dynamic';

export async function GET() {
    return POST();
}

export async function POST() {
    console.log('[Discovery Worker] Starting...');

    try {
        // Claim a pending discovery job
        const job = await claimJob('discovery');

        if (!job) {
            console.log('[Discovery Worker] No pending jobs');
            return NextResponse.json({ processed: 0, message: 'No pending jobs' });
        }

        console.log(`[Discovery Worker] Claimed job ${job.id} for ${job.platform}`);
        await updatePlatformStatus(job.scan_id, job.platform, 'discovering');

        const supabase = getServiceRoleClient();
        if (!supabase) {
            console.error('[Discovery Worker] FAILED: Supabase client not available');
            await failJob(job.id, 'Supabase client not available', false);
            await updatePlatformStatus(job.scan_id, job.platform, 'failed');
            return NextResponse.json({ processed: 0, error: 'No supabase client' });
        }

        // Get hunter config for this project (use maybeSingle to handle 0 or multiple rows)
        const { data: config, error: configError } = await supabase
            .from('hunter_configs')
            .select('*')
            .eq('project_id', job.project_id)
            .limit(1)
            .maybeSingle();

        if (configError || !config) {
            console.error(`[Discovery Worker] FAILED: No hunter config for project ${job.project_id}:`, configError);
            await failJob(job.id, `No hunter config found: ${configError?.message}`, false);
            await updatePlatformStatus(job.scan_id, job.platform, 'failed');
            return NextResponse.json({ processed: 0, error: 'No config' });
        }

        // Get integration for this platform
        const { data: integration, error: intError } = await supabase
            .from('platform_integrations')
            .select('*')
            .eq('project_id', job.project_id)
            .eq('platform_type', job.platform)
            .in('status', ['active', 'paused', 'setup'])
            .single();

        if (intError || !integration) {
            console.error(`[Discovery Worker] FAILED: No integration for ${job.platform} in project ${job.project_id}:`, intError);
            await failJob(job.id, `No integration for ${job.platform}: ${intError?.message}`, false);
            await updatePlatformStatus(job.scan_id, job.platform, 'failed');
            return NextResponse.json({ processed: 0, error: 'No integration' });
        }

        // Run discovery
        const hunter = getHunter(job.platform as PlatformType);

        const hunterConfig = {
            project_id: job.project_id,
            company_name: config.company_name,
            product_description: config.product_description,
            product_tagline: config.product_tagline,
            website_url: config.website_url,
            name_variations: config.name_variations || [],
            keywords: config.keywords || [],
            excluded_keywords: config.excluded_keywords || [],
            competitors: config.competitors || [],
            target_audience: config.target_audience,
            product_category: config.product_category,
        } as any;

        const platformIntegration = {
            id: integration.id,
            platform_type: integration.platform_type,
            project_id: integration.project_id,
            status: integration.status,
            config: integration.config || {},
        } as any;

        console.log(`[Discovery Worker] Running hunt for ${job.platform}...`);
        const rawFeedback = await hunter.hunt(hunterConfig, platformIntegration);

        console.log(`[Discovery Worker] Found ${rawFeedback.length} items on ${job.platform}`);

        // Store raw items in staging table
        if (rawFeedback.length > 0) {
            // Safe date conversion helper
            const safeISOString = (date: Date | string | null | undefined): string | undefined => {
                if (!date) return undefined;
                try {
                    const d = date instanceof Date ? date : new Date(date);
                    return isNaN(d.getTime()) ? undefined : d.toISOString();
                } catch {
                    return undefined;
                }
            };

            const storedCount = await storeRawItems(
                job.scan_id,
                job.project_id,
                job.platform,
                rawFeedback.map(item => ({
                    external_id: item.platform_id,
                    external_url: item.platform_url,
                    title: item.title,
                    content: item.content,
                    author: item.author_username,
                    posted_at: safeISOString(item.discovered_at),
                    raw_metadata: {
                        engagement_metrics: item.engagement_metrics,
                        author_profile_url: item.author_profile_url,
                    },
                }))
            );

            // Update scan stats
            await updateScanStats(job.scan_id, { discovered: storedCount });
            console.log(`[Discovery Worker] Stored ${storedCount} items in staging`);
        }

        // Create relevance job if we found items
        if (rawFeedback.length > 0) {
            await createJob({
                scanId: job.scan_id,
                projectId: job.project_id,
                jobType: 'relevance',
                platform: job.platform,
            });
            console.log(`[Discovery Worker] Created relevance job for ${job.platform}`);
        }

        // Mark job complete
        await completeJob(job.id);
        await updatePlatformStatus(job.scan_id, job.platform, 'discovered');

        return NextResponse.json({
            processed: 1,
            platform: job.platform,
            itemsFound: rawFeedback.length,
        });
    } catch (error) {
        console.error('[Discovery Worker] Error:', error);
        return NextResponse.json({
            processed: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
